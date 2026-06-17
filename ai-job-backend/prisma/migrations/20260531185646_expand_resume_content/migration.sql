-- 保留已有简历正文，仅将列名调整为更准确的 originalContent。
ALTER TABLE "Resume" RENAME COLUMN "content" TO "originalContent";

-- 增加 AI 解析结果和 AI 优化结果。JSONB 适合保存结构化简历数据。
ALTER TABLE "Resume"
ADD COLUMN "structuredContent" JSONB,
ADD COLUMN "optimizedContent" JSONB;
