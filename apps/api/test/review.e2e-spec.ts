import { ensureAdmin, createTestApp, type TestContext } from './utils/test-app';
import {
  createApplicant,
  createCampaign,
  createStudent,
  FIXTURE_PASSWORD,
  FixtureTracker,
  loginAdmin,
  loginApplicant,
  loginStudent,
  uploadPiece,
  type Agent,
} from './utils/scholarship-fixtures';

type Body = Record<string, unknown>;

const RENEWAL_PIECES = [
  { code: 'CERTIFICAT_INSCRIPTION' },
  { code: 'ATTESTATION_RESULTATS' },
];
const APPLICATION_PIECES = [
  { code: 'PIECE_IDENTITE' },
  { code: 'ATTESTATION_ADMISSION' },
  {
    code: 'RELEVE_BAC',
    cycles: ['PREPA' as const, 'BTS' as const, 'LICENCE' as const],
  },
];

describe('Candidature et instruction des demandes (e2e)', () => {
  let ctx: TestContext;
  let admin: Agent;
  const tracker = new FixtureTracker();

  /** Renouvellement soumis par un boursier L3 qui passe en M1. */
  async function submittedRenewal(suffix: string) {
    const campaign = await createCampaign(
      ctx,
      tracker,
      'RENEWAL',
      RENEWAL_PIECES,
    );
    const student = await createStudent(ctx, tracker, suffix);
    const agent = await loginStudent(ctx, student.email);
    const created = await agent
      .post('/api/student/requests')
      .send({ campaignId: campaign.id })
      .expect(201);
    const requestId = (created.body as Body).id as string;

    await agent
      .patch(`/api/student/requests/${requestId}`)
      .send({ targetLevel: 'M1', previousResult: 'PASSED', city: 'Metz' })
      .expect(200);

    for (const { code } of RENEWAL_PIECES) {
      await uploadPiece(agent, 'student', requestId, code).expect(201);
    }

    await agent
      .post(`/api/student/requests/${requestId}/submit`)
      .send({ honorDeclaration: true })
      .expect(200);

    return { campaign, student, agent, requestId };
  }

  beforeEach(async () => {
    ctx = await createTestApp();
    await ensureAdmin(ctx.prisma);
    admin = await loginAdmin(ctx, 'admin-e2e@sgee.local');
  });

  afterEach(async () => {
    await tracker.cleanup(ctx);
    await ctx.app.close();
  });

  it('instruit un renouvellement : complément, nouvelle soumission puis acceptation', async () => {
    const { student, agent, requestId } = await submittedRenewal('ACCEPTE');

    const queue = await admin
      .get('/api/admin/requests')
      .query({ type: 'RENEWAL', search: student.lastName })
      .expect(200);

    expect(
      (queue.body as { items: Body[] }).items.map((item) => item.id),
    ).toEqual([requestId]);

    await admin
      .post(`/api/admin/requests/${requestId}/start-review`)
      .send({})
      .expect(200);
    await admin
      .post(`/api/admin/requests/${requestId}/request-info`)
      .send({
        comment: 'Merci de fournir un certificat signé',
        documents: [
          {
            documentTypeCode: 'CERTIFICAT_INSCRIPTION',
            comment: 'Signature manquante',
          },
        ],
      })
      .expect(200);

    const incomplete = (
      await agent.get(`/api/student/requests/${requestId}`).expect(200)
    ).body as Body;
    const certificate = (incomplete.documents as Body[]).find(
      (document) => document.documentTypeCode === 'CERTIFICAT_INSCRIPTION',
    );

    expect(incomplete.status).toBe('INCOMPLETE');
    expect(certificate?.status).toBe('REJECTED');
    expect(certificate?.reviewComment).toBe('Signature manquante');

    // Tant que la pièce refusée n'est pas remplacée, le dossier reste incomplet.
    await agent
      .post(`/api/student/requests/${requestId}/submit`)
      .send({ honorDeclaration: true })
      .expect(422);
    await uploadPiece(
      agent,
      'student',
      requestId,
      'CERTIFICAT_INSCRIPTION',
    ).expect(201);
    await agent
      .post(`/api/student/requests/${requestId}/submit`)
      .send({ honorDeclaration: true })
      .expect(200);

    const approved = await admin
      .post(`/api/admin/requests/${requestId}/approve`)
      .send({ comment: 'Dossier complet' })
      .expect(200);

    expect((approved.body as Body).status).toBe('APPROVED');
    await admin
      .post(`/api/admin/requests/${requestId}/approve`)
      .send({})
      .expect(409);

    const updated = await ctx.prisma.student.findUniqueOrThrow({
      where: { id: student.id },
      include: { cursus: { orderBy: { createdAt: 'asc' } } },
    });

    expect(updated.levelCode).toBe('M1');
    expect(updated.academy).toBe('Metz');
    expect(
      updated.cursus.map((entry) => [
        entry.levelCode,
        entry.isCurrent,
        entry.result,
      ]),
    ).toEqual([
      ['L3', false, 'PASSED'],
      ['M1', true, null],
    ]);

    const history = (approved.body as { history: Body[] }).history.map(
      (entry) => entry.toStatus,
    );

    expect(history).toEqual([
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'INCOMPLETE',
      'SUBMITTED',
      'APPROVED',
    ]);

    const notifications = await agent
      .get('/api/student/notifications')
      .expect(200);

    expect((notifications.body as Body).total).toBe(5);
  });

  it('annule la bourse quand le renouvellement est refusé, motif obligatoire', async () => {
    const { student, requestId } = await submittedRenewal('REFUSE');

    await admin
      .post(`/api/admin/requests/${requestId}/reject`)
      .send({})
      .expect(400);
    await admin
      .post(`/api/admin/requests/${requestId}/reject`)
      .send({ comment: 'Deuxième redoublement dans le cycle' })
      .expect(200);

    const updated = await ctx.prisma.student.findUniqueOrThrow({
      where: { id: student.id },
    });

    expect(updated.scholarshipStatus).toBe('CANCELLED');
    expect(
      await ctx.prisma.auditLog.count({
        where: { entityId: requestId, action: 'REQUEST_REJECTED' },
      }),
    ).toBe(1);
  });

  it('crée le boursier quand une candidature est acceptée', async () => {
    const campaign = await createCampaign(
      ctx,
      tracker,
      'NEW_APPLICATION',
      APPLICATION_PIECES,
      { maxAgeNonDoctoral: 30 },
    );
    const applicant = await createApplicant(ctx, tracker, 'LAUREAT');
    const agent = await loginApplicant(ctx, applicant.email);
    const created = await agent
      .post('/api/applicant/requests')
      .send({ campaignId: campaign.id })
      .expect(201);
    const draft = created.body as Body;
    const requestId = draft.id as string;

    expect(draft.reference).toMatch(/^CAN-\d{4}-\d{6}$/);

    // Le brouillon reste privé : invisible dans la file d'instruction.
    await admin.get(`/api/admin/requests/${requestId}`).expect(404);

    await agent
      .patch(`/api/applicant/requests/${requestId}`)
      .send({
        targetLevel: 'L1',
        institution: 'Université de Strasbourg',
        city: 'Strasbourg',
        country: 'France',
        fieldOfStudy: 'Physique',
        baccalaureateSeries: 'S1',
        baccalaureateYear: 2026,
        baccalaureateMention: 'Bien',
        baccalaureateAverage: 15.2,
        motivation: 'Poursuivre des études de physique fondamentale en France.',
      })
      .expect(200);

    for (const { code } of APPLICATION_PIECES) {
      await uploadPiece(agent, 'applicant', requestId, code).expect(201);
    }

    await agent
      .post(`/api/applicant/requests/${requestId}/submit`)
      .send({ honorDeclaration: true })
      .expect(200);
    await admin
      .post(`/api/admin/requests/${requestId}/approve`)
      .send({})
      .expect(200);

    const me = (await agent.get('/api/applicant/me').expect(200)).body as Body;

    expect(me.studentNumber).toMatch(/^SGEE\d{4}-\d{5}$/);

    // Le lauréat se connecte au portail boursier avec ses identifiants de candidat.
    const scholar = ctx.api();

    await scholar
      .post('/api/auth/login')
      .send({ identifier: applicant.email, password: FIXTURE_PASSWORD })
      .expect(200);

    const documents = (await scholar.get('/api/student/documents').expect(200))
      .body as { items: Body[] };

    expect(documents.items.map((document) => document.type).sort()).toEqual([
      'ATTESTATION_ARRIVEE',
      'RIB',
    ]);
  });

  it('bloque une candidature au-delà de 30 ans hors doctorat', async () => {
    const campaign = await createCampaign(
      ctx,
      tracker,
      'NEW_APPLICATION',
      APPLICATION_PIECES,
      { maxAgeNonDoctoral: 30 },
    );
    const applicant = await createApplicant(ctx, tracker, 'AGE', '1990-01-01');
    const agent = await loginApplicant(ctx, applicant.email);
    const refused = await agent
      .post('/api/applicant/requests')
      .send({ campaignId: campaign.id })
      .expect(422);

    expect(JSON.stringify(refused.body)).toContain('AGE_LIMIT');

    // Un candidat ne peut pas utiliser une campagne de renouvellement.
    const renewal = await createCampaign(
      ctx,
      tracker,
      'RENEWAL',
      RENEWAL_PIECES,
    );

    await agent
      .post('/api/applicant/requests')
      .send({ campaignId: renewal.id })
      .expect(400);
  });
});
