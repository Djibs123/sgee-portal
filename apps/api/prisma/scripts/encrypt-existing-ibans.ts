/**
 * Reprise ponctuelle : chiffre les IBAN encore stockés en clair (colonne `iban`)
 * puis vide cette colonne. Idempotent, à lancer après la migration
 * `version_ribs_and_encrypt_iban` sur chaque environnement :
 *
 *   pnpm --filter api exec tsx prisma/scripts/encrypt-existing-ibans.ts
 *
 * Quand toutes les bases sont reprises, une migration pourra supprimer la colonne.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { protectIban } from '../../src/common/crypto/iban';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const legacyRibs = await prisma.rib.findMany({
    where: { iban: { not: null } },
    select: { id: true, iban: true },
  });

  for (const rib of legacyRibs) {
    await prisma.rib.update({
      where: { id: rib.id },
      data: { ...protectIban(rib.iban!), iban: null },
    });
  }

  console.log(`${legacyRibs.length} IBAN chiffré(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
