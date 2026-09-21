-- CreateEnum
CREATE TYPE "OneTimeTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "OneTimeToken" (
    "id" TEXT NOT NULL,
    "purpose" "OneTimeTokenPurpose" NOT NULL,
    "subjectType" "SessionSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneTimeToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeToken_tokenHash_key" ON "OneTimeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OneTimeToken_subjectType_subjectId_purpose_idx" ON "OneTimeToken"("subjectType", "subjectId", "purpose");

-- CreateIndex
CREATE INDEX "OneTimeToken_expiresAt_idx" ON "OneTimeToken"("expiresAt");
