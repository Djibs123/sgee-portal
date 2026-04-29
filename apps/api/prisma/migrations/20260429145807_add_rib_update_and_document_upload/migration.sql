-- AlterTable
ALTER TABLE "StudentDocument" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "storagePath" TEXT,
ADD COLUMN     "uploadedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StudentDocument_uploadedAt_idx" ON "StudentDocument"("uploadedAt");
