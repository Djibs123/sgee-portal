# Feuille de route — audit, renouvellement et candidature

Branche : `feat/audit-renouvellement-candidature`. Un commit par lot.

**Reprise à froid** : lire ce fichier, prendre le premier lot « à faire », ne lire que les fichiers cités dans sa fiche et les décisions ci-dessous.

## Démarrage local

```bash
pnpm install
pnpm db:start          # PostgreSQL de dev (PGlite) : 5433 = sgee_dev, 5435 = base fantôme
pnpm db:deploy && pnpm db:seed
pnpm dev               # API :3000, web :5173
```

## Décisions transverses

- **Base de dev = PGlite** (PostgreSQL 17 en WebAssembly) via `scripts/dev-db.mjs`. Smart App Control bloque les DLL non signées de PostgreSQL 18 natif sur ce poste. CI et Docker utilisent un vrai PostgreSQL 18. Connexion : `postgres@127.0.0.1:5433/postgres`, sans TLS, sans mot de passe vérifié, écoute locale uniquement.
- Données de dev : `%USERPROFILE%\.sgee\pglite\sgee_dev` (hors dépôt).
- Workspace pnpm racine, lockfile unique, Node 24.
- Langue UI et messages d'erreur API : français accentué.
- Règles métier SGEE : renouvellement annuel du 1er septembre au 31 décembre ; pièces = certificat d'inscription N + résultats N-1 ; un redoublement max par cycle ; M2/ING3 sans redoublement sauf dérogation ; doctorat couvert 3 ans ; candidature ≤ 30 ans sauf doctorat.

## Suivi

| Lot | Objet | Statut | Commit |
|---|---|---|---|
| L00 | Outillage, workspace, base de dev | fait | voir git log |
| L01 | Sécurité critique API | fait | voir git log |
| L02 | Sessions, login durci, RBAC, audit | à faire | |
| L03 | Uploads et documents | à faire | |
| L04 | RIB versionné, IBAN chiffré | à faire | |
| L05 | Maintenabilité API, e2e isolés | à faire | |
| L06 | Modèle métier et règles pures | à faire | |
| L07 | API renouvellement boursier | à faire | |
| L08 | Comptes candidats, mails, mot de passe oublié | à faire | |
| L09 | API candidature et instruction admin | à faire | |
| L10 | Fondations front | à faire | |
| L11 | Portail boursier | à faire | |
| L12 | Renouvellement boursier (front) | à faire | |
| L13 | Candidature publique (front) | à faire | |
| L14 | Back-office (front) | à faire | |
| L15 | DevOps et documentation | à faire | |

## Fiches

### L00 — Outillage (fait)
État initial mesuré : lint, build et tests unitaires verts sur api et web ; 10 e2e verts sur PGlite.

### L01 — Sécurité critique API
Fichiers : `apps/api/src/main.ts`, `app.module.ts`, `students/*` (suppression), `admin/*`, `auth/auth.module.ts`, `admin-auth/admin-auth.module.ts`, `auth/auth.constants.ts`, `admin-auth/admin-auth.constants.ts`, nouveau `src/config/*`, nouveau `src/common/security/csrf.middleware.ts`, `test/app.e2e-spec.ts`, `apps/web/src/lib/api.ts`.
Fin : `/api/students` absent ; `GET /api/admin/students` paginé sans secret ; env validé au démarrage ; Helmet ; CSRF `X-SGEE-CSRF: 1` exigé sur méthodes non sûres et `Sec-Fetch-Site: cross-site` refusé ; cookies `SameSite=strict` ; throttler global unique ; `ParseUUIDPipe` sur les identifiants.
Réalisé : config typée `src/config/env.ts` (import `env`) ; `src/app.setup.ts` `configureApp()` partagé par `main.ts` et les e2e ; `src/common/security/csrf.guard.ts` en `APP_GUARD` ; pagination réutilisable `PaginationQueryDto` (`admin.dto.ts`) ; e2e : utilitaire `test/utils/test-app.ts` (`createTestApp()`, `api()` avec en-tête CSRF, `raw()` sans) et `test/security.e2e-spec.ts` ; `test:e2e` en `--runInBand`.

