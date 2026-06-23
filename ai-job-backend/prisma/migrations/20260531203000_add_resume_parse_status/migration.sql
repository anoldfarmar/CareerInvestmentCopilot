-- 保存 MinerU 异步任务 id，便于后续查询解析进度。
ALTER TABLE "Resume"
ADD COLUMN "mineruTaskId" TEXT,
ADD COLUMN "parseStatus" TEXT NOT NULL DEFAULT 'not_started';

-- 一个 MinerU 任务只能绑定一份简历。
CREATE UNIQUE INDEX "Resume_mineruTaskId_key" ON "Resume"("mineruTaskId");
