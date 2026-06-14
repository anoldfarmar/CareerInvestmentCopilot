import { describe, expect, it } from "vitest";

import { routePaths } from "./routePaths";

describe("routePaths", () => {
  it("builds detail routes with ids", () => {
    expect(routePaths.resumeSuggestions("resume_001")).toBe("/resume-optimize/resume_001/suggestions");
    expect(routePaths.interviewChat("session_001")).toBe("/mock-interview/session_001/chat");
    expect(routePaths.reportDetail("report_001")).toBe("/review-report/report_001");
    expect(routePaths.jobManage).toBe("/jobs");
    expect(routePaths.realInterviewKnowledgeBaseDetail("kb_frontend")).toBe(
      "/review-report/real-interviews/kb_frontend",
    );
  });
});
