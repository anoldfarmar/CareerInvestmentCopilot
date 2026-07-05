import { Injectable, Logger } from '@nestjs/common';
import { END, START, StateGraph } from '@langchain/langgraph';
import { InterviewAiService } from '../interview-ai.service';
import {
  DEFAULT_INTERVIEW_STAGE,
  InterviewGraphAnnotation,
  type InterviewGraphAction,
  type EvaluatorOutput,
  type InterviewGraphAnnotationState,
  type InterviewGraphState,
  type InterviewMemoryState,
  type InterviewResumeMemoryNode,
  type StrategistDecision,
} from './interview-graph.state';
import { evaluatorNode } from './nodes/evaluator.node';
import { listenerNode } from './nodes/listener.node';
import { speakerNode } from './nodes/speaker.node';
import { strategistNode } from './nodes/strategist.node';

export type RunInterviewTurnInput = Partial<InterviewGraphState> & {
  sessionId: string;
  userId: number;
  latestAnswer: string;
};

export type InterviewTurnResult = InterviewGraphAnnotationState;

export type RunFinalEvaluationInput = Partial<InterviewGraphState> & {
  sessionId: string;
  userId: number;
};

export type InterviewFinalEvaluation = EvaluatorOutput | unknown;
export type InterviewGraphProgressEvent =
  | { type: 'thinking_start' }
  | { type: 'listener_done'; summary?: string }
  | { type: 'strategist_done'; action?: string; nextState?: string; reason?: string }
  | { type: 'speaker_delta'; delta: string }
  | { type: 'speaker_done'; content: string; messageType?: string }
  | { type: 'turn_saved' };

@Injectable()
export class InterviewGraphService {
  private readonly logger = new Logger(InterviewGraphService.name);
  private readonly turnGraph = this.createTurnGraph();
  private readonly finalEvaluationGraph = this.createFinalEvaluationGraph();

  constructor(private readonly interviewAiService?: InterviewAiService) {}

  async runTurn(input: RunInterviewTurnInput): Promise<InterviewTurnResult> {
    return await this.turnGraph.invoke(this.toInitialState(input));
  }

  async runTurnWithProgress(
    input: RunInterviewTurnInput,
    onEvent: (event: InterviewGraphProgressEvent) => void | Promise<void>,
  ): Promise<InterviewTurnResult> {
    let state = this.toInitialState(input);
    await onEvent({ type: 'thinking_start' });

    state = { ...state, ...await this.loadSessionContext(state) };
    state = { ...state, ...await this.runListener(state) };
    await onEvent({ type: 'listener_done', summary: state.listenerOutput?.summary });

    state = { ...state, ...await this.runStrategist(state) };
    await onEvent({
      type: 'strategist_done',
      action: state.strategistDecision?.action,
      nextState: state.strategistDecision?.nextState,
      reason: state.strategistDecision?.reason,
    });

    state = { ...state, ...await this.runSpeaker(state) };
    const content = state.speakerOutput?.content ?? '';
    for (const delta of this.chunkSpeakerContent(content)) {
      await onEvent({ type: 'speaker_delta', delta });
      await this.sleep(35);
    }
    await onEvent({
      type: 'speaker_done',
      content,
      messageType: state.speakerOutput?.messageType,
    });

    state = { ...state, ...await this.saveTurnState(state) };
    await onEvent({ type: 'turn_saved' });

    return state;
  }

  async runFinalEvaluation(input: RunFinalEvaluationInput): Promise<InterviewFinalEvaluation> {
    const state = await this.finalEvaluationGraph.invoke(this.toInitialState({
      ...input,
      latestAnswer: input.latestAnswer ?? '',
    }));

    return state.evaluationState;
  }

  private toInitialState(input: RunInterviewTurnInput): InterviewGraphAnnotationState {
    return {
      sessionId: input.sessionId,
      userId: input.userId,
      stage: input.stage ?? DEFAULT_INTERVIEW_STAGE,
      latestAnswer: input.latestAnswer,
      currentQuestion: input.currentQuestion,
      jobDescription: input.jobDescription,
      recentRawMessages: (input.recentRawMessages ?? []).slice(-6),
      turnSummaries: input.turnSummaries ?? [],
      strategySnapshot: input.strategySnapshot ?? null,
      memoryState: input.memoryState ?? null,
      listenerOutput: input.listenerOutput,
      strategistDecision: input.strategistDecision,
      speakerOutput: input.speakerOutput,
      evaluationState: input.evaluationState ?? null,
    };
  }

