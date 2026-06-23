-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "draftContent" JSONB,
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "finalizedContent" JSONB,
ADD COLUMN     "optimizationVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" SERIAL NOT NULL,
    "resumeId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "notes" JSONB,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeExport" (
    "id" SERIAL NOT NULL,
    "resumeId" INTEGER NOT NULL,
    "versionId" INTEGER,
    "versionNumber" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "s3Url" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeVersion_resumeId_createdAt_idx" ON "ResumeVersion"("resumeId", "createdAt");

-- CreateIndex
CREATE INDEX "ResumeVersion_resumeId_isFinal_idx" ON "ResumeVersion"("resumeId", "isFinal");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_resumeId_version_key" ON "ResumeVersion"("resumeId", "version");

-- CreateIndex
CREATE INDEX "ResumeExport_resumeId_generatedAt_idx" ON "ResumeExport"("resumeId", "generatedAt");

-- CreateIndex
CREATE INDEX "ResumeExport_resumeId_isStale_idx" ON "ResumeExport"("resumeId", "isStale");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeExport_resumeId_versionNumber_template_key" ON "ResumeExport"("resumeId", "versionNumber", "template");

-- CreateIndex
CREATE INDEX "Resume_finalizedAt_idx" ON "Resume"("finalizedAt");

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeExport" ADD CONSTRAINT "ResumeExport_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeExport" ADD CONSTRAINT "ResumeExport_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
