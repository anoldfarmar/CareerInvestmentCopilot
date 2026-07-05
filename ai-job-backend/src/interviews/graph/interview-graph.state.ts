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

export type InterviewGraphState = {
  sessionId: string;
  userId: number;
  stage: InterviewStage;
  latestAnswer: string;
  currentQuestion?: {
    id?: string;
    content: string;
    dimension?: string;
    difficulty?: string;
  };
  jobDescription?: string;
  recentRawMessages: InterviewGraphMessage[];
  turnSummaries: InterviewTurnSummary[];
  strategySnapshot: unknown;
  memoryState: unknown;
  listenerOutput?: ListenerOutput;
  strategistDecision?: StrategistDecision;
  speakerOutput?: SpeakerOutput;
  evaluationState?: EvaluatorOutput | unknown;
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
  currentQuestion: Annotation<InterviewGraphState['currentQuestion'] | undefined>({
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
});

export type InterviewGraphAnnotationState = typeof InterviewGraphAnnotation.State;
export type InterviewGraphAnnotationUpdate = typeof InterviewGraphAnnotation.Update;
