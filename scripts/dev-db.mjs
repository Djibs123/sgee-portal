#!/usr/bin/env node
// Serveur PostgreSQL de développement basé sur PGlite (PostgreSQL compilé en WebAssembly).
//
// Pourquoi : Smart App Control (Windows) bloque les DLL non signées de l'installation
// PostgreSQL native. PGlite s'exécute dans Node (signé) et parle le protocole PostgreSQL,
// donc Prisma, psql et pgAdmin s'y connectent normalement.
//
// Limites (dev uniquement) : pas de TLS, pas d'authentification réelle, écoute sur
// 127.0.0.1 seulement. Les connexions clientes sont multiplexées sur une connexion
// PGlite unique ; le multiplexeur réserve la base à la connexion qui détient une
// transaction ouverte et fait un ROLLBACK si elle se déconnecte. En CI et en production,
// utiliser un vrai PostgreSQL 18 (voir docker-compose.yml).
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const HOST = '127.0.0.1';
const DEV_PORT = Number(process.env.SGEE_DB_PORT ?? 5433);
const SHADOW_PORT = Number(process.env.SGEE_SHADOW_DB_PORT ?? 5435);
const MAX_CONNECTIONS = Number(process.env.SGEE_DB_MAX_CONNECTIONS ?? 50);
const DATA_DIR =
  process.env.SGEE_DB_DIR ?? join(homedir(), '.sgee', 'pglite', 'sgee_dev');

async function startServer(label, dataDir, port) {
  const db = dataDir ? await PGlite.create(dataDir) : await PGlite.create();
  // La valeur par défaut de la librairie (1) refuse pgAdmin ou Prisma Studio en parallèle de l'API.
  const server = new PGLiteSocketServer({ db, host: HOST, port, maxConnections: MAX_CONNECTIONS });

  await server.start();
  console.log(`[db] ${label} prêt sur postgresql://postgres@${HOST}:${port}/postgres`);

  return { db, server };
}

mkdirSync(DATA_DIR, { recursive: true });

const instances = [
  await startServer(`sgee_dev (${DATA_DIR})`, DATA_DIR, DEV_PORT),
  await startServer('shadow (mémoire)', undefined, SHADOW_PORT),
];

async function shutdown() {
  console.log('[db] arrêt…');

  for (const { db, server } of instances) {
    await server.stop();
    await db.close();
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
