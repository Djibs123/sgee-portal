# SGEE Portal API

Backend NestJS du portail SGEE.

Cette API sert de couche backend propre entre le futur frontend du portail, Prisma/PostgreSQL, et l'ancien systeme legacy ASP qui sera branche plus tard.

## Stack

- NestJS + TypeScript
- Prisma 7
- PostgreSQL local
- pnpm
- MiniForge / conda pour l'environnement local

Architecture actuelle:

```text
Frontend -> NestJS API -> Prisma -> PostgreSQL
                    |
                    -> LegacyService placeholder, futur adaptateur ASP/legacy
```

## Demarrage

Depuis `apps/api`:

```bash
pnpm install
pnpm start:dev
```

L'API ecoute sur le port `3000` par defaut, sauf si `PORT` est defini.

Toutes les routes applicatives sont prefixees par `/api`.

## Configuration

Le fichier `.env` doit contenir:

```env
DATABASE_URL="postgresql://Djibil@localhost:5432/sgee_db"
JWT_SECRET="dev-sgee-portal-change-me"
AUTH_COOKIE_NAME="sgee_session"
FRONTEND_ORIGIN="http://localhost:5173"
UPLOAD_DIR="uploads/student-documents"
MAX_UPLOAD_SIZE_MB="5"
```

Prisma 7 utilise `prisma.config.ts` pour la connexion a la base.

Important: avec Prisma 7, `schema.prisma` ne doit pas contenir `url` dans le bloc `datasource`.

## Authentification locale

L'API utilise un JWT signe dans un cookie HttpOnly.

Cookie:

- nom par defaut: `sgee_session`
- `httpOnly: true`
- `sameSite: lax`
- `secure: false` en developpement local
- `secure: true` en production
- `path: /`
- duree: 8 heures

Identifiants de developpement crees par le seed:

```text
Identifiant: test@sgee.local ou STU001
Mot de passe: password123
```

Le mot de passe est stocke en base sous forme de hash bcrypt dans `Student.passwordHash`.

Important:

- ne pas utiliser le `JWT_SECRET` de developpement en production
- en production, `JWT_SECRET` doit etre defini et fort
- lancer `pnpm prisma db seed` pour creer l'utilisateur local de test
- `POST /api/auth/login` est limite a 5 tentatives par minute par IP

## Modules

### AppModule

Point d'assemblage principal.

Modules importes:

- `AuthModule`
- `StudentPortalModule`
- `StudentsModule`

### PrismaModule

Expose `PrismaService`.

`PrismaService`:

- etend `PrismaClient`
- utilise `@prisma/adapter-pg`
- lit `DATABASE_URL`
- connecte Prisma au demarrage du module
- deconnecte Prisma a l'arret du module

### AuthModule

Module d'authentification par JWT stocke dans un cookie HttpOnly.

Responsabilites:

- exposer `POST /api/auth/login`
- exposer `POST /api/auth/logout`
- exposer `GET /api/me`
- verifier le mot de passe avec bcrypt
- signer un JWT de session
- proteger les routes portail via `JwtAuthGuard`
- valider les entrees de login avec `LoginDto`

### StudentPortalModule

Module des ressources du portail etudiant.

Endpoints:

- `GET /api/student/rib`
- `PATCH /api/student/rib`
- `GET /api/student/cursus`
- `GET /api/student/payments`
- `GET /api/student/documents`
- `POST /api/student/documents`

`StudentPortalService` lit les donnees de l'etudiant connecte depuis PostgreSQL via Prisma.

### LegacyModule

Frontiere preparee pour l'ancien systeme ASP/legacy.

Pour l'instant, `LegacyService` reste un placeholder et ne fournit plus les donnees du portail.

Plus tard, c'est ici qu'il faudra ajouter:

- appels HTTP vers l'ancien ASP
- ou acces a une base legacy
- ou tout autre connecteur d'integration

Les controllers du portail ne doivent pas appeler directement le legacy.

### StudentsModule

Module CRUD minimal existant pour `Student`.

Endpoints:

- `POST /api/students`
- `GET /api/students`
- `GET /api/students/:studentNumber`

La route `GET /api/students/:studentNumber` est conservee uniquement comme route legacy/debug. Le flux portail etudiant ne doit pas utiliser de numero etudiant dans l'URL.

## Endpoints

### Auth

#### `POST /api/auth/login`

Login avec identifiant/email et mot de passe.

