ALTER TABLE "InterviewSession" ADD COLUMN "strategySnapshot" JSONB;

ALTER TABLE "ReviewReport" ADD COLUMN "advantageSummary" JSONB;
ALTER TABLE "ReviewReport" ADD COLUMN "weaknessSummary" JSONB;
ALTER TABLE "ReviewReport" ADD COLUMN "interviewerSteeringReview" JSONB;
