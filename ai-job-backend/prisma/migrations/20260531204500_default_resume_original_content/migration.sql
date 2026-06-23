-- 新建解析任务前还没有 Markdown，允许简历原始文本暂时使用空字符串。
ALTER TABLE "Resume"
ALTER COLUMN "originalContent" SET DEFAULT '';
