import bcrypt from 'bcryptjs';
import { protectIban } from '../src/common/crypto/iban';
import {
  createTestApp,
  ensureAdmin,
  isRecord,
  type TestContext,
} from './utils/test-app';

const PASSWORD = 'mot-de-passe-rib';
const ACTIVE_IBAN = 'FR7630004000031234567890143';
const NEW_IBAN = 'FR76 3000 6000 0112 3456 7890 189';
const NEW_IBAN_COMPACT = 'FR7630006000011234567890189';

type RibView = Record<string, unknown> | null;
type StudentRibResponse = {
  active: RibView;
  pending: RibView;
  lastRejected: RibView;
};

describe('RIB versionné et IBAN chiffré (e2e)', () => {
  let ctx: TestContext;
  const createdStudentIds: string[] = [];

  async function createStudentWithActiveRib(suffix: string) {
    const unique = `${suffix}-${Date.now()}`;
    const student = await ctx.prisma.student.create({
      data: {
        studentNumber: `RIB_${unique}`,
        firstName: 'Rib',
        lastName: suffix,
        email: `rib-${unique.toLowerCase()}@sgee.local`,
        birthDate: new Date('2001-01-01'),
        scholarshipStatus: 'Repris',
        passwordHash: await bcrypt.hash(PASSWORD, 4),
      },
    });

    createdStudentIds.push(student.id);

    const activeRib = await ctx.prisma.rib.create({
      data: {
        studentId: student.id,
        activeSlot: true,
        bankName: 'Banque Active',
        holderName: 'Rib Active',
        ...protectIban(ACTIVE_IBAN),
        bic: 'BNPAFRPP',
        address: 'Nancy',
        phone: '0600000000',
        email: student.email,
        status: 'VALIDATED',
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    const agent = ctx.api();

    await agent
      .post('/api/auth/login')
      .send({ identifier: student.email, password: PASSWORD })
      .expect(200);

    return { student, activeRib, agent };
  }

  async function adminAgent() {
    const admin = await ensureAdmin(ctx.prisma);
    const agent = ctx.api();

    await agent
      .post('/api/admin/auth/login')
      .send({ email: admin.email, password: 'admin12345' })
      .expect(200);

    return agent;
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

  it('garde le RIB actif pendant l’instruction et ne renvoie jamais l’IBAN complet', async () => {
    const { student, activeRib, agent } =
      await createStudentWithActiveRib('SUBMIT');

    await agent
      .patch('/api/student/rib')
      .send({ banque: 'Banque Test', iban: 'FR7612345678901234567890123' })
      .expect(400);

    const response = await agent
      .patch('/api/student/rib')
      .send({ banque: 'Nouvelle Banque', iban: NEW_IBAN, bic: 'agrifrpp' })
      .expect(200);
    const body = response.body as StudentRibResponse;

    expect(body.active?.id).toBe(activeRib.id);
    expect(body.pending?.status).toBe('PENDING');
    expect(body.pending?.banque).toBe('Nouvelle Banque');
    expect(body.pending?.bic).toBe('AGRIFRPP');
    expect(JSON.stringify(body)).not.toContain(NEW_IBAN_COMPACT);
    expect(JSON.stringify(body)).not.toContain(ACTIVE_IBAN);

    const stored = await ctx.prisma.rib.findMany({
      where: { studentId: student.id },
    });

    expect(stored).toHaveLength(2);
    expect(stored.every((rib) => rib.iban === null)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain(NEW_IBAN_COMPACT);
  });

  it('refuse de soumettre l’IBAN déjà actif', async () => {
    const { agent } = await createStudentWithActiveRib('DUPLICATE');

    await agent
      .patch('/api/student/rib')
      .send({ banque: 'Banque Active', iban: ACTIVE_IBAN })
      .expect(409);
  });

  it('bascule le RIB actif à la validation et conserve l’ancien en historique', async () => {
    const { student, activeRib, agent } =
      await createStudentWithActiveRib('VALIDATE');
    const submitted = await agent
      .patch('/api/student/rib')
      .send({ banque: 'Nouvelle Banque', iban: NEW_IBAN })
      .expect(200);
    const pendingId = (submitted.body as StudentRibResponse).pending?.id;
    const admin = await adminAgent();

    await admin
      .patch(`/api/admin/ribs/${pendingId as string}/validate`)
      .send({})
      .expect(200);

    const after = (await agent.get('/api/student/rib').expect(200))
      .body as StudentRibResponse;

    expect(after.active?.id).toBe(pendingId);
    expect(after.pending).toBeNull();

    const previous = await ctx.prisma.rib.findUniqueOrThrow({
      where: { id: activeRib.id },
    });

    expect(previous.activeSlot).toBeNull();
    expect(previous.supersededAt).not.toBeNull();
    expect(
      await ctx.prisma.rib.count({
        where: { studentId: student.id, activeSlot: true },
      }),
    ).toBe(1);
  });

  it('laisse le RIB actif intact en cas de refus et affiche le motif', async () => {
    const { activeRib, agent } = await createStudentWithActiveRib('REJECT');
    const submitted = await agent
      .patch('/api/student/rib')
      .send({ banque: 'Banque Douteuse', iban: NEW_IBAN })
      .expect(200);
    const pendingId = (submitted.body as StudentRibResponse).pending?.id;
    const admin = await adminAgent();

    await admin
      .patch(`/api/admin/ribs/${pendingId as string}/reject`)
      .send({ reviewComment: 'RIB non conforme' })
      .expect(200);

    const after = (await agent.get('/api/student/rib').expect(200))
      .body as StudentRibResponse;

    expect(after.active?.id).toBe(activeRib.id);
    expect(after.pending).toBeNull();
    expect(after.lastRejected?.reviewComment).toBe('RIB non conforme');
  });

  it('signale un IBAN utilisé par plusieurs boursiers et journalise sa révélation', async () => {
    const first = await createStudentWithActiveRib('SHARED_A');
    const second = await createStudentWithActiveRib('SHARED_B');

    for (const { agent } of [first, second]) {
      await agent
        .patch('/api/student/rib')
        .send({ banque: 'Même Banque', iban: NEW_IBAN })
        .expect(200);
    }

    const admin = await adminAgent();
    const list = await admin
      .get('/api/admin/ribs/pending')
      .query({ pageSize: 100 })
      .expect(200);
    const items = (list.body as { items: Array<Record<string, unknown>> })
      .items;
    const firstItem = items.find(
      (item) => isRecord(item.student) && item.student.id === first.student.id,
    );

    expect(firstItem?.sharedIbanCount).toBe(1);
    expect(isRecord(firstItem?.activeRib)).toBe(true);
    expect(JSON.stringify(list.body)).not.toContain(NEW_IBAN_COMPACT);

    const reveal = await admin
      .get(`/api/admin/ribs/${firstItem?.id as string}/iban`)
      .expect(200);

    expect(reveal.body).toEqual({ iban: NEW_IBAN_COMPACT });
    expect(reveal.headers['cache-control']).toBe('no-store');
    expect(
      await ctx.prisma.auditLog.count({
        where: {
          entityId: firstItem?.id as string,
          action: 'RIB_IBAN_REVEALED',
        },
      }),
    ).toBe(1);
  });

  it('permet à l’étudiant d’annuler sa demande en attente', async () => {
    const { agent } = await createStudentWithActiveRib('CANCEL');

    await agent.delete('/api/student/rib/pending').expect(404);
    await agent
      .patch('/api/student/rib')
      .send({ banque: 'Nouvelle Banque', iban: NEW_IBAN })
      .expect(200);

    const response = await agent.delete('/api/student/rib/pending').expect(200);

    expect((response.body as StudentRibResponse).pending).toBeNull();
  });
});
