-- Link mock interview sessions to the real resume that generated the questions.
ALTER TABLE "InterviewSession" ADD COLUMN IF NOT EXISTS "resumeId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InterviewSession_resumeId_fkey'
  ) THEN
    ALTER TABLE "InterviewSession"
      ADD CONSTRAINT "InterviewSession_resumeId_fkey"
      FOREIGN KEY ("resumeId")
      REFERENCES "Resume"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "InterviewSession_resumeId_idx" ON "InterviewSession"("resumeId");
