import type {
  CoverageState,
  InterviewGraphMessage,
  InterviewSessionStatus,
  InterviewStage,
  InterviewTurnSummary,
  QuestionPoolItem,
} from '../interview-graph.state';

// Step 8：图使用的会话存储接口 —— 由 NestJS/Prisma 实现，图决定读取与保存时机。
// 幂等约定：saveTurn 以 turnId（sessionId:turnCount）去重，重复提交同一轮不重复写入。

export const INTERVIEW_SESSION_REPOSITORY = 'InterviewSessionRepository';

export type InterviewSessionSnapshot = {
  sessionId: string;
  userId: number;
  graphVersion: 'v1' | 'v2';
  stage: InterviewStage;
  status: InterviewSessionStatus;
  maxTurns: number;
  turnCount: number;
  currentQuestion?: QuestionPoolItem;
  questionPool: QuestionPoolItem[];
  completedTopicIds: string[];
  skippedTopicIds: Array<{ id: string; reason?: string }>;
  coverageState: CoverageState;
  turnSummaries: InterviewTurnSummary[];
  strategySnapshot?: unknown;
  memoryState?: unknown;
  evaluationState?: unknown;
  recentRawMessages: InterviewGraphMessage[];
  jobDescription?: string;
};

export type SaveTurnInput = {
  turnId: string; // sessionId:turnCount，幂等键
  interviewState: Record<string, unknown>;
  memoryState?: unknown;
  evaluationState?: unknown;
};

export type SaveFinalInput = {
  interviewState: Record<string, unknown>;
  evaluationState?: unknown;
};

export interface InterviewSessionRepository {
  getSnapshot(sessionId: string): Promise<InterviewSessionSnapshot | null>;
  saveTurn(
    sessionId: string,
    input: SaveTurnInput,
  ): Promise<{ applied: boolean }>;
  saveFinal(sessionId: string, input: SaveFinalInput): Promise<void>;
}
