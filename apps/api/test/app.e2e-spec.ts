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
        expect(body.status).toBe('PENDING');
        expect(body.statusLabel).toBe('En attente de validation');
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
        expect(body.status).toBe('PENDING');
      });
  });

  it('uploads documents only with a valid session and accepted file type', async () => {
    const agent = request.agent(app.getHttpServer());
    const testType = `TEST_DOCUMENT_${Date.now()}`;
    const requiredTestType = `TEST_REQUIRED_DOCUMENT_${Date.now()}`;
    const untouchedRequiredTestType = `TEST_UNTOUCHED_REQUIRED_${Date.now()}`;
    let requiredDocumentId: string | null = null;

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

    try {
      const student = await prisma.student.findUniqueOrThrow({
        where: {
          studentNumber: 'STU001',
        },
        select: {
          id: true,
        },
      });
      const requiredDocument = await prisma.studentDocument.create({
        data: {
          studentId: student.id,
          name: 'Document requis test',
          type: requiredTestType,
          status: 'REQUIRED',
          required: true,
        },
      });
      requiredDocumentId = requiredDocument.id;
      const untouchedRequiredDocument = await prisma.studentDocument.create({
        data: {
          studentId: student.id,
          name: 'Document requis non depose test',
          type: untouchedRequiredTestType,
          status: 'REQUIRED',
          required: true,
        },
      });

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
          expect(body.status).toBe('PENDING');
          expect(body.statut).toBe('PENDING');
          expect(body.status).not.toBe('REQUIRED');
          expect(body.statusLabel).toBe('En attente de validation');
          expect(body.fileName).toBeUndefined();
          expect(body.isDownloadable).toBe(true);
        });

      await agent
        .post('/api/student/documents')
        .field('documentId', requiredDocument.id)
        .field('type', requiredTestType)
        .field('label', 'Document requis test')
        .attach('file', Buffer.from('%PDF-1.4\n%required\n'), {
          filename: 'required.pdf',
          contentType: 'application/pdf',
        })
        .expect(201)
        .expect((response) => {
          const body: unknown = response.body;

          expect(isRecord(body)).toBe(true);

          if (!isRecord(body)) {
            return;
          }

          expect(body.id).toBe(requiredDocument.id);
          expect(body.status).toBe('PENDING');
          expect(body.status).not.toBe('REQUIRED');
          expect(body.obligatoire).toBe(true);
          expect(body.isDownloadable).toBe(true);
        });

      const requiredDocumentAfterUpload =
        await prisma.studentDocument.findUniqueOrThrow({
          where: {
            id: requiredDocument.id,
          },
          select: {
            required: true,
          },
        });

      expect(requiredDocumentAfterUpload.required).toBe(true);

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
                  item.nom === 'Document test' &&
                  item.status === 'PENDING',
              ),
          ).toBe(true);
          expect(
            Array.isArray(items) &&
              items.some(
                (item) =>
                  isRecord(item) &&
                  item.id === requiredDocumentId &&
                  item.status === 'PENDING',
              ),
          ).toBe(true);
          expect(
            Array.isArray(items) &&
              items.some(
                (item) =>
                  isRecord(item) &&
                  item.id === untouchedRequiredDocument.id &&
                  item.status === 'REQUIRED' &&
                  item.isDownloadable === false,
              ),
          ).toBe(true);
        });

      const uploadedDocument = await prisma.studentDocument.findFirst({
        where: {
          type: testType,
        },
        select: {
          required: true,
        },
      });
      expect(uploadedDocument?.required).toBe(false);
    } finally {
      const testDocuments = await prisma.studentDocument.findMany({
        where: {
          type: {
            in: [testType, requiredTestType, untouchedRequiredTestType],
          },
        },
        select: {
          fileName: true,
        },
      });

      await prisma.studentDocument.deleteMany({
        where: {
          type: {
            in: [testType, requiredTestType, untouchedRequiredTestType],
          },
        },
      });

      testDocuments.forEach((document) => {
        if (!document.fileName) {
          return;
        }

        const uploadedPath = join(
          process.cwd(),
          'uploads',
          'student-documents',
          document.fileName,
        );

        if (existsSync(uploadedPath)) {
          rmSync(uploadedPath);
        }
      });
    }
  });

  it('cancels only pending document submissions safely', async () => {
    const agent = request.agent(app.getHttpServer());
    const uploadDirectory = join(process.cwd(), 'uploads', 'student-documents');
    const testSuffix = Date.now();
    const fileNames = {
      required: `cancel-required-${testSuffix}.pdf`,
      free: `cancel-free-${testSuffix}.pdf`,
      other: `cancel-other-${testSuffix}.pdf`,
    };
    const createdDocumentIds: string[] = [];
    let otherStudentId: string | null = null;

    mkdirSync(uploadDirectory, {
      recursive: true,
    });

    writeFileSync(
      join(uploadDirectory, fileNames.required),
      Buffer.from('%PDF-1.4\n%required cancel\n'),
    );
    writeFileSync(
      join(uploadDirectory, fileNames.free),
      Buffer.from('%PDF-1.4\n%free cancel\n'),
    );
    writeFileSync(
      join(uploadDirectory, fileNames.other),
      Buffer.from('%PDF-1.4\n%other cancel\n'),
    );

    const student = await prisma.student.findUniqueOrThrow({
      where: {
        studentNumber: 'STU001',
      },
      select: {
        id: true,
      },
    });

    const requiredStatusDocument = await prisma.studentDocument.create({
      data: {
        studentId: student.id,
        name: 'Cancel required status',
        type: `CANCEL_REQUIRED_STATUS_${testSuffix}`,
        status: 'REQUIRED',
        required: true,
      },
    });
    createdDocumentIds.push(requiredStatusDocument.id);

    const validatedDocument = await prisma.studentDocument.create({
      data: {
        studentId: student.id,
        name: 'Cancel validated',
        type: `CANCEL_VALIDATED_${testSuffix}`,
        status: 'VALIDATED',
        required: true,
      },
    });
    createdDocumentIds.push(validatedDocument.id);

    const rejectedDocument = await prisma.studentDocument.create({
      data: {
        studentId: student.id,
        name: 'Cancel rejected',
        type: `CANCEL_REJECTED_${testSuffix}`,
        status: 'REJECTED',
        required: true,
      },
    });
    createdDocumentIds.push(rejectedDocument.id);

    const pendingRequiredDocument = await prisma.studentDocument.create({
      data: {
        studentId: student.id,
        name: 'Cancel pending required',
        type: `CANCEL_PENDING_REQUIRED_${testSuffix}`,
        status: 'PENDING',
        required: true,
        submittedAt: new Date(),
        uploadedAt: new Date(),
        fileName: fileNames.required,
        originalName: 'cancel-required.pdf',
        mimeType: 'application/pdf',
        size: 20,
        storagePath: `uploads/student-documents/${fileNames.required}`,
      },
    });
    createdDocumentIds.push(pendingRequiredDocument.id);

    const pendingRequiredMissingFileDocument =
      await prisma.studentDocument.create({
        data: {
          studentId: student.id,
          name: 'Cancel pending required missing file',
          type: `CANCEL_PENDING_REQUIRED_MISSING_${testSuffix}`,
          status: 'PENDING',
          required: true,
          submittedAt: new Date(),
          uploadedAt: new Date(),
          fileName: `cancel-missing-${testSuffix}.pdf`,
          originalName: 'cancel-missing.pdf',
          mimeType: 'application/pdf',
          size: 20,
          storagePath: `uploads/student-documents/cancel-missing-${testSuffix}.pdf`,
        },
      });
    createdDocumentIds.push(pendingRequiredMissingFileDocument.id);

    const pendingFreeDocument = await prisma.studentDocument.create({
      data: {
        studentId: student.id,
        name: 'Cancel pending free',
        type: `CANCEL_PENDING_FREE_${testSuffix}`,
        status: 'PENDING',
        required: false,
        submittedAt: new Date(),
        uploadedAt: new Date(),
        fileName: fileNames.free,
        originalName: 'cancel-free.pdf',
        mimeType: 'application/pdf',
        size: 20,
        storagePath: `uploads/student-documents/${fileNames.free}`,
      },
    });
    createdDocumentIds.push(pendingFreeDocument.id);

    const otherStudent = await prisma.student.create({
      data: {
        studentNumber: `CANCEL_OTHER_${testSuffix}`,
        firstName: 'Other',
        lastName: 'Cancel',
        email: `cancel-other-${testSuffix}@sgee.local`,
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
        name: 'Cancel other student',
        type: `CANCEL_OTHER_STUDENT_${testSuffix}`,
        status: 'PENDING',
        required: false,
        submittedAt: new Date(),
        uploadedAt: new Date(),
        fileName: fileNames.other,
        originalName: 'cancel-other.pdf',
        mimeType: 'application/pdf',
        size: 20,
        storagePath: `uploads/student-documents/${fileNames.other}`,
      },
    });
    createdDocumentIds.push(otherStudentDocument.id);

    try {
      await request(app.getHttpServer())
        .delete(
          `/api/student/documents/${pendingRequiredDocument.id}/submission`,
        )
        .expect(401);

      await agent
        .post('/api/auth/login')
        .send({
          identifier: 'test@sgee.local',
          password: 'password123',
        })
        .expect(200);

      await agent
        .delete(`/api/student/documents/${randomUUID()}/submission`)
        .expect(404);

      await agent
        .delete(`/api/student/documents/${otherStudentDocument.id}/submission`)
        .expect(404);

      await agent
        .delete(
          `/api/student/documents/${requiredStatusDocument.id}/submission`,
        )
        .expect(409);

      await agent
        .delete(`/api/student/documents/${validatedDocument.id}/submission`)
        .expect(409);

      await agent
        .delete(`/api/student/documents/${rejectedDocument.id}/submission`)
        .expect(409);

      await agent
        .delete(
          `/api/student/documents/${pendingRequiredDocument.id}/submission`,
        )
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
                  item.id === pendingRequiredDocument.id &&
                  item.status === 'REQUIRED' &&
                  item.isDownloadable === false,
              ),
          ).toBe(true);
        });

      await agent
        .get(`/api/student/documents/${pendingRequiredDocument.id}/download`)
        .expect(404);

      await agent
        .delete(
          `/api/student/documents/${pendingRequiredMissingFileDocument.id}/submission`,
        )
        .expect(200);

      await agent
        .delete(`/api/student/documents/${pendingFreeDocument.id}/submission`)
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
                (item) => isRecord(item) && item.id === pendingFreeDocument.id,
              ),
          ).toBe(false);
        });

      await agent
        .get(`/api/student/documents/${pendingFreeDocument.id}/download`)
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

      Object.values(fileNames).forEach((fileName) => {
        const filePath = join(uploadDirectory, fileName);

        if (existsSync(filePath)) {
          rmSync(filePath);
        }
      });
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
        status: 'PENDING',
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
        status: 'PENDING',
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
        status: 'PENDING',
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
