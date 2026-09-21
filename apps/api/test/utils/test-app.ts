import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';

export const CSRF = { name: 'X-SGEE-CSRF', value: '1' } as const;

export type TestContext = {
  app: NestExpressApplication;
  prisma: PrismaService;
  /** Agent qui conserve les cookies et envoie l'en-tête anti-CSRF, comme le front. */
  api: () => ReturnType<typeof request.agent>;
  /** Agent sans en-tête anti-CSRF, pour tester la protection. */
  raw: () => ReturnType<typeof request.agent>;
};

export async function createTestApp(): Promise<TestContext> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<NestExpressApplication>();

  configureApp(app);
  await app.init();

  return {
    app,
    prisma: moduleFixture.get(PrismaService),
    api: () => request.agent(app.getHttpServer()).set(CSRF.name, CSRF.value),
    raw: () => request.agent(app.getHttpServer()),
  };
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function ensureAdmin(
  prisma: PrismaService,
  email = 'admin-e2e@sgee.local',
  role: 'ADMIN' | 'SUPER_ADMIN' = 'ADMIN',
) {
  const passwordHash = await bcrypt.hash('admin12345', 4);

  return prisma.adminUser.upsert({
    where: { email },
    update: { name: 'Admin E2E', passwordHash, role },
    create: { email, name: 'Admin E2E', passwordHash, role },
  });
}
