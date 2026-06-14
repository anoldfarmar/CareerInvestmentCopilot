export type InterviewType = "general" | "professional" | "behavioral" | "stress" | "english";
export type InterviewMessageRole = "assistant" | "user" | "system";
export type VoiceInputStatus = "idle" | "recording" | "uploading" | "transcribed" | "failed";
export type InterviewQuestionDifficulty = "easy" | "medium" | "hard";
export type InterviewQuestionSourceType = "rule" | "resume" | "job_description" | "knowledge_base" | "custom";

export type InterviewSetupFormValues = {
  interviewType: InterviewType;
  resumeId: string;
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
  messageType?: "question" | "follow_up" | "answer_feedback" | "closing";
  dimension?: string;
  difficulty?: InterviewQuestionDifficulty;
  sourceLabel?: string;
  sourceType?: InterviewQuestionSourceType;
  feedbackScore?: number;
  feedbackStrengths?: string[];
  feedbackImprovements?: string[];
  audioUrl?: string;
  isStreaming?: boolean;
};

export type InterviewQuestionPreview = {
  id: string;
  order: number;
  content: string;
  dimension: string;
  dimensionLabel: string;
  difficulty: InterviewQuestionDifficulty;
  difficultyLabel: string;
  sourceType: InterviewQuestionSourceType;
  sourceLabel: string;
  skipped?: boolean;
};

export type InterviewQuestionFeedback = {
  difficultyRating: number;
  relevanceRating: number;
  isRepeated?: boolean;
  comment?: string;
  submittedAt?: string;
};

export type InterviewSession = {
  sessionId: string;
  type: InterviewType;
  totalQuestions: number;
  currentQuestion: number;
  startedAt: string;
  ended: boolean;
  messages: InterviewMessage[];
  questionsPreview: InterviewQuestionPreview[];
  questionFeedback: Record<string, InterviewQuestionFeedback>;
  knowledgeBaseIds: string[];
  resumeId?: number;
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
