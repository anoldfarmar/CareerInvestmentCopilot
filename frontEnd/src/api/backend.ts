import { ActivityDay, InterviewReport, InterviewSession, Job, Resume } from "../types";
import { API_BASE_URL, ApiError, apiRequest, getAuthToken, setAuthToken } from "./client";

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface BackendLoginResult {
  accessToken: string;
}

export interface BackendJob {
  id: number;
  title: string;
  company?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  status?: string | null;
  salary?: string | null;
  location?: string | null;
  notes?: string | null;
  priority?: "normal" | "urgent" | string | null;
  tags?: string[] | null;
  createdAt?: string;
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
  sourceStats?: Record<string, number>;
  recommendations: BackendJobRecommendation[];
}

interface BackendResume {
  id: number;
  title?: string | null;
  name?: string | null;
  updatedAt?: string;
  optimizedContent?: unknown;
  jdMatchResult?: unknown;
  structuredContent?: unknown;
  parseStatus?: string | null;
  structureStatus?: string | null;
  optimizeStatus?: string | null;
  finalizedAt?: string | null;
  originalFileName?: string | null;
  originalFileUrl?: string | null;
}

export interface BackendResumeVersion {
  id: number;
  resumeId: number;
  version: number;
  label: string;
  source: string;
  content: unknown;
  notes?: unknown;
  isFinal: boolean;
  createdAt?: string;
}

export interface BackendReport {
  reportId?: string;
  id?: string;
  title?: string | null;
  score?: number | null;
  level?: string | null;
  summary?: string | null;
  highlights?: unknown;
  suggestions?: unknown;
  actionPlans?: unknown;
  transcript?: unknown;
  dimensions?: unknown;
  questions?: unknown;
  nextActions?: unknown;
  topDirections?: unknown;
  companyName?: string | null;
  positionName?: string | null;
  resumeName?: string | null;
  createdAt?: string;
}

export interface BackendKnowledgeRecord {
  id: string;
  knowledgeBaseId: string;
  title: string;
  sourceType: string;
  interviewDate: string;
  transcript?: string;
  audioFileName?: string;
  audioFileSize?: number;
  audioUrl?: string;
  asrProvider?: string;
  asrModel?: string;
  speakerTranscript?: string;
  roleTranscript?: string;
  transcribedAt?: string;
  status: string;
  buildStatus: string;
  buildError?: string;
  structuredContent?: unknown;
  chunks?: unknown[];
  impactStats?: {
    monthlyQuestionCount?: number;
    recommendation?: string;
  };
  createdAt: string;
}

export interface BackendKnowledgeBase {
  id: string;
  name: string;
  description?: string;
  recordCount?: number;
  focusAreas?: unknown[];
  updatedAt?: string;
  records?: BackendKnowledgeRecord[];
  impactStats?: {
    monthlyQuestionCount?: number;
    recommendation?: string;
  };
}

export interface BackendProfile {
  name: string;
  jobMode: string;
  targetDirection: string;
  targetDirections: string[];
  customTargetDirection: string;
  subscriptionPlan: "free" | "premium";
  language: "zh-CN" | "en-US";
  questionCount: number;
  enableVoiceInput: boolean;
  showStarTips: boolean;
  subscription?: {
    plan: string;
    planLabel: string;
    limits: string[];
    benefits: string[];
    upgradeEnabled: boolean;
  };
}

export interface BackendOverview {
  kpis: Array<{ label: string; value: number; unit: string }>;
  recentReportTitle: string;
  mode: string;
  pipeline?: {
    applications: number;
    interviews: number;
    offers: number;
  };
  activity?: {
    todayCount: number;
    level: number;
    calendar?: ActivityDay[];
  };
  suggestedTodos?: Array<{
    id: string;
    text: string;
    icon: string;
    isHighPriority?: boolean;
  }>;
}

