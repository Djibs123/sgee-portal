-- AlterTable
ALTER TABLE "ScholarshipRequest" ADD COLUMN     "warningCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ScholarshipRequest_warningCount_idx" ON "ScholarshipRequest"("warningCount");
