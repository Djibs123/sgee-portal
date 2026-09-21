-- CreateEnum
CREATE TYPE "ScholarshipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('RENEWAL', 'NEW_APPLICATION');

-- CreateEnum
CREATE TYPE "StudyLevel" AS ENUM ('PREPA1', 'PREPA2', 'BTS1', 'BTS2', 'L1', 'L2', 'L3', 'M1', 'M2', 'ING1', 'ING2', 'ING3', 'D1', 'D2', 'D3', 'D4', 'OTHER');

-- CreateEnum
CREATE TYPE "StudyCycle" AS ENUM ('PREPA', 'BTS', 'LICENCE', 'MASTER', 'INGENIEUR', 'DOCTORAT', 'OTHER');

-- CreateEnum
CREATE TYPE "AcademicResult" AS ENUM ('PASSED', 'REPEATED', 'FAILED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INCOMPLETE', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "CursusEntry" ADD COLUMN     "levelCode" "StudyLevel",
ADD COLUMN     "result" "AcademicResult";

-- AlterTable : conversion des libellés hérités sans perte ("Verse" -> PAID).
ALTER TABLE "Payment"
  ALTER COLUMN "status" TYPE "PaymentStatus" USING (
    CASE
      WHEN lower(trim("status")) IN ('pending', 'en attente', 'a verser', 'à verser') THEN 'PENDING'
      WHEN lower(trim("status")) LIKE 'annul%' OR upper(trim("status")) = 'CANCELLED' THEN 'CANCELLED'
      ELSE 'PAID'
    END
  )::"PaymentStatus",
  ALTER COLUMN "status" SET DEFAULT 'PAID';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "applicantId" TEXT;

-- AlterTable : conversion des libellés hérités sans perte ("Repris" -> ACTIVE).
ALTER TABLE "Student" ADD COLUMN "levelCode" "StudyLevel";
ALTER TABLE "Student"
  ALTER COLUMN "scholarshipStatus" TYPE "ScholarshipStatus" USING (
    CASE
      WHEN lower(trim("scholarshipStatus")) LIKE 'suspen%' THEN 'SUSPENDED'
      WHEN lower(trim("scholarshipStatus")) LIKE 'annul%' OR upper(trim("scholarshipStatus")) = 'CANCELLED' THEN 'CANCELLED'
      WHEN lower(trim("scholarshipStatus")) LIKE 'termin%' OR lower(trim("scholarshipStatus")) LIKE 'achev%' OR upper(trim("scholarshipStatus")) = 'COMPLETED' THEN 'COMPLETED'
      ELSE 'ACTIVE'
    END
  )::"ScholarshipStatus",
  ALTER COLUMN "scholarshipStatus" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "phone" TEXT,
    "nationalIdNumber" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "maxAgeNonDoctoral" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRequirement" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "documentTypeCode" TEXT NOT NULL,
    "cycles" "StudyCycle"[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "campaignId" TEXT NOT NULL,
    "studentId" TEXT,
    "applicantId" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "targetLevel" "StudyLevel",
    "institution" TEXT,
    "city" TEXT,
    "country" TEXT,
    "fieldOfStudy" TEXT,
    "programName" TEXT,
    "previousLevel" "StudyLevel",
    "previousResult" "AcademicResult",
    "previousAverage" DECIMAL(4,2),
    "changedField" BOOLEAN NOT NULL DEFAULT false,
    "changedInstitution" BOOLEAN NOT NULL DEFAULT false,
    "baccalaureateSeries" TEXT,
    "baccalaureateYear" INTEGER,
    "baccalaureateMention" TEXT,
    "baccalaureateAverage" DECIMAL(4,2),
    "motivation" TEXT,
    "honorDeclarationAt" TIMESTAMP(3),
    "eligibilityWarnings" JSONB,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionComment" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScholarshipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "documentTypeCode" TEXT NOT NULL,
    "status" "StudentDocumentStatus" NOT NULL DEFAULT 'REQUIRED',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "fileName" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "storagePath" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestStatusHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" "RequestStatus",
    "toStatus" "RequestStatus" NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "applicantId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_email_key" ON "Applicant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_studentId_key" ON "Applicant"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_code_key" ON "AcademicYear"("code");

-- CreateIndex
CREATE INDEX "Campaign_opensAt_closesAt_idx" ON "Campaign"("opensAt", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_type_academicYearId_key" ON "Campaign"("type", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRequirement_campaignId_documentTypeCode_key" ON "CampaignRequirement"("campaignId", "documentTypeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipRequest_reference_key" ON "ScholarshipRequest"("reference");

-- CreateIndex
CREATE INDEX "ScholarshipRequest_campaignId_status_idx" ON "ScholarshipRequest"("campaignId", "status");

-- CreateIndex
CREATE INDEX "ScholarshipRequest_status_submittedAt_idx" ON "ScholarshipRequest"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipRequest_studentId_campaignId_key" ON "ScholarshipRequest"("studentId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipRequest_applicantId_campaignId_key" ON "ScholarshipRequest"("applicantId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestDocument_requestId_documentTypeCode_key" ON "RequestDocument"("requestId", "documentTypeCode");

-- CreateIndex
CREATE INDEX "RequestStatusHistory_requestId_createdAt_idx" ON "RequestStatusHistory"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_studentId_readAt_idx" ON "Notification"("studentId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_applicantId_readAt_idx" ON "Notification"("applicantId", "readAt");

-- CreateIndex
CREATE INDEX "Session_applicantId_idx" ON "Session"("applicantId");

-- CreateIndex
CREATE INDEX "Student_scholarshipStatus_idx" ON "Student"("scholarshipStatus");

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRequirement" ADD CONSTRAINT "CampaignRequirement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRequirement" ADD CONSTRAINT "CampaignRequirement_documentTypeCode_fkey" FOREIGN KEY ("documentTypeCode") REFERENCES "DocumentType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRequest" ADD CONSTRAINT "ScholarshipRequest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRequest" ADD CONSTRAINT "ScholarshipRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRequest" ADD CONSTRAINT "ScholarshipRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRequest" ADD CONSTRAINT "ScholarshipRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocument" ADD CONSTRAINT "RequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ScholarshipRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocument" ADD CONSTRAINT "RequestDocument_documentTypeCode_fkey" FOREIGN KEY ("documentTypeCode") REFERENCES "DocumentType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestStatusHistory" ADD CONSTRAINT "RequestStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ScholarshipRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Une demande appartient soit à un boursier (renouvellement), soit à un candidat.
ALTER TABLE "ScholarshipRequest"
  ADD CONSTRAINT "ScholarshipRequest_owner_check" CHECK (
    ("type" = 'RENEWAL' AND "studentId" IS NOT NULL AND "applicantId" IS NULL)
    OR ("type" = 'NEW_APPLICATION' AND "applicantId" IS NOT NULL AND "studentId" IS NULL)
  );

-- Une notification cible exactement un destinataire.
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_recipient_check" CHECK (num_nonnulls("studentId", "applicantId") = 1);

-- Une campagne se ferme après son ouverture.
ALTER TABLE "Campaign"
  ADD CONSTRAINT "Campaign_dates_check" CHECK ("closesAt" > "opensAt");

-- Numérotation des références de demande (REN-2026-000001, CAN-2026-000002…).
CREATE SEQUENCE "scholarship_request_number_seq";
