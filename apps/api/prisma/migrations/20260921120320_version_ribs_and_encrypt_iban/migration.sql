-- RIB versionné : un RIB actif et un RIB en attente au plus par étudiant.
DROP INDEX "Rib_studentId_key";

ALTER TABLE "Rib"
  ADD COLUMN "activeSlot" BOOLEAN,
  ADD COLUMN "pendingSlot" BOOLEAN,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "ibanCiphertext" TEXT,
  ADD COLUMN "ibanFingerprint" TEXT,
  ADD COLUMN "ibanLast4" TEXT,
  ALTER COLUMN "iban" DROP NOT NULL;

-- Les slots valent TRUE ou NULL : FALSE contournerait l'unicité.
ALTER TABLE "Rib"
  ADD CONSTRAINT "Rib_activeSlot_check" CHECK ("activeSlot" IS NULL OR "activeSlot"),
  ADD CONSTRAINT "Rib_pendingSlot_check" CHECK ("pendingSlot" IS NULL OR "pendingSlot"),
  ADD CONSTRAINT "Rib_single_slot_check" CHECK (NOT ("activeSlot" IS TRUE AND "pendingSlot" IS TRUE));

-- Reprise sans perte de l'existant (une ligne par étudiant auparavant).
UPDATE "Rib" SET "activeSlot" = TRUE WHERE "status" = 'VALIDATED';
UPDATE "Rib" SET "pendingSlot" = TRUE WHERE "status" = 'PENDING';
UPDATE "Rib"
SET "ibanLast4" = right(regexp_replace("iban", '\s', '', 'g'), 4)
WHERE "iban" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Rib_studentId_activeSlot_key" ON "Rib"("studentId", "activeSlot");
CREATE UNIQUE INDEX "Rib_studentId_pendingSlot_key" ON "Rib"("studentId", "pendingSlot");
CREATE INDEX "Rib_ibanFingerprint_idx" ON "Rib"("ibanFingerprint");