export interface BackendInterviewProgress {
  sessionId: string;
  stage: "running" | "ended";
  currentQuestion: number;
  totalQuestions: number;
  usedMinutes: number;
  averageAnswerSeconds: number;
  totalWords: number;
  distribution: Array<{ label: string; done: number; total: number }>;
}

export async function login(email: string, password: string) {
  const result = await apiRequest<BackendLoginResult>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setAuthToken(result.accessToken);
  return result;
}

export async function register(email: string, password: string, name?: string) {
  const result = await apiRequest<BackendLoginResult>("/auth/register", {
    method: "POST",
    body: { email, password, name },
  });
  setAuthToken(result.accessToken);
  return result;
}

const allowedJobStatuses = new Set([
  "draft",
  "interested",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
]);

export const backendApi = {
  me: () => apiRequest("/auth/me"),
  overview: () => apiRequest<BackendOverview>("/overview"),
  jobs: () => apiRequest<Paginated<BackendJob>>("/jobs?page=1&pageSize=50"),
  createJob: (input: {
    title: string;
    company?: string;
    description: string;
    sourceUrl?: string;
    status?: string;
    salary?: string;
    location?: string;
    notes?: string;
    priority?: "normal" | "urgent";
  }) =>
    apiRequest<BackendJob>("/jobs", {
      method: "POST",
      body: toCreateJobBody(input),
    }),
  updateJob: (
    id: string | number,
    input: Partial<{
      title: string;
      company: string;
      description: string;
      sourceUrl: string;
      status: string;
      salary: string;
      location: string;
      notes: string;
      priority: "normal" | "urgent";
    }>,
  ) =>
    apiRequest<BackendJob>(`/jobs/${id}`, {
      method: "PATCH",
      body: toUpdateJobBody(input),
    }),
  deleteJob: (id: string | number) =>
    apiRequest<BackendJob>(`/jobs/${id}`, {
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
  resumes: () => apiRequest<Paginated<BackendResume>>("/resumes?page=1&pageSize=50"),
  reports: () => apiRequest<Paginated<BackendReport>>("/reports?page=1&pageSize=50"),
  report: (reportId: string) => apiRequest<BackendReport>(`/reports/${reportId}`),
  profile: () => apiRequest<BackendProfile>("/profile"),
  updateProfile: (input: Partial<BackendProfile>) =>
    apiRequest<BackendProfile>("/profile", {
      method: "PUT",
      body: toProfileBody(input),
    }),
  deleteProfile: () =>
    apiRequest<BackendProfile>("/profile", {
      method: "DELETE",
    }),
  knowledgeBases: () => apiRequest<Paginated<BackendKnowledgeBase>>("/interview-knowledge-bases?page=1&pageSize=20"),
  createKnowledgeBase: (input: { name: string; description?: string; focusAreas?: string[] }) =>
    apiRequest<BackendKnowledgeBase>("/interview-knowledge-bases", {
      method: "POST",
      body: toKnowledgeBaseBody(input),
    }),
  knowledgeBase: (id: string) =>
    apiRequest<BackendKnowledgeBase>(`/interview-knowledge-bases/${id}`),
  deleteKnowledgeBase: (id: string) =>
    apiRequest<{ id: string }>(`/interview-knowledge-bases/${id}`, {
      method: "DELETE",
    }),
  createManualKnowledgeRecord: (
    knowledgeBaseId: string,
    input: { title: string; interviewDate: string; transcript?: string },
  ) =>
    apiRequest<BackendKnowledgeRecord>(`/interview-knowledge-bases/${knowledgeBaseId}/records/manual`, {
      method: "POST",
      body: toManualRecordBody(input),
    }),
  buildKnowledgeRecord: (knowledgeBaseId: string, recordId: string) =>
    apiRequest<BackendKnowledgeRecord>(
      `/interview-knowledge-bases/${knowledgeBaseId}/records/${recordId}/build`,
      { method: "POST" },
    ),
  deleteKnowledgeRecord: (knowledgeBaseId: string, recordId: string) =>
    apiRequest<{ id: string; knowledgeBaseId: string }>(
      `/interview-knowledge-bases/${knowledgeBaseId}/records/${recordId}`,
      { method: "DELETE" },
    ),
  uploadAudioReview: (input: {
    title: string;
    interviewDate: string;
    file: File;
    onUploadProgress?: (progress: number) => void;
  }) => uploadAudioReviewThroughKnowledgeBase(input),
  transcribeKnowledgeRecord: (knowledgeBaseId: string, recordId: string, audioUrl?: string) =>
    apiRequest<BackendKnowledgeRecord>(
      `/interview-knowledge-bases/${knowledgeBaseId}/records/${recordId}/transcribe`,
      {
        method: "POST",
        body: audioUrl ? { audioUrl } : {},
      },
    ),
  uploadKnowledgeAudioRecord: (
    knowledgeBaseId: string,
    input: {
      title: string;
      interviewDate: string;
      file: File;
      onUploadProgress?: (progress: number) => void;
    },
  ) => {
    const formData = new FormData();
    formData.append("title", input.title);
    formData.append("interviewDate", input.interviewDate);
    formData.append("audioFile", input.file);
    return uploadFormWithProgress<BackendKnowledgeRecord>(
      `/interview-knowledge-bases/${knowledgeBaseId}/records/audio`,
      formData,
      input.onUploadProgress,
    );
  },
  createInterviewSession: (data: {
    interviewType: "general" | "professional" | "behavioral" | "stress" | "english";
    questionCount: number;
    resumeId?: string | number;
    jobDescription?: string;
    knowledgeBaseIds?: string[];
    enableFollowUp?: boolean;
    enableVoiceInput?: boolean;
    language?: string;
  }) =>
    apiRequest<InterviewSession>("/interviews/sessions", {
      method: "POST",
      body: data,
    }),
  latestActiveInterviewSession: () =>
    apiRequest<InterviewSession | null>("/interviews/sessions/active/latest"),
  interviewSession: (sessionId: string) =>
    apiRequest<InterviewSession>(`/interviews/sessions/${sessionId}`),
  addInterviewQuestion: (
    sessionId: string,
    input: { content?: string; dimension?: "general" | "professional" | "behavioral" | "stress" | "english" },
  ) =>
    apiRequest<InterviewSession>(`/interviews/sessions/${sessionId}/questions`, {
      method: "POST",
      body: input,
    }),
  skipInterviewQuestion: (sessionId: string, questionId: string) =>
    apiRequest<InterviewSession>(`/interviews/sessions/${sessionId}/questions/${questionId}/skip`, {
      method: "POST",
    }),
  submitQuestionFeedback: (
    sessionId: string,
    questionId: string,
    input: { difficultyRating: number; relevanceRating: number; isRepeated?: boolean; comment?: string },
  ) =>
    apiRequest<InterviewSession>(`/interviews/sessions/${sessionId}/questions/${questionId}/feedback`, {
      method: "POST",
      body: input,
    }),
  interviewProgress: (sessionId: string) =>
    apiRequest<BackendInterviewProgress>(`/interviews/sessions/${sessionId}/progress`),
  submitInterviewAnswer: (sessionId: string, answer: string) =>
    apiRequest<InterviewSession>(`/interviews/sessions/${sessionId}/answer`, {
      method: "POST",
      body: { answer },
    }),
  nextInterviewQuestion: (sessionId: string) =>
    apiRequest<InterviewSession>(`/interviews/sessions/${sessionId}/next-question`, {
      method: "POST",
    }),
  endInterviewSession: (sessionId: string) =>
    apiRequest(`/interviews/sessions/${sessionId}/end`, {
      method: "POST",
    }),
  generateInterviewReport: (sessionId: string) =>
    apiRequest<BackendReport>("/reports", {
      method: "POST",
      body: { sessionId },
    }),
  uploadResume: (file: File) => {
    return uploadResumeForParsing(file);
  },
  syncResumeParse: (id: string | number) => apiRequest<BackendResume>(`/resumes/${id}/parse`),
  updateResume: (id: string | number, input: { title: string }) =>
    apiRequest<BackendResume>(`/resumes/${id}`, {
      method: "PATCH",
      body: { title: input.title.trim() },
    }),
  structureResume: (id: string | number) =>
    apiRequest<BackendResume>(`/resumes/${id}/structure`, {
      method: "POST",
    }),
  optimizeResume: (
    id: string | number,
    input: { jobDescription?: string; additionalInstruction?: string },
  ) =>
    apiRequest<BackendResume>(`/resumes/${id}/optimize`, {
      method: "POST",
      body: toOptimizeResumeBody(input),
    }),
  resumeVersions: (id: string | number) =>
    apiRequest<BackendResumeVersion[]>(`/resumes/${id}/versions`),
  updateResumeVersion: (id: string | number, versionId: string | number, label: string) =>
    apiRequest<BackendResumeVersion>(`/resumes/${id}/versions/${versionId}`, {
      method: "PATCH",
      body: { label: label.trim() },
    }),
  saveOptimizedResume: (id: string | number, content: unknown) =>
    apiRequest<BackendResume>(`/resumes/${id}/optimized-content`, {
      method: "PUT",
      body: content,
    }),
  finalizeResume: (id: string | number, label?: string) =>
    apiRequest<BackendResume>(`/resumes/${id}/finalize`, {
      method: "POST",
      body: { label },
    }),
  exportResumePdf: (id: string | number, template = "classic") =>
    apiBlobRequest(`/resumes/${id}/export/pdf?template=${encodeURIComponent(template)}`, {
      method: "POST",
    }, 60_000),
  deleteResume: (id: string | number) =>
    apiRequest<BackendResume>(`/resumes/${id}`, {
      method: "DELETE",
    }),
};

function toCreateJobBody(input: {
  title: string;
  company?: string;
  description: string;
  sourceUrl?: string;
  status?: string;
  salary?: string;
  location?: string;
  notes?: string;
  priority?: "normal" | "urgent";
}) {
  const sourceUrl = input.sourceUrl?.trim();
  return {
    title: input.title.trim(),
    ...(input.company?.trim() ? { company: input.company.trim() } : {}),
    description: input.description.trim(),
    ...(sourceUrl && isHttpUrl(sourceUrl) ? { sourceUrl } : {}),
    ...(input.status && allowedJobStatuses.has(input.status) ? { status: input.status } : {}),
    ...(input.salary?.trim() ? { salary: input.salary.trim() } : {}),
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
  };
}

function toUpdateJobBody(input: Partial<{
  title: string;
  company: string;
  description: string;
  sourceUrl: string;
  status: string;
  salary: string;
  location: string;
  notes: string;
  priority: "normal" | "urgent";
}>) {
  const sourceUrl = input.sourceUrl?.trim();
  return {
    ...(typeof input.title === "string" ? { title: input.title.trim() } : {}),
    ...(typeof input.company === "string" ? { company: input.company.trim() } : {}),
    ...(typeof input.description === "string" ? { description: input.description.trim() } : {}),
    ...(typeof input.sourceUrl === "string" ? { sourceUrl: sourceUrl && isHttpUrl(sourceUrl) ? sourceUrl : undefined } : {}),
    ...(input.status && allowedJobStatuses.has(input.status) ? { status: input.status } : {}),
    ...(typeof input.salary === "string" ? { salary: input.salary.trim() } : {}),
    ...(typeof input.location === "string" ? { location: input.location.trim() } : {}),
    ...(typeof input.notes === "string" ? { notes: input.notes.trim() } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
  };
}

function toProfileBody(input: Partial<BackendProfile>) {
  return {
    ...(typeof input.name === "string" ? { name: input.name } : {}),
    ...(typeof input.jobMode === "string" ? { jobMode: input.jobMode } : {}),
    ...(typeof input.targetDirection === "string" ? { targetDirection: input.targetDirection } : {}),
    ...(Array.isArray(input.targetDirections) ? { targetDirections: input.targetDirections } : {}),
    ...(typeof input.customTargetDirection === "string"
      ? { customTargetDirection: input.customTargetDirection }
      : {}),
    ...(typeof input.subscriptionPlan === "string" ? { subscriptionPlan: input.subscriptionPlan } : {}),
    ...(typeof input.language === "string" ? { language: input.language } : {}),
    ...(typeof input.questionCount === "number" ? { questionCount: input.questionCount } : {}),
    ...(typeof input.enableVoiceInput === "boolean" ? { enableVoiceInput: input.enableVoiceInput } : {}),
    ...(typeof input.showStarTips === "boolean" ? { showStarTips: input.showStarTips } : {}),
  };
}

function toKnowledgeBaseBody(input: { name: string; description?: string; focusAreas?: string[] }) {
  return {
    name: input.name.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(Array.isArray(input.focusAreas) ? { focusAreas: input.focusAreas.filter(Boolean) } : {}),
  };
}

function toManualRecordBody(input: { title: string; interviewDate: string; transcript?: string }) {
  return {
    title: input.title.trim(),
    interviewDate: input.interviewDate,
    ...(input.transcript?.trim() ? { transcript: input.transcript.trim() } : {}),
  };
}

function toOptimizeResumeBody(input: { jobDescription?: string; additionalInstruction?: string }) {
  return {
    ...(input.jobDescription?.trim() ? { jobDescription: input.jobDescription.trim() } : {}),
    ...(input.additionalInstruction?.trim()
      ? { additionalInstruction: input.additionalInstruction.trim() }
      : {}),
  };
}

async function uploadResumeForParsing(file: File) {
  const created = await apiRequest<BackendResume>("/resumes", {
    method: "POST",
    body: { title: file.name },
  });

  const formData = new FormData();
  formData.append("file", file);

  try {
    return await apiRequest<BackendResume>(`/resumes/${created.id}/parse/upload`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return {
        ...created,
        parseStatus: "unsupported",
      };
    }
    throw error;
  }
}

async function uploadAudioReviewThroughKnowledgeBase(input: {
  title: string;
  interviewDate: string;
  file: File;
  onUploadProgress?: (progress: number) => void;
}) {
  const knowledgeBase = await ensureAudioReviewKnowledgeBase();
  const uploaded = await backendApi.uploadKnowledgeAudioRecord(knowledgeBase.id, input);

  if (!uploaded.audioUrl) {
    return uploaded;
  }

  try {
    const transcribed = await backendApi.transcribeKnowledgeRecord(
      knowledgeBase.id,
      uploaded.id,
      uploaded.audioUrl,
    );

    if (transcribed.status !== "ready" || !transcribed.transcript?.trim()) {
      return transcribed;
    }

    return await backendApi.buildKnowledgeRecord(knowledgeBase.id, transcribed.id);
  } catch {
    return uploaded;
  }
}

async function ensureAudioReviewKnowledgeBase() {
  const list = await apiRequest<Paginated<BackendKnowledgeBase>>(
    "/interview-knowledge-bases?page=1&pageSize=50",
  );
  const existing = list.items.find((item) => item.name === "Audio Reviews");

  if (existing) {
    return existing;
  }

  return apiRequest<BackendKnowledgeBase>("/interview-knowledge-bases", {
    method: "POST",
    body: {
      name: "Audio Reviews",
      description: "Uploaded interview audio reviews",
      focusAreas: ["interview", "review"],
    },
  });
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function uploadFormWithProgress<T>(
  path: string,
  formData: FormData,
  onUploadProgress?: (progress: number) => void,
) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);

    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type") ?? "";
      const response = contentType.includes("application/json")
        ? JSON.parse(xhr.responseText || "{}")
        : xhr.responseText;

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response as T);
        return;
      }

      const message =
        typeof response === "object" && response && "message" in response
          ? String((response as { message: unknown }).message)
          : `API request failed with ${xhr.status}`;
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("网络连接失败，录音上传未完成。"));
    xhr.send(formData);
  });
}

