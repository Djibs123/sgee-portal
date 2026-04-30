-- CreateEnum
CREATE TYPE "RibStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StudentDocumentStatus" AS ENUM ('REQUIRED', 'PENDING', 'VALIDATED', 'REJECTED');

-- AlterTable
ALTER TABLE "Rib"
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewComment" TEXT;

UPDATE "Rib"
SET "status" = CASE
  WHEN upper("status") = 'VALIDATED' THEN 'VALIDATED'
  WHEN upper("status") = 'REJECTED' THEN 'REJECTED'
  ELSE 'PENDING'
END;

ALTER TABLE "Rib"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "RibStatus" USING "status"::"RibStatus",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "StudentDocument"
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewComment" TEXT;

UPDATE "StudentDocument"
SET
  "status" = CASE
    WHEN upper("status") = 'VALIDATED' THEN 'VALIDATED'
    WHEN upper("status") = 'REJECTED' THEN 'REJECTED'
    WHEN "storagePath" IS NOT NULL OR "fileName" IS NOT NULL THEN 'PENDING'
    ELSE 'REQUIRED'
  END,
  "submittedAt" = CASE
    WHEN "storagePath" IS NOT NULL OR "fileName" IS NOT NULL THEN COALESCE("submittedAt", "uploadedAt", "updatedAt")
    ELSE "submittedAt"
  END;

ALTER TABLE "StudentDocument"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "StudentDocumentStatus" USING "status"::"StudentDocumentStatus",
ALTER COLUMN "status" SET DEFAULT 'REQUIRED';
