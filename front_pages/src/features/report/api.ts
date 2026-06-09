import { http } from "@/services/http";

import { mockReports } from "./mock";
import type { ReviewReport } from "./types";

// 复盘后端尚未接入，当前继续使用本地 Mock。
const useMock = true;

export async function getReports(): Promise<ReviewReport[]> {
  if (!useMock) {
    const { data } = await http.get<ReviewReport[]>("/reports");
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return mockReports;
}

export async function getReport(reportId: string): Promise<ReviewReport> {
  if (!useMock) {
    const { data } = await http.get<ReviewReport>(`/reports/${reportId}`);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return mockReports.find((report) => report.reportId === reportId) ?? mockReports[0];
}

export async function generateReport(sessionId: string): Promise<ReviewReport> {
  if (!useMock) {
    const { data } = await http.post<ReviewReport>("/reports", { sessionId });
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 900));
  return { ...mockReports[0], reportId: "report_001" };
}
