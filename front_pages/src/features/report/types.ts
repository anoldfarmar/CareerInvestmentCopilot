export type ReviewDimension = {
  label: string;
  score: number;
};

export type QuestionReview = {
  id: string;
  question: string;
  answer: string;
  comment: string;
  correctPoints?: string[];
  wrongPoints?: string[];
  issues: string[];
  advice: string;
  referenceAnswer: string;
  diagnosis?: {
    content: string;
    logic: string;
    expression: string;
    depth: string;
  };
  improvement?: {
    summary: string;
    example: string;
    nextTry: string;
  };
  practiceResources?: string[];
  knowledgeTags?: string[];
  qaTranscript?: Array<{
    role: "assistant" | "user";
    content: string;
  }>;
};

export type TopDirection = {
  title: string;
  reason: string;
  actions: string[];
};

export type ReviewReport = {
  reportId: string;
  title: string;
  score: number;
  level: string;
  summary: string;
  createdAt: string;
  dimensions: ReviewDimension[];
  questions: QuestionReview[];
  nextActions: string[];
  topDirections: TopDirection[];
};
