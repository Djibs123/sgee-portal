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
| L02 | Sessions, login durci, RBAC, audit | fait | voir git log |
| L03 | Uploads et documents | fait | voir git log |
| L04 | RIB versionné, IBAN chiffré | fait | voir git log |
| L05 | Maintenabilité API, e2e isolés | fait | voir git log |
| L06 | Modèle métier et règles pures | fait | voir git log |
| L07 | API renouvellement boursier | fait | voir git log |
| L08 | Comptes candidats, mails, mot de passe oublié | fait | voir git log |
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
Réalisé : `src/auth/session/` (`credentials.ts` règles pures + tests, `session.service.ts` avec expiration 8 h et inactivité 60 min étudiant / 30 min admin, `session.module.ts` ré-exporté par `AuthModule` et `AdminAuthModule`) ; JWT porteur de `sid` ; `AdminAuthGuard` relit le rôle en base et applique `@Roles()` (`admin-auth/roles.decorator.ts`, SUPER_ADMIN passe partout) ; `src/audit/` module global, `AuditService.record(entry, tx?)` et `list()` ; décorateur `@AdminActor()` ; `GET /api/admin/audit-logs` réservé SUPER_ADMIN ; décisions admin en transaction avec audit ; `PrismaService` utilise `DATABASE_POOL_MAX` ; e2e `test/auth-sessions.e2e-spec.ts`.
Attention : Prisma 7 ne régénère plus le client après `migrate dev` ; lancer `pnpm db:generate`.

### L03 — Uploads et documents
Fichiers : nouveaux `src/common/storage/*`, `src/common/uploads/*`, `src/common/http/content-disposition.ts` ; `student-portal/*`, `admin/*` ; `schema.prisma` (+ `DocumentType`).
Fin : magic bytes, extension déduite, nettoyage en erreur, re-dépôt limité à REQUIRED/REJECTED, en-têtes de téléchargement durcis, plus de code dupliqué.
Réalisé : `src/common/uploads/` (`file-signature.ts` magic bytes + heuristique PDF actif + nom nettoyé ; `upload.options.ts` multer en mémoire avec `defParamCharset: 'utf8'` ; `UploadedFilesService.store/resolveDownload/remove` ; `UploadsModule` global) ; `src/common/storage/document-storage.ts` (`DocumentStorage` abstrait, `LocalDiskStorage`) ; `src/common/http/file-download.ts` (`sendFileDownload` : CSP sandbox, nosniff, no-store) ; `student-portal/upload.config.ts` supprimé ; table `DocumentType` (11 codes dont CERTIFICAT_INSCRIPTION, ATTESTATION_RESULTATS, PIECE_IDENTITE, ATTESTATION_ADMISSION, RELEVE_BAC, RIB, LETTRE_DIRECTEUR_THESE, AUTRE) avec clé étrangère depuis `StudentDocument.type` ; `GET /api/student/document-types` ; e2e `test/documents.e2e-spec.ts`. Réutiliser `UploadedFilesService` pour les pièces de demande (L07, L09).
Bug corrigé au passage : les noms de fichiers accentués étaient décodés en latin1.