async function apiBlobRequest(path: string, options: RequestInit = {}, timeoutMs = 45_000) {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("PDF 导出超时，请稍后重试。");
    }
    throw new Error(`无法连接后端 ${API_BASE_URL}${path}，PDF 导出失败。`);
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const details = await readResponse(response);
    const message =
      typeof details === "object" && details && "message" in details
        ? String((details as { message: unknown }).message)
        : typeof details === "string" && details
          ? details
          : `PDF 导出失败，状态码 ${response.status}`;
    throw new Error(message);
  }

  return response.blob();
}

async function readResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export function mapBackendJob(job: BackendJob): Job {
  const company = job.company?.trim() || "未知公司";

  return {
    id: String(job.id),
    title: job.title,
    company,
    logoUrl: "",
    logoAlt: company,
    description: job.description ?? "暂无岗位描述",
    sourceUrl: job.sourceUrl ?? undefined,
    salary: job.salary ?? undefined,
    location: job.location ?? undefined,
    notes: job.notes ?? undefined,
    priority: job.priority === "urgent" ? "urgent" : "normal",
    status: job.status ?? undefined,
    updatedAt: formatDate(job.updatedAt),
    matchScore: statusToScore(job.status),
    tag: job.tags?.[0] ?? statusToLabel(job.status),
  };
}

