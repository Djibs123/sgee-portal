import {
  createTestApp,
  ensureAdmin,
  isRecord,
  type TestContext,
} from './utils/test-app';

describe('Sécurité HTTP (e2e)', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  it("n'expose plus les routes publiques /api/students", async () => {
    await ctx.api().get('/api/students').expect(404);
    await ctx
      .api()
      .post('/api/students')
      .send({ studentNumber: 'X' })
      .expect(404);
  });

  it('pose les en-têtes de sécurité et masque Express', async () => {
    const response = await ctx.api().get('/api/health').expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  it('refuse les requêtes modifiantes sans en-tête anti-CSRF', async () => {
    await ctx
      .raw()
      .post('/api/auth/login')
      .send({ identifier: 'test@sgee.local', password: 'password123' })
      .expect(403);
  });

  it('refuse les requêtes inter-sites et les origines inconnues', async () => {
    await ctx
      .api()
      .post('/api/auth/login')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ identifier: 'test@sgee.local', password: 'password123' })
      .expect(403);

    await ctx
      .api()
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ identifier: 'test@sgee.local', password: 'password123' })
      .expect(403);
  });

  it('pose des cookies de session HttpOnly et SameSite=Strict', async () => {
    const response = await ctx
      .api()
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ identifier: 'test@sgee.local', password: 'password123' })
      .expect(200);
    const cookies = ([] as string[]).concat(
      response.headers['set-cookie'] ?? [],
    );

    expect(cookies.some((cookie) => /HttpOnly/i.test(cookie))).toBe(true);
    expect(cookies.some((cookie) => /SameSite=Strict/i.test(cookie))).toBe(
      true,
    );
  });

  it('rejette les identifiants de route qui ne sont pas des UUID', async () => {
    const agent = ctx.api();

    await agent
      .post('/api/auth/login')
      .send({ identifier: 'test@sgee.local', password: 'password123' })
      .expect(200);
    await agent.get('/api/student/documents/not-a-uuid/download').expect(400);
  });

  it('liste les étudiants côté admin sans aucun secret', async () => {
    await ensureAdmin(ctx.prisma);
    await ctx.api().get('/api/admin/students').expect(401);

    const agent = ctx.api();

    await agent
      .post('/api/admin/auth/login')
      .send({ email: 'admin-e2e@sgee.local', password: 'admin12345' })
      .expect(200);

    const response = await agent
      .get('/api/admin/students')
      .query({ search: 'STU001', pageSize: 5 })
      .expect(200);
    const body: unknown = response.body;

    expect(isRecord(body)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    if (isRecord(body)) {
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(5);
      expect(Array.isArray(body.items) && body.items.length).toBeGreaterThan(0);
    }

    await agent.get('/api/admin/students').query({ pageSize: 500 }).expect(400);
  });
});
