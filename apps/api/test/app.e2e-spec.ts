import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
        expect(body.fileName).toBeUndefined();
        expect(body.isDownloadable).toBe(true);
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

    const uploadedDocument = await prisma.studentDocument.findFirst({
      where: {
        type: testType,
      },
      select: {
        fileName: true,
      },
    });

    await prisma.studentDocument.deleteMany({
      where: {
        type: testType,
      },
    });

    if (uploadedDocument?.fileName) {
      const uploadedPath = join(
        process.cwd(),
        'uploads',
        'student-documents',
        uploadedDocument.fileName,
      );

      if (existsSync(uploadedPath)) {
        rmSync(uploadedPath);
      }
    }
  });

  it('downloads only the current student document files securely', async () => {
    const agent = request.agent(app.getHttpServer());
    const uploadDirectory = join(process.cwd(), 'uploads', 'student-documents');
    const testSuffix = Date.now();
    const fileName = `download-${testSuffix}.pdf`;
    const filePath = join(uploadDirectory, fileName);
    const missingFileName = `missing-${testSuffix}.pdf`;
    const createdDocumentIds: string[] = [];
    let otherStudentId: string | null = null;

    mkdirSync(uploadDirectory, {
      recursive: true,
    });
    writeFileSync(filePath, Buffer.from('%PDF-1.4\n%download\n'));

    const student = await prisma.student.findUniqueOrThrow({
      where: {
        studentNumber: 'STU001',
      },
      select: {
        id: true,
      },
    });

    const downloadableDocument = await prisma.studentDocument.create({
      data: {
        studentId: student.id,
        name: 'Document telechargeable',
        type: `DOWNLOAD_TEST_${testSuffix}`,
        status: 'PROVIDED',
        required: false,
        submittedAt: new Date(),
        uploadedAt: new Date(),
        fileName,
        originalName: 'releve accentué test.pdf',
        mimeType: 'application/pdf',
        size: 20,
        storagePath: `uploads/student-documents/${fileName}`,
      },
    });
    createdDocumentIds.push(downloadableDocument.id);

    const missingPhysicalFileDocument = await prisma.studentDocument.create({
      data: {
        studentId: student.id,
        name: 'Document absent disque',
        type: `DOWNLOAD_MISSING_FILE_${testSuffix}`,
        status: 'PROVIDED',
        required: false,
        submittedAt: new Date(),
        uploadedAt: new Date(),
        fileName: missingFileName,
        originalName: 'missing.pdf',
        mimeType: 'application/pdf',
        size: 20,
        storagePath: `uploads/student-documents/${missingFileName}`,
      },
    });
    createdDocumentIds.push(missingPhysicalFileDocument.id);

    const otherStudent = await prisma.student.create({
      data: {
        studentNumber: `OTHER_${testSuffix}`,
        firstName: 'Other',
        lastName: 'Student',
        email: `other-${testSuffix}@sgee.local`,
        birthDate: new Date('2001-01-01'),
        scholarshipStatus: 'Repris',
      },
      select: {
        id: true,
      },
    });
    otherStudentId = otherStudent.id;

    const otherStudentDocument = await prisma.studentDocument.create({
      data: {
        studentId: otherStudent.id,
        name: 'Document autre etudiant',
        type: `DOWNLOAD_OTHER_${testSuffix}`,
        status: 'PROVIDED',
        required: false,
        submittedAt: new Date(),
        uploadedAt: new Date(),
        fileName,
        originalName: 'other.pdf',
        mimeType: 'application/pdf',
        size: 20,
        storagePath: `uploads/student-documents/${fileName}`,
      },
    });
    createdDocumentIds.push(otherStudentDocument.id);

    try {
      await request(app.getHttpServer())
        .get(`/api/student/documents/${downloadableDocument.id}/download`)
        .expect(401);

      await agent
        .post('/api/auth/login')
        .send({
          identifier: 'test@sgee.local',
          password: 'password123',
        })
        .expect(200);

      await agent
        .get(`/api/student/documents/${downloadableDocument.id}/download`)
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect((response) => {
          const disposition = response.headers['content-disposition'];

          expect(disposition).toContain('attachment;');
          expect(disposition).toContain('filename="releve accentue test.pdf"');
          expect(disposition).toContain(
            "filename*=UTF-8''releve%20accentu%C3%A9%20test.pdf",
          );
        });

      await agent
        .get(`/api/student/documents/${randomUUID()}/download`)
        .expect(404);

      await agent
        .get(`/api/student/documents/${otherStudentDocument.id}/download`)
        .expect(404);

      await agent
        .get(
          `/api/student/documents/${missingPhysicalFileDocument.id}/download`,
        )
        .expect(404);
    } finally {
      await prisma.studentDocument.deleteMany({
        where: {
          id: {
            in: createdDocumentIds,
          },
        },
      });

      if (otherStudentId) {
        await prisma.student.delete({
          where: {
            id: otherStudentId,
          },
        });
      }

      if (existsSync(filePath)) {
        rmSync(filePath);
      }
    }
  });

  afterEach(async () => {
    await app?.close();
  });
});