export function mapBackendResume(resume: BackendResume): Resume {
  const tag = resume.finalizedAt
    ? "已定稿"
    : resume.optimizedContent
      ? "已优化"
      : resume.structuredContent
        ? "已结构化"
        : resume.optimizeStatus === "running"
          ? "优化中"
          : resume.structureStatus === "running"
            ? "结构化中"
            : resume.parseStatus === "done"
              ? "待结构化"
              : ["pending", "running", "uploading", "waiting-file"].includes(resume.parseStatus ?? "")
                ? "解析中"
                : resume.parseStatus === "failed"
                  ? "解析失败"
                  : resume.parseStatus === "unsupported"
                    ? "仅保存"
                    : "待解析";

  return {
    id: String(resume.id),
    name: resume.title ?? resume.originalFileName ?? resume.name ?? `简历 #${resume.id}`,
    tag,
    lastUpdated: formatDate(resume.updatedAt),
    wellness: resume.optimizedContent ? 92 : resume.structuredContent ? 78 : 52,
    keywordCount: resume.optimizedContent || resume.structuredContent ? 32 : 0,
    fileUrl: resume.originalFileUrl ?? undefined,
    isInterviewReady: Boolean(resume.optimizedContent || resume.structuredContent),
    structuredContent: resume.structuredContent,
    optimizedContent: resume.optimizedContent,
    jdMatchResult: resume.jdMatchResult,
  };
}

