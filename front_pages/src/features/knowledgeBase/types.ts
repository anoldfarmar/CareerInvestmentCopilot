export type RealInterviewSourceType = "audio" | "manual";

export type RealInterviewRecord = {
  id: string;
  knowledgeBaseId: string;
  title: string;
  sourceType: RealInterviewSourceType;
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
  status: "ready" | "processing" | "failed" | "asr_pending" | "transcribing";
  buildStatus?: "not_built" | "empty" | "waiting_asr" | "building" | "built" | "failed";
  buildError?: string;
  structuredContent?: unknown;
  chunks?: Array<{
    id: string;
    title: string;
    content: string;
    keywords: string[];
    sourceType: "question" | "answer" | "summary" | "weak_point";
  }>;
  impactStats?: {
    monthlyQuestionCount: number;
    recommendation: string;
  };
  createdAt: string;
};

export type InterviewKnowledgeBase = {
  id: string;
  name: string;
  description?: string;
  recordCount: number;
  focusAreas: string[];
  updatedAt: string;
  impactStats?: {
    monthlyQuestionCount: number;
    relatedSessionCount: number;
    lastUsedAt?: string;
    recommendation: string;
  };
  records: RealInterviewRecord[];
};

export type CreateKnowledgeBaseInput = {
  name: string;
  description?: string;
};

export type CreateManualRecordInput = {
  knowledgeBaseId: string;
  title: string;
  interviewDate: string;
  transcript: string;
};

export type CreateAudioRecordInput = {
  knowledgeBaseId: string;
  title: string;
  interviewDate: string;
  audioFile?: File;
  audioUrl?: string;
};

export type BuildKnowledgeRecordInput = {
  knowledgeBaseId: string;
  recordId: string;
};

export type TranscribeAudioRecordInput = {
  knowledgeBaseId: string;
  recordId: string;
  audioUrl?: string;
};
