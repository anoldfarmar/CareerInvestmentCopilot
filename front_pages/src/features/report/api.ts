import { http } from "@/services/http";
import { unwrapItems, type PaginatedResponse } from "@/services/pagination";

import { mockReports } from "./mock";
import type { ReviewReport } from "./types";

// 复盘报告已接入后端真实接口；mock 只作为开发兜底保留。
const useMock = false;

export async function getReports(): Promise<ReviewReport[]> {
  if (!useMock) {
    const { data } = await http.get<ReviewReport[] | PaginatedResponse<ReviewReport>>("/reports");
    return unwrapItems(data);
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

export async function deleteReport(reportId: string): Promise<{ reportId: string }> {
  if (!useMock) {
    const { data } = await http.delete<{ reportId: string }>(`/reports/${reportId}`);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return { reportId };
}
