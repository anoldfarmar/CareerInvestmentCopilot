import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { END, START, StateGraph, type LangGraphRunnableConfig } from '@langchain/langgraph';
import { InterviewAiService } from '../interview-ai.service';
import {
  INTERVIEW_SESSION_REPOSITORY,
  type InterviewSessionRepository,
} from './repositories/interview-session.repository';
import {
  DEFAULT_INTERVIEW_STAGE,
  InterviewGraphAnnotation,
  type EvaluatorOutput,
  type InterviewGraphAnnotationState,
  type InterviewGraphState,
  type InterviewMemoryState,
  type InterviewResumeMemoryNode,
  type PolicyOverrideEntry,
  type RouteTraceEntry,
  type StrategistDecision,
} from './interview-graph.state';
import { withNodeGuard } from './nodes/with-node-guard';
import { InterviewGraphTelemetry } from './telemetry/interview-graph-telemetry';
import { evaluatorNode } from './nodes/evaluator.node';
import { listenerNode } from './nodes/listener.node';
import { policyGateNode, toAction, toStage } from './nodes/policy-gate.node';
import { speakerNode } from './nodes/speaker.node';
import { strategistNode } from './nodes/strategist.node';
import { topicManagerNode } from './nodes/topic-manager.node';
import {
  routeAfterPolicy,
  routeAfterTopicManager,
} from './routes/interview.routes';

