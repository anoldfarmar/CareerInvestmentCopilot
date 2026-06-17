CREATE INDEX "Resume_userId_createdAt_idx" ON "Resume"("userId", "createdAt");
CREATE INDEX "Resume_userId_updatedAt_idx" ON "Resume"("userId", "updatedAt");
CREATE INDEX "Resume_parseStatus_idx" ON "Resume"("parseStatus");

CREATE INDEX "Job_userId_updatedAt_idx" ON "Job"("userId", "updatedAt");
CREATE INDEX "Job_userId_status_idx" ON "Job"("userId", "status");

CREATE INDEX "InterviewKnowledgeBase_userId_updatedAt_idx" ON "InterviewKnowledgeBase"("userId", "updatedAt");

CREATE INDEX "RealInterviewRecord_knowledgeBaseId_createdAt_idx" ON "RealInterviewRecord"("knowledgeBaseId", "createdAt");
CREATE INDEX "RealInterviewRecord_status_idx" ON "RealInterviewRecord"("status");

CREATE INDEX "InterviewSession_userId_startedAt_idx" ON "InterviewSession"("userId", "startedAt");
CREATE INDEX "InterviewSession_userId_ended_idx" ON "InterviewSession"("userId", "ended");

CREATE INDEX "ReviewReport_userId_createdAt_idx" ON "ReviewReport"("userId", "createdAt");
