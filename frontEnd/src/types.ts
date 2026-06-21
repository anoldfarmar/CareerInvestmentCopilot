/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Todo {
  id: string;
  text: string;
  icon: string;
  isCompleted: boolean;
  isHighPriority?: boolean;
}

export interface ActivityDay {
  date: string;
  day: number;
  applicationCount: number;
  audioUploadCount: number;
  mockInterviewCount: number;
  totalCount: number;
  level: number;
}

export interface Resume {
  id: string;
  name: string;
  tag?: string;
  lastUpdated: string;
  wellness: number;
  keywordCount: number;
  fileUrl?: string;
  isInterviewReady?: boolean;
}

export interface InterviewQuestionPreview {
  id: string;
  order: number;
  content: string;
  dimension?: string;
  dimensionLabel?: string;
  difficulty?: string;
  difficultyLabel?: string;
  sourceType?: string;
  sourceLabel?: string;
}

export interface InterviewSession {
  sessionId: string;
  type: string;
  totalQuestions: number;
  currentQuestion: number;
  startedAt: string;
  ended: boolean;
  messages: Array<{
    id: string;
    role: "assistant" | "user";
    content: string;
    createdAt: string;
    questionId?: string;
    messageType?: string;
  }>;
  questionsPreview: InterviewQuestionPreview[];
  questionFeedback?: Record<
    string,
    {
      difficultyRating: number;
      relevanceRating: number;
      isRepeated?: boolean;
      comment?: string;
      submittedAt?: string;
    }
  >;
  knowledgeBaseIds?: string[];
  resumeId?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  logoUrl: string;
  logoAlt?: string;
  description: string;
  sourceUrl?: string;
  matchScore: number;
  tag: string;
}

export interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
}

export interface InterviewTranscriptItem {
  id: string;
  time: string;
  speaker: string;
  text: string;
  isUser: boolean;
}

export interface InterviewReport {
  id: string;
  score: number;
  level?: string;
  evaluation: string;
  highlights: string[];
  suggestions: string[];
  actionPlans: { id: string; label: string; text: string; completed: boolean }[];
  transcripts: InterviewTranscriptItem[];
  companyName: string;
  positionName: string;
  resumeName: string;
  date: string;
  summary?: string;
  dimensions?: Array<{ label: string; score: number }>;
  questions?: Array<{
    id: string;
    question: string;
    answer: string;
    comment: string;
    issues: string[];
    advice: string;
    referenceAnswer: string;
    correctPoints?: string[];
    wrongPoints?: string[];
    knowledgeTags?: string[];
    diagnosis?: {
      content?: string;
      logic?: string;
      expression?: string;
      depth?: string;
    };
    improvement?: {
      summary?: string;
      example?: string;
      nextTry?: string;
    };
    practiceResources?: string[];
    qaTranscript?: Array<{ role: "assistant" | "user"; content: string }>;
  }>;
  nextActions?: string[];
  topDirections?: Array<{
    title: string;
    reason: string;
    actions: string[];
  }>;
}

export interface GlobalState {
  todos: Todo[];
  resumes: Resume[];
  jobs: Job[];
  reports: InterviewReport[];
  deliveryCount: number;
  activeTab: "workbench" | "matching" | "knowledge" | "profile";
}
