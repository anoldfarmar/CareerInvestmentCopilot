-- 为真实面试记录增加知识库构建产物。
-- structuredContent 保存大模型结构化结果，chunks 保存后续 RAG/向量化可直接使用的片段。
ALTER TABLE "RealInterviewRecord"
ADD COLUMN "buildStatus" TEXT NOT NULL DEFAULT 'not_built',
ADD COLUMN "buildError" TEXT,
ADD COLUMN "structuredContent" JSONB,
ADD COLUMN "chunks" JSONB;

CREATE INDEX "RealInterviewRecord_buildStatus_idx" ON "RealInterviewRecord"("buildStatus");
