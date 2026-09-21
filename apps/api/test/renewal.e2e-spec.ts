import bcrypt from 'bcryptjs';
import type {
  AcademicResult,
  ScholarshipStatus,
  StudyLevel,
} from '../src/generated/prisma/client';
import {
  createTestApp,
  ensureAdmin,
  isRecord,
  type TestContext,
} from './utils/test-app';

const PASSWORD = 'mot-de-passe-renouvellement';
const PDF = Buffer.from('%PDF-1.4\n%renouvellement\n');
const DAY = 24 * 60 * 60 * 1000;

type Body = Record<string, unknown>;

let yearCounter = 0;

describe('Renouvellement annuel côté boursier (e2e)', () => {
  let ctx: TestContext;
  const createdStudentIds: string[] = [];
  const createdYearIds: string[] = [];

  /** Campagne de test indépendante de la date du jour et de l'année courante. */
  async function createRenewalCampaign(open = true) {
    const start = 2090 + (yearCounter += 1);
    const now = Date.now();
    const year = await ctx.prisma.academicYear.create({
      data: {
        code: `${start}-${start + 1}`,
        label: `${start}/${start + 1}`,
        startsOn: new Date(`${start}-09-01`),
        endsOn: new Date(`${start + 1}-08-31`),
      },
    });

    createdYearIds.push(year.id);

    return ctx.prisma.campaign.create({
      data: {
        type: 'RENEWAL',
        academicYearId: year.id,
        title: `Renouvellement e2e ${start}`,
        opensAt: new Date(now - (open ? DAY : 10 * DAY)),
        closesAt: new Date(now + (open ? 30 * DAY : -DAY)),
        requirements: {
          create: [
            { documentTypeCode: 'CERTIFICAT_INSCRIPTION', sortOrder: 0 },
            { documentTypeCode: 'ATTESTATION_RESULTATS', sortOrder: 1 },
            {
              documentTypeCode: 'LETTRE_DIRECTEUR_THESE',
              cycles: ['DOCTORAT'],
              isRequired: false,
              sortOrder: 2,
            },
          ],
        },
      },
    });
  }

  async function createStudent(
    suffix: string,
    options: {
      status?: ScholarshipStatus;
      level?: StudyLevel;
      history?: Array<{ level: StudyLevel; result: AcademicResult }>;
    } = {},
  ) {
    const unique = `${suffix}-${Date.now()}`.toLowerCase();
    const level = options.level ?? 'L3';
    const student = await ctx.prisma.student.create({
      data: {
        studentNumber: `REN_${unique}`,
        firstName: 'Renouvellement',
        lastName: suffix,
        email: `ren-${unique}@sgee.local`,
        birthDate: new Date('2001-01-01'),
        scholarshipStatus: options.status ?? 'ACTIVE',
        levelCode: level,
        field: 'Informatique',
        academy: 'Nancy',
        country: 'France',
        passwordHash: await bcrypt.hash(PASSWORD, 4),
        cursus: {
          create: [
            ...(options.history ?? []).map((entry, index) => ({
              academicYear: `${2020 + index}/${2021 + index}`,
              institution: 'Université de Lorraine',
              level: entry.level,
              levelCode: entry.level,
              specialty: 'Informatique',
              diploma: entry.level,
              status: 'VALIDATED',
              result: entry.result,
            })),
            {
              academicYear: '2025/2026',
              institution: 'Université de Lorraine',
              level,
              levelCode: level,
              specialty: 'Informatique',
              diploma: level,
              status: 'CURRENT',
              isCurrent: true,
            },
          ],
        },
      },
    });

    createdStudentIds.push(student.id);

    const agent = ctx.api();

    await agent
      .post('/api/auth/login')
      .send({ identifier: student.email, password: PASSWORD })
      .expect(200);

    return { student, agent };
  }

  const uploadPiece = (
    agent: ReturnType<TestContext['api']>,
    requestId: string,
    code: string,
  ) =>
    agent
      .post(`/api/student/requests/${requestId}/documents`)
      .field('documentTypeCode', code)
      .attach('file', PDF, {
        filename: `${code}.pdf`,
        contentType: 'application/pdf',
      });

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.prisma.student.deleteMany({
      where: { id: { in: createdStudentIds.splice(0) } },
    });
    await ctx.prisma.campaign.deleteMany({
      where: { academicYearId: { in: createdYearIds } },
    });
    await ctx.prisma.academicYear.deleteMany({
      where: { id: { in: createdYearIds.splice(0) } },
    });
    await ctx.app.close();
  });

  it('mène une demande du brouillon à la soumission puis au retrait', async () => {
    const campaign = await createRenewalCampaign();
    const { agent } = await createStudent('NOMINAL');

    const created = await agent
      .post('/api/student/requests')
      .send({ campaignId: campaign.id })
      .expect(201);
    const draft = created.body as Body;

    expect(draft.reference).toMatch(/^REN-\d{4}-\d{6}$/);
    expect(draft.status).toBe('DRAFT');
    expect(draft.previousLevel).toBe('L3');
    expect(draft.institution).toBe('Université de Lorraine');

    const requestId = draft.id as string;
    const incomplete = await agent
      .post(`/api/student/requests/${requestId}/submit`)
      .send({ honorDeclaration: true })
      .expect(422);

    expect(incomplete.body).toMatchObject({ message: 'Dossier incomplet' });
    expect((incomplete.body as Body).missingFields).toEqual(
      expect.arrayContaining(['targetLevel', 'previousResult']),
    );

    const updated = await agent
      .patch(`/api/student/requests/${requestId}`)
      .send({
        version: draft.version,
        targetLevel: 'M1',
        previousResult: 'PASSED',
        previousAverage: 13.5,
        fieldOfStudy: 'Informatique',
        motivation:
          'ignoré pour un renouvellement, ce champ ne doit pas être enregistré',
      })
      .expect(200);

    expect((updated.body as Body).version).toBe((draft.version as number) + 1);
    expect((updated.body as Body).targetLevelLabel).toBe('Master 1');
    expect((updated.body as Body).previousAverage).toBe('13.50');
    expect((updated.body as Body).motivation).toBeNull();

    // Verrou optimiste : une version périmée est refusée.
    await agent
      .patch(`/api/student/requests/${requestId}`)
      .send({ version: draft.version, city: 'Metz' })
      .expect(409);

    await uploadPiece(agent, requestId, 'RELEVE_BAC').expect(400);
    await uploadPiece(agent, requestId, 'CERTIFICAT_INSCRIPTION').expect(201);
    await uploadPiece(agent, requestId, 'ATTESTATION_RESULTATS').expect(201);

    await agent
      .post(`/api/student/requests/${requestId}/submit`)
      .send({ honorDeclaration: false })
      .expect(400);

    const submitted = await agent
      .post(`/api/student/requests/${requestId}/submit`)
      .send({ honorDeclaration: true })
      .expect(200);
    const submittedBody = submitted.body as Body;

    expect(submittedBody.status).toBe('SUBMITTED');
    expect(submittedBody.isEditable).toBe(false);
    expect(
      (submittedBody.history as Body[]).map((entry) => entry.toStatus),
    ).toEqual(['DRAFT', 'SUBMITTED']);

    await agent
      .patch(`/api/student/requests/${requestId}`)
      .send({ city: 'Metz' })
      .expect(409);

    const notifications = await agent
      .get('/api/student/notifications')
      .query({ unreadOnly: 'true' })
      .expect(200);

    expect((notifications.body as Body).unreadCount).toBe(1);

    const withdrawn = await agent
      .post(`/api/student/requests/${requestId}/withdraw`)
      .expect(200);

    expect((withdrawn.body as Body).status).toBe('WITHDRAWN');

    // Une demande retirée peut être reprise, avec la même référence.
    const resumed = await agent
      .post('/api/student/requests')
      .send({ campaignId: campaign.id })
      .expect(201);

    expect((resumed.body as Body).id).toBe(requestId);
    expect((resumed.body as Body).status).toBe('DRAFT');
    expect((resumed.body as Body).reference).toBe(draft.reference);
  });

  it('bloque une bourse annulée, une campagne fermée et les doublons', async () => {
    const campaign = await createRenewalCampaign();
    const closedCampaign = await createRenewalCampaign(false);
    const cancelled = await createStudent('ANNULEE', { status: 'CANCELLED' });

    const refused = await cancelled.agent
      .post('/api/student/requests')
      .send({ campaignId: campaign.id })
      .expect(422);

    expect(JSON.stringify(refused.body)).toContain('SCHOLARSHIP_NOT_RENEWABLE');

    const { agent } = await createStudent('DOUBLON');

    const closed = await agent
      .post('/api/student/requests')
      .send({ campaignId: closedCampaign.id })
      .expect(422);

    expect(JSON.stringify(closed.body)).toContain('CAMPAIGN_CLOSED');

    await agent
      .post('/api/student/requests')
      .send({ campaignId: campaign.id })
      .expect(201);
    await agent
      .post('/api/student/requests')
      .send({ campaignId: campaign.id })
      .expect(409);
  });

  it('fige les alertes pour l’instructeur (redoublement en M2)', async () => {
    const campaign = await createRenewalCampaign();
    const { agent } = await createStudent('M2', {
      level: 'M2',
      history: [{ level: 'M1', result: 'PASSED' }],
    });
    const created = await agent
      .post('/api/student/requests')
      .send({ campaignId: campaign.id })
      .expect(201);
    const requestId = (created.body as Body).id as string;

    await agent
      .patch(`/api/student/requests/${requestId}`)
      .send({ targetLevel: 'M2', previousResult: 'REPEATED' })
      .expect(200);
    await uploadPiece(agent, requestId, 'CERTIFICAT_INSCRIPTION').expect(201);
    await uploadPiece(agent, requestId, 'ATTESTATION_RESULTATS').expect(201);

    const submitted = await agent
      .post(`/api/student/requests/${requestId}/submit`)
      .send({ honorDeclaration: true })
      .expect(200);
    const eligibility = (submitted.body as Body).eligibility as Body;

    expect(JSON.stringify(eligibility.warnings)).toContain('REPEAT_FINAL_YEAR');

    const stored = await ctx.prisma.scholarshipRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    expect(JSON.stringify(stored.eligibilityWarnings)).toContain(
      'REPEAT_FINAL_YEAR',
    );
  });

  it('isole les demandes de chaque boursier', async () => {
    const campaign = await createRenewalCampaign();
    const owner = await createStudent('PROPRIO');
    const other = await createStudent('AUTRE');
    const created = await owner.agent
      .post('/api/student/requests')
      .send({ campaignId: campaign.id })
      .expect(201);
    const requestId = (created.body as Body).id as string;

    await other.agent.get(`/api/student/requests/${requestId}`).expect(404);
    await other.agent
      .post(`/api/student/requests/${requestId}/withdraw`)
      .expect(404);
    await ctx.raw().get(`/api/student/requests/${requestId}`).expect(401);
  });

  it('renvoie un tableau de bord calculé à partir des données réelles', async () => {
    const agent = ctx.api();

    await agent
      .post('/api/auth/login')
      .send({ identifier: 'test@sgee.local', password: 'password123' })
      .expect(200);

    const response = await agent.get('/api/student/dashboard').expect(200);
    const body = response.body as Body;
    const payments = body.payments as Body;
    const scholarship = body.scholarship as Body;

    expect(isRecord(payments.last)).toBe(true);
    expect((payments.last as Body).amount).toBe('297.27');
    expect(payments.currentYearCount).toBe(7);
    expect(typeof scholarship.progressPercent).toBe('number');
    expect(scholarship.statusLabel).toBe('Active');
    expect(isRecord(body.renewal)).toBe(true);
    expect(isRecord((body.rib as Body).active)).toBe(true);
  });

  it('réserve la gestion des campagnes aux super-admins', async () => {
    await ensureAdmin(ctx.prisma, 'admin-e2e@sgee.local', 'ADMIN');
    await ensureAdmin(ctx.prisma, 'superadmin-e2e@sgee.local', 'SUPER_ADMIN');

    const admin = ctx.api();

    await admin
      .post('/api/admin/auth/login')
      .send({ email: 'admin-e2e@sgee.local', password: 'admin12345' })
      .expect(200);
    await admin.get('/api/admin/campaigns').expect(200);

    const start = 2090 + (yearCounter += 1);
    const year = await ctx.prisma.academicYear.create({
      data: {
        code: `${start}-${start + 1}`,
        label: `${start}/${start + 1}`,
        startsOn: new Date(`${start}-09-01`),
        endsOn: new Date(`${start + 1}-08-31`),
      },
    });

    createdYearIds.push(year.id);

    const payload = {
      type: 'RENEWAL',
      academicYearId: year.id,
      title: 'Renouvellement créé par e2e',
      opensAt: new Date(Date.now() - DAY).toISOString(),
      closesAt: new Date(Date.now() + 10 * DAY).toISOString(),
      requirements: [{ documentTypeCode: 'CERTIFICAT_INSCRIPTION' }],
    };

    await admin.post('/api/admin/campaigns').send(payload).expect(403);

    const superAdmin = ctx.api();

    await superAdmin
      .post('/api/admin/auth/login')
      .send({ email: 'superadmin-e2e@sgee.local', password: 'admin12345' })
      .expect(200);
    await superAdmin
      .post('/api/admin/campaigns')
      .send({ ...payload, closesAt: payload.opensAt })
      .expect(400);

    const created = await superAdmin
      .post('/api/admin/campaigns')
      .send(payload)
      .expect(201);
    const campaign = created.body as Body;

    expect(campaign.phase).toBe('OPEN');
    await superAdmin.post('/api/admin/campaigns').send(payload).expect(409);

    const closed = await superAdmin
      .post(`/api/admin/campaigns/${campaign.id as string}/close`)
      .expect(200);

    expect((closed.body as Body).phase).toBe('CLOSED');
    expect(
      await ctx.prisma.auditLog.count({
        where: { entityId: campaign.id as string },
      }),
    ).toBe(2);
  });
});