### L04 — RIB versionné et IBAN chiffré
Fichiers : `schema.prisma` (Rib), `student-portal/*` (RIB), `admin/*` (RIB), nouveau `src/common/crypto/*`, `prisma/scripts/encrypt-existing-ibans.ts`, `apps/web/src/pages/RibPage.tsx`, `AdminDashboardPage.tsx`, `lib/api.ts`.
Fin : RIB validé conservé jusqu'à validation du nouveau ; IBAN chiffré AES-256-GCM ; empreinte HMAC et alerte IBAN partagé ; `@IsIBAN()` ; révélation admin auditée.
Réalisé : module `src/rib/` (`RibService` : `getForStudent`, `submit`, `cancelPending`, `listPending` paginé, `review`, `revealIban` ; `rib.mapper.ts` ; `SubmitRibDto`) ; `src/common/crypto/` (`FieldCipher` AES-256-GCM avec sous-clés HKDF, `iban.ts` : `normalizeIban`, `maskIban`, `protectIban`, `isValidIban`) ; `DATA_ENCRYPTION_KEY` validée au démarrage (clé de dev par défaut, obligatoire en prod) ; migration manuelle avec contraintes CHECK sur les slots ; `prisma/scripts/encrypt-existing-ibans.ts` exécuté sur la base de dev ; routes `GET /api/student/rib` → `{ active, pending, lastRejected }`, `PATCH /api/student/rib`, `DELETE /api/student/rib/pending`, `GET /api/admin/ribs/pending?page&pageSize`, `GET /api/admin/ribs/:id/iban` ; e2e `test/rib.e2e-spec.ts` ; `RibPage` et file RIB admin adaptées.
Décision utilisateur : les IBAN sont internationaux (France et autres pays d'études), pas sénégalais. Validation = registre ISO 13616 de SWIFT via class-validator. Limite connue : pas d'IBAN au Canada ni aux États-Unis.
Dette : supprimer la colonne `Rib.iban` quand toutes les bases auront été reprises.

### L05 — Maintenabilité API
Fichiers : `schema.prisma` (générateur), imports Prisma, `main.ts`, `app.module.ts`, `prisma/seed.ts`, `test/*`, nouveaux `src/health/*`, `src/common/filters/*`.
Fin : générateur `prisma-client`, logs pino, `/api/health`, filtre d'erreurs Prisma, Swagger hors prod, e2e sur base isolée. Suite complète verte.
Réalisé : client Prisma généré dans `src/generated/prisma` (non versionné, `postinstall: prisma generate`), import `../generated/prisma/client` ; Jest lancé avec `--experimental-vm-modules` (le client charge son moteur WASM par `import()`) et `moduleNameMapper` pour les imports `.js` ; `nestjs-pino` (`src/common/logging/logger.config.ts`, `X-Request-Id`, masquage cookies/mots de passe/IBAN, `LOG_LEVEL`) ; `GET /api/health` (`src/health/`) ; `PrismaExceptionFilter` global ; Swagger sur `/api/docs` hors production avec plugin CLI ; seed refusé en production ; e2e isolés : `test/global-setup.ts` démarre `scripts/dev-db.mjs --memory` (ou utilise `TEST_DATABASE_URL` en CI), migre et seede ; `tsconfig.build.json` limité à `src` (corrige `start:prod`, qui cherchait `dist/main.js`). API compilée vérifiée en réel.

### L06 — Modèle métier et règles pures
Modèles : `AcademicYear` ; `Campaign` (RENEWAL | NEW_APPLICATION, `opensAt`, `closesAt`, `closedAt?`, `maxAgeNonDoctoral`, statut calculé sans cron) ; `CampaignRequirement` ; `ScholarshipRequest` (référence `REN-2026-000123` ou `CAN-…`, `studentId?` ou `applicantId?`, statut, `StudyLevel` L1…M2 / ING1-3 / D1-D4, établissement, ville, pays, filière, résultat N-1 `PASSED|REPEATED|FAILED`, moyenne, bac, changement de filière, attestation sur l'honneur, décision, `version`) avec `@@unique([studentId, campaignId])` et `@@unique([applicantId, campaignId])` ; `RequestDocument` ; `RequestStatusHistory` ; `Notification`. Enums `ScholarshipStatus` (« Repris » → ACTIVE), `PaymentStatus` (« Verse » → PAID) ; `CursusEntry.levelCode/result`.
Fonctions pures testées : machine à états `DRAFT → SUBMITTED → UNDER_REVIEW → (INCOMPLETE ↔ SUBMITTED) → APPROVED | REJECTED`, `WITHDRAWN` avant décision ; éligibilité avec bloquants (bourse annulée ou terminée, campagne fermée, doublon, âge > 30 hors doctorat) et alertes instructeur (2e redoublement dans le cycle, redoublement M2/ING3, doctorat > 3 ans, changement de filière, fin de bourse dépassée).
Seed : année 2026-2027, campagne de renouvellement ouverte jusqu'au 31/12/2026, campagne de candidature, catalogue de pièces, admin et super-admin, étudiants variés.
Réalisé : migration `renewal_and_application_domain` (conversion sans perte « Repris » → ACTIVE et « Verse » → PAID, CHECK propriétaire boursier/candidat, CHECK destinataire de notification, CHECK dates de campagne, séquence `scholarship_request_number_seq`) ; modèle `Applicant` déjà créé (L08 n'ajoute que `OneTimeToken` et la logique) ; `Session.applicantId` ; domaine pur `src/scholarship/domain/` : `study-levels.ts` (cycles, libellés, `compareWithinCycle`), `request-status.ts` (`canTransition`, `assertTransition`, `isEditableByOwner`, libellés), `campaign.ts` (`campaignPhase`, `requirementsFor`, `formatRequestReference`), `eligibility.ts` (`evaluateEligibility`, `ageOn`) + 14 tests ; mapper portail : libellés FR des statuts, champs bruts `amount`, `baseAmount`, `paidAt`, `status` sur les paiements.
Comptes seed : boursiers test@sgee.local (L3), aminata.diop@ (M2), khady.ndiaye@ (D3), ibrahima.sow@ (bourse annulée) / password123 ; admin@sgee.local et superadmin@sgee.local / admin12345 ; candidat candidate@sgee.local / candidat-sgee-2026.
Campagnes seed 2026-2027 : renouvellement du 01/09/2026 au 01/01/2027 exclu (pièces CERTIFICAT_INSCRIPTION, ATTESTATION_RESULTATS, LETTRE_DIRECTEUR_THESE facultative en doctorat) ; candidature du 01/06 au 01/11/2026, 30 ans max (PIECE_IDENTITE, ATTESTATION_ADMISSION, RELEVE_BAC pour PREPA/BTS/LICENCE, RELEVE_NOTES pour MASTER/INGENIEUR/DOCTORAT).

### L07 — API renouvellement boursier
`GET /student/campaigns/current`, `GET|POST /student/requests`, `PATCH /student/requests/:id`, `POST /student/requests/:id/submit|withdraw`, pièces de demande via le pipeline L03, `GET|PATCH /student/notifications`, `GET /student/dashboard` (échéance de campagne, statut de demande, pièces manquantes nommées, dernier versement, prochain versement estimé, progression calculée, montants bruts + devise). SUPER_ADMIN : CRUD `/admin/campaigns` et `/admin/academic-years`. e2e.
Réalisé : `src/notifications/` (service global, `student-notifications.controller.ts`), `src/scholarship/` (`dto/request.dto.ts`, `dto/campaign.dto.ts`, `scholarship.mapper.ts`, `campaigns.service.ts`, `requests.service.ts` avec `RequestOwner` réutilisable pour les candidats, `student-requests.controller.ts`, `admin-campaigns.controller.ts`, `scholarship.module.ts`), `src/student-portal/student-dashboard.service.ts` + route `GET /api/student/dashboard`, nouvelles actions d'audit REQUEST_* / CAMPAIGN_* / ACADEMIC_YEAR_*.
Contrats : `POST /api/student/requests {campaignId}` (422 si bloquant avec `blockers`, 409 si doublon), `PATCH` accepte `version` (409 si périmée) et ignore les champs hors type, `POST .../submit {honorDeclaration:true}` (422 `missingFields`/`missingDocuments`), pièces via `POST .../documents` multipart (`documentTypeCode`, `file`), une demande retirée est reprise à la recréation (même référence). Liens de notification : `/portal/renouvellement?demande=<id>` et `/candidature?demande=<id>`. e2e `test/renewal.e2e-spec.ts` (campagnes de test sur des années 2091+ ouvertes autour de l'heure courante).

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
