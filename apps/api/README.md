# API SGEE

API REST du portail SGEE (NestJS 11, Prisma 7, PostgreSQL). Toutes les routes sont préfixées par
`/api`. Documentation interactive hors production : `/api/docs`.

## Organisation

| Dossier | Rôle |
|---|---|
| `config/` | validation de la configuration au démarrage (`env`) |
| `auth/`, `admin-auth/`, `applicant-auth/` | connexion des trois espaces, sessions révocables, mots de passe |
| `audit/` | journal d'audit en ajout seul (`AuditService.record`) |
| `scholarship/` | campagnes, demandes, instruction ; `domain/` contient les règles pures testées |
| `student-portal/`, `rib/`, `notifications/`, `admin/` | dossier boursier, coordonnées bancaires, notifications, back-office |
| `common/` | sécurité (CSRF), chiffrement de champs, stockage et contrôle des fichiers, journalisation, filtres d'erreurs |
| `mail/` | envoi des e-mails (console en développement, SMTP si `SMTP_URL`) |
| `health/` | `GET /api/health` (état de la base) |

## Configuration

Les variables sont validées au démarrage : une valeur manquante ou faible arrête le processus.
Voir `.env.example` ; en production, `JWT_SECRET`, `ADMIN_JWT_SECRET` (distincts, ≥ 32 caractères),
`DATA_ENCRYPTION_KEY` (32 octets en base64) et `SMTP_URL` sont obligatoires.

| Variable | Défaut | Rôle |
|---|---|---|
| `DATABASE_URL` | — | connexion PostgreSQL |
| `DATABASE_POOL_MAX` | `10` | taille du pool |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | origines autorisées (CORS et contrôle CSRF), séparées par des virgules |
| `PUBLIC_APP_URL` | `http://localhost:5173` | base des liens envoyés par e-mail |
| `TRUST_PROXY` | `false` | nombre de proxys de confiance derrière un reverse proxy |
| `UPLOAD_DIR` | `uploads/student-documents` | racine de stockage des pièces |
| `MAX_UPLOAD_SIZE_MB` | `5` | taille maximale d'un fichier |
| `DATA_ENCRYPTION_KEY` | clé de dev | chiffrement des IBAN (AES-256-GCM) |
| `SMTP_URL`, `MAIL_FROM` | — | envoi des e-mails |
| `LOG_LEVEL` | selon l'environnement | niveau de journalisation |

## Sécurité

- Cookie de session `HttpOnly`, `SameSite=strict`, `Secure` en production ; le JWT porte un
  identifiant de session révocable (déconnexion, expiration, inactivité).
- Méthodes non sûres : en-tête `X-SGEE-CSRF: 1`, origine dans la liste blanche, refus des requêtes
  `Sec-Fetch-Site: cross-site`.
- Connexion : comparaison à temps constant, e-mail insensible à la casse, verrouillage 15 minutes
  après 5 échecs, réponses identiques pour ne pas révéler l'existence d'un compte.
- Rôles `ADMIN` / `SUPER_ADMIN` (`@Roles()`), relus en base à chaque requête ; toutes les décisions
  et les consultations d'IBAN sont journalisées.
- Téléchargements servis avec `Content-Disposition`, `nosniff` et une CSP restrictive.

## Base de données

```bash
pnpm db:start                    # PGlite (développement) sur le port 5433
pnpm --filter api exec prisma migrate dev --name <nom>
pnpm db:deploy                   # appliquer les migrations
pnpm db:generate                 # régénérer le client (obligatoire après une migration)
pnpm db:seed                     # jeu de données (refusé en production)
```

## Tests

```bash
pnpm --filter api test           # unitaires (règles métier pures, sécurité)
pnpm --filter api test:e2e       # bout en bout
```

Les e2e utilisent une base éphémère, ou `TEST_DATABASE_URL` si la variable est définie (CI) ; la
base de développement n'est jamais touchée.
