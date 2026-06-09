import type { RouteObject } from "react-router-dom";

import { HomePage } from "@/pages/HomePage/HomePage";
import { AuthPage } from "@/pages/AuthPage/AuthPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { LinkManagePage } from "@/pages/LinkManagePage/LinkManagePage";
import { InterviewChatPage } from "@/pages/MockInterviewPage/InterviewChatPage";
import { InterviewProgressPage } from "@/pages/MockInterviewPage/InterviewProgressPage";
import { InterviewSetupPage } from "@/pages/MockInterviewPage/InterviewSetupPage";
import { NotFoundPage } from "@/pages/NotFoundPage/NotFoundPage";
import { ProfilePage } from "@/pages/ProfilePage/ProfilePage";
import { ReportDetailPage } from "@/pages/ReviewReportPage/ReportDetailPage";
import { ReportListPage } from "@/pages/ReviewReportPage/ReportListPage";
import { ResumeComparePage } from "@/pages/ResumeOptimizePage/ResumeComparePage";
import { ResumeOptimizePage } from "@/pages/ResumeOptimizePage/ResumeOptimizePage";
import { ResumeSuggestionsPage } from "@/pages/ResumeOptimizePage/ResumeSuggestionsPage";
import { KnowledgeBaseDetailPage } from "@/pages/RealInterviewPage/KnowledgeBaseDetailPage";
import { KnowledgeBaseListPage } from "@/pages/RealInterviewPage/KnowledgeBaseListPage";

export const routes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/auth", element: <AuthPage /> },
  { path: "/resume-optimize", element: <ProtectedRoute><ResumeOptimizePage /></ProtectedRoute> },
  { path: "/resume-optimize/:resumeId", element: <ProtectedRoute><ResumeSuggestionsPage /></ProtectedRoute> },
  { path: "/resume-optimize/:resumeId/suggestions", element: <ProtectedRoute><ResumeSuggestionsPage /></ProtectedRoute> },
  { path: "/resume-optimize/:resumeId/compare", element: <ProtectedRoute><ResumeComparePage /></ProtectedRoute> },
  { path: "/mock-interview/setup", element: <ProtectedRoute><InterviewSetupPage /></ProtectedRoute> },
  { path: "/mock-interview/:sessionId/chat", element: <ProtectedRoute><InterviewChatPage /></ProtectedRoute> },
  { path: "/mock-interview/:sessionId/progress", element: <ProtectedRoute><InterviewProgressPage /></ProtectedRoute> },
  { path: "/review-report", element: <ProtectedRoute><ReportListPage /></ProtectedRoute> },
  { path: "/review-report/real-interviews", element: <ProtectedRoute><KnowledgeBaseListPage /></ProtectedRoute> },
  { path: "/review-report/real-interviews/:knowledgeBaseId", element: <ProtectedRoute><KnowledgeBaseDetailPage /></ProtectedRoute> },
  { path: "/review-report/:reportId", element: <ProtectedRoute><ReportDetailPage /></ProtectedRoute> },
  { path: "/link-manage", element: <ProtectedRoute><LinkManagePage /></ProtectedRoute> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "*", element: <NotFoundPage /> },
];
