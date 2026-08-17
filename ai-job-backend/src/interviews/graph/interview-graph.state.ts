import { Annotation } from '@langchain/langgraph';

export type InterviewStage =
  | 'S0_ICE_BREAK'
  | 'S1_PROJECT_ENTRY'
  | 'S2_CORE_DEEP_DIVE'
  | 'S3_EXTENSION'
  | 'S4_REVERSE_QUESTION'
  | 'FINISHED';

export type InterviewRole = 'assistant' | 'user';

export type InterviewGraphMessage = {
  role: InterviewRole;
  content: string;
};

export type InterviewTurnSummary = {
  turn: number;
  topic: string;
  nodeId?: string;
  facts: string[];
  missingSlots: string[];
  riskSignals: string[];
};

export type InterviewGraphAction =
  | 'continue_deep_dive'
  | 'clarify'
  | 'pressure_test'
  | 'switch_topic'
  | 'guide_back'
  | 'wrap_up';

export type InterviewGraphMessageType =
  | 'question'
  | 'follow_up'
  | 'pressure_test'
  | 'topic_switch'
  | 'closing';

export type ListenerOutput = {
  summary: string;
  entities: string[];
  facts: string[];
  missingSlots: string[];
  riskSignals: string[];
};

export type StrategistDecision = {
  action: InterviewGraphAction;
  nextState: InterviewStage;
  messageType: InterviewGraphMessageType;
  reason: string;
  targetCapability: string;
  targetResumeNode?: string;
  speakerInstruction: string;
  memoryPatch: string[];
  policyOverride?: string;
};

export type SpeakerOutput = {
  messageType: InterviewGraphMessageType;
  content: string;
};

export type EvaluatorOutput = {
  overallScore: number;
  dimensionScores: Record<string, number>;
  verifiedStrengths: string[];
  unverifiedClaims: string[];
  followUpChainReview: Array<{
    topic: string;
    chain: string[];
    result: string;
  }>;
  nextPracticeActions: string[];
};

// Step 1：会话控制状态
export type InterviewSessionStatus =
  | 'ACTIVE'
  | 'EVALUATING'
  | 'FINISHED'
  | 'FAILED';

export type InterviewEndReason =
  | 'max_turns'
  | 'coverage_complete'
  | 'no_available_nodes'
  | 'user_ended'
  | 'error';

// Step 1：题目池快照。为避免与 interviews.service 循环依赖，这里使用轻量结构，
// 由 NestJS 侧把 session.questions 映射为 QuestionPoolItem 后作为图输入。
export type QuestionPoolItem = {
  id: string;
  order: number;
  content: string;
  dimension?: string;
  difficulty?: string;
  sourceType?: string;
  sourceLabel?: string;
  skipped?: boolean; // 用户跳过标记，选题时过滤（Step 3）
};

export type RouteTraceEntry = {
  node: string; // 节点名
  action?: string; // 经过时的 finalAction
  at: string; // ISO 时间
  detail?: string; // 回退原因 / 规则编号等
};

export type PolicyOverrideEntry = {
  ruleId: string; // R1..R9
  from: string; // 原动作
  to: string; // 修正后动作
  reason: string;
};

export type CoverageState = {
  covered: string[]; // 已完成的能力/题目节点 id
  uncovered: string[]; // 未覆盖节点 id
  ratio: number; // covered / (covered + uncovered)
};

