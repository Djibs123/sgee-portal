# Portail SGEE

Portail du Service de Gestion des Étudiants sénégalais à l'Étranger : espace boursier,
**renouvellement annuel de la bourse**, **candidature** des nouveaux étudiants et back-office
d'instruction pour les agents du SGEE.

| Espace | Adresse | Public |
|---|---|---|
| Site public | `/` | tout le monde (calendrier des campagnes) |
| Espace boursier | `/login` → `/portal` | étudiants boursiers |
| Candidature | `/candidature` → `/candidature/espace` | nouveaux candidats |
| Back-office | `/admin/login` → `/admin` | agents (ADMIN) et super-administrateurs (SUPER_ADMIN) |

## Architecture

```
apps/api   NestJS 11 + Prisma 7 + PostgreSQL   (API REST sous /api)
apps/web   React 19 + Vite 8 + React Router 8  (application monopage)
docs/      Règles métier et feuille de route
scripts/   Base de développement PGlite
```

- Monorepo **pnpm** (un seul lockfile, Node 24).
- Authentification par **cookie de session HttpOnly SameSite=strict** (sessions révocables côté
  serveur), protection **CSRF** par en-tête `X-SGEE-CSRF` + contrôle d'origine, **RBAC** et
  **journal d'audit** en ajout seul.
- Documents chiffrés en transit, **IBAN chiffrés** (AES-256-GCM) et jamais renvoyés en clair sans
  consultation journalisée.

## Démarrer en local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # secrets de développement

pnpm db:start                            # PostgreSQL de dev (PGlite) : 5433
pnpm db:deploy && pnpm db:seed           # schéma + jeu de données
pnpm dev                                 # API :3000 et front :5173
```

Documentation interactive de l'API (hors production) : <http://localhost:3000/api/docs>.

### Comptes du jeu de données

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Boursier (L3) | `test@sgee.local` | `password123` |
| Boursière (M2) | `aminata.diop@sgee.local` | `password123` |
| Doctorante (D3) | `khady.ndiaye@sgee.local` | `password123` |
| Bourse annulée | `ibrahima.sow@sgee.local` | `password123` |
| Agent | `admin@sgee.local` | `admin12345` |
| Super-administrateur | `superadmin@sgee.local` | `admin12345` |
| Candidat | `candidate@sgee.local` | `candidat-sgee-2026` |

### Accès à la base de développement

`pnpm db:start` démarre **PGlite** (PostgreSQL en WebAssembly) exposé en TCP :

```
hôte 127.0.0.1   port 5433   base postgres   utilisateur postgres   TLS désactivé
```

Les données vivent dans `%USERPROFILE%\.sgee\pglite\sgee_dev`. `pnpm db:studio` ouvre Prisma Studio
si un client graphique (pgAdmin, DBeaver) n'arrive pas à se connecter.

## Scripts

| Commande | Effet |
|---|---|
| `pnpm dev` | API et front en parallèle |
| `pnpm lint` / `pnpm typecheck` | ESLint et TypeScript sur les deux applications |
| `pnpm test` | tests unitaires API + tests front (Vitest) |
| `pnpm test:e2e` | tests bout en bout de l'API (base éphémère) |
| `pnpm build` | build de production des deux applications |
| `pnpm db:start` / `db:deploy` / `db:seed` / `db:studio` / `db:generate` | base de développement |

## Déploiement

```bash
cp .env.example .env     # secrets : POSTGRES_PASSWORD, JWT_SECRET, ADMIN_JWT_SECRET, DATA_ENCRYPTION_KEY
docker compose up --build
```

`docker compose` démarre PostgreSQL 18, applique les migrations, puis lance l'API et le front
(nginx non privilégié) sur <http://localhost:8080> ; les e-mails de test sont consultables sur
<http://localhost:8025>.

En production : terminaison TLS devant le service `web` (HSTS à activer dans
`apps/web/nginx/security-headers.conf`), secrets injectés par la plateforme, SMTP réel,
sauvegardes de la base et du volume `uploads`.

## Intégration continue

`.github/workflows/ci.yml` : lint, types, tests et build du front ; lint, types, tests unitaires,
build et e2e de l'API sur un vrai PostgreSQL 18 ; audit des dépendances de production ; build des
deux images Docker. Mises à jour de dépendances groupées par Dependabot.

## Documentation

- [Règles du renouvellement et de la candidature](docs/renouvellement.md)
- [Feuille de route et décisions](docs/ROADMAP.md)
- [API](apps/api/README.md) · [Front](apps/web/README.md)
