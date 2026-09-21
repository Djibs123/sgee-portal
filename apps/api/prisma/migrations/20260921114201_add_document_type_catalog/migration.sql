-- CreateTable
CREATE TABLE "DocumentType" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("code")
);

-- Catalogue de référence (procédures SGEE : dossier, renouvellement, candidature).
INSERT INTO "DocumentType" ("code", "label", "description", "sortOrder", "updatedAt") VALUES
  ('CERTIFICAT_INSCRIPTION', 'Certificat d''inscription', 'Certificat d''inscription de l''année universitaire en cours.', 10, CURRENT_TIMESTAMP),
  ('CERTIFICAT_SCOLARITE', 'Certificat de scolarité', NULL, 20, CURRENT_TIMESTAMP),
  ('ATTESTATION_RESULTATS', 'Résultats de l''année précédente', 'Relevé de notes ou attestation de réussite de l''année N-1.', 30, CURRENT_TIMESTAMP),
  ('RELEVE_NOTES', 'Relevé de notes', NULL, 40, CURRENT_TIMESTAMP),
  ('ATTESTATION_ARRIVEE', 'Attestation d''arrivée', NULL, 50, CURRENT_TIMESTAMP),
  ('PIECE_IDENTITE', 'Pièce d''identité ou passeport', 'Carte nationale d''identité ou passeport ordinaire en cours de validité.', 60, CURRENT_TIMESTAMP),
  ('ATTESTATION_ADMISSION', 'Attestation d''admission', 'Admission ou pré-inscription dans un établissement d''enseignement supérieur.', 70, CURRENT_TIMESTAMP),
  ('RELEVE_BAC', 'Relevé de notes du baccalauréat', NULL, 80, CURRENT_TIMESTAMP),
  ('RIB', 'Relevé d''identité bancaire', 'RIB au nom du bénéficiaire.', 90, CURRENT_TIMESTAMP),
  ('LETTRE_DIRECTEUR_THESE', 'Lettre du directeur de thèse', 'Requise pour une dérogation au-delà de la 3e année de doctorat.', 100, CURRENT_TIMESTAMP),
  ('AUTRE', 'Autre justificatif', NULL, 1000, CURRENT_TIMESTAMP);

-- Reprise des types déjà utilisés hors catalogue : aucune perte de données.
INSERT INTO "DocumentType" ("code", "label", "isActive", "sortOrder", "updatedAt")
SELECT DISTINCT d."type", d."type", false, 9000, CURRENT_TIMESTAMP
FROM "StudentDocument" d
WHERE NOT EXISTS (SELECT 1 FROM "DocumentType" t WHERE t."code" = d."type");

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_type_fkey" FOREIGN KEY ("type") REFERENCES "DocumentType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
