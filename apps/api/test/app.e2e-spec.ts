import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('protects student endpoints with a login session', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent.get('/api/me').expect(401);

    await agent
      .post('/api/auth/login')
      .send({
        identifier: 'test@sgee.local',
        password: 'password123',
      })
      .expect(200)
      .expect((response) => {
        const body: unknown = response.body;

        expect(isRecord(body)).toBe(true);

        if (!isRecord(body)) {
          return;
        }

        const student = body.student;

        expect(body.success).toBe(true);
        expect(isRecord(student)).toBe(true);

        if (!isRecord(student)) {
          return;
        }

        expect(student.studentNumber).toBe('STU001');
        expect(response.headers['set-cookie']).toBeDefined();
      });

    await agent
      .get('/api/me')
      .expect(200)
      .expect((response) => {
        const body: unknown = response.body;

        expect(isRecord(body)).toBe(true);

        if (!isRecord(body)) {
          return;
        }

        expect(body.studentNumber).toBe('STU001');
        expect(body.passwordHash).toBeUndefined();
      });

    await agent
      .get('/api/student/profile')
      .expect(200)
      .expect((response) => {
        const body: unknown = response.body;

        expect(isRecord(body)).toBe(true);

        if (!isRecord(body)) {
          return;
        }

        expect(body.studentNumber).toBe('STU001');
      });

    await agent.post('/api/auth/logout').expect(200).expect({ success: true });

    await agent.get('/api/me').expect(401);
  });

  afterEach(async () => {
    await app?.close();
  });
});
