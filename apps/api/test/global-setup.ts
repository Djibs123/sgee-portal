import { execSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';

type GlobalWithDb = typeof globalThis & {
  __SGEE_TEST_DB__?: ReturnType<typeof spawn>;
};

function startMemoryDatabase(): Promise<{
  url: string;
  child: ReturnType<typeof spawn>;
}> {
  const script = resolve(__dirname, '../../../scripts/dev-db.mjs');
  const child = spawn(process.execPath, [script, '--memory'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  return new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Base de test PGlite non démarrée à temps')),
      60_000,
    );

    child.stdout.on('data', (chunk: Buffer) => {
      const match = /SGEE_DB_READY (\d+)/.exec(chunk.toString());

      if (match) {
        clearTimeout(timeout);
        resolvePromise({
          url: `postgresql://postgres:postgres@127.0.0.1:${match[1]}/postgres?sslmode=disable`,
          child,
        });
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Base de test arrêtée (code ${code})`));
    });
  });
}

/**
 * Base isolée pour les e2e : jamais la base de dev.
 * - `TEST_DATABASE_URL` défini (CI, PostgreSQL réel) : remise à zéro puis seed ;
 * - sinon : PostgreSQL PGlite en mémoire, migré et seedé, détruit en fin de run.
 */
export default async function globalSetup() {
  const apiRoot = resolve(__dirname, '..');
  let url = process.env.TEST_DATABASE_URL;

  if (url) {
    execSync('pnpm exec prisma migrate reset --force', {
      cwd: apiRoot,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: url },
    });
  } else {
    const database = await startMemoryDatabase();

    (globalThis as GlobalWithDb).__SGEE_TEST_DB__ = database.child;
    url = database.url;
    execSync('pnpm exec prisma migrate deploy', {
      cwd: apiRoot,
      stdio: 'ignore',
      env: { ...process.env, DATABASE_URL: url },
    });
  }

  execSync('pnpm exec prisma db seed', {
    cwd: apiRoot,
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: url },
  });

  process.env.DATABASE_URL = url;
  process.env.UPLOAD_DIR = 'uploads/student-documents';
}
