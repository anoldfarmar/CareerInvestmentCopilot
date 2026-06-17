CREATE TABLE IF NOT EXISTS "DailyActivity" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "audioUploadCount" INTEGER NOT NULL DEFAULT 0,
    "mockInterviewCount" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyActivity_userId_date_key" ON "DailyActivity"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyActivity_userId_date_idx" ON "DailyActivity"("userId", "date");

ALTER TABLE "DailyActivity"
ADD CONSTRAINT "DailyActivity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
