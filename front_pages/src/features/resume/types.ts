import type { Level } from "@/types/common";

export type IssueSeverity = "high" | "medium" | "low";
export type SuggestionCategory = "structure" | "keyword" | "rewrite" | "ats";

export type UploadedResume = {
  resumeId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
};

export type ResumeMetric = {
  key: string;
  label: string;
  score: number;
  level: Level;
};

export type ResumeIssue = {
  id: string;
  sectionType: string;
  sectionTitle: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  suggestion: string;
  originalText?: string;
};

export type ResumeSuggestion = {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  beforeText?: string;
  afterText?: string;
  severity: IssueSeverity;
  sectionName?: string;
  actionType: "manual" | "auto";
};

export type ResumeAnalysisResult = {
  resumeId: string;
  totalScore: number;
  summary: string;
  metrics: ResumeMetric[];
  issues: ResumeIssue[];
  suggestions: ResumeSuggestion[];
};

export type ResumeJdMatchMetric = {
  key: string;
  label: string;
  score: number;
  level: "good" | "warning" | "danger";
  reason: string;
};

export type ResumeJdMatchSuggestion = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  severity: IssueSeverity;
};

export type ResumeJdMatchResult = {
  resumeId: number;
  totalScore: number;
  summary: string;
  jdKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  metrics: ResumeJdMatchMetric[];
  deductions: string[];
  suggestions: ResumeJdMatchSuggestion[];
};

export type ResumeCompareSection = {
  title: string;
  before: string[];
  after: string[];
  highlight?: string;
};

export type ResumeCompareResult = {
  resumeId: string;
  sections: ResumeCompareSection[];
};

export type ResumeOptimizeFormValues = {
  jobDirection?: string;
  jobDescription?: string;
  resumeFile: File;
};

export type ResumeParseStatus =
  | "not_started"
  | "pending"
  | "waiting-file"
  | "uploading"
  | "running"
  | "done"
  | "failed";

export type ResumePdfTemplate = "classic" | "modern" | "sidebar" | "kendall" | "even";

export type ResumeBasicInfo = {
  name?: string;
  phone?: string;
  email?: string;
};

export type WorkExperience = {
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

export type ProjectExperience = {
  name: string;
  description?: string;
};

export type Education = {
  school: string;
  major?: string;
  degree?: string;
};

// 对应后端 SaveStructuredResumeDto，也是 DeepSeek 必须返回的 JSON 形状。
export type StructuredResume = {
  basicInfo?: ResumeBasicInfo;
  summary?: string;
  skills?: string[];
  workExperiences?: WorkExperience[];
  projects?: ProjectExperience[];
  educations?: Education[];
};

// 对应后端 SaveOptimizedResumeDto。它不会覆盖原始结构化简历。
export type OptimizedResumeContent = {
  optimizedResume: StructuredResume;
  optimizationNotes: string[];
};

export type ResumeVersion = {
  id: number;
  resumeId: number;
  version: number;
  label: string;
  source: "manual_save" | "finalized" | string;
  content: OptimizedResumeContent;
  notes?: string[] | null;
  isFinal: boolean;
  createdAt: string;
};

export type ResumeExportRecord = {
  id: number;
  resumeId: number;
  versionId?: number | null;
  versionNumber: number;
  template: ResumePdfTemplate;
  filePath: string;
  s3Url?: string | null;
  downloadCount: number;
  isStale: boolean;
  generatedAt: string;
  updatedAt: string;
  version?: {
    label: string;
    isFinal: boolean;
  } | null;
};

// 对应后端 Resume 表。第一条联调链路只使用解析相关字段。
export type BackendResume = {
  id: number;
  title: string;
  originalContent: string;
  mineruTaskId?: string | null;
  parseStatus: ResumeParseStatus;
  structuredContent?: StructuredResume | null;
  optimizedContent?: OptimizedResumeContent | null;
  draftContent?: OptimizedResumeContent | null;
  finalizedContent?: OptimizedResumeContent | null;
  finalizedAt?: string | null;
  optimizationVersion?: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
};
