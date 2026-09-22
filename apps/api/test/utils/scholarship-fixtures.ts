import bcrypt from 'bcryptjs';
import type {
  CampaignType,
  StudyCycle,
  StudyLevel,
} from '../../src/generated/prisma/client';
import type { TestContext } from './test-app';

export const FIXTURE_PASSWORD = 'mot-de-passe-fixture-2026';
export const PDF = Buffer.from('%PDF-1.4\n%fixture\n');
const DAY = 24 * 60 * 60 * 1000;

let yearCounter = 0;

export type Agent = ReturnType<TestContext['api']>;

/** Données créées par un test, supprimées en fin de test. */
export class FixtureTracker {
  readonly studentIds: string[] = [];
  readonly applicantIds: string[] = [];
  readonly yearIds: string[] = [];

  async cleanup(ctx: TestContext) {
    // Les boursiers créés par attribution sont rattachés aux candidats.
    const promoted = await ctx.prisma.applicant.findMany({
      where: { id: { in: this.applicantIds }, studentId: { not: null } },
      select: { studentId: true },
    });
    const studentIds = [
      ...this.studentIds.splice(0),
      ...promoted.map((applicant) => applicant.studentId!),
    ];

    await ctx.prisma.applicant.deleteMany({
      where: { id: { in: this.applicantIds.splice(0) } },
    });
    await ctx.prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    await ctx.prisma.campaign.deleteMany({
      where: { academicYearId: { in: this.yearIds } },
    });
    await ctx.prisma.academicYear.deleteMany({
      where: { id: { in: this.yearIds.splice(0) } },
    });
  }
}

/** Campagne dans une année fictive dédiée (2200+), ouverte ou fermée autour de l'heure courante. */
export async function createCampaign(
  ctx: TestContext,
  tracker: FixtureTracker,
  type: CampaignType,
  requirements: Array<{
    code: string;
    cycles?: StudyCycle[];
    isRequired?: boolean;
  }>,
  options: { open?: boolean; maxAgeNonDoctoral?: number } = {},
) {
  // Années fictives distinctes de celles de renewal.e2e-spec (2091+).
  const start =
    2200 + (yearCounter += 1) + (type === 'NEW_APPLICATION' ? 500 : 0);
  const open = options.open ?? true;
  const now = Date.now();
  const year = await ctx.prisma.academicYear.create({
    data: {
      code: `${start}-${start + 1}`,
      label: `${start}/${start + 1}`,
      startsOn: new Date(`${start}-09-01`),
      endsOn: new Date(`${start + 1}-08-31`),
    },
  });

  tracker.yearIds.push(year.id);

  return ctx.prisma.campaign.create({
    data: {
      type,
      academicYearId: year.id,
      title: `Campagne e2e ${type} ${start}`,
      opensAt: new Date(now - (open ? DAY : 10 * DAY)),
      closesAt: new Date(now + (open ? 30 * DAY : -DAY)),
      maxAgeNonDoctoral: options.maxAgeNonDoctoral ?? null,
      requirements: {
        create: requirements.map((requirement, index) => ({
          documentTypeCode: requirement.code,
          cycles: requirement.cycles ?? [],
          isRequired: requirement.isRequired ?? true,
          sortOrder: index,
        })),
      },
    },
    include: { academicYear: true },
  });
}

export async function createStudent(
  ctx: TestContext,
  tracker: FixtureTracker,
  suffix: string,
  level: StudyLevel = 'L3',
) {
  const unique = `${suffix}-${Date.now()}`.toLowerCase();
  const student = await ctx.prisma.student.create({
    data: {
      studentNumber: `FIX_${unique}`,
      firstName: 'Fixture',
      lastName: suffix,
      email: `fix-${unique}@sgee.local`,
      birthDate: new Date('2001-01-01'),
      levelCode: level,
      level,
      field: 'Informatique',
      academy: 'Nancy',
      country: 'France',
      passwordHash: await bcrypt.hash(FIXTURE_PASSWORD, 4),
      cursus: {
        create: {
          academicYear: '2025/2026',
          institution: 'Université de Lorraine',
          level,
          levelCode: level,
          specialty: 'Informatique',
          diploma: level,
          status: 'CURRENT',
          isCurrent: true,
        },
      },
    },
  });

  tracker.studentIds.push(student.id);

  return student;
}

export async function createApplicant(
  ctx: TestContext,
  tracker: FixtureTracker,
  suffix: string,
  birthDate = '2006-03-01',
) {
  const unique = `${suffix}-${Date.now()}`.toLowerCase();
  const applicant = await ctx.prisma.applicant.create({
    data: {
      email: `cand-${unique}@sgee.local`,
      passwordHash: await bcrypt.hash(FIXTURE_PASSWORD, 4),
      firstName: 'Candidat',
      lastName: suffix,
      birthDate: new Date(birthDate),
      emailVerifiedAt: new Date(),
    },
  });

  tracker.applicantIds.push(applicant.id);

  return applicant;
}

export async function loginStudent(ctx: TestContext, email: string) {
  const agent = ctx.api();

  await agent
    .post('/api/auth/login')
    .send({ identifier: email, password: FIXTURE_PASSWORD })
    .expect(200);

  return agent;
}

export async function loginApplicant(ctx: TestContext, email: string) {
  const agent = ctx.api();

  await agent
    .post('/api/applicant/auth/login')
    .send({ email, password: FIXTURE_PASSWORD })
    .expect(200);

  return agent;
}

export async function loginAdmin(ctx: TestContext, email: string) {
  const agent = ctx.api();

  await agent
    .post('/api/admin/auth/login')
    .send({ email, password: 'admin12345' })
    .expect(200);

  return agent;
}

export function uploadPiece(
  agent: Agent,
  prefix: 'student' | 'applicant',
  requestId: string,
  code: string,
) {
  return agent
    .post(`/api/${prefix}/requests/${requestId}/documents`)
    .field('documentTypeCode', code)
    .attach('file', PDF, {
      filename: `${code}.pdf`,
      contentType: 'application/pdf',
    });
}
