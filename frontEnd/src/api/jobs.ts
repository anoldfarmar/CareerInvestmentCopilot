import { isJobStatus } from "../domain/status-contracts";
import { Job } from "../types";
import { apiRequest } from "./client";

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BackendJob {
  id: number;
  title: string;
  company: string;
  description?: string | null;
  sourceUrl?: string | null;
  status?: string | null;
  tags?: string[] | null;
  updatedAt?: string;
}

export interface BackendJobRecommendation {
  index: number;
  title: string;
  url: string;
  summary: string;
  source: string;
  tier: string;
  tierReason: string;
  groupName?: string;
  sourceKey?: string;
}

export interface BackendJobRecommendationResult {
  generatedAt: string;
  intent: {
    targetRoles: string[];
    cities: string[];
    skills: string[];
    availability: string;
    profile: string;
  };
  total: number;
  recommendations: BackendJobRecommendation[];
}

export const jobApi = {
  jobs: () => apiRequest<Paginated<BackendJob>>("/jobs?page=1&pageSize=50"),
  createJob: (input: {
    title: string;
    company?: string;
    description: string;
    sourceUrl?: string;
    status?: string;
  }) =>
    apiRequest<BackendJob>("/jobs", {
      method: "POST",
      body: toCreateJobBody(input),
    }),
  deleteJob: (jobId: string) =>
    apiRequest<BackendJob>(`/jobs/${jobId}`, {
      method: "DELETE",
    }),
  recommendJobs: (input: {
    targetRoles?: string[];
    cities?: string[];
    skills?: string[];
    availability?: string;
    mode?: "fast" | "standard" | "broad";
    maxResults?: number;
    profile?: string;
  }) =>
    apiRequest<BackendJobRecommendationResult>("/jobs/recommendations", {
      method: "POST",
      body: input,
    }),
};

function toCreateJobBody(input: {
  title: string;
  company?: string;
  description: string;
  sourceUrl?: string;
  status?: string;
}) {
  const sourceUrl = input.sourceUrl?.trim();
  return {
    title: input.title.trim(),
    ...(input.company?.trim() ? { company: input.company.trim() } : {}),
    description: input.description.trim(),
    ...(sourceUrl && isHttpUrl(sourceUrl) ? { sourceUrl } : {}),
    ...(isJobStatus(input.status) ? { status: input.status } : {}),
  };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function mapBackendJob(job: BackendJob): Job {
  return {
    id: String(job.id),
    title: job.title,
    company: job.company,
    logoUrl: "",
    logoAlt: job.company,
    description: job.description ?? "暂无岗位描述",
    matchScore: statusToScore(job.status),
    tag: job.tags?.[0] ?? statusToLabel(job.status),
  };
}

function statusToScore(status?: string | null) {
  const scores: Record<string, number> = {
    offer: 96,
    interviewing: 86,
    applied: 72,
    interested: 64,
    draft: 52,
    rejected: 35,
  };
  return scores[status ?? ""] ?? 70;
}

function statusToLabel(status?: string | null) {
  const labels: Record<string, string> = {
    offer: "Offer",
    interviewing: "面试中",
    applied: "已投递",
    interested: "感兴趣",
    draft: "草稿",
    rejected: "未通过",
    archived: "已归档",
  };
  return labels[status ?? ""] ?? "Job";
}
