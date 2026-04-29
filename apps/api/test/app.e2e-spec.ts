import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('validates and rejects invalid login requests', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({})
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: 'test@sgee.local',
        password: 'bad-password',
      })
      .expect(401)
      .expect((response) => {
        const body: unknown = response.body;

        expect(isRecord(body)).toBe(true);

        if (!isRecord(body)) {
          return;
        }

        expect(body.message).toBe('Identifiants invalides');
      });
  });

  it('protects student endpoints with a login session', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent.get('/api/me').expect(401);
    await agent.get('/api/student/profile').expect(401);

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

    await agent
      .post('/api/auth/logout')
      .expect(200)
      .expect({ success: true })
      .expect((response) => {
        expect(response.headers['set-cookie']).toBeDefined();
      });

    await agent.get('/api/me').expect(401);
  });

  it('updates the current student RIB only with a valid session', async () => {
    const agent = request.agent(app.getHttpServer());

    await request(app.getHttpServer())
      .patch('/api/student/rib')
      .send({
        banque: 'Banque Test',
        iban: 'SN123456789012345678901234',
      })
      .expect(401);

    await agent
      .post('/api/auth/login')
      .send({
        identifier: 'test@sgee.local',
        password: 'password123',
      })
      .expect(200);

    await agent
      .patch('/api/student/rib')
      .send({
        banque: '',
        iban: 'bad iban !',
      })
      .expect(400);

    const phone = `+221 77 000 ${Date.now().toString().slice(-4)}`;

    await agent
      .patch('/api/student/rib')
      .send({
        banque: 'Banque SGEE Test',
        iban: 'SN12 3456 7890 1234 5678 9012 34',
        adresse: 'Dakar',
        telephone: phone,
        email: 'rib-test@sgee.local',
      })
      .expect(200)
      .expect((response) => {
        const body: unknown = response.body;

        expect(isRecord(body)).toBe(true);

        if (!isRecord(body)) {
          return;
        }

        expect(body.banque).toBe('Banque SGEE Test');
        expect(body.iban).toBe('SN123456789012345678901234');
        expect(body.telephone).toBe(phone);
      });

    await agent
      .get('/api/student/rib')
      .expect(200)
      .expect((response) => {
        const body: unknown = response.body;

        expect(isRecord(body)).toBe(true);

        if (!isRecord(body)) {
          return;
        }

        expect(body.banque).toBe('Banque SGEE Test');
        expect(body.telephone).toBe(phone);
      });
  });

  it('uploads documents only with a valid session and accepted file type', async () => {
    const agent = request.agent(app.getHttpServer());
    const testType = `TEST_DOCUMENT_${Date.now()}`;
    let uploadedFileName: string | null = null;

    await request(app.getHttpServer())
      .get('/api/student/documents')
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/student/documents')
      .field('type', testType)
      .attach('file', Buffer.from('%PDF-1.4\n%test\n'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .expect(401);

    await agent
      .post('/api/auth/login')
      .send({
        identifier: 'test@sgee.local',
        password: 'password123',
      })
      .expect(200);

    await agent
      .post('/api/student/documents')
      .field('type', testType)
      .expect(400);

    await agent
      .post('/api/student/documents')
      .field('type', testType)
      .attach('file', Buffer.from('plain text'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    await agent
      .post('/api/student/documents')
      .field('type', testType)
      .field('label', 'Document test')
      .attach('file', Buffer.from('%PDF-1.4\n%test\n'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .expect(201)
      .expect((response) => {
        const body: unknown = response.body;

        expect(isRecord(body)).toBe(true);

        if (!isRecord(body)) {
          return;
        }

        expect(body.type).toBe(testType);
        expect(body.nom).toBe('Document test');
        expect(body.statut).toBe('PROVIDED');

        if (typeof body.fileName === 'string') {
          uploadedFileName = body.fileName;
        }
      });

    await agent
      .get('/api/student/documents')
      .expect(200)
      .expect((response) => {
        const body: unknown = response.body;

        expect(isRecord(body)).toBe(true);

        if (!isRecord(body)) {
          return;
        }

        const items = body.items;

        expect(Array.isArray(items)).toBe(true);
        expect(
          Array.isArray(items) &&
            items.some(
              (item) =>
                isRecord(item) &&
                item.type === testType &&
                item.nom === 'Document test',
            ),
        ).toBe(true);
      });

    await prisma.studentDocument.deleteMany({
      where: {
        type: testType,
      },
    });

    if (uploadedFileName) {
      const uploadedPath = join(
        process.cwd(),
        'uploads',
        'student-documents',
        uploadedFileName,
      );

      if (existsSync(uploadedPath)) {
        rmSync(uploadedPath);
      }
    }
  });

  afterEach(async () => {
    await app?.close();
  });
});
