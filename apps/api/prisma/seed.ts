import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await prisma.student.upsert({
    where: {
      studentNumber: 'STU001',
    },
    update: {},
    create: {
      studentNumber: 'STU001',
      firstName: 'Test',
      lastName: 'Student',
      email: 'student@example.com',
      birthDate: new Date('2000-01-01'),
      scholarshipStatus: 'PENDING',
    },
  });
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