Exemple:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"test@sgee.local\",\"password\":\"password123\"}"
```

Reponse:

```json
{
  "success": true,
  "student": {
    "studentNumber": "STU001",
    "email": "test@sgee.local"
  }
}
```

Le controller pose aussi le cookie HttpOnly `sgee_session`.

#### `POST /api/auth/logout`

Logout de session.

```bash
curl -i -X POST http://localhost:3000/api/auth/logout
```

Reponse:

```json
{
  "success": true
}
```

#### `GET /api/me`

Endpoint principal du profil etudiant connecte. Route protegee.

```bash
curl -i http://localhost:3000/api/me
```

Retourne l'etudiant authentifie par le cookie JWT.

### Portail etudiant

#### `GET /api/student/rib`

```bash
curl -i http://localhost:3000/api/student/rib
```

Route protegee.

#### `PATCH /api/student/rib`

Met a jour le RIB de l'etudiant connecte. Route protegee.

```bash
curl -i -X PATCH http://localhost:3000/api/student/rib \
  -H "Content-Type: application/json" \
  -d "{\"banque\":\"Banque SGEE\",\"iban\":\"SN123456789012345678901234\",\"adresse\":\"Dakar\",\"telephone\":\"+221770000000\",\"email\":\"rib@sgee.local\"}"
```

Le backend normalise l'IBAN en retirant les espaces et en le passant en majuscules.

#### `GET /api/student/cursus`

```bash
curl -i http://localhost:3000/api/student/cursus
```

Route protegee.

#### `GET /api/student/payments`

```bash
curl -i http://localhost:3000/api/student/payments
```

Route protegee.

#### `GET /api/student/documents`

```bash
curl -i http://localhost:3000/api/student/documents
```

Route protegee.

#### `POST /api/student/documents`

Upload d'un document pour l'etudiant connecte. Route protegee.

```bash
curl -i -X POST http://localhost:3000/api/student/documents \
  -F "type=CERTIFICAT_SCOLARITE" \
  -F "label=Certificat de scolarite" \
  -F "file=@certificat.pdf"
```

Contraintes upload:

- champ fichier: `file`
- stockage local: `apps/api/uploads/student-documents`
- taille max par defaut: 5 Mo
- types MIME acceptes: `application/pdf`, `image/png`, `image/jpeg`
- le dossier `uploads/` est ignore par Git et ne doit pas etre committe

### Students legacy/debug

#### `GET /api/students`

```bash
curl -i http://localhost:3000/api/students
```

#### `POST /api/students`

```bash
curl -i -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d "{\"studentNumber\":\"STU001\",\"firstName\":\"Test\",\"lastName\":\"Student\",\"email\":\"student@example.com\",\"birthDate\":\"2000-01-01\",\"scholarshipStatus\":\"PENDING\"}"
```

#### `GET /api/students/:studentNumber`

Route legacy/debug uniquement.

```bash
curl -i http://localhost:3000/api/students/STU001
```

## Prisma

Schema actuel:

```prisma
model Student {
  id                String   @id @default(uuid())
  studentNumber     String   @unique
  firstName         String
  lastName          String
  email             String   @unique
  birthDate         DateTime
  scholarshipStatus String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @default(now()) @updatedAt
  passwordHash      String?
  lastLoginAt       DateTime?
}
```

Commandes utiles:

```bash
pnpm prisma validate
pnpm prisma format
pnpm prisma migrate dev --name init_student
pnpm prisma generate
pnpm prisma studio
```

## Validation

Depuis `apps/api`:

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:e2e
pnpm prisma validate
```

## Regles de conception actuelles

- Ne pas modifier `apps/web` depuis ce backend.
- Ne pas exposer `studentNumber` dans les URLs du portail etudiant.
- Utiliser `GET /api/me` comme source principale du profil.
- Garder `AuthService` responsable du login et du profil authentifie.
- Garder `StudentPortalService` comme orchestrateur.
- Garder `LegacyService` comme frontiere vers l'ancien systeme.
- Ne pas ajouter de logique metier avancee dans cette phase MVP.

## Prochaines etapes recommandees

1. Brancher progressivement `LegacyService` sur de vrais appels legacy si necessaire.
2. Ajouter une politique de rotation/renouvellement de session si le besoin produit le demande.
3. Introduire des DTOs supplementaires quand les contrats d'entree hors login seront stabilises.
4. Ajouter plus de tests e2e metier pour les endpoints `/api/student/*`.