export function mapBackendReport(report: BackendReport): InterviewReport {
  const questions = toQuestionReviews(report.questions);
  const nextActions = toStringArray(report.nextActions, []);
  const fallbackHighlights = questions.flatMap((question) => question.correctPoints ?? []).slice(0, 3);
  const fallbackSuggestions = questions
    .flatMap((question) => question.wrongPoints?.length ? question.wrongPoints : question.issues)
    .slice(0, 3);

  return {
    id: report.reportId ?? report.id ?? `report-${Date.now()}`,
    score: report.score ?? 80,
    level: report.level ?? undefined,
    evaluation: report.summary ?? report.title ?? "综合表现：待复盘",
    summary: report.summary ?? undefined,
    highlights: toStringArray(report.highlights, fallbackHighlights.length ? fallbackHighlights : ["暂无亮点记录"]),
    suggestions: toStringArray(report.suggestions, fallbackSuggestions.length ? fallbackSuggestions : ["暂无改进建议"]),
    actionPlans: toActionPlans(report.actionPlans ?? nextActions),
    transcripts: toTranscriptItems(questions),
    companyName: report.companyName ?? "未知公司",
    positionName: report.positionName ?? "未知岗位",
    resumeName: report.resumeName ?? "默认简历",
    date: formatDate(report.createdAt),
    dimensions: toDimensions(report.dimensions),
    questions,
    nextActions,
    topDirections: toTopDirections(report.topDirections),
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

function formatDate(value?: string) {
  if (!value) return "暂无记录";
  return value.slice(0, 10).replace(/-/g, ".");
}

function toStringArray(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return fallback;
}

function toActionPlans(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => ({
    id: typeof item === "object" && item && "id" in item ? String(item.id) : `action-${index}`,
    label: `Action ${index + 1}`,
    text: typeof item === "object" && item && "text" in item ? String(item.text) : String(item),
    completed: typeof item === "object" && item && "completed" in item ? Boolean(item.completed) : false,
  }));
}

function toDimensions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const source = isRecord(item) ? item : {};
    return {
      label: "label" in source ? String(source.label) : "综合能力",
      score: clampScore("score" in source ? source.score : 0),
    };
  });
}

