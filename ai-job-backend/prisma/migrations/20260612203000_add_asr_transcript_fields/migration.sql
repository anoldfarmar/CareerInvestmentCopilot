-- 接入 ASR 能力后，真实面试记录需要保存音频公网地址、
-- ASR 原始结果、speaker 转写稿和角色转写稿。
ALTER TABLE "RealInterviewRecord"
ADD COLUMN "audioUrl" TEXT,
ADD COLUMN "asrProvider" TEXT,
ADD COLUMN "asrModel" TEXT,
ADD COLUMN "asrRawJson" JSONB,
ADD COLUMN "speakerTranscript" TEXT,
ADD COLUMN "roleTranscript" TEXT,
ADD COLUMN "transcribedAt" TIMESTAMP(3);
