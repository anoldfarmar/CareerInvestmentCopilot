import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { lazy, Suspense } from "react";

import { routePaths } from "@/app/router/routePaths";
import { SkeletonState } from "@/components/common/State/State";
import { ProtectedRoute } from "./ProtectedRoute";

const HomePage = lazy(() => import("@/pages/HomePage/HomePage").then((module) => ({ default: module.HomePage })));
const AuthPage = lazy(() => import("@/pages/AuthPage/AuthPage").then((module) => ({ default: module.AuthPage })));
const LinkManagePage = lazy(() =>
  import("@/pages/LinkManagePage/LinkManagePage").then((module) => ({ default: module.LinkManagePage })),
);
const InterviewChatPage = lazy(() =>
  import("@/pages/MockInterviewPage/InterviewChatPage").then((module) => ({ default: module.InterviewChatPage })),
);
const InterviewProgressPage = lazy(() =>
  import("@/pages/MockInterviewPage/InterviewProgressPage").then((module) => ({
    default: module.InterviewProgressPage,
  })),
);
const InterviewSetupPage = lazy(() =>
  import("@/pages/MockInterviewPage/InterviewSetupPage").then((module) => ({ default: module.InterviewSetupPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage/ProfilePage").then((module) => ({ default: module.ProfilePage })),
);
const ReportDetailPage = lazy(() =>
  import("@/pages/ReviewReportPage/ReportDetailPage").then((module) => ({ default: module.ReportDetailPage })),
);
const ReportListPage = lazy(() =>
  import("@/pages/ReviewReportPage/ReportListPage").then((module) => ({ default: module.ReportListPage })),
);
const ResumeComparePage = lazy(() =>
  import("@/pages/ResumeOptimizePage/ResumeComparePage").then((module) => ({ default: module.ResumeComparePage })),
);
const ResumeOptimizePage = lazy(() =>
  import("@/pages/ResumeOptimizePage/ResumeOptimizePage").then((module) => ({ default: module.ResumeOptimizePage })),
);
const ResumeSuggestionsPage = lazy(() =>
  import("@/pages/ResumeOptimizePage/ResumeSuggestionsPage").then((module) => ({
    default: module.ResumeSuggestionsPage,
  })),
);
const KnowledgeBaseDetailPage = lazy(() =>
  import("@/pages/RealInterviewPage/KnowledgeBaseDetailPage").then((module) => ({
    default: module.KnowledgeBaseDetailPage,
  })),
);
const KnowledgeBaseListPage = lazy(() =>
  import("@/pages/RealInterviewPage/KnowledgeBaseListPage").then((module) => ({
    default: module.KnowledgeBaseListPage,
  })),
);

function withPageFallback(element: ReactElement) {
  return <Suspense fallback={<SkeletonState rows={3} />}>{element}</Suspense>;
}

function protectedPage(element: ReactElement) {
  return withPageFallback(<ProtectedRoute>{element}</ProtectedRoute>);
}

export const routes: RouteObject[] = [
  { path: "/", element: withPageFallback(<HomePage />) },
  { path: "/auth", element: withPageFallback(<AuthPage />) },
  { path: "/resume-optimize", element: protectedPage(<ResumeOptimizePage />) },
  { path: "/resume-optimize/:resumeId", element: protectedPage(<ResumeSuggestionsPage />) },
  { path: "/resume-optimize/:resumeId/suggestions", element: protectedPage(<ResumeSuggestionsPage />) },
  { path: "/resume-optimize/:resumeId/compare", element: protectedPage(<ResumeComparePage />) },
  { path: "/mock-interview/setup", element: protectedPage(<InterviewSetupPage />) },
  { path: "/mock-interview/:sessionId/chat", element: protectedPage(<InterviewChatPage />) },
  { path: "/mock-interview/:sessionId/progress", element: protectedPage(<InterviewProgressPage />) },
  { path: "/review-report", element: protectedPage(<ReportListPage />) },
  { path: "/review-report/real-interviews", element: protectedPage(<KnowledgeBaseListPage />) },
  { path: "/review-report/real-interviews/:knowledgeBaseId", element: protectedPage(<KnowledgeBaseDetailPage />) },
  { path: "/review-report/:reportId", element: protectedPage(<ReportDetailPage />) },
  { path: "/jobs", element: protectedPage(<LinkManagePage />) },
  { path: "/link-manage", element: <Navigate to={routePaths.jobManage} replace /> },
  { path: "/profile", element: withPageFallback(<ProfilePage />) },
  { path: "*", element: withPageFallback(<NotFoundPage />) },
];