function toQuestionReviews(value: unknown): NonNullable<InterviewReport["questions"]> {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const source = isRecord(item) ? item : {};
    const diagnosis = isRecord(source.diagnosis) ? source.diagnosis : {};
    const improvement = isRecord(source.improvement) ? source.improvement : {};
    return {
      id: "id" in source ? String(source.id) : `q-${index + 1}`,
      question: "question" in source ? String(source.question) : `第 ${index + 1} 题`,
      answer: "answer" in source ? String(source.answer) : "",
      comment: "comment" in source ? String(source.comment) : "",
      issues: toStringArray(source.issues, []),
      advice: "advice" in source ? String(source.advice) : "",
      referenceAnswer: "referenceAnswer" in source ? String(source.referenceAnswer) : "",
      correctPoints: toStringArray(source.correctPoints, []),
      wrongPoints: toStringArray(source.wrongPoints, []),
      knowledgeTags: toStringArray(source.knowledgeTags, []),
      diagnosis: {
        content: "content" in diagnosis ? String(diagnosis.content) : undefined,
        logic: "logic" in diagnosis ? String(diagnosis.logic) : undefined,
        expression: "expression" in diagnosis ? String(diagnosis.expression) : undefined,
        depth: "depth" in diagnosis ? String(diagnosis.depth) : undefined,
      },
      improvement: {
        summary: "summary" in improvement ? String(improvement.summary) : undefined,
        example: "example" in improvement ? String(improvement.example) : undefined,
        nextTry: "nextTry" in improvement ? String(improvement.nextTry) : undefined,
      },
      practiceResources: toStringArray(source.practiceResources, []),
      qaTranscript: toQaTranscript(source.qaTranscript),
    };
  });
}

function toQaTranscript(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const source = isRecord(item) ? item : {};
    const role: "assistant" | "user" = source.role === "user" ? "user" : "assistant";
    return {
      role,
      content: "content" in source ? String(source.content) : "",
    };
  }).filter((item) => item.content);
}

function toTranscriptItems(questions: InterviewReport["questions"] = []) {
  return questions.flatMap((question, questionIndex) =>
    (question.qaTranscript ?? []).map((item, index) => ({
      id: `${question.id}-${index}`,
      time: `${String(questionIndex + 1).padStart(2, "0")}:${String(index).padStart(2, "0")}`,
      speaker: item.role === "user" ? "YOU (MANDARIN)" : "INTERVIEWER",
      text: item.content,
      isUser: item.role === "user",
    })),
  );
}

function toTopDirections(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const source = isRecord(item) ? item : {};
    return {
      title: "title" in source ? String(source.title) : "综合提升",
      reason: "reason" in source ? String(source.reason) : "",
      actions: toStringArray(source.actions, []),
    };
  });
}

function clampScore(value: unknown) {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
