-- AlterTable
ALTER TABLE "Student"
ADD COLUMN "email" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

UPDATE "Student"
SET
  "firstName" = COALESCE(NULLIF(split_part("fullName", ' ', 1), ''), 'Test'),
  "lastName" = COALESCE(NULLIF(trim(substr("fullName", length(split_part("fullName", ' ', 1)) + 1)), ''), 'Student'),
  "email" = COALESCE(NULLIF("studentNumber", ''), 'student') || '@example.com'
WHERE "firstName" IS NULL
  OR "lastName" IS NULL
  OR "email" IS NULL;

ALTER TABLE "Student"
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
DROP COLUMN "fullName";

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
