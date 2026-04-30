import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const devPassword = 'password123';
  const passwordHash = await bcrypt.hash(devPassword, 12);

  const student = await prisma.student.upsert({
    where: {
      studentNumber: 'STU001',
    },
    update: {
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@sgee.local',
      birthDate: new Date('2000-01-01'),
      scholarshipStatus: 'Repris',
      passwordHash,
      matricule: '1933200401205',
      level: 'Licence 3',
      field: 'Mathematique Informatique',
      academy: 'Nancy-Metz',
      country: 'France',
      academicYear: '2025/2026',
      scholarshipType: 'Bourse 1er et 2nd Cycle',
      paymentMethod: 'Virement-France',
      birthCity: 'Pikine',
      birthCountry: 'Senegal',
      gender: 'Masculin',
      familySituation: 'Celibataire',
      budget: 'Ministere Education',
      allocationMonthlyAmount: '221.05',
      allocationCurrency: 'EUR',
      allocationCfaAmount: 145000,
      totalPaidAmount: '2324.81',
      progressPercent: 73,
      startDate: new Date('2023-10-01'),
      endDate: new Date('2026-07-31'),
      attributionNumber: '31146 MES/DB DU 02/12/2024',
      arrivalDate: new Date('2024-12-21'),
      lastProcessingDate: new Date('2026-04-01'),
    },
    create: {
      studentNumber: 'STU001',
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@sgee.local',
      birthDate: new Date('2000-01-01'),
      scholarshipStatus: 'Repris',
      passwordHash,
      matricule: '1933200401205',
      level: 'Licence 3',
      field: 'Mathematique Informatique',
      academy: 'Nancy-Metz',
      country: 'France',
      academicYear: '2025/2026',
      scholarshipType: 'Bourse 1er et 2nd Cycle',
      paymentMethod: 'Virement-France',
      birthCity: 'Pikine',
      birthCountry: 'Senegal',
      gender: 'Masculin',
      familySituation: 'Celibataire',
      budget: 'Ministere Education',
      allocationMonthlyAmount: '221.05',
      allocationCurrency: 'EUR',
      allocationCfaAmount: 145000,
      totalPaidAmount: '2324.81',
      progressPercent: 73,
      startDate: new Date('2023-10-01'),
      endDate: new Date('2026-07-31'),
      attributionNumber: '31146 MES/DB DU 02/12/2024',
      arrivalDate: new Date('2024-12-21'),
      lastProcessingDate: new Date('2026-04-01'),
    },
  });

  await prisma.rib.upsert({
    where: {
      studentId: student.id,
    },
    update: {
      bankName: 'BNP PARIBAS',
      holderName: `${student.firstName} ${student.lastName}`,
      iban: 'FR76 3000 4004 2600 0004 4603 285',
      ibanMasked: 'FR76 **** **** **** **** **** 3285',
      bic: 'BNPAFRPPXXX',
      address: '26 RUE DE SAURUP',
      phone: '07 44 24 22 37',
      email: student.email,
      status: 'VALIDATED',
      submittedAt: new Date('2024-12-21'),
      reviewedAt: new Date('2024-12-22'),
      reviewComment: null,
    },
    create: {
      studentId: student.id,
      bankName: 'BNP PARIBAS',
      holderName: `${student.firstName} ${student.lastName}`,
      iban: 'FR76 3000 4004 2600 0004 4603 285',
      ibanMasked: 'FR76 **** **** **** **** **** 3285',
      bic: 'BNPAFRPPXXX',
      address: '26 RUE DE SAURUP',
      phone: '07 44 24 22 37',
      email: student.email,
      status: 'VALIDATED',
      submittedAt: new Date('2024-12-21'),
      reviewedAt: new Date('2024-12-22'),
      reviewComment: null,
    },
  });

  await prisma.adminUser.upsert({
    where: {
      email: 'admin@sgee.local',
    },
    update: {
      name: 'Admin SGEE',
      passwordHash: await bcrypt.hash('admin12345', 12),
      role: 'ADMIN',
    },
    create: {
      email: 'admin@sgee.local',
      name: 'Admin SGEE',
      passwordHash: await bcrypt.hash('admin12345', 12),
      role: 'ADMIN',
    },
  });

  await Promise.all(
    [
      {
        reference: 'PAY-2025-2026-04',
        month: 'Avril',
        academicYear: '2025/2026',
        paymentDate: new Date('2026-04-01'),
        amount: '297.27',
        currency: 'EUR',
        baseAmount: '221.05',
        status: 'Verse',
      },
      {
        reference: 'PAY-2025-2026-03',
        month: 'Mars',
        academicYear: '2025/2026',
        paymentDate: new Date('2026-03-10'),
        amount: '297.27',
        currency: 'EUR',
        baseAmount: '221.05',
        status: 'Verse',
      },
      {
        reference: 'PAY-2025-2026-02',
        month: 'Fevrier',
        academicYear: '2025/2026',
        paymentDate: new Date('2026-02-06'),
        amount: '297.27',
        currency: 'EUR',
        baseAmount: '221.05',
        status: 'Verse',
      },
      {
        reference: 'PAY-2025-2026-01',
        month: 'Janvier',
        academicYear: '2025/2026',
        paymentDate: new Date('2026-01-29'),
        amount: '297.27',
        currency: 'EUR',
        baseAmount: '221.05',
        status: 'Verse',
      },
      {
        reference: 'PAY-2025-2026-12',
        month: 'Decembre',
        academicYear: '2025/2026',
        paymentDate: new Date('2025-12-03'),
        amount: '297.27',
        currency: 'EUR',
        baseAmount: '221.05',
        status: 'Verse',
      },
      {
        reference: 'PAY-2025-2026-11',
        month: 'Novembre',
        academicYear: '2025/2026',
        paymentDate: new Date('2025-11-03'),
        amount: '297.27',
        currency: 'EUR',
        baseAmount: '221.05',
        status: 'Verse',
      },
      {
        reference: 'PAY-2025-2026-10',
        month: 'Octobre',
        academicYear: '2025/2026',
        paymentDate: new Date('2025-10-01'),
        amount: '541.19',
        currency: 'EUR',
        baseAmount: '221.05',
        status: 'Verse',
      },
    ].map((payment) =>
      prisma.payment.upsert({
        where: {
          reference: payment.reference,
        },
        update: {
          ...payment,
          studentId: student.id,
        },
        create: {
          ...payment,
          studentId: student.id,
        },
      }),
    ),
  );

  await prisma.cursusEntry.deleteMany({
    where: {
      studentId: student.id,
    },
  });

  await prisma.cursusEntry.createMany({
    data: [
      {
        studentId: student.id,
        academicYear: '2023/2024',
        institution: 'Universite de Lorraine',
        level: 'Licence 1',
        specialty: 'Mathematique Informatique',
        diploma: 'Licence 1',
        status: 'VALIDATED',
        isCurrent: false,
      },
      {
        studentId: student.id,
        academicYear: '2024/2025',
        institution: 'Universite de Lorraine',
        level: 'Licence 2',
        specialty: 'Mathematique Informatique',
        diploma: 'Licence 2',
        status: 'VALIDATED',
        isCurrent: false,
      },
      {
        studentId: student.id,
        academicYear: '2025/2026',
        institution: 'Universite de Lorraine',
        level: 'Licence 3',
        specialty: 'Mathematique Informatique',
        diploma: 'Licence 3',
        status: 'CURRENT',
        isCurrent: true,
      },
    ],
  });

  await prisma.studentDocument.deleteMany({
    where: {
      studentId: student.id,
    },
  });

  await prisma.studentDocument.createMany({
    data: [
      {
        studentId: student.id,
        name: 'Certificat de scolarite 2025/2026',
        type: 'CERTIFICAT_SCOLARITE',
        status: 'REQUIRED',
        required: true,
        submittedAt: null,
      },
      {
        studentId: student.id,
        name: 'Releve de notes Semestre 5',
        type: 'RELEVE_NOTES',
        status: 'REQUIRED',
        required: true,
        submittedAt: null,
      },
      {
        studentId: student.id,
        name: "Attestation d'arrivee",
        type: 'ATTESTATION_ARRIVEE',
        status: 'VALIDATED',
        required: true,
        submittedAt: new Date('2024-12-21'),
        reviewedAt: new Date('2024-12-22'),
      },
    ],
  });

  console.log('Development student credentials:');
  console.log('  identifier: test@sgee.local or STU001');
  console.log(`  password: ${devPassword}`);
  console.log('Development admin credentials:');
  console.log('  email: admin@sgee.local');
  console.log('  password: admin12345');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
