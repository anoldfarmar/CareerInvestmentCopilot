import { http } from "@/services/http";
import { unwrapItems, type PaginatedResponse } from "@/services/pagination";

import type { LinkAnalysisSummary, LinkRecord, LinkRecordInput, LinkStatus } from "./types";

function normalizeInput(input: LinkRecordInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    ...(input.company?.trim() ? { company: input.company.trim() } : {}),
    ...(input.sourceUrl?.trim() ? { sourceUrl: input.sourceUrl.trim() } : {}),
  };
}

export async function getLinks(status?: LinkStatus | "all"): Promise<LinkRecord[]> {
  const { data } = await http.get<LinkRecord[] | PaginatedResponse<LinkRecord>>("/jobs");
  const items = unwrapItems(data);

  if (!status || status === "all") return items;
  return items.filter((item) => item.status === status);
}

export async function getLinkAnalysis(): Promise<LinkAnalysisSummary> {
  const { data } = await http.get<LinkAnalysisSummary>("/jobs/analysis/summary");
  return data;
}

export async function createLink(input: LinkRecordInput): Promise<LinkRecord> {
  const { data } = await http.post<LinkRecord>("/jobs", normalizeInput(input));
  return data;
}

export async function updateLink(id: number, input: LinkRecordInput): Promise<LinkRecord> {
  const { data } = await http.patch<LinkRecord>(`/jobs/${id}`, normalizeInput(input));
  return data;
}

export async function deleteLink(id: number): Promise<number> {
  await http.delete(`/jobs/${id}`);
  return id;
}