### L02 — Sessions, login, RBAC, audit
Fichiers : `schema.prisma` (+ `Session`, `AuditLog`, champs de verrouillage), `auth/*`, `admin-auth/*`, nouveau `src/audit/*`, `admin/admin.service.ts`.
Fin : logout révoque la session ; bcrypt factice si compte absent ; email insensible à la casse ; verrouillage 15 min après 5 échecs ; `@Roles()` ; audit des décisions admin.

### L03 — Uploads et documents
Fichiers : nouveaux `src/common/storage/*`, `src/common/uploads/*`, `src/common/http/content-disposition.ts` ; `student-portal/*`, `admin/*` ; `schema.prisma` (+ `DocumentType`).
Fin : magic bytes, extension déduite, nettoyage en erreur, re-dépôt limité à REQUIRED/REJECTED, en-têtes de téléchargement durcis, plus de code dupliqué.

### L04 — RIB versionné et IBAN chiffré
Fichiers : `schema.prisma` (Rib), `student-portal/*` (RIB), `admin/*` (RIB), nouveau `src/common/crypto/*`, `prisma/scripts/encrypt-existing-ibans.ts`, `apps/web/src/pages/RibPage.tsx`, `AdminDashboardPage.tsx`, `lib/api.ts`.
Fin : RIB validé conservé jusqu'à validation du nouveau ; IBAN chiffré AES-256-GCM ; empreinte HMAC et alerte IBAN partagé ; `@IsIBAN()` ; révélation admin auditée.

### L05 — Maintenabilité API
Fichiers : `schema.prisma` (générateur), imports Prisma, `main.ts`, `app.module.ts`, `prisma/seed.ts`, `test/*`, nouveaux `src/health/*`, `src/common/filters/*`.
Fin : générateur `prisma-client`, logs pino, `/api/health`, filtre d'erreurs Prisma, Swagger hors prod, e2e sur base isolée. Suite complète verte.