  private chunkSpeakerContent(content: string) {
    if (!content) {
      return [];
    }
    const chunks: string[] = [];
    for (let index = 0; index < content.length; index += 12) {
      chunks.push(content.slice(index, index + 12));
    }
    return chunks;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async loadSessionContext(
    state: InterviewGraphAnnotationState,
  ): Promise<Partial<InterviewGraphAnnotationState>> {
    return {
      stage: state.stage ?? DEFAULT_INTERVIEW_STAGE,
      currentQuestion: state.currentQuestion,
      jobDescription: state.jobDescription,
      recentRawMessages: state.recentRawMessages.slice(-6),
      turnSummaries: state.turnSummaries ?? [],
      memoryState: state.memoryState ?? null,
      strategySnapshot: state.strategySnapshot ?? null,
    };
  }

  private async saveTurnState(
    state: InterviewGraphAnnotationState,
  ): Promise<Partial<InterviewGraphAnnotationState>> {
    return state;
  }

  private createTurnGraph() {
    return new StateGraph(InterviewGraphAnnotation)
      .addNode('load_session_context', this.loadSessionContext.bind(this))
      .addNode('listener', this.runListener.bind(this))
      .addNode('strategist', this.runStrategist.bind(this))
      .addNode('speaker', this.runSpeaker.bind(this))
      .addNode('save_turn_state', this.saveTurnState.bind(this))
      .addEdge(START, 'load_session_context')
      .addEdge('load_session_context', 'listener')
      .addEdge('listener', 'strategist')
      .addEdge('strategist', 'speaker')
      .addEdge('speaker', 'save_turn_state')
      .addEdge('save_turn_state', END)
      .compile();
  }

  private createFinalEvaluationGraph() {
    return new StateGraph(InterviewGraphAnnotation)
      .addNode('load_session_context', this.loadSessionContext.bind(this))
      .addNode('evaluator', this.runEvaluator.bind(this))
      .addNode('save_final_evaluation', this.saveTurnState.bind(this))
      .addEdge(START, 'load_session_context')
      .addEdge('load_session_context', 'evaluator')
      .addEdge('evaluator', 'save_final_evaluation')
      .addEdge('save_final_evaluation', END)
      .compile();
  }

  private async runListener(state: InterviewGraphAnnotationState) {
    if (!this.interviewAiService) {
      return listenerNode(state);
    }

    try {
      const listenerOutput = await this.interviewAiService.runListener({
        stage: state.stage,
        currentQuestion: state.currentQuestion,
        latestAnswer: state.latestAnswer,
        recentRawMessages: state.recentRawMessages,
        turnSummaries: state.turnSummaries,
        jobDescription: state.jobDescription,
        memoryState: state.memoryState,
      });

      return {
        listenerOutput,
        turnSummaries: [
          ...state.turnSummaries,
          {
            turn: state.turnSummaries.length + 1,
            topic: state.currentQuestion?.content ?? state.stage,
            nodeId: state.currentQuestion?.id,
            facts: listenerOutput.facts,
            missingSlots: listenerOutput.missingSlots,
            riskSignals: listenerOutput.riskSignals,
          },
        ],
      };
    } catch (error) {
      this.logger.warn(`Listener Agent 失败，已回落本地节点：${error instanceof Error ? error.message : String(error)}`);
      return listenerNode(state);
    }
  }

  private async runStrategist(state: InterviewGraphAnnotationState) {
    if (!this.interviewAiService || !state.listenerOutput) {
      const fallback = await strategistNode(state);
      const strategistDecision = this.enforceDecisionPolicy(state, fallback.strategistDecision);
      return {
        strategistDecision,
        stage: strategistDecision.nextState,
        memoryState: this.buildMemoryState(state, strategistDecision),
      };
    }

    try {
      const rawDecision = await this.interviewAiService.runStrategist({
        stage: state.stage,
        listenerOutput: state.listenerOutput,
        turnSummaries: state.turnSummaries,
        strategySnapshot: state.strategySnapshot,
        memoryState: state.memoryState,
        jobDescription: state.jobDescription,
      });
      const strategistDecision = this.enforceDecisionPolicy(state, rawDecision);

      return {
        strategistDecision,
        stage: strategistDecision.nextState,
        memoryState: this.buildMemoryState(state, strategistDecision),
      };
    } catch (error) {
      this.logger.warn(`Strategist Agent 失败，已回落本地节点：${error instanceof Error ? error.message : String(error)}`);
      const fallback = await strategistNode(state);
      const strategistDecision = this.enforceDecisionPolicy(state, fallback.strategistDecision);
      return {
        strategistDecision,
        stage: strategistDecision.nextState,
        memoryState: this.buildMemoryState(state, strategistDecision),
      };
    }
  }

  private async runSpeaker(state: InterviewGraphAnnotationState) {
    if (!this.interviewAiService || !state.strategistDecision || this.shouldUseFastMode()) {
      return speakerNode(state);
    }

    try {
      const speakerOutput = await this.interviewAiService.runSpeaker({
        stage: state.stage,
        latestAnswer: state.latestAnswer,
        recentRawMessages: state.recentRawMessages,
        decision: state.strategistDecision,
        jobDescription: state.jobDescription,
      });

      return { speakerOutput };
    } catch (error) {
      this.logger.warn(`Speaker Agent 失败，已回落本地节点：${error instanceof Error ? error.message : String(error)}`);
      return speakerNode(state);
    }
  }

  private async runEvaluator(state: InterviewGraphAnnotationState) {
    if (!this.interviewAiService || this.shouldUseFastMode()) {
      return evaluatorNode(state);
    }

    try {
      const memoryState = this.normalizeMemoryState(state.memoryState);
      const evaluationState = await this.interviewAiService.runEvaluator({
        turnSummaries: state.turnSummaries,
        strategistDecisionLog: memoryState.strategistDecisionLog,
        memoryState,
        strategySnapshot: state.strategySnapshot,
        jobDescription: state.jobDescription,
        recentRawMessages: state.recentRawMessages,
      });

      return { evaluationState };
    } catch (error) {
      this.logger.warn(`Evaluator Agent 失败，已回落本地节点：${error instanceof Error ? error.message : String(error)}`);
      return evaluatorNode(state);
    }
  }

  private enforceDecisionPolicy(
    state: InterviewGraphAnnotationState,
    decision: StrategistDecision,
  ): StrategistDecision {
    const turnCount = state.turnSummaries.length;
    const consecutiveNodeTurns = this.countConsecutiveNodeTurns(state);
    const hasNewFacts = this.hasNewListenerFacts(state);
    const hasDriftRisk = Boolean(state.listenerOutput?.riskSignals.some((signal) => /跑偏|回避|无关/.test(signal)));

    if (turnCount >= 8 && decision.action !== 'wrap_up') {
      return this.overrideDecision(state, decision, 'wrap_up', '核心轮次已覆盖，进入收尾或反问环节。');
    }

    if (hasDriftRisk && decision.action !== 'guide_back') {
      return this.overrideDecision(state, decision, 'guide_back', '检测到跑偏或回避风险，优先拉回当前问题。');
    }

    if (
      consecutiveNodeTurns >= 3 &&
      decision.action !== 'switch_topic' &&
      decision.action !== 'wrap_up' &&
      decision.action !== 'guide_back'
    ) {
      return this.overrideDecision(state, decision, 'switch_topic', '当前节点已连续深挖 3 轮，按 P3 规则切换能力维度。');
    }

    if (!hasNewFacts && consecutiveNodeTurns >= 2 && decision.action === 'continue_deep_dive') {
      return this.overrideDecision(state, decision, 'switch_topic', '连续两轮没有新增事实，按 P3 规则切换话题。');
    }

    if (!hasNewFacts && decision.action === 'continue_deep_dive') {
      return this.overrideDecision(state, decision, 'clarify', '本轮没有新增事实，先澄清背景、行动或指标。');
    }

    return decision;
  }

  private overrideDecision(
    state: InterviewGraphAnnotationState,
    decision: StrategistDecision,
    action: InterviewGraphAction,
    reason: string,
  ): StrategistDecision {
    const nextState = this.nextStageForAction(state.stage, action);
    return {
      ...decision,
      action,
      nextState,
      messageType: this.messageTypeForAction(action),
      reason,
      speakerInstruction: this.speakerInstructionForAction(action, decision.speakerInstruction),
      policyOverride: reason,
    };
  }

  private nextStageForAction(stage: InterviewGraphAnnotationState['stage'], action: InterviewGraphAction) {
    if (action === 'wrap_up') return 'S4_REVERSE_QUESTION';
    if (action === 'switch_topic') return stage === 'S2_CORE_DEEP_DIVE' ? 'S3_EXTENSION' : 'S1_PROJECT_ENTRY';
    if (action === 'guide_back') return stage;
    if (stage === 'S0_ICE_BREAK') return 'S1_PROJECT_ENTRY';
    if (stage === 'S1_PROJECT_ENTRY') return 'S2_CORE_DEEP_DIVE';
    return stage;
  }

  private messageTypeForAction(action: InterviewGraphAction) {
    if (action === 'pressure_test') return 'pressure_test';
    if (action === 'switch_topic') return 'topic_switch';
    if (action === 'wrap_up') return 'closing';
    return 'follow_up';
  }

  private speakerInstructionForAction(action: InterviewGraphAction, fallback: string) {
    if (action === 'switch_topic') {
      return '请自然切换到另一个与 JD 相关的能力点，保持真实面试官口吻，只问一个问题。';
    }
    if (action === 'guide_back') {
      return '请礼貌拉回当前问题和 JD 核心要求，围绕候选人刚才回避或跑偏的点问一个澄清问题。';
    }
    if (action === 'wrap_up') {
      return '请进入收尾或反问环节，用简洁自然的面试官口吻提出最后一个问题。';
    }
    if (action === 'clarify') {
      return '请要求候选人补充背景、具体行动或量化结果，只问一个澄清问题。';
    }

    return fallback;
  }

  private countConsecutiveNodeTurns(state: InterviewGraphAnnotationState) {
    const nodeId = state.currentQuestion?.id ?? state.currentQuestion?.content ?? state.stage;
    let count = 0;
    for (let index = state.turnSummaries.length - 1; index >= 0; index -= 1) {
      const summary = state.turnSummaries[index];
      const summaryNodeId = summary.nodeId ?? summary.topic;
      if (summaryNodeId !== nodeId && summary.topic !== state.currentQuestion?.content) {
        break;
      }
      count += 1;
    }

    return count;
  }

  private hasNewListenerFacts(state: InterviewGraphAnnotationState) {
    const facts = state.listenerOutput?.facts.map((fact) => fact.trim()).filter(Boolean) ?? [];
    if (facts.length === 0) {
      return false;
    }
    const previousFacts = new Set(
      state.turnSummaries
        .slice(0, -1)
        .flatMap((summary) => summary.facts)
        .map((fact) => fact.trim())
        .filter(Boolean),
    );

    return facts.some((fact) => !previousFacts.has(fact));
  }

  private buildMemoryState(
    state: InterviewGraphAnnotationState,
    decision: StrategistDecision,
  ): InterviewMemoryState {
    const base = this.normalizeMemoryState(state.memoryState);
    const facts = state.listenerOutput?.facts ?? [];
    const missingSlots = state.listenerOutput?.missingSlots ?? [];
    const node = this.buildResumeMemoryNode(state, decision, base.resumeNodes);

    return {
      candidateClaims: this.uniqueTail([...base.candidateClaims, ...decision.memoryPatch, ...facts], 30),
      verifiedEvidence: this.uniqueTail([...base.verifiedEvidence, ...facts], 30),
      unverifiedClaims: this.uniqueTail([...base.unverifiedClaims, ...missingSlots], 30),
      resumeNodes: [
        ...base.resumeNodes.filter((item) => item.id !== node.id),
        node,
      ].slice(-12),
      turnSummaries: state.turnSummaries.slice(-20),
      strategistDecisionLog: [
        ...base.strategistDecisionLog,
        {
          turn: state.turnSummaries.length,
          action: decision.action,
          stage: decision.nextState,
          reason: decision.reason,
          targetCapability: decision.targetCapability,
          nodeId: node.id,
        },
      ].slice(-20),
    };
  }

  private buildResumeMemoryNode(
    state: InterviewGraphAnnotationState,
    decision: StrategistDecision,
    existingNodes: InterviewResumeMemoryNode[],
  ): InterviewResumeMemoryNode {
    const id = state.currentQuestion?.id ?? decision.targetResumeNode ?? 'professional-interview';
    const existing = existingNodes.find((item) => item.id === id);
    const askedIntent = decision.targetCapability || decision.action;
    const missingIntents = state.listenerOutput?.missingSlots ?? [];
    const nextDeepDiveCount = decision.action === 'continue_deep_dive' || decision.action === 'clarify'
      ? (existing?.deepDiveCount ?? 0) + 1
      : 0;

    return {
      id,
      title: decision.targetResumeNode ?? state.currentQuestion?.content ?? '专业面试节点',
      status: decision.action === 'switch_topic' || decision.action === 'wrap_up' ? 'completed' : 'probing',
      deepDiveCount: nextDeepDiveCount,
      askedIntents: this.uniqueTail([...(existing?.askedIntents ?? []), askedIntent], 12),
      missingIntents: this.uniqueTail([...(existing?.missingIntents ?? []), ...missingIntents], 12),
    };
  }

  private normalizeMemoryState(memoryState: unknown): InterviewMemoryState {
    const base = memoryState && typeof memoryState === 'object' && !Array.isArray(memoryState)
      ? memoryState as Record<string, unknown>
      : {};

    return {
      candidateClaims: this.stringArray(base.candidateClaims),
      verifiedEvidence: this.stringArray(base.verifiedEvidence),
      unverifiedClaims: this.stringArray(base.unverifiedClaims),
      resumeNodes: Array.isArray(base.resumeNodes)
        ? base.resumeNodes
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
            .map((item) => ({
              id: typeof item.id === 'string' ? item.id : 'unknown',
              title: typeof item.title === 'string' ? item.title : '专业面试节点',
              status: item.status === 'completed' || item.status === 'skipped' ? item.status : 'probing',
              deepDiveCount: Number.isFinite(Number(item.deepDiveCount)) ? Number(item.deepDiveCount) : 0,
              askedIntents: this.stringArray(item.askedIntents),
              missingIntents: this.stringArray(item.missingIntents),
            }))
        : [],
      turnSummaries: Array.isArray(base.turnSummaries)
        ? base.turnSummaries.filter((item): item is InterviewMemoryState['turnSummaries'][number] =>
            Boolean(item) && typeof item === 'object' && !Array.isArray(item),
          )
        : [],
      strategistDecisionLog: Array.isArray(base.strategistDecisionLog)
        ? base.strategistDecisionLog
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
            .map((item) => ({
              turn: Number.isFinite(Number(item.turn)) ? Number(item.turn) : 0,
              action: this.toAction(item.action),
              stage: this.toStage(item.stage),
              reason: typeof item.reason === 'string' ? item.reason : '',
              targetCapability: typeof item.targetCapability === 'string' ? item.targetCapability : '专业能力',
              nodeId: typeof item.nodeId === 'string' ? item.nodeId : undefined,
            }))
        : [],
    };
  }

  private stringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private uniqueTail(values: string[], limit: number) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(-limit);
  }

  private toAction(value: unknown): InterviewGraphAction {
    return value === 'continue_deep_dive' ||
      value === 'clarify' ||
      value === 'pressure_test' ||
      value === 'switch_topic' ||
      value === 'guide_back' ||
      value === 'wrap_up'
      ? value
      : 'continue_deep_dive';
  }

  private toStage(value: unknown): InterviewGraphAnnotationState['stage'] {
    return value === 'S0_ICE_BREAK' ||
      value === 'S1_PROJECT_ENTRY' ||
      value === 'S2_CORE_DEEP_DIVE' ||
      value === 'S3_EXTENSION' ||
      value === 'S4_REVERSE_QUESTION' ||
      value === 'FINISHED'
      ? value
      : DEFAULT_INTERVIEW_STAGE;
  }

  private shouldUseFastMode() {
    return process.env.INTERVIEW_PROFESSIONAL_AI_MODE === 'fast';
  }
}
