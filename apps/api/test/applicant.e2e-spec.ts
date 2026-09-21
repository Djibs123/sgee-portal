import bcrypt from 'bcryptjs';
import { MailerService } from '../src/mail/mailer.service';
import { createTestApp, type TestContext } from './utils/test-app';

type Body = Record<string, unknown>;

const PASSWORD = 'un-mot-de-passe-solide';

describe('Comptes candidats et mot de passe oublié (e2e)', () => {
  let ctx: TestContext;
  let mailer: MailerService;
  const emails: string[] = [];
  const studentIds: string[] = [];

  /** Jeton contenu dans le dernier e-mail envoyé à cette adresse. */
  function lastTokenFor(email: string) {
    const message = [...mailer.outbox]
      .reverse()
      .find((mail) => mail.to === email);
    const token = message
      ? /token=([\w-]+)/.exec(message.text)?.[1]
      : undefined;

    if (!token) {
      throw new Error(`Aucun lien envoyé à ${email}`);
    }

    return token;
  }

  function newEmail(label: string) {
    const email = `candidat-${label}-${Date.now()}@sgee.local`;

    emails.push(email);

    return email;
  }

  const registration = (email: string, password = PASSWORD) => ({
    email,
    password,
    firstName: 'Awa',
    lastName: 'Fall',
    birthDate: '2006-04-12',
    phone: '+221 77 000 00 00',
  });

  beforeEach(async () => {
    ctx = await createTestApp();
    mailer = ctx.app.get(MailerService);
  });

  afterEach(async () => {
    await ctx.prisma.applicant.deleteMany({
      where: { email: { in: emails.splice(0) } },
    });
    await ctx.prisma.student.deleteMany({
      where: { id: { in: studentIds.splice(0) } },
    });
    await ctx.app.close();
  });

  it('inscrit un candidat, exige la vérification puis ouvre une session', async () => {
    const email = newEmail('parcours');
    const agent = ctx.api();

    const registered = await agent
      .post('/api/applicant/auth/register')
      .send(registration(email.toUpperCase()))
      .expect(202);

    expect((registered.body as Body).message).toContain('Si cette adresse');

    await agent
      .post('/api/applicant/auth/login')
      .send({ email, password: PASSWORD })
      .expect(403);

    const token = lastTokenFor(email);

    await agent
      .post('/api/applicant/auth/verify-email')
      .send({ token })
      .expect(200);
    // Usage unique.
    await agent
      .post('/api/applicant/auth/verify-email')
      .send({ token })
      .expect(400);

    await agent
      .post('/api/applicant/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    const me = await agent.get('/api/applicant/me').expect(200);

    expect(me.body).toMatchObject({
      email,
      emailVerified: true,
      studentNumber: null,
    });

    await agent.post('/api/applicant/auth/logout').expect(200);
    await agent.get('/api/applicant/me').expect(401);
  });

  it('ne révèle pas si une adresse est déjà inscrite', async () => {
    const email = newEmail('doublon');

    const first = await ctx
      .api()
      .post('/api/applicant/auth/register')
      .send(registration(email))
      .expect(202);
    const second = await ctx
      .api()
      .post('/api/applicant/auth/register')
      .send(registration(email, 'un-autre-mot-de-passe'))
      .expect(202);

    expect(second.body).toEqual(first.body);
    expect(await ctx.prisma.applicant.count({ where: { email } })).toBe(1);
  });

  it('refuse les mots de passe courts, courants ou dérivés de l’e-mail', async () => {
    const email = newEmail('faible');

    await ctx
      .api()
      .post('/api/applicant/auth/register')
      .send(registration(email, 'court'))
      .expect(400);
    await ctx
      .api()
      .post('/api/applicant/auth/register')
      .send(registration(email, 'azertyuiop123'))
      .expect(400);
    await ctx
      .api()
      .post('/api/applicant/auth/register')
      .send(registration(email, `${email.split('@')[0]}!`))
      .expect(400);
  });

  it('réinitialise le mot de passe d’un boursier et ferme ses sessions', async () => {
    const email = newEmail('boursier');
    const student = await ctx.prisma.student.create({
      data: {
        studentNumber: `RESET_${Date.now()}`,
        firstName: 'Reset',
        lastName: 'Boursier',
        email,
        birthDate: new Date('2000-01-01'),
        passwordHash: await bcrypt.hash(PASSWORD, 4),
      },
    });

    studentIds.push(student.id);

    const session = ctx.api();

    await session
      .post('/api/auth/login')
      .send({ identifier: email, password: PASSWORD })
      .expect(200);

    const unknown = await ctx
      .api()
      .post('/api/auth/password/forgot')
      .send({ email: 'personne@sgee.local', accountType: 'STUDENT' })
      .expect(202);
    const known = await ctx
      .api()
      .post('/api/auth/password/forgot')
      .send({ email, accountType: 'STUDENT' })
      .expect(202);

    expect(known.body).toEqual(unknown.body);

    const token = lastTokenFor(email);

    // Un mot de passe refusé ne consomme pas le lien.
    await ctx
      .api()
      .post('/api/auth/password/reset')
      .send({ token, password: 'motdepasse123' })
      .expect(400);
    await ctx
      .api()
      .post('/api/auth/password/reset')
      .send({ token, password: 'nouveau-mot-de-passe-sur' })
      .expect(200);
    await ctx
      .api()
      .post('/api/auth/password/reset')
      .send({ token, password: 'encore-un-autre-mot-de-passe' })
      .expect(400);

    await session.get('/api/me').expect(401);
    await ctx
      .api()
      .post('/api/auth/login')
      .send({ identifier: email, password: PASSWORD })
      .expect(401);
    await ctx
      .api()
      .post('/api/auth/login')
      .send({ identifier: email, password: 'nouveau-mot-de-passe-sur' })
      .expect(200);
  });

  it('ne mélange pas les sessions boursier et candidat', async () => {
    const student = ctx.api();

    await student
      .post('/api/auth/login')
      .send({ identifier: 'test@sgee.local', password: 'password123' })
      .expect(200);
    await student.get('/api/applicant/me').expect(401);

    const applicant = ctx.api();

    await applicant
      .post('/api/applicant/auth/login')
      .send({ email: 'candidate@sgee.local', password: 'candidat-sgee-2026' })
      .expect(200);
    await applicant.get('/api/me').expect(401);
  });

  it('expose les campagnes de l’année en cours sans authentification', async () => {
    const response = await ctx.raw().get('/api/public/campaigns').expect(200);
    const items = (response.body as { items: Body[] }).items;

    expect(items.map((item) => item.type).sort()).toEqual([
      'NEW_APPLICATION',
      'RENEWAL',
    ]);
    expect(items.every((item) => typeof item.phase === 'string')).toBe(true);
    expect(response.headers['cache-control']).toContain('max-age=300');
  });
});