### L06 — Modèle métier et règles pures
Modèles : `AcademicYear` ; `Campaign` (RENEWAL | NEW_APPLICATION, `opensAt`, `closesAt`, `closedAt?`, `maxAgeNonDoctoral`, statut calculé sans cron) ; `CampaignRequirement` ; `ScholarshipRequest` (référence `REN-2026-000123` ou `CAN-…`, `studentId?` ou `applicantId?`, statut, `StudyLevel` L1…M2 / ING1-3 / D1-D4, établissement, ville, pays, filière, résultat N-1 `PASSED|REPEATED|FAILED`, moyenne, bac, changement de filière, attestation sur l'honneur, décision, `version`) avec `@@unique([studentId, campaignId])` et `@@unique([applicantId, campaignId])` ; `RequestDocument` ; `RequestStatusHistory` ; `Notification`. Enums `ScholarshipStatus` (« Repris » → ACTIVE), `PaymentStatus` (« Verse » → PAID) ; `CursusEntry.levelCode/result`.
Fonctions pures testées : machine à états `DRAFT → SUBMITTED → UNDER_REVIEW → (INCOMPLETE ↔ SUBMITTED) → APPROVED | REJECTED`, `WITHDRAWN` avant décision ; éligibilité avec bloquants (bourse annulée ou terminée, campagne fermée, doublon, âge > 30 hors doctorat) et alertes instructeur (2e redoublement dans le cycle, redoublement M2/ING3, doctorat > 3 ans, changement de filière, fin de bourse dépassée).
Seed : année 2026-2027, campagne de renouvellement ouverte jusqu'au 31/12/2026, campagne de candidature, catalogue de pièces, admin et super-admin, étudiants variés.

### L07 — API renouvellement boursier
`GET /student/campaigns/current`, `GET|POST /student/requests`, `PATCH /student/requests/:id`, `POST /student/requests/:id/submit|withdraw`, pièces de demande via le pipeline L03, `GET|PATCH /student/notifications`, `GET /student/dashboard` (échéance de campagne, statut de demande, pièces manquantes nommées, dernier versement, prochain versement estimé, progression calculée, montants bruts + devise). SUPER_ADMIN : CRUD `/admin/campaigns` et `/admin/academic-years`. e2e.

### L08 — Comptes candidats
`Applicant` (email en minuscules unique, identité, `emailVerifiedAt`, verrouillage, `studentId?`) ; `OneTimeToken` (EMAIL_VERIFICATION | PASSWORD_RESET, hash SHA-256, expiration, usage unique) ; `MailerService` (console en dev, SMTP via `nodemailer` si `SMTP_URL`) ; inscription, vérification, connexion, déconnexion, profil candidat ; mot de passe oublié pour candidats et boursiers avec réponse identique ; mot de passe de 12 à 128 caractères ; `GET /public/campaigns`. e2e.

### L09 — API candidature et instruction admin
Parcours candidat (brouillon, pièces, soumission, suivi). Admin : `GET /admin/requests` (paginé, filtres type, statut, campagne, niveau, alertes, recherche), `GET /admin/requests/:id`, `POST /admin/requests/:id/start-review|request-info|approve|reject` (commentaire obligatoire sauf approbation). Approbation renouvellement en transaction : étudiant mis à jour, cursus courant, notification, audit. Approbation candidature : création du `Student` avec numéro généré, mot de passe repris, cursus, documents requis dont RIB, lien `applicant.studentId`, e-mail. Rejet renouvellement : bourse CANCELLED. Suite complète verte.

### L10 — Fondations front
React Router v7 (`/`, `/login`, `/portal/*`, `/candidature/*`, `/mot-de-passe-oublie`, `/reinitialiser`, `/admin/*`), layouts protégés, titre par page ; `src/lib/api/` découpé par domaine (en-tête CSRF, redirection 401) ; composants accessibles `Dialog`, `StatusMessage`, `StatusPill`, `Stepper`, `Pagination`, `EmptyState`, `FileField` ; tiroir de navigation mobile ; lien d'évitement, `:focus-visible`, contraste AA, cibles ≥ 24 px, `prefers-reduced-motion`, `aria-current` ; textes accentués ; `eslint-plugin-jsx-a11y` ; Vitest et Testing Library.

### L11 — Portail boursier
Dashboard sur données réelles ; paiements via `Intl.NumberFormat` ; documents avec re-dépôt des refusés et `Dialog` ; RIB actif et en attente ; page notifications.

### L12 — Renouvellement boursier (front)
Assistant en 4 étapes (situation N+1, résultats N-1, pièces, récapitulatif et attestation), sauvegarde automatique, frise de suivi, complément demandé, retrait.

### L13 — Candidature publique (front)
Section « Candidatures » dynamique sur l'accueil, inscription, vérification e-mail, connexion, mot de passe oublié, espace candidat avec l'assistant partagé et le suivi.

### L14 — Back-office (front)
Layout admin, file des demandes filtrable, fiche demande (pièces, alertes, historique, décision), validations documents et RIB avec `Dialog`, campagnes (SUPER_ADMIN), recherche étudiants, journal d'audit. Suite complète verte.

### L15 — DevOps et documentation
Dockerfiles multi-étapes non-root, nginx avec fallback SPA et en-têtes, `docker-compose.yml` (PostgreSQL 18, api, web, volume uploads), CI GitHub Actions (lint, typecheck, tests, build, e2e sur service PostgreSQL, audit), Dependabot, README racine et apps, `docs/renouvellement.md`, vérification finale de bout en bout.
