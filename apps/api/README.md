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
                    -> LegacyService mock, futur adaptateur ASP/legacy
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
- `path: /`

Identifiants de developpement crees par le seed:

```text
Identifiant: test@sgee.local ou STU001
Mot de passe: password123
```

Le mot de passe est stocke en base sous forme de hash bcrypt dans `Student.passwordHash`.

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

Module d'authentification temporaire.

Il ne fait pas encore de vraie authentification.

Responsabilites actuelles:

- exposer `POST /api/auth/login`
- exposer `POST /api/auth/logout`
- exposer `GET /api/me`
- fournir le contexte etudiant courant via `AuthService`

`AuthService.getCurrentStudent()` cherche actuellement un etudiant avec Prisma:

```ts
this.prisma.student.findFirst()
```

Si aucun etudiant n'existe, un etudiant mock est retourne.

### StudentPortalModule

Module des ressources du portail etudiant.

Endpoints:

- `GET /api/student/rib`
- `GET /api/student/cursus`
- `GET /api/student/payments`
- `GET /api/student/documents`

`StudentPortalService` recupere l'etudiant courant via `AuthService`, puis delegue les donnees metier a `LegacyService`.

### LegacyModule

Frontiere preparee pour l'ancien systeme ASP/legacy.

Pour l'instant, `LegacyService` retourne des donnees mockees pour:

- RIB
- cursus
- paiements
- documents

Plus tard, c'est ici qu'il faudra remplacer les mocks par:

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

Login mock.

Exemple:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"student@example.com\",\"password\":\"demo\"}"
```

Reponse:

```json
{
  "success": true,
  "student": {
    "id": "mock-student-id",
    "studentNumber": "STU-MOCK-001",
    "firstName": "Etudiant",
    "lastName": "SGEE",
    "fullName": "Etudiant SGEE",
    "email": "student@example.com",
    "scholarshipStatus": "PENDING"
  }
}
```

Le controller pose aussi un cookie HttpOnly placeholder `sgee_mock_session`.

#### `POST /api/auth/logout`

Logout mock.

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

Endpoint principal du profil etudiant connecte.

```bash
curl -i http://localhost:3000/api/me
```

Retourne l'etudiant courant centralise par `AuthService`.

### Portail etudiant

#### `GET /api/student/rib`

```bash
curl -i http://localhost:3000/api/student/rib
```

#### `GET /api/student/cursus`

```bash
curl -i http://localhost:3000/api/student/cursus
```

#### `GET /api/student/payments`

```bash
curl -i http://localhost:3000/api/student/payments
```

#### `GET /api/student/documents`

```bash
curl -i http://localhost:3000/api/student/documents
```

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
- Garder `AuthService` responsable du contexte etudiant courant.
- Garder `StudentPortalService` comme orchestrateur.
- Garder `LegacyService` comme frontiere vers l'ancien systeme.
- Ne pas ajouter de JWT/session/auth reelle tant que ce n'est pas demande.
- Ne pas ajouter de logique metier avancee dans cette phase MVP.

## Prochaines etapes recommandees

1. Remplacer progressivement les mocks de `LegacyService` par de vrais appels legacy.
2. Ajouter une vraie strategie d'authentification lorsque le flux utilisateur sera defini.
3. Introduire des DTOs et validation pipes quand les contrats d'entree seront stabilises.
4. Ajouter des tests e2e pour les endpoints `/api/me` et `/api/student/*`.
