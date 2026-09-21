import bcrypt from 'bcryptjs';
import {
  createTestApp,
  CSRF,
  ensureAdmin,
  isRecord,
  type TestContext,
} from './utils/test-app';

const PASSWORD = 'mot-de-passe-e2e';

describe('Sessions, verrouillage et rôles (e2e)', () => {
  let ctx: TestContext;
  const createdStudentIds: string[] = [];

  async function createStudent(suffix: string) {
    const student = await ctx.prisma.student.create({
      data: {
        studentNumber: `SESS_${suffix}_${Date.now()}`,
        firstName: 'Session',
        lastName: suffix,
        email: `session-${suffix.toLowerCase()}-${Date.now()}@sgee.local`,
        birthDate: new Date('2001-01-01'),
        scholarshipStatus: 'ACTIVE',
        passwordHash: await bcrypt.hash(PASSWORD, 4),
      },
    });

    createdStudentIds.push(student.id);

    return student;
  }

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.prisma.student.deleteMany({
      where: { id: { in: createdStudentIds.splice(0) } },
    });
    await ctx.app.close();
  });

  it('révoque la session au logout : un ancien cookie est refusé', async () => {
    const student = await createStudent('LOGOUT');
    const agent = ctx.api();
    const login = await agent
      .post('/api/auth/login')
      .send({ identifier: student.email, password: PASSWORD })
      .expect(200);
    const sessionCookie = ([] as string[])
      .concat(login.headers['set-cookie'] ?? [])
      .map((cookie) => cookie.split(';')[0])
      .join('; ');

    await agent.get('/api/me').expect(200);
    await agent.post('/api/auth/logout').expect(200);

    await ctx.raw().get('/api/me').set('Cookie', sessionCookie).expect(401);

    const sessions = await ctx.prisma.session.findMany({
      where: { studentId: student.id },
    });

    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it("accepte l'email sans tenir compte de la casse", async () => {
    const student = await createStudent('CASE');

    await ctx
      .api()
      .post('/api/auth/login')
      .send({ identifier: student.email.toUpperCase(), password: PASSWORD })
      .expect(200);
  });

  it('verrouille le compte après 5 échecs puis refuse le bon mot de passe', async () => {
    const student = await createStudent('LOCK');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await ctx
        .api()
        .post('/api/auth/login')
        .send({ identifier: student.email, password: 'mauvais-mot-de-passe' })
        .expect(401);
    }

    const locked = await ctx.prisma.student.findUniqueOrThrow({
      where: { id: student.id },
    });

    expect(locked.lockedUntil?.getTime()).toBeGreaterThan(Date.now());

    // Nouvelle instance : quota de connexion par IP remis à zéro.
    await ctx.app.close();
    ctx = await createTestApp();

    await ctx
      .api()
      .post('/api/auth/login')
      .send({ identifier: student.email, password: PASSWORD })
      .expect(401);

    const events = await ctx.prisma.auditLog.findMany({
      where: { entityId: student.id },
      select: { action: true },
    });

    expect(events.map((event) => event.action)).toEqual(
      expect.arrayContaining(['AUTH_LOGIN_FAILED', 'AUTH_ACCOUNT_LOCKED']),
    );
  });

  it('réserve le journal d’audit aux super-admins', async () => {
    await ensureAdmin(ctx.prisma, 'admin-e2e@sgee.local', 'ADMIN');
    await ensureAdmin(ctx.prisma, 'superadmin-e2e@sgee.local', 'SUPER_ADMIN');

    const admin = ctx.api();

    await admin
      .post('/api/admin/auth/login')
      .send({ email: 'admin-e2e@sgee.local', password: 'admin12345' })
      .expect(200);
    await admin.get('/api/admin/audit-logs').expect(403);

    const superAdmin = ctx.api();

    await superAdmin
      .post('/api/admin/auth/login')
      .send({ email: 'superadmin-e2e@sgee.local', password: 'admin12345' })
      .expect(200);

    const response = await superAdmin
      .get('/api/admin/audit-logs')
      .query({ action: 'AUTH_LOGIN_SUCCEEDED', pageSize: 5 })
      .expect(200);
    const body: unknown = response.body;

    expect(isRecord(body) && Array.isArray(body.items)).toBe(true);

    if (isRecord(body) && Array.isArray(body.items)) {
      expect(body.items.length).toBeGreaterThan(0);
    }
  });

  it("journalise les décisions admin avec l'identité de l'instructeur", async () => {
    const adminUser = await ensureAdmin(ctx.prisma);
    const student = await createStudent('AUDIT');
    const rib = await ctx.prisma.rib.create({
      data: {
        studentId: student.id,
        bankName: 'Banque Audit',
        holderName: 'Session AUDIT',
        pendingSlot: true,
        ibanMasked: 'FR76 **** 0143',
        bic: 'BNPAFRPP',
        address: 'Dakar',
        phone: '+221770000000',
        email: student.email,
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });
    const admin = ctx.api();

    await admin
      .post('/api/admin/auth/login')
      .send({ email: adminUser.email, password: 'admin12345' })
      .expect(200);
    await admin
      .patch(`/api/admin/ribs/${rib.id}/validate`)
      .set(CSRF.name, CSRF.value)
      .send({})
      .expect(200);

    const entry = await ctx.prisma.auditLog.findFirst({
      where: { entityId: rib.id, action: 'RIB_VALIDATED' },
    });

    expect(entry?.actorType).toBe('ADMIN');
    expect(entry?.actorId).toBe(adminUser.id);
  });
});
