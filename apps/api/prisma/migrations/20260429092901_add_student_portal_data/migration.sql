-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "academicYear" TEXT,
ADD COLUMN     "academy" TEXT,
ADD COLUMN     "allocationCfaAmount" INTEGER,
ADD COLUMN     "allocationCurrency" TEXT,
ADD COLUMN     "allocationMonthlyAmount" DECIMAL(10,2),
ADD COLUMN     "arrivalDate" TIMESTAMP(3),
ADD COLUMN     "attributionNumber" TEXT,
ADD COLUMN     "birthCity" TEXT,
ADD COLUMN     "birthCountry" TEXT,
ADD COLUMN     "budget" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "familySituation" TEXT,
ADD COLUMN     "field" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "lastProcessingDate" TIMESTAMP(3),
ADD COLUMN     "level" TEXT,
ADD COLUMN     "matricule" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "progressPercent" INTEGER,
ADD COLUMN     "scholarshipType" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "totalPaidAmount" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "baseAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rib" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "ibanMasked" TEXT NOT NULL,
    "bic" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rib_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursusEntry" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "diploma" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursusEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");

-- CreateIndex
CREATE INDEX "Payment_academicYear_idx" ON "Payment"("academicYear");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Rib_studentId_key" ON "Rib"("studentId");

-- CreateIndex
CREATE INDEX "Rib_studentId_idx" ON "Rib"("studentId");

-- CreateIndex
CREATE INDEX "Rib_status_idx" ON "Rib"("status");

-- CreateIndex
CREATE INDEX "CursusEntry_studentId_idx" ON "CursusEntry"("studentId");

-- CreateIndex
CREATE INDEX "CursusEntry_academicYear_idx" ON "CursusEntry"("academicYear");

-- CreateIndex
CREATE INDEX "CursusEntry_isCurrent_idx" ON "CursusEntry"("isCurrent");

-- CreateIndex
CREATE INDEX "StudentDocument_studentId_idx" ON "StudentDocument"("studentId");

-- CreateIndex
CREATE INDEX "StudentDocument_type_idx" ON "StudentDocument"("type");

-- CreateIndex
CREATE INDEX "StudentDocument_status_idx" ON "StudentDocument"("status");

-- CreateIndex
CREATE INDEX "Student_matricule_idx" ON "Student"("matricule");

-- CreateIndex
CREATE INDEX "Student_academicYear_idx" ON "Student"("academicYear");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rib" ADD CONSTRAINT "Rib_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursusEntry" ADD CONSTRAINT "CursusEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
