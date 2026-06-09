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
  status: "ready" | "processing" | "failed";
  createdAt: string;
};

export type InterviewKnowledgeBase = {
  id: string;
  name: string;
  description?: string;
  recordCount: number;
  focusAreas: string[];
  updatedAt: string;
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
  audioFile: File;
};