export type InterviewGraphState = {
  sessionId: string;
  userId: number;
  stage: InterviewStage;
  status: InterviewSessionStatus;
  turnCount: number;
  maxTurns: number;
  endReason?: InterviewEndReason;
  nextQuestion?: QuestionPoolItem;
  latestAnswer: string;
  currentQuestion?: {
    id?: string;
    content: string;
    dimension?: string;
    difficulty?: string;
    order?: number; // 题目序号（Step 3：Topic Manager 选题游标）
  };
  jobDescription?: string;
  recentRawMessages: InterviewGraphMessage[];
  turnSummaries: InterviewTurnSummary[];
  questionPool: QuestionPoolItem[];
  completedTopicIds: string[];
  skippedTopicIds: Array<{ id: string; reason?: string }>;
  coverageState: CoverageState;
  routeTrace: RouteTraceEntry[];
  strategySnapshot: unknown;
  memoryState: unknown;
  listenerOutput?: ListenerOutput;
  proposedDecision?: StrategistDecision;
  strategistDecision?: StrategistDecision;
  policyOverrides: PolicyOverrideEntry[];
  speakerOutput?: SpeakerOutput;
  evaluationState?: EvaluatorOutput | unknown;
  // Step 8：执行模式开关（非业务状态）——图内加载节点按需从 Repository 恢复快照 / 保存轮次
  hydrateFromRepository?: boolean;
  persistTurn?: boolean;
  // Step 9：最近一次节点回退记录（流式事件 loop 据此发出 node_fallback）
  fallbackTrace?: RouteTraceEntry;
};

export type InterviewResumeMemoryNode = {
  id: string;
  title: string;
  status: 'probing' | 'completed' | 'skipped';
  deepDiveCount: number;
  askedIntents: string[];
  missingIntents: string[];
};

export type InterviewMemoryState = {
  candidateClaims: string[];
  verifiedEvidence: string[];
  unverifiedClaims: string[];
  resumeNodes: InterviewResumeMemoryNode[];
  turnSummaries: InterviewTurnSummary[];
  strategistDecisionLog: Array<{
    turn: number;
    action: InterviewGraphAction;
    stage: InterviewStage;
    reason: string;
    targetCapability: string;
    nodeId?: string;
  }>;
};

export const DEFAULT_INTERVIEW_STAGE: InterviewStage = 'S0_ICE_BREAK';

export const InterviewGraphAnnotation = Annotation.Root({
  sessionId: Annotation<string>(),
  userId: Annotation<number>(),
  stage: Annotation<InterviewStage>(),
  latestAnswer: Annotation<string>(),
  currentQuestion: Annotation<
    InterviewGraphState['currentQuestion'] | undefined
  >({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  jobDescription: Annotation<string | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  recentRawMessages: Annotation<InterviewGraphMessage[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  turnSummaries: Annotation<InterviewTurnSummary[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  strategySnapshot: Annotation<unknown>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  memoryState: Annotation<unknown>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  listenerOutput: Annotation<ListenerOutput | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  strategistDecision: Annotation<StrategistDecision | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  speakerOutput: Annotation<SpeakerOutput | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  evaluationState: Annotation<EvaluatorOutput | unknown>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  status: Annotation<InterviewSessionStatus>({
    reducer: (_left, right) => right,
    default: () => 'ACTIVE',
  }),
  turnCount: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  maxTurns: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 12,
  }),
  endReason: Annotation<InterviewEndReason | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  nextQuestion: Annotation<QuestionPoolItem | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  routeTrace: Annotation<RouteTraceEntry[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  questionPool: Annotation<QuestionPoolItem[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  completedTopicIds: Annotation<string[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  skippedTopicIds: Annotation<Array<{ id: string; reason?: string }>>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  coverageState: Annotation<CoverageState>({
    reducer: (_left, right) => right,
    default: () => ({ covered: [], uncovered: [], ratio: 0 }),
  }),
  proposedDecision: Annotation<StrategistDecision | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  policyOverrides: Annotation<PolicyOverrideEntry[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  hydrateFromRepository: Annotation<boolean | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  persistTurn: Annotation<boolean | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  fallbackTrace: Annotation<RouteTraceEntry | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
});

export type InterviewGraphAnnotationState =
  typeof InterviewGraphAnnotation.State;
export type InterviewGraphAnnotationUpdate =
  typeof InterviewGraphAnnotation.Update;