export type RunInterviewTurnInput = Partial<InterviewGraphState> & {
  sessionId: string;
  userId: number;
  latestAnswer: string;
  graphVersion?: 'v1' | 'v2'; // Step 4：按会话版本分派 v1/v2 图
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
  | {
      type: 'policy_checked';
      finalAction?: string;
      policyOverrides?: PolicyOverrideEntry[];
      route?: string;
    }
  | { type: 'route_selected'; action?: string; target?: string }
  | { type: 'topic_switched'; nextQuestionId?: string }
  | { type: 'speaker_delta'; delta: string }
  | { type: 'speaker_done'; content: string; messageType?: string }
  | { type: 'turn_saved' }
  | { type: 'evaluation_done' }
  | { type: 'interview_finished' }
  | { type: 'node_fallback'; node?: string; detail?: string };

const ROUTE_TRACE_LIMIT = 40; // Step 10：routeTrace 保留最近 N 条，避免 JSON 膨胀

@Injectable()
export class InterviewGraphService {
  private readonly logger = new Logger(InterviewGraphService.name);
  private readonly turnGraph = this.createTurnGraph();
  private readonly turnGraphV2 = this.createTurnGraphV2();
  private readonly finalEvaluationGraph = this.createFinalEvaluationGraph();

  constructor(
    private readonly interviewAiService?: InterviewAiService,
    @Optional()
    @Inject(INTERVIEW_SESSION_REPOSITORY)
    private readonly sessionRepository?: InterviewSessionRepository,
  ) {}

  async runTurn(input: RunInterviewTurnInput): Promise<InterviewTurnResult> {
    const graph = input.graphVersion === 'v2' ? this.turnGraphV2 : this.turnGraph;
    return await graph.invoke(this.toInitialState(input));
  }

  // Step 6：同步与流式统一走同一张已编译图（v1/v2 各自按版本分派），
  // 通过 streamMode='updates' 把节点更新映射为标准事件，删除手动节点顺序与伪流式。
  async runTurnWithProgress(
    input: RunInterviewTurnInput,
    onEvent: (event: InterviewGraphProgressEvent) => void | Promise<void>,
  ): Promise<InterviewTurnResult> {
    const graph = input.graphVersion === 'v2' ? this.turnGraphV2 : this.turnGraph;
    const initial = this.toInitialState(input);
    let state: InterviewGraphAnnotationState = initial;
    await onEvent({ type: 'thinking_start' });

    // Step 10：流式路径节点计时遥测（节点顺序执行，相邻更新到达间隔 ≈ 节点耗时）
    const telemetry = new InterviewGraphTelemetry();
    let lastNodeAt = Date.now();

    // Speaker 原生流式（Step 7）：节点执行期间通过 config.configurable 实时回传增量
    let speakerStreamed = false;
    const stream = await graph.stream(initial, {
      streamMode: 'updates',
      configurable: {
        onSpeakerDelta: (delta: string) => {
          speakerStreamed = true;
          void onEvent({ type: 'speaker_delta', delta });
        },
      },
    });

    for await (const chunk of stream) {
      const nodeName = Object.keys(chunk)[0];
      const nodeUpdate = chunk[nodeName];
      if (!nodeName || !nodeUpdate || typeof nodeUpdate !== 'object') {
        continue;
      }
      const now = Date.now();
      telemetry.record({
        node: nodeName,
        durationMs: now - lastNodeAt,
        at: new Date(now).toISOString(),
      });
      lastNodeAt = now;
      state = { ...state, ...(nodeUpdate as Partial<InterviewGraphAnnotationState>) };

      // Step 9：节点回退时发出 node_fallback（仅当前节点本次更新携带 fallbackTrace 时）
      const fallback = (nodeUpdate as { fallbackTrace?: RouteTraceEntry }).fallbackTrace;
      if (fallback) {
        await onEvent({
          type: 'node_fallback',
          node: fallback.node,
          detail: fallback.detail,
        });
      }

      if (nodeName === 'listener') {
        await onEvent({ type: 'listener_done', summary: state.listenerOutput?.summary });
      } else if (nodeName === 'strategist') {
        await onEvent({
          type: 'strategist_done',
          action: state.proposedDecision?.action,
          nextState: state.proposedDecision?.nextState,
          reason: state.proposedDecision?.reason,
        });
      } else if (nodeName === 'policy_gate') {
        const finalAction = state.strategistDecision?.action;
        const target = routeAfterPolicy(state);
        await onEvent({
          type: 'policy_checked',
          finalAction,
          policyOverrides: state.policyOverrides,
          route: target,
        });
        await onEvent({ type: 'route_selected', action: finalAction, target });
      } else if (nodeName === 'topic_manager') {
        await onEvent({
          type: 'topic_switched',
          nextQuestionId: state.nextQuestion?.id,
        });
      } else if (nodeName === 'speaker') {
        const content = state.speakerOutput?.content ?? '';
        if (!speakerStreamed && content) {
          await onEvent({ type: 'speaker_delta', delta: content });
        }
        await onEvent({
          type: 'speaker_done',
          content,
          messageType: state.speakerOutput?.messageType,
        });
      } else if (nodeName === 'save_turn_state') {
        await onEvent({ type: 'turn_saved' });
      } else if (nodeName === 'evaluator') {
        await onEvent({ type: 'evaluation_done' });
      } else if (nodeName === 'save_final_state') {
        await onEvent({ type: 'interview_finished' });
      }
    }

    telemetry.flushToLog();
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
      status: input.status ?? 'ACTIVE',
      turnCount: input.turnCount ?? 0,
      maxTurns: input.maxTurns ?? 12,
      endReason: input.endReason,
      nextQuestion: input.nextQuestion,
      latestAnswer: input.latestAnswer,
      currentQuestion: input.currentQuestion,
      jobDescription: input.jobDescription,
      recentRawMessages: (input.recentRawMessages ?? []).slice(-6),
      turnSummaries: input.turnSummaries ?? [],
      questionPool: input.questionPool ?? [],
      completedTopicIds: input.completedTopicIds ?? [],
      skippedTopicIds: input.skippedTopicIds ?? [],
      coverageState: input.coverageState ?? { covered: [], uncovered: [], ratio: 0 },
      routeTrace: input.routeTrace ?? [],
      strategySnapshot: input.strategySnapshot ?? null,
      memoryState: input.memoryState ?? null,
      listenerOutput: input.listenerOutput,
      proposedDecision: input.proposedDecision,
      strategistDecision: input.strategistDecision,
      policyOverrides: input.policyOverrides ?? [],
      speakerOutput: input.speakerOutput,
      evaluationState: input.evaluationState ?? null,
      hydrateFromRepository: input.hydrateFromRepository,
      persistTurn: input.persistTurn,
      fallbackTrace: input.fallbackTrace,
    };
  }

  private async loadSessionContext(
    state: InterviewGraphAnnotationState,
  ): Promise<Partial<InterviewGraphAnnotationState>> {
    // Step 8：启用 hydrateFromRepository 时从会话仓库恢复快照（断连/重启后继续）
    if (
      this.sessionRepository &&
      state.sessionId &&
      state.hydrateFromRepository
    ) {
      try {
        const snapshot = await this.sessionRepository.getSnapshot(state.sessionId);
        if (snapshot) {
          return {
            stage: snapshot.stage,
            status: snapshot.status,
            turnCount: snapshot.turnCount,
            maxTurns: snapshot.maxTurns,
            currentQuestion: snapshot.currentQuestion,
            questionPool: snapshot.questionPool,
            completedTopicIds: snapshot.completedTopicIds,
            skippedTopicIds: snapshot.skippedTopicIds,
            coverageState: snapshot.coverageState,
            turnSummaries: snapshot.turnSummaries,
            strategySnapshot: snapshot.strategySnapshot ?? null,
            memoryState: snapshot.memoryState ?? null,
            evaluationState: snapshot.evaluationState ?? null,
            recentRawMessages: snapshot.recentRawMessages.slice(-6),
            jobDescription: snapshot.jobDescription,
          };
        }
      } catch (error) {
        this.logger.warn(
          `会话快照加载失败，继续使用输入状态：${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

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
    const turnCount = state.turnCount + 1;
    // Step 8：启用 persistTurn 时经会话仓库幂等落库（turnId 去重，失败不阻塞本轮）
    if (this.sessionRepository && state.sessionId && state.persistTurn) {
      try {
        await this.sessionRepository.saveTurn(state.sessionId, {
          turnId: `${state.sessionId}:${turnCount}`,
          interviewState: {
            status: state.status,
            stage: state.stage,
            endReason: state.endReason,
            routeTrace: state.routeTrace,
            turnCount,
          },
          memoryState: state.memoryState,
          evaluationState: state.evaluationState,
        });
      } catch (error) {
        this.logger.warn(
          `会话轮次持久化失败（不阻断本轮）：${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return {
      turnCount,
      routeTrace: [
        ...state.routeTrace,
        {
          node: 'save_turn_state',
          action: state.strategistDecision?.action,
          at: new Date().toISOString(),
        },
      ].slice(-ROUTE_TRACE_LIMIT),
    };
  }

  // Step 4：结束分支保存节点 —— 写入 FINISHED 状态与结束原因
  private async saveFinalState(
    state: InterviewGraphAnnotationState,
  ): Promise<Partial<InterviewGraphAnnotationState>> {
    // Step 8：启用 persistTurn 时经会话仓库保存最终评估
    if (this.sessionRepository && state.sessionId && state.persistTurn) {
      try {
        await this.sessionRepository.saveFinal(state.sessionId, {
          interviewState: {
            stage: state.stage,
            endReason: state.endReason ?? 'no_available_nodes',
            routeTrace: state.routeTrace,
            turnCount: state.turnCount,
          },
          evaluationState: state.evaluationState,
        });
      } catch (error) {
        this.logger.warn(
          `会话最终状态持久化失败（不阻断本轮）：${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return {
      status: 'FINISHED',
      endReason: state.endReason ?? 'no_available_nodes',
      routeTrace: [
        ...state.routeTrace,
        {
          node: 'save_final_state',
          action: state.strategistDecision?.action,
          at: new Date().toISOString(),
        },
      ].slice(-ROUTE_TRACE_LIMIT),
    };
  }

  // Step 4：切题分支 —— Topic Manager 选择下一节点并维护覆盖状态
  // 阶段推进由 Policy Gate 统一负责（switch_topic → S3 等），此处不再重复推进。
  private async runTopicManager(
    state: InterviewGraphAnnotationState,
  ): Promise<Partial<InterviewGraphAnnotationState>> {
    const output = await topicManagerNode(state);
    return {
      ...(output.nextQuestion
        ? { currentQuestion: output.nextQuestion, nextQuestion: output.nextQuestion }
        : { nextQuestion: undefined }),
      completedTopicIds: output.completedTopicIds,
      coverageState: output.coverageState,
    };
  }

  private createTurnGraph() {
    return new StateGraph(InterviewGraphAnnotation)
      .addNode('load_session_context', this.loadSessionContext.bind(this))
      .addNode('listener', this.runListener.bind(this))
      .addNode('strategist', this.runStrategist.bind(this))
      .addNode('policy_gate', this.runPolicyGate.bind(this))
      .addNode('speaker', this.runSpeaker.bind(this))
      .addNode('save_turn_state', this.saveTurnState.bind(this))
      .addEdge(START, 'load_session_context')
      .addEdge('load_session_context', 'listener')
      .addEdge('listener', 'strategist')
      .addEdge('strategist', 'policy_gate')
      .addEdge('policy_gate', 'speaker')
      .addEdge('speaker', 'save_turn_state')
      .addEdge('save_turn_state', END)
      .compile();
  }

  // Step 4：v2 图 —— 基于最终动作的条件路由，切题与结束判断全部进入图内
  private createTurnGraphV2() {
    return new StateGraph(InterviewGraphAnnotation)
      .addNode('load_session_context', this.loadSessionContext.bind(this))
      .addNode('listener', this.runListener.bind(this))
      .addNode('strategist', this.runStrategist.bind(this))
      .addNode('policy_gate', this.runPolicyGate.bind(this))
      .addNode('topic_manager', this.runTopicManager.bind(this))
      .addNode('speaker', this.runSpeaker.bind(this))
      .addNode('save_turn_state', this.saveTurnState.bind(this))
      .addNode('evaluator', this.runEvaluator.bind(this))
      .addNode('save_final_state', this.saveFinalState.bind(this))
      .addEdge(START, 'load_session_context')
      .addEdge('load_session_context', 'listener')
      .addEdge('listener', 'strategist')
      .addEdge('strategist', 'policy_gate')
      .addConditionalEdges('policy_gate', routeAfterPolicy, {
        speaker: 'speaker',
        topic_manager: 'topic_manager',
        evaluator: 'evaluator',
      })
      .addConditionalEdges('topic_manager', routeAfterTopicManager, {
        speaker: 'speaker',
        evaluator: 'evaluator',
      })
      .addEdge('speaker', 'save_turn_state')
      .addEdge('save_turn_state', END)
      .addEdge('evaluator', 'save_final_state')
      .addEdge('save_final_state', END)
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

  // Step 9：节点守护包装 —— 超时/重试/兜底 + 回退写入 routeTrace 与 fallbackTrace
  private async guardedNode<TUpdate extends Record<string, unknown>>(
    logKey: string,
    run: () => Promise<TUpdate>,
    fallback: () => Promise<TUpdate>,
    state: InterviewGraphAnnotationState,
  ): Promise<
    TUpdate & { routeTrace: RouteTraceEntry[]; fallbackTrace?: RouteTraceEntry }
  > {
    const startedAt = Date.now();
    const result = await withNodeGuard(run, {
      timeoutMs: this.nodeTimeoutMs(logKey),
      retries: this.nodeRetries(),
      logKey,
      fallback,
    });
    const durationMs = Date.now() - startedAt;
    // Step 10：节点调用计时日志（结构化 JSON，供延迟定位与 A/B 对比）
    this.logger.log(
      JSON.stringify({
        event: 'graph.node.call',
        node: logKey,
        durationMs,
        retries: this.nodeRetries(),
        fallback: result.trace.length > 0,
      }),
    );
    // Step 10：每节点写入 routeTrace，构成完整决策链（回退时带 fallback 原因）
    const entry: RouteTraceEntry = result.trace[0] ?? {
      node: logKey,
      at: new Date().toISOString(),
    };
    return {
      ...result.update,
      routeTrace: [...state.routeTrace, entry].slice(-ROUTE_TRACE_LIMIT),
      fallbackTrace: result.trace[0],
    };
  }

  private nodeTimeoutMs(key: string) {
    const value = process.env[`INTERVIEW_${key.toUpperCase()}_TIMEOUT_MS`];
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 60000);
  }

  private nodeRetries() {
    const parsed = Number(process.env.INTERVIEW_NODE_RETRIES ?? 0);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  private async runListener(state: InterviewGraphAnnotationState) {
    const ai = this.interviewAiService;
    if (!ai) {
      return listenerNode(state);
    }

    return this.guardedNode(
      'listener',
      async () => {
        const listenerOutput = await ai.runListener({
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
      },
      async () => listenerNode(state),
      state,
    );
  }

  // Step 4：Strategist 只产出候选决策（proposedDecision），策略校验交给 policy_gate 节点
  private async runStrategist(state: InterviewGraphAnnotationState) {
    const ai = this.interviewAiService;
    const listenerOutput = state.listenerOutput;
    if (!ai || !listenerOutput) {
      const fallback = await strategistNode(state);
      return { proposedDecision: fallback.strategistDecision };
    }

    return this.guardedNode(
      'strategist',
      async () => {
        const rawDecision = await ai.runStrategist({
          stage: state.stage,
          listenerOutput,
          turnSummaries: state.turnSummaries,
          strategySnapshot: state.strategySnapshot,
          memoryState: state.memoryState,
          jobDescription: state.jobDescription,
        });
        return { proposedDecision: rawDecision };
      },
      async () => {
        const fallback = await strategistNode(state);
        return { proposedDecision: fallback.strategistDecision };
      },
      state,
    );
  }

  // Step 4：Policy Gate 节点 —— 读取 proposedDecision，产出最终决策与覆盖记录
  private async runPolicyGate(
    state: InterviewGraphAnnotationState,
  ): Promise<Partial<InterviewGraphAnnotationState>> {
    const gate = await policyGateNode(state, state.proposedDecision);
    return {
      strategistDecision: gate.strategistDecision,
      policyOverrides: gate.policyOverrides,
      ...(gate.status ? { status: gate.status } : {}),
      ...(gate.endReason ? { endReason: gate.endReason } : {}),
      stage: gate.strategistDecision.nextState,
      memoryState: this.buildMemoryState(state, gate.strategistDecision),
    };
  }

  // Step 7：Speaker 节点支持 config.configurable.onSpeakerDelta —— 原生流式回传增量；
  // 模型不支持流式（无回调或接口缺失）时走 runSpeaker 一次返回完整结果。
  private async runSpeaker(
    state: InterviewGraphAnnotationState,
    config?: LangGraphRunnableConfig,
  ) {
    const ai = this.interviewAiService;
    const decision = this.buildSpeakerDecision(state);
    if (!ai || !decision || this.shouldUseFastMode()) {
      return speakerNode(state, decision);
    }

    const onDelta = this.resolveSpeakerDeltaCallback(config);
    const canStream = onDelta && typeof ai.streamSpeaker === 'function';

    return this.guardedNode(
      'speaker',
      async () => {
        const speakerOutput = canStream
          ? await ai.streamSpeaker(
              {
                stage: state.stage,
                latestAnswer: state.latestAnswer,
                recentRawMessages: state.recentRawMessages,
                decision,
                jobDescription: state.jobDescription,
              },
              onDelta,
            )
          : await ai.runSpeaker({
              stage: state.stage,
              latestAnswer: state.latestAnswer,
              recentRawMessages: state.recentRawMessages,
              decision,
              jobDescription: state.jobDescription,
            });
        return { speakerOutput };
      },
      async () => speakerNode(state, decision),
      state,
    );
  }

  private resolveSpeakerDeltaCallback(
    config?: LangGraphRunnableConfig,
  ): ((delta: string) => void) | undefined {
    const configurable = config?.configurable as
      | { onSpeakerDelta?: (delta: string) => void }
      | undefined;
    return configurable?.onSpeakerDelta;
  }

  // Step 4：切题分支把 Topic Manager 选出的下一题注入 Speaker 话术指令；
  // Speaker 失败回退本地节点时，模板内容同样包含下一题文本。
  private buildSpeakerDecision(
    state: InterviewGraphAnnotationState,
  ): StrategistDecision | undefined {
    const base = state.strategistDecision;
    if (!base) {
      return undefined;
    }
    if (base.action === 'switch_topic' && state.nextQuestion?.content) {
      return {
        ...base,
        speakerInstruction: `请以自然口吻提出下一道主问题：${state.nextQuestion.content}，只问一个问题。`,
      };
    }
    return base;
  }

  private async runEvaluator(state: InterviewGraphAnnotationState) {
    const ai = this.interviewAiService;
    // Step 10：INTERVIEW_EVALUATOR_ASYNC=1 时 Evaluator 移出关键路径——
    // 本地评分 + EVALUATING，AI 评估由后台异步执行（finalEvaluationStatus pending → done）
    if (!ai || this.shouldUseFastMode() || this.shouldUseAsyncEvaluator()) {
      return {
        ...(await evaluatorNode(state)),
        ...(this.shouldUseAsyncEvaluator() ? { status: 'EVALUATING' } : {}),
      };
    }

    // Step 9：Evaluator 失败 → 本地评分兜底 + status=EVALUATING（后台重试，不回滚已完成面试）
    return this.guardedNode(
      'evaluator',
      async () => {
        const memoryState = this.normalizeMemoryState(state.memoryState);
        const evaluationState = await ai.runEvaluator({
          turnSummaries: state.turnSummaries,
          strategistDecisionLog: memoryState.strategistDecisionLog,
          memoryState,
          strategySnapshot: state.strategySnapshot,
          jobDescription: state.jobDescription,
          recentRawMessages: state.recentRawMessages,
        });
        return { evaluationState };
      },
      async () => ({
        ...(await evaluatorNode(state)),
        status: 'EVALUATING',
      }),
      state,
    );
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
              action: toAction(item.action),
              stage: toStage(item.stage),
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

  private shouldUseFastMode() {
    return process.env.INTERVIEW_PROFESSIONAL_AI_MODE === 'fast';
  }

  // Step 10：Evaluator 异步化开关（默认关闭，保持图内同步评估）
  private shouldUseAsyncEvaluator() {
    return process.env.INTERVIEW_EVALUATOR_ASYNC === '1';
  }
}
