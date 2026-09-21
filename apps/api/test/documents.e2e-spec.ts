import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { createTestApp, isRecord, type TestContext } from './utils/test-app';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'student-documents');
const PDF = Buffer.from('%PDF-1.4\n%sgee e2e\n');

const countStoredFiles = () =>
  existsSync(UPLOAD_DIR) ? readdirSync(UPLOAD_DIR).length : 0;

describe('Pièces justificatives (e2e)', () => {
  let ctx: TestContext;
  let studentId: string;
  const createdDocumentIds: string[] = [];

  async function loginAsStudent() {
    const agent = ctx.api();

    await agent
      .post('/api/auth/login')
      .send({ identifier: 'test@sgee.local', password: 'password123' })
      .expect(200);

    return agent;
  }

  async function createDocument(
    status: 'REQUIRED' | 'PENDING' | 'VALIDATED' | 'REJECTED',
    withFile = false,
  ) {
    const fileName = `e2e-${status.toLowerCase()}-${Date.now()}.pdf`;

    if (withFile) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
      writeFileSync(join(UPLOAD_DIR, fileName), PDF);
    }

    const document = await ctx.prisma.studentDocument.create({
      data: {
        studentId,
        name: `Pièce ${status}`,
        type: 'RELEVE_NOTES',
        status,
        required: true,
        ...(withFile && {
          fileName,
          originalName: 'relevé.pdf',
          mimeType: 'application/pdf',
          size: PDF.length,
          storagePath: `uploads/student-documents/${fileName}`,
          submittedAt: new Date(),
        }),
      },
    });

    createdDocumentIds.push(document.id);

    return { document, filePath: join(UPLOAD_DIR, fileName) };
  }

  beforeEach(async () => {
    ctx = await createTestApp();
    studentId = (
      await ctx.prisma.student.findUniqueOrThrow({
        where: { studentNumber: 'STU001' },
      })
    ).id;
  });

  afterEach(async () => {
    const documents = await ctx.prisma.studentDocument.findMany({
      where: { id: { in: createdDocumentIds } },
    });

    await ctx.prisma.studentDocument.deleteMany({
      where: { id: { in: createdDocumentIds.splice(0) } },
    });

    for (const document of documents) {
      const filePath = document.fileName
        ? join(UPLOAD_DIR, document.fileName)
        : null;

      if (filePath && existsSync(filePath)) {
        rmSync(filePath);
      }
    }

    await ctx.app.close();
  });

  it('expose le catalogue des types de pièces', async () => {
    const agent = await loginAsStudent();
    const response = await agent.get('/api/student/document-types').expect(200);
    const body: unknown = response.body;

    expect(isRecord(body) && Array.isArray(body.items)).toBe(true);
    expect(JSON.stringify(body)).toContain('CERTIFICAT_INSCRIPTION');
  });

  it('refuse un fichier dont le contenu ne correspond pas au type déclaré, sans rien écrire', async () => {
    const agent = await loginAsStudent();
    const before = countStoredFiles();

    await agent
      .post('/api/student/documents')
      .field('type', 'AUTRE')
      .attach('file', Buffer.from('<html><script>alert(1)</script>'), {
        filename: 'faux.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    await agent
      .post('/api/student/documents')
      .field('type', 'AUTRE')
      .attach(
        'file',
        Buffer.from('%PDF-1.4\n<< /OpenAction << /JavaScript (x) >> >>'),
        {
          filename: 'actif.pdf',
          contentType: 'application/pdf',
        },
      )
      .expect(400);

    expect(countStoredFiles()).toBe(before);
  });

  it('refuse un type de pièce inconnu', async () => {
    const agent = await loginAsStudent();

    await agent
      .post('/api/student/documents')
      .field('type', 'TYPE_INEXISTANT')
      .attach('file', PDF, {
        filename: 'a.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });

  it('interdit de remplacer un document validé ou en attente', async () => {
    const agent = await loginAsStudent();
    const { document: validated } = await createDocument('VALIDATED', true);
    const { document: pending } = await createDocument('PENDING', true);

    for (const target of [validated, pending]) {
      await agent
        .post('/api/student/documents')
        .field('documentId', target.id)
        .field('type', target.type)
        .attach('file', PDF, {
          filename: 'remplacement.pdf',
          contentType: 'application/pdf',
        })
        .expect(409);
    }

    const unchanged = await ctx.prisma.studentDocument.findUniqueOrThrow({
      where: { id: validated.id },
    });

    expect(unchanged.status).toBe('VALIDATED');
    expect(unchanged.fileName).toBe(validated.fileName);
  });

  it('permet de redéposer un document refusé et supprime l’ancien fichier', async () => {
    const agent = await loginAsStudent();
    const { document: rejected, filePath: oldFile } = await createDocument(
      'REJECTED',
      true,
    );

    const response = await agent
      .post('/api/student/documents')
      .field('documentId', rejected.id)
      .field('type', rejected.type)
      .attach('file', PDF, {
        filename: 'nouveau relevé.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const body: unknown = response.body;

    expect(isRecord(body) && body.status).toBe('PENDING');
    expect(existsSync(oldFile)).toBe(false);

    const updated = await ctx.prisma.studentDocument.findUniqueOrThrow({
      where: { id: rejected.id },
    });

    expect(updated.fileName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(updated.originalName).toBe('nouveau relevé.pdf');
    expect(updated.reviewComment).toBeNull();
  });

  it('sert les téléchargements avec des en-têtes durcis', async () => {
    const agent = await loginAsStudent();
    const { document } = await createDocument('PENDING', true);

    const response = await agent
      .get(`/api/student/documents/${document.id}/download`)
      .expect(200);

    expect(response.headers['content-security-policy']).toBe(
      "default-src 'none'; sandbox",
    );
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['content-disposition']).toContain('attachment;');
  });
});
