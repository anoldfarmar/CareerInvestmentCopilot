export type ReviewDimension = {
  label: string;
  score: number;
};

export type QuestionReview = {
  id: string;
  question: string;
  answer: string;
  comment: string;
  issues: string[];
  advice: string;
  referenceAnswer: string;
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
};
