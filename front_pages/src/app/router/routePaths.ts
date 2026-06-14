export const routePaths = {
  home: "/",
  resumeOptimize: "/resume-optimize",
  resumeDetail: (resumeId: string) => `/resume-optimize/${resumeId}`,
  resumeSuggestions: (resumeId: string) => `/resume-optimize/${resumeId}/suggestions`,
  resumeCompare: (resumeId: string) => `/resume-optimize/${resumeId}/compare`,
  interviewSetup: "/mock-interview/setup",
  interviewChat: (sessionId: string) => `/mock-interview/${sessionId}/chat`,
  interviewProgress: (sessionId: string) => `/mock-interview/${sessionId}/progress`,
  reportList: "/review-report",
  reportDetail: (reportId: string) => `/review-report/${reportId}`,
  realInterviewKnowledgeBases: "/review-report/real-interviews",
  realInterviewKnowledgeBaseDetail: (knowledgeBaseId: string) =>
    `/review-report/real-interviews/${knowledgeBaseId}`,
  jobManage: "/jobs",
  linkManage: "/jobs",
  profile: "/profile",
  auth: "/auth",
} as const;
