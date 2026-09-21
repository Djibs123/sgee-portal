/**
 * Jeu de données de DÉVELOPPEMENT (mots de passe connus) : refusé en production.
 * Idempotent : peut être relancé à volonté.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { protectIban } from '../src/common/crypto/iban';
import {
  PrismaClient,
  type AcademicResult,
  type CampaignType,
  type Prisma,
  type ScholarshipStatus,
  type StudyCycle,
  type StudyLevel,
} from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed de développement refusé en production');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const STUDENT_PASSWORD = 'password123';
const ADMIN_PASSWORD = 'admin12345';
const APPLICANT_PASSWORD = 'candidat-sgee-2026';

type CursusSeed = {
  academicYear: string;
  levelCode: StudyLevel;
  level: string;
  result: AcademicResult | null;
  isCurrent?: boolean;
};

type StudentSeed = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  scholarshipStatus: ScholarshipStatus;
  levelCode: StudyLevel;
  level: string;
  field: string;
  academy: string;
  institution: string;
  startDate: string;
  endDate: string;
  cursus: CursusSeed[];
  iban?: string;
  extra?: Partial<Prisma.StudentCreateInput>;
};

async function seedAcademicYears() {
  const years = [
    {
      code: '2025-2026',
      label: '2025/2026',
      startsOn: '2025-09-01',
      endsOn: '2026-08-31',
      isCurrent: false,
    },
    {
      code: '2026-2027',
      label: '2026/2027',
      startsOn: '2026-09-01',
      endsOn: '2027-08-31',
      isCurrent: true,
    },
  ];
  const result: Record<string, string> = {};

  for (const year of years) {
    const data = {
      label: year.label,
      startsOn: new Date(year.startsOn),
      endsOn: new Date(year.endsOn),
      isCurrent: year.isCurrent,
    };
    const saved = await prisma.academicYear.upsert({
      where: { code: year.code },
      update: data,
      create: { code: year.code, ...data },
    });

    result[year.code] = saved.id;
  }

  return result;
}

async function seedCampaign(
  type: CampaignType,
  academicYearId: string,
  data: {
    title: string;
    instructions: string;
    opensAt: string;
    closesAt: string;
    maxAgeNonDoctoral?: number;
  },
  requirements: Array<{
    code: string;
    cycles?: StudyCycle[];
    isRequired?: boolean;
  }>,
) {
  const campaignData = {
    title: data.title,
    instructions: data.instructions,
    opensAt: new Date(data.opensAt),
    closesAt: new Date(data.closesAt),
    closedAt: null,
    maxAgeNonDoctoral: data.maxAgeNonDoctoral ?? null,
  };
  const campaign = await prisma.campaign.upsert({
    where: { type_academicYearId: { type, academicYearId } },
    update: campaignData,
    create: { type, academicYearId, ...campaignData },
  });

  await prisma.campaignRequirement.deleteMany({
    where: { campaignId: campaign.id },
  });
  await prisma.campaignRequirement.createMany({
    data: requirements.map((requirement, index) => ({
      campaignId: campaign.id,
      documentTypeCode: requirement.code,
      cycles: requirement.cycles ?? [],
      isRequired: requirement.isRequired ?? true,
      sortOrder: index,
    })),
  });
}

async function seedAdmins() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  for (const admin of [
    {
      email: 'admin@sgee.local',
      name: 'Instructeur SGEE',
      role: 'ADMIN' as const,
    },
    {
      email: 'superadmin@sgee.local',
      name: 'Super-admin SGEE',
      role: 'SUPER_ADMIN' as const,
    },
  ]) {
    await prisma.adminUser.upsert({
      where: { email: admin.email },
      update: {
        name: admin.name,
        role: admin.role,
        passwordHash,
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
      create: { ...admin, passwordHash },
    });
  }
}

async function seedStudent(seed: StudentSeed, passwordHash: string) {
  const data = {
    firstName: seed.firstName,
    lastName: seed.lastName,
    email: seed.email,
    birthDate: new Date(seed.birthDate),
    scholarshipStatus: seed.scholarshipStatus,
    passwordHash,
    lockedUntil: null,
    failedLoginAttempts: 0,
    levelCode: seed.levelCode,
    level: seed.level,
    field: seed.field,
    academy: seed.academy,
    country: 'France',
    academicYear: '2025/2026',
    scholarshipType: 'Bourse 1er et 2nd Cycle',
    paymentMethod: 'Virement-France',
    birthCountry: 'Sénégal',
    allocationMonthlyAmount: '221.05',
    allocationCurrency: 'EUR',
    allocationCfaAmount: 145000,
    startDate: new Date(seed.startDate),
    endDate: new Date(seed.endDate),
    ...seed.extra,
  };
  const student = await prisma.student.upsert({
    where: { studentNumber: seed.studentNumber },
    update: data,
    create: { studentNumber: seed.studentNumber, ...data },
  });

  await prisma.cursusEntry.deleteMany({ where: { studentId: student.id } });
  await prisma.cursusEntry.createMany({
    data: seed.cursus.map((entry) => ({
      studentId: student.id,
      academicYear: entry.academicYear,
      institution: seed.institution,
      level: entry.level,
      levelCode: entry.levelCode,
      specialty: seed.field,
      diploma: entry.level,
      result: entry.result,
      status: entry.isCurrent
        ? 'CURRENT'
        : entry.result === 'PASSED'
          ? 'VALIDATED'
          : 'REPEATED',
      isCurrent: entry.isCurrent ?? false,
    })),
  });

  if (seed.iban) {
    await prisma.rib.deleteMany({ where: { studentId: student.id } });
    await prisma.rib.create({
      data: {
        studentId: student.id,
        activeSlot: true,
        bankName: 'BNP PARIBAS',
        holderName: `${seed.firstName} ${seed.lastName}`,
        ...protectIban(seed.iban),
        bic: 'BNPAFRPPXXX',
        address: '26 rue de Saurupt, Nancy',
        phone: '07 44 24 22 37',
        email: seed.email,
        status: 'VALIDATED',
        submittedAt: new Date('2024-12-21'),
        reviewedAt: new Date('2024-12-22'),
      },
    });
  }

  return student;
}

async function seedPaymentsAndDocuments(studentId: string) {
  const months = [
    ['PAY-2025-2026-10', 'Octobre', '2025-10-01', '541.19'],
    ['PAY-2025-2026-11', 'Novembre', '2025-11-03', '297.27'],
    ['PAY-2025-2026-12', 'Décembre', '2025-12-03', '297.27'],
    ['PAY-2025-2026-01', 'Janvier', '2026-01-29', '297.27'],
    ['PAY-2025-2026-02', 'Février', '2026-02-06', '297.27'],
    ['PAY-2025-2026-03', 'Mars', '2026-03-10', '297.27'],
    ['PAY-2025-2026-04', 'Avril', '2026-04-01', '297.27'],
  ] as const;

  for (const [reference, month, date, amount] of months) {
    const data = {
      studentId,
      month,
      academicYear: '2025/2026',
      paymentDate: new Date(date),
      amount,
      currency: 'EUR',
      baseAmount: '221.05',
      status: 'PAID' as const,
    };

    await prisma.payment.upsert({
      where: { reference },
      update: data,
      create: { reference, ...data },
    });
  }

  await prisma.studentDocument.deleteMany({ where: { studentId } });
  await prisma.studentDocument.createMany({
    data: [
      {
        studentId,
        name: 'Certificat de scolarité 2025/2026',
        type: 'CERTIFICAT_SCOLARITE',
        status: 'REQUIRED',
        required: true,
      },
      {
        studentId,
        name: 'Relevé de notes semestre 5',
        type: 'RELEVE_NOTES',
        status: 'REQUIRED',
        required: true,
      },
      {
        studentId,
        name: 'Attestation d’arrivée',
        type: 'ATTESTATION_ARRIVEE',
        status: 'VALIDATED',
        required: true,
        submittedAt: new Date('2024-12-21'),
        reviewedAt: new Date('2024-12-22'),
      },
    ],
  });
}

async function main() {
  const years = await seedAcademicYears();

  await seedCampaign(
    'RENEWAL',
    years['2026-2027'],
    {
      title: 'Renouvellement 2026/2027',
      instructions:
        'Déposez votre certificat d’inscription de l’année en cours et vos résultats de l’année précédente avant le 31 décembre.',
      opensAt: '2026-09-01T00:00:00Z',
      closesAt: '2027-01-01T00:00:00Z',
    },
    [
      { code: 'CERTIFICAT_INSCRIPTION' },
      { code: 'ATTESTATION_RESULTATS' },
      {
        code: 'LETTRE_DIRECTEUR_THESE',
        cycles: ['DOCTORAT'],
        isRequired: false,
      },
    ],
  );
  await seedCampaign(
    'NEW_APPLICATION',
    years['2026-2027'],
    {
      title: 'Candidatures 2026/2027',
      instructions:
        'Réservé aux étudiants sénégalais admis dans un établissement d’enseignement supérieur, 30 ans maximum hors doctorat.',
      opensAt: '2026-06-01T00:00:00Z',
      closesAt: '2026-11-01T00:00:00Z',
      maxAgeNonDoctoral: 30,
    },
    [
      { code: 'PIECE_IDENTITE' },
      { code: 'ATTESTATION_ADMISSION' },
      { code: 'RELEVE_BAC', cycles: ['PREPA', 'BTS', 'LICENCE'] },
      { code: 'RELEVE_NOTES', cycles: ['MASTER', 'INGENIEUR', 'DOCTORAT'] },
    ],
  );

  await seedAdmins();

  const studentPasswordHash = await bcrypt.hash(STUDENT_PASSWORD, 12);
  const students: StudentSeed[] = [
    {
      // Parcours nominal : L3 réussie, passe en M1.
      studentNumber: 'STU001',
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@sgee.local',
      birthDate: '2000-01-01',
      scholarshipStatus: 'ACTIVE',
      levelCode: 'L3',
      level: 'Licence 3',
      field: 'Mathématiques-Informatique',
      academy: 'Nancy-Metz',
      institution: 'Université de Lorraine',
      startDate: '2023-10-01',
      endDate: '2028-07-31',
      iban: 'FR76 3000 4000 0312 3456 7890 143',
      extra: {
        matricule: '1933200401205',
        birthCity: 'Pikine',
        gender: 'Masculin',
        familySituation: 'Célibataire',
        budget: 'Ministère de l’Éducation',
        attributionNumber: '31146 MES/DB DU 02/12/2024',
        arrivalDate: new Date('2024-12-21'),
        lastProcessingDate: new Date('2026-04-01'),
      },
      cursus: [
        {
          academicYear: '2023/2024',
          levelCode: 'L1',
          level: 'Licence 1',
          result: 'PASSED',
        },
        {
          academicYear: '2024/2025',
          levelCode: 'L2',
          level: 'Licence 2',
          result: 'PASSED',
        },
        {
          academicYear: '2025/2026',
          levelCode: 'L3',
          level: 'Licence 3',
          result: null,
          isCurrent: true,
        },
      ],
    },
    {
      // Redoublement en M2 : alerte « dérogation nécessaire » à l'instruction.
      studentNumber: 'STU002',
      firstName: 'Aminata',
      lastName: 'Diop',
      email: 'aminata.diop@sgee.local',
      birthDate: '1999-03-14',
      scholarshipStatus: 'ACTIVE',
      levelCode: 'M2',
      level: 'Master 2',
      field: 'Économie du développement',
      academy: 'Paris',
      institution: 'Université Paris 1 Panthéon-Sorbonne',
      startDate: '2024-10-01',
      endDate: '2026-09-30',
      iban: 'FR14 2004 1010 0505 0001 3M02 606',
      cursus: [
        {
          academicYear: '2024/2025',
          levelCode: 'M1',
          level: 'Master 1',
          result: 'PASSED',
        },
        {
          academicYear: '2025/2026',
          levelCode: 'M2',
          level: 'Master 2',
          result: null,
          isCurrent: true,
        },
      ],
    },
    {
      // Doctorante en 3e année : une 4e année demande une dérogation.
      studentNumber: 'STU003',
      firstName: 'Khady',
      lastName: 'Ndiaye',
      email: 'khady.ndiaye@sgee.local',
      birthDate: '1996-07-02',
      scholarshipStatus: 'ACTIVE',
      levelCode: 'D3',
      level: 'Doctorat 3e année',
      field: 'Biologie',
      academy: 'Lyon',
      institution: 'Université Claude Bernard Lyon 1',
      startDate: '2023-10-01',
      endDate: '2026-09-30',
      cursus: [
        {
          academicYear: '2023/2024',
          levelCode: 'D1',
          level: 'Doctorat 1re année',
          result: 'PASSED',
        },
        {
          academicYear: '2024/2025',
          levelCode: 'D2',
          level: 'Doctorat 2e année',
          result: 'PASSED',
        },
        {
          academicYear: '2025/2026',
          levelCode: 'D3',
          level: 'Doctorat 3e année',
          result: null,
          isCurrent: true,
        },
      ],
    },
    {
      // Bourse annulée : le renouvellement est bloqué.
      studentNumber: 'STU004',
      firstName: 'Ibrahima',
      lastName: 'Sow',
      email: 'ibrahima.sow@sgee.local',
      birthDate: '2001-11-20',
      scholarshipStatus: 'CANCELLED',
      levelCode: 'L2',
      level: 'Licence 2',
      field: 'Droit',
      academy: 'Bordeaux',
      institution: 'Université de Bordeaux',
      startDate: '2024-10-01',
      endDate: '2027-07-31',
      cursus: [
        {
          academicYear: '2024/2025',
          levelCode: 'L1',
          level: 'Licence 1',
          result: 'REPEATED',
        },
        {
          academicYear: '2025/2026',
          levelCode: 'L1',
          level: 'Licence 1',
          result: 'REPEATED',
          isCurrent: true,
        },
      ],
    },
  ];

  for (const seed of students) {
    const student = await seedStudent(seed, studentPasswordHash);

    if (seed.studentNumber === 'STU001') {
      await seedPaymentsAndDocuments(student.id);
    }
  }

  // Candidat dont l'adresse e-mail est déjà vérifiée.
  const applicantData = {
    passwordHash: await bcrypt.hash(APPLICANT_PASSWORD, 12),
    firstName: 'Mariama',
    lastName: 'Ba',
    birthDate: new Date('2007-02-11'),
    phone: '+221 77 123 45 67',
    emailVerifiedAt: new Date('2026-06-15'),
    lockedUntil: null,
    failedLoginAttempts: 0,
  };

  await prisma.applicant.upsert({
    where: { email: 'candidate@sgee.local' },
    update: applicantData,
    create: { email: 'candidate@sgee.local', ...applicantData },
  });

  console.log('Comptes de développement :');
  console.log(
    `  boursiers : test@sgee.local (ou STU001), aminata.diop@sgee.local, khady.ndiaye@sgee.local, ibrahima.sow@sgee.local / ${STUDENT_PASSWORD}`,
  );
  console.log(`  instructeur : admin@sgee.local / ${ADMIN_PASSWORD}`);
  console.log(`  super-admin : superadmin@sgee.local / ${ADMIN_PASSWORD}`);
  console.log(`  candidat : candidate@sgee.local / ${APPLICANT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
