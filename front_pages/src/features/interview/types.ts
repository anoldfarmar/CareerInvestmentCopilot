export type InterviewType = "general" | "professional" | "behavioral" | "stress" | "english";
export type InterviewMessageRole = "assistant" | "user" | "system";
export type VoiceInputStatus = "idle" | "recording" | "uploading" | "transcribed" | "failed";

export type InterviewSetupFormValues = {
  interviewType: InterviewType;
  resumeId?: string;
  jobDescription?: string;
  knowledgeBaseIds: string[];
  questionCount: 5 | 8 | 10;
  enableFollowUp: boolean;
  enableVoiceInput: boolean;
  language: "zh-CN" | "en-US";
};

export type InterviewMessage = {
  id: string;
  sessionId: string;
  role: InterviewMessageRole;
  content: string;
  createdAt: string;
  questionId?: string;
  audioUrl?: string;
  isStreaming?: boolean;
};

export type InterviewSession = {
  sessionId: string;
  type: InterviewType;
  totalQuestions: number;
  currentQuestion: number;
  startedAt: string;
  ended: boolean;
  messages: InterviewMessage[];
  knowledgeBaseIds: string[];
};

export type InterviewProgress = {
  sessionId: string;
  stage: string;
  currentQuestion: number;
  totalQuestions: number;
  usedMinutes: number;
  averageAnswerSeconds: number;
  totalWords: number;
  distribution: { label: string; done: number; total: number }[];
};
