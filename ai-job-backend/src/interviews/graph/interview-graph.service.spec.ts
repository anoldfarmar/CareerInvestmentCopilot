import { InterviewGraphService } from './interview-graph.service';
import { policyGateNode } from './nodes/policy-gate.node';
import { topicManagerNode } from './nodes/topic-manager.node';
import type {
  InterviewGraphAction,
  InterviewGraphAnnotationState,
  InterviewMemoryState,
  QuestionPoolItem,
  StrategistDecision,
} from './interview-graph.state';

// 比较图输出时忽略从未写入的 undefined 键与 routeTrace 时间戳，聚焦业务值漂移
function normalizeStateForComparison(state: Record<string, unknown>) {
  const normalized = JSON.parse(JSON.stringify(state)) as {
    routeTrace?: Array<Record<string, unknown>>;
  };
  if (Array.isArray(normalized.routeTrace)) {
    normalized.routeTrace = normalized.routeTrace.map((entry) =>
      Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'at')),
    );
  }
  return normalized;
}

describe('InterviewGraphService', () => {
  it('同一节点连续深挖到上限后会切换话题，并写入结构化记忆池', async () => {
    const service = new InterviewGraphService();
    const result = await service.runTurn({
      sessionId: 'session-p3',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: '我使用 SARIMAX 做销量预测。',
      currentQuestion: {
        id: 'q-project',
        content: '请介绍一个代表性项目。',
        dimension: 'professional',
      },
      turnSummaries: [
        {
          turn: 1,
          topic: '请介绍一个代表性项目。',
          nodeId: 'q-project',
          facts: ['我使用 SARIMAX 做销量预测。'],
          missingSlots: ['量化结果'],
          riskSignals: [],
        },
        {
          turn: 2,
          topic: '请介绍一个代表性项目。',
          nodeId: 'q-project',
          facts: ['我使用 SARIMAX 做销量预测。'],
          missingSlots: ['个人贡献边界'],
          riskSignals: [],
        },
      ],
    });
    const memoryState = result.memoryState as InterviewMemoryState;

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'switch_topic',
        messageType: 'topic_switch',
        policyOverride: expect.stringContaining('追问 2 次'),
      }),
    );
    expect(result.stage).toBe('S3_EXTENSION');
    expect(memoryState.candidateClaims).toContain(
      '我使用 SARIMAX 做销量预测。',
    );
    expect(memoryState.unverifiedClaims.length).toBeGreaterThan(0);
    expect(memoryState.resumeNodes[0]).toEqual(
      expect.objectContaining({
        id: 'q-project',
        status: 'completed',
      }),
    );
    expect(memoryState.strategistDecisionLog.at(-1)).toEqual(
      expect.objectContaining({
        action: 'switch_topic',
        nodeId: 'q-project',
      }),
    );
  });

  it('候选人回答已经完整时会跳过继续追问并切到下一道主问题', async () => {
    const aiService = {
      runListener: jest.fn().mockResolvedValue({
        summary: '候选人完整说明了建模项目。',
        entities: ['SARIMAX', 'ADF', 'AIC'],
        facts: [
          '说明了数据场景',
          '说明了参数选择方法',
          '说明了验证指标和业务结果',
        ],
        missingSlots: [],
        riskSignals: [],
      }),
      runStrategist: jest.fn().mockResolvedValue({
        action: 'continue_deep_dive',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
        reason: '还可以继续追问参数细节。',
        targetCapability: '建模能力',
        speakerInstruction: '继续追问参数选择。',
        memoryPatch: ['说明了参数选择方法'],
      }),
      runSpeaker: jest.fn().mockResolvedValue({
        messageType: 'topic_switch',
        content: '好的，我们进入下一道主问题。',
      }),
    };
    const service = new InterviewGraphService(aiService as never);
    const answer = [
      '在鲜销超短定价项目中，我先用 ADF 单位根检验和 ACF、PACF 判断销量序列是否平稳，并根据季节周期构造 SARIMAX 的 p、d、q 与季节项参数。',
      '训练阶段通过网格搜索对比 AIC 和 BIC，结合留出集滚动验证评估 MAPE、RMSE 和预测稳定性，同时把节假日、价格、库存作为外生变量输入模型。',
      '最终预测结果进入线性规划定价模块，用需求预测约束库存和利润目标，验证后促销损耗降低 12%，周转效率提升 8%，并沉淀了自动化训练脚本。',
    ].join('');

    const result = await service.runTurn({
      sessionId: 'session-complete',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: answer,
      currentQuestion: {
        id: 'q-1',
        content: '请说明 SARIMAX 项目的参数选择和验证方式。',
        dimension: 'professional',
      },
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'switch_topic',
        messageType: 'topic_switch',
        policyOverride: expect.stringContaining('较完整答案'),
      }),
    );
    expect(aiService.runSpeaker).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: expect.objectContaining({
          action: 'switch_topic',
        }),
      }),
    );
  });

  it('Graph State 只保留最近 3 轮原始对话，避免上下文膨胀', async () => {
    const service = new InterviewGraphService();
    const result = await service.runTurn({
      sessionId: 'session-window',
      userId: 10,
      latestAnswer: '这是第七轮回答。',
      recentRawMessages: Array.from({ length: 10 }, (_, index) => ({
        role: index % 2 === 0 ? 'assistant' : 'user',
        content: `message-${index + 1}`,
      })),
    });

    expect(result.recentRawMessages).toHaveLength(6);
    expect(result.recentRawMessages[0].content).toBe('message-5');
    expect(result.recentRawMessages.at(-1)?.content).toBe('message-10');
  });

  it('面试结束后会生成最终评估结构', async () => {
    const service = new InterviewGraphService();
    const result = await service.runFinalEvaluation({
      sessionId: 'session-final',
      userId: 10,
      stage: 'FINISHED',
      latestAnswer: '',
      turnSummaries: [
        {
          turn: 1,
          topic: 'SARIMAX 销量预测项目',
          facts: ['使用 SARIMAX 做销量预测', '补充了预测误差指标'],
          missingSlots: ['个人贡献边界仍需更清楚'],
          riskSignals: [],
        },
      ],
      memoryState: {
        candidateClaims: ['使用 SARIMAX 做销量预测'],
        verifiedEvidence: ['补充了预测误差指标'],
        unverifiedClaims: ['个人贡献边界仍需更清楚'],
        resumeNodes: [],
        turnSummaries: [],
        strategistDecisionLog: [],
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        overallScore: expect.any(Number),
        dimensionScores: expect.objectContaining({
          technicalDepth: expect.any(Number),
          jdFit: expect.any(Number),
        }),
        verifiedStrengths: expect.arrayContaining(['使用 SARIMAX 做销量预测']),
        unverifiedClaims: expect.arrayContaining(['个人贡献边界仍需更清楚']),
        followUpChainReview: expect.any(Array),
        nextPracticeActions: expect.any(Array),
      }),
    );
  });
});

// ============================================================================
// Step 0（M1）：基线与保护性测试 —— 固定当前行为，供后续重构回归
//
// 基线发现（写于 2026-07 重构前）：
// 1. 六种动作中 continue_deep_dive / clarify / switch_topic / wrap_up 可由本地节点
//    确定性产出（不注入 InterviewAiService）；guide_back / pressure_test 在本地
//    strategistNode 中没有对应分支，因此用桩 InterviewAiService 固定其流转。
// 2. 本地 listenerNode 的 riskSignals 永远不包含 /跑偏|回避|无关/，guide_back 只能
//    由策略层（enforceDecisionPolicy）在 AI 决策为其他动作时修正产生。
// 3. enforceDecisionPolicy 的 R6（无新增事实→clarify）实际上不可达：countConsecutive
//    至少为 1（当前轮自身摘要必然匹配），R5 总是先命中；clarify 只来自本地节点短回答
//    分支或 AI 直接提议。
// 4. 非法动作目前不会被图内策略兜底（R8 是后续目标），本基线先固定现状。
// ============================================================================

const LONG_ANSWER =
  '我负责推荐系统的召回与粗排模块，使用双塔模型和向量检索提升候选集质量，通过离线评测与线上A/B实验持续验证效果，最终让点击率提升12%，并沉淀了可复用的特征工程流程，同时把实验平台接入自动化监控。';

function buildTurnSummaries(count: number, sameNode = false) {
  return Array.from({ length: count }, (_, index) => ({
    turn: index + 1,
    topic: sameNode ? '请介绍你的推荐系统项目。' : `历史话题 ${index + 1}`,
    nodeId: sameNode ? 'q-1' : `other-${index + 1}`,
    facts: [`历史事实 ${index + 1}`],
    missingSlots: [],
    riskSignals: [],
  }));
}

function createAiStub(overrides: {
  listener?: Record<string, unknown>;
  strategist?: Record<string, unknown>;
  speaker?: Record<string, unknown>;
  fail?: Array<'listener' | 'strategist' | 'speaker'>;
}) {
  const listenerOutput = overrides.listener ?? {
    summary: '候选人回答摘要。',
    entities: [],
    facts: ['新事实 A'],
    missingSlots: ['量化结果'],
    riskSignals: [],
  };
  const strategistDecision = overrides.strategist ?? {
    action: 'continue_deep_dive',
    nextState: 'S2_CORE_DEEP_DIVE',
    messageType: 'follow_up',
    reason: '继续追问。',
    targetCapability: '建模能力',
    speakerInstruction: '请继续追问。',
    memoryPatch: [],
  };
  const failed = new Set(overrides.fail ?? []);
  return {
    runListener: jest.fn(
      failed.has('listener')
        ? () => Promise.reject(new Error('listener stub failure'))
        : () => Promise.resolve(listenerOutput),
    ),
    runStrategist: jest.fn(
      failed.has('strategist')
        ? () => Promise.reject(new Error('strategist stub failure'))
        : () => Promise.resolve(strategistDecision),
    ),
    runSpeaker: jest.fn(
      failed.has('speaker')
        ? () => Promise.reject(new Error('speaker stub failure'))
        : () =>
            Promise.resolve(
              overrides.speaker ?? {
                messageType: 'follow_up',
                content: '面试官追问内容。',
              },
            ),
    ),
  };
}

describe('Step 0 基线：六种动作路由', () => {
  it('continue_deep_dive：回答含新事实且仍有缺口时保持当前主题深挖（本地节点）', async () => {
    const service = new InterviewGraphService();
    const result = await service.runTurn({
      sessionId: 'baseline-deep',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'continue_deep_dive',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
      }),
    );
    expect(result.stage).toBe('S2_CORE_DEEP_DIVE');
    expect(result.speakerOutput?.content).toContain('你刚才提到');
    expect(result.turnSummaries).toHaveLength(1);
  });

  it('clarify：回答过短时要求澄清（本地节点）', async () => {
    const service = new InterviewGraphService();
    const result = await service.runTurn({
      sessionId: 'baseline-clarify',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: '我负责推荐系统。',
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'clarify',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
      }),
    );
    expect(result.stage).toBe('S2_CORE_DEEP_DIVE');
  });

  it('switch_topic：同一节点连续追问 2 次后切换到下一阶段（本地节点）', async () => {
    const service = new InterviewGraphService();
    const result = await service.runTurn({
      sessionId: 'baseline-switch',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
      turnSummaries: buildTurnSummaries(2, true),
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'switch_topic',
        nextState: 'S3_EXTENSION',
        messageType: 'topic_switch',
      }),
    );
    expect(result.stage).toBe('S3_EXTENSION');
    const memoryState = result.memoryState as InterviewMemoryState;
    expect(memoryState.resumeNodes[0]).toEqual(
      expect.objectContaining({ id: 'q-1', status: 'completed' }),
    );
  });

  it('wrap_up：恰好第 12 轮进入收尾（本地节点）', async () => {
    const service = new InterviewGraphService();
    const result = await service.runTurn({
      sessionId: 'baseline-wrap',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
      turnSummaries: buildTurnSummaries(11),
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'wrap_up',
        nextState: 'S4_REVERSE_QUESTION',
        messageType: 'closing',
      }),
    );
    expect(result.stage).toBe('S4_REVERSE_QUESTION');
  });

  it('第 11 轮不触发 wrap_up（边界）', async () => {
    const service = new InterviewGraphService();
    const result = await service.runTurn({
      sessionId: 'baseline-wrap-11',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
      turnSummaries: buildTurnSummaries(10),
    });

    expect(result.strategistDecision?.action).not.toBe('wrap_up');
    expect(result.strategistDecision?.action).toBe('continue_deep_dive');
  });

  it('guide_back：回答明显跑题时策略层修正为拉回（桩 AI，LLM 每轮 3 次调用基线）', async () => {
    const aiService = createAiStub({
      listener: {
        summary: '候选人回答偏离主题。',
        entities: [],
        facts: ['提到了无关的工作经历'],
        missingSlots: ['与当前问题相关的证据'],
        riskSignals: ['回答明显跑题，与当前问题无关'],
      },
      strategist: {
        action: 'continue_deep_dive',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
        reason: '继续追问细节。',
        targetCapability: '建模能力',
        speakerInstruction: '继续追问。',
        memoryPatch: [],
      },
    });
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runTurn({
      sessionId: 'baseline-guide-back',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'guide_back',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
      }),
    );
    expect(result.strategistDecision?.policyOverride).toContain('拉回');
    expect(result.stage).toBe('S2_CORE_DEEP_DIVE');
    expect(aiService.runListener).toHaveBeenCalledTimes(1);
    expect(aiService.runStrategist).toHaveBeenCalledTimes(1);
    expect(aiService.runSpeaker).toHaveBeenCalledTimes(1);
  });

  it('pressure_test：数据缺乏依据时原样通过（桩 AI）', async () => {
    const aiService = createAiStub({
      listener: {
        summary: '候选人给出了结论但没有数据依据。',
        entities: [],
        facts: ['提出了一个量化结论'],
        missingSlots: ['指标口径和验证方式'],
        riskSignals: [],
      },
      strategist: {
        action: 'pressure_test',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'pressure_test',
        reason: '数据缺乏依据，需要压力测试。',
        targetCapability: '数据真实性',
        speakerInstruction: '请说明这个结论的数据依据。',
        memoryPatch: [],
      },
      speaker: {
        messageType: 'pressure_test',
        content: '这个结论的数据依据是什么？',
      },
    });
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runTurn({
      sessionId: 'baseline-pressure',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'pressure_test',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'pressure_test',
      }),
    );
    const speakerInput = aiService.runSpeaker.mock.calls[0]?.[0] as
      | { decision?: { action?: string } }
      | undefined;
    expect(speakerInput?.decision?.action).toBe('pressure_test');
  });

  it('连续无新增事实且已追问过：continue_deep_dive 被修正为 switch_topic（策略 R5，桩 AI）', async () => {
    const aiService = createAiStub({
      listener: {
        summary: '候选人重复了之前的说法。',
        entities: [],
        facts: ['重复事实 A'],
        missingSlots: ['新的量化结果'],
        riskSignals: [],
      },
      strategist: {
        action: 'continue_deep_dive',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
        reason: '继续追问。',
        targetCapability: '建模能力',
        speakerInstruction: '请继续追问。',
        memoryPatch: [],
      },
    });
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runTurn({
      sessionId: 'baseline-no-new-switch',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
      turnSummaries: [
        {
          turn: 1,
          topic: '历史话题',
          nodeId: 'other-1',
          facts: ['重复事实 A'],
          missingSlots: [],
          riskSignals: [],
        },
      ],
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'switch_topic',
        nextState: 'S3_EXTENSION',
      }),
    );
    expect(result.strategistDecision?.policyOverride).toContain('新增关键事实');
    expect(result.stage).toBe('S3_EXTENSION');
  });

  it('clarify：AI 直接提议澄清时原样通过（桩 AI）', async () => {
    const aiService = createAiStub({
      strategist: {
        action: 'clarify',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
        reason: '术语含糊需要澄清。',
        targetCapability: '表达清晰度',
        speakerInstruction: '请澄清这个术语。',
        memoryPatch: [],
      },
    });
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runTurn({
      sessionId: 'baseline-ai-clarify',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'clarify',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
      }),
    );
    expect(result.strategistDecision?.policyOverride).toBeUndefined();
  });

  it('非法动作由策略层兜底为合法动作并记录覆盖（R9，Step 2 起生效）', async () => {
    const aiService = createAiStub({
      strategist: {
        action: 'illegal_action',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
        reason: 'r',
        targetCapability: 'c',
        speakerInstruction: 's',
        memoryPatch: [],
      },
    });
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runTurn({
      sessionId: 'baseline-illegal',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.strategistDecision).toEqual(
      expect.objectContaining({
        action: 'continue_deep_dive',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
      }),
    );
    expect(result.policyOverrides).toEqual([
      expect.objectContaining({
        ruleId: 'R9',
        from: 'illegal_action',
        to: 'continue_deep_dive',
      }),
    ]);
  });
});

describe('Step 0 基线：同步与流式一致性', () => {
  it('runTurn 与 runTurnWithProgress 对同一输入的最终状态一致（基线）', async () => {
    const service = new InterviewGraphService();
    const input = {
      sessionId: 'baseline-sync-stream',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
      recentRawMessages: [
        { role: 'assistant' as const, content: '请介绍你的推荐系统项目。' },
        { role: 'user' as const, content: LONG_ANSWER },
      ],
    };
    const syncResult = await service.runTurn(input);
    const events: string[] = [];
    const streamResult = await service.runTurnWithProgress(input, (event) => {
      events.push(event.type);
    });

    // 编译图会省略从未写入的 undefined 通道，手动路径保留显式 undefined，
    // 且 routeTrace 时间戳逐次不同——比较前做规范化，聚焦业务值漂移。
    expect(normalizeStateForComparison(streamResult)).toEqual(
      normalizeStateForComparison(syncResult),
    );
    expect(events).toEqual(
      expect.arrayContaining([
        'thinking_start',
        'listener_done',
        'strategist_done',
        'speaker_delta',
        'speaker_done',
        'turn_saved',
      ]),
    );
  });
});

describe('Step 0 基线：Agent 失败回退（本地节点兜底）', () => {
  it('Listener 失败时回退本地节点', async () => {
    const aiService = createAiStub({ fail: ['listener'] });
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runTurn({
      sessionId: 'fallback-listener',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.listenerOutput?.summary).toContain('候选人回答摘要');
    expect(result.turnSummaries).toHaveLength(1);
    expect(result.strategistDecision?.action).toBe('continue_deep_dive');
  });

  it('Strategist 失败时回退本地确定性节点并仍受策略约束', async () => {
    const aiService = createAiStub({ fail: ['strategist'] });
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runTurn({
      sessionId: 'fallback-strategist',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.strategistDecision?.action).toBe('continue_deep_dive');
    expect(result.stage).toBe('S2_CORE_DEEP_DIVE');
    expect(aiService.runStrategist).toHaveBeenCalledTimes(1);
  });

  it('Speaker 失败时回退本地模板节点', async () => {
    const aiService = createAiStub({ fail: ['speaker'] });
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runTurn({
      sessionId: 'fallback-speaker',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
    });

    expect(result.speakerOutput?.content).toContain('你刚才提到');
  });

  it('Evaluator 失败时回退本地评分节点', async () => {
    const aiService = {
      runEvaluator: jest.fn(() =>
        Promise.reject(new Error('evaluator failure')),
      ),
    };
    const service = new InterviewGraphService(aiService as never);
    const result = await service.runFinalEvaluation({
      sessionId: 'fallback-evaluator',
      userId: 10,
      stage: 'FINISHED',
      latestAnswer: '',
      turnSummaries: [
        {
          turn: 1,
          topic: 'SARIMAX 项目',
          facts: ['使用 SARIMAX 做销量预测'],
          missingSlots: ['个人贡献边界'],
          riskSignals: [],
        },
      ],
    });

    const evaluation = result as {
      overallScore?: number;
      dimensionScores?: Record<string, number>;
    };
    expect(typeof evaluation.overallScore).toBe('number');
    expect(typeof evaluation.dimensionScores?.technicalDepth).toBe('number');
  });
});

describe('Step 1 基线：状态模型扩展（旧数据缺省可读 + 新字段透传）', () => {
  it('旧会话缺省新字段时加载默认值（兼容旧数据）', async () => {
    const service = new InterviewGraphService();
    const result = await service.runTurn({
      sessionId: 'legacy-session',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: {
        id: 'q-1',
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
      // 有意缺省所有 Step 1 新增字段，模拟历史数据
    });

    expect(result.status).toBe('ACTIVE');
    // Step 4 起 save_turn_state 每轮 turnCount + 1 并追加 routeTrace
    expect(result.turnCount).toBe(1);
    expect(result.maxTurns).toBe(12);
    expect(result.endReason).toBeUndefined();
    expect(result.nextQuestion).toBeUndefined();
    expect(result.routeTrace).toHaveLength(1);
    expect(result.routeTrace[0]?.node).toBe('save_turn_state');
    expect(result.questionPool).toEqual([]);
    expect(result.completedTopicIds).toEqual([]);
    expect(result.skippedTopicIds).toEqual([]);
    expect(result.coverageState).toEqual({
      covered: [],
      uncovered: [],
      ratio: 0,
    });
    // Step 2 起，图会在策略校验前写入 proposedDecision（本地节点产出），不再为 undefined
    expect(result.proposedDecision).toBeDefined();
    expect(result.proposedDecision?.action).toBe('continue_deep_dive');
    expect(result.policyOverrides).toEqual([]);
  });

  it('新字段作为图输入透传（题目池、轮数与状态游标）', async () => {
    const service = new InterviewGraphService();
    const pool = [
      {
        id: 'q-1',
        order: 1,
        content: '请介绍你的推荐系统项目。',
        dimension: 'professional',
      },
      {
        id: 'q-2',
        order: 2,
        content: '请介绍第二个项目。',
        dimension: 'professional',
      },
    ];
    const result = await service.runTurn({
      sessionId: 'pool-session',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      status: 'ACTIVE',
      turnCount: 3,
      maxTurns: 8,
      latestAnswer: LONG_ANSWER,
      currentQuestion: pool[0],
      questionPool: pool,
      completedTopicIds: ['q-1'],
      coverageState: { covered: ['q-1'], uncovered: ['q-2'], ratio: 0.5 },
      routeTrace: [
        { node: 'listener', at: '2026-08-16T00:00:00.000Z' },
        { node: 'strategist', at: '2026-08-16T00:00:01.000Z' },
      ],
    });

    expect(result.status).toBe('ACTIVE');
    // Step 4 起 save_turn_state 每轮 turnCount + 1 并追加 routeTrace
    expect(result.turnCount).toBe(4);
    expect(result.maxTurns).toBe(8);
    expect(result.questionPool).toHaveLength(2);
    expect(result.questionPool[1]?.id).toBe('q-2');
    expect(result.completedTopicIds).toEqual(['q-1']);
    expect(result.coverageState).toEqual({
      covered: ['q-1'],
      uncovered: ['q-2'],
      ratio: 0.5,
    });
    expect(result.routeTrace).toHaveLength(3);
    expect(result.routeTrace[0]?.node).toBe('listener');
    expect(result.routeTrace.at(-1)?.node).toBe('save_turn_state');
  });
});

describe('Step 2：Policy Gate 节点（直接单测，不经过图）', () => {
  const COMPREHENSIVE_ANSWER =
    LONG_ANSWER +
    LONG_ANSWER +
    '最终，模型准确率提升了20%，并通过A/B实验验证了效果。';

  function buildPolicyState(
    overrides: Partial<InterviewGraphAnnotationState> = {},
  ): InterviewGraphAnnotationState {
    return {
      sessionId: 'policy-test',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      status: 'ACTIVE',
      turnCount: 0,
      maxTurns: 12,
      latestAnswer: LONG_ANSWER,
      recentRawMessages: [],
      turnSummaries: [],
      questionPool: [],
      completedTopicIds: [],
      skippedTopicIds: [],
      coverageState: { covered: [], uncovered: [], ratio: 0 },
      routeTrace: [],
      strategySnapshot: null,
      memoryState: null,
      listenerOutput: {
        summary: 's',
        entities: [],
        facts: ['事实 A'],
        missingSlots: [],
        riskSignals: [],
      },
      policyOverrides: [],
      evaluationState: null,
      ...overrides,
    };
  }

  function makeDecision(
    action: InterviewGraphAction = 'continue_deep_dive',
    overrides: Partial<StrategistDecision> = {},
  ): StrategistDecision {
    return {
      action,
      nextState: 'S2_CORE_DEEP_DIVE',
      messageType: 'follow_up',
      reason: 'r',
      targetCapability: 'c',
      speakerInstruction: 's',
      memoryPatch: [],
      ...overrides,
    };
  }

  it('R1：会话已结束时拒绝继续生成问题 → wrap_up，endReason=user_ended', async () => {
    const state = buildPolicyState({
      status: 'FINISHED',
      turnCount: 2,
      maxTurns: 12,
    });
    const gate = await policyGateNode(state, makeDecision());

    expect(gate.strategistDecision.action).toBe('wrap_up');
    expect(gate.strategistDecision.nextState).toBe('S4_REVERSE_QUESTION');
    expect(gate.endReason).toBe('user_ended');
    expect(gate.policyOverrides).toEqual([
      expect.objectContaining({
        ruleId: 'R1',
        from: 'continue_deep_dive',
        to: 'wrap_up',
      }),
    ]);
  });

  it('R2：达到最大轮数 → wrap_up，endReason=max_turns', async () => {
    const state = buildPolicyState({
      turnCount: 0,
      maxTurns: 8,
      turnSummaries: buildTurnSummaries(8),
    });
    const gate = await policyGateNode(state, makeDecision());

    expect(gate.strategistDecision.action).toBe('wrap_up');
    expect(gate.strategistDecision.nextState).toBe('S4_REVERSE_QUESTION');
    expect(gate.endReason).toBe('max_turns');
    expect(gate.policyOverrides[0]).toEqual(
      expect.objectContaining({
        ruleId: 'R2',
        from: 'continue_deep_dive',
        to: 'wrap_up',
      }),
    );
  });

  it('R3：覆盖完成且无未覆盖节点 → wrap_up，endReason=coverage_complete', async () => {
    const state = buildPolicyState({
      coverageState: { covered: ['q-1', 'q-2'], uncovered: [], ratio: 1 },
    });
    const gate = await policyGateNode(state, makeDecision());

    expect(gate.strategistDecision.action).toBe('wrap_up');
    expect(gate.endReason).toBe('coverage_complete');
  });

  it('R4：明显跑题 → guide_back 且保持当前阶段', async () => {
    const state = buildPolicyState({
      listenerOutput: {
        summary: 's',
        entities: [],
        facts: ['f'],
        missingSlots: [],
        riskSignals: ['回答明显跑题，与当前问题无关'],
      },
    });
    const gate = await policyGateNode(state, makeDecision());

    expect(gate.strategistDecision.action).toBe('guide_back');
    expect(gate.strategistDecision.nextState).toBe('S2_CORE_DEEP_DIVE');
    expect(gate.policyOverrides[0]).toEqual(
      expect.objectContaining({
        ruleId: 'R4',
        from: 'continue_deep_dive',
        to: 'guide_back',
      }),
    );
  });

  it('R5：回答较完整且已追问过 → switch_topic', async () => {
    const state = buildPolicyState({
      latestAnswer: COMPREHENSIVE_ANSWER,
      listenerOutput: {
        summary: 's',
        entities: [],
        facts: ['事实 A', '事实 B'],
        missingSlots: [],
        riskSignals: [],
      },
      turnSummaries: [
        {
          turn: 1,
          topic: '请介绍你的推荐系统项目。',
          nodeId: 'q-1',
          facts: ['事实 A'],
          missingSlots: [],
          riskSignals: [],
        },
      ],
      currentQuestion: { id: 'q-1', content: '请介绍你的推荐系统项目。' },
    });
    const gate = await policyGateNode(state, makeDecision());

    expect(gate.strategistDecision.action).toBe('switch_topic');
    expect(gate.strategistDecision.nextState).toBe('S3_EXTENSION');
    expect(gate.policyOverrides[0]).toEqual(
      expect.objectContaining({
        ruleId: 'R5',
        from: 'continue_deep_dive',
        to: 'switch_topic',
      }),
    );
  });

  it('R6：当前节点连续追问达到上限 → switch_topic', async () => {
    const state = buildPolicyState({
      turnSummaries: buildTurnSummaries(2, true),
      currentQuestion: { id: 'q-1', content: '请介绍你的推荐系统项目。' },
    });
    const gate = await policyGateNode(state, makeDecision());

    expect(gate.strategistDecision.action).toBe('switch_topic');
    expect(gate.strategistDecision.nextState).toBe('S3_EXTENSION');
    expect(gate.policyOverrides[0]).toEqual(
      expect.objectContaining({ ruleId: 'R6' }),
    );
  });

  it('R7：连续无新增事实且已追问过 → switch_topic', async () => {
    const state = buildPolicyState({
      listenerOutput: {
        summary: 's',
        entities: [],
        facts: ['重复事实'],
        missingSlots: [],
        riskSignals: [],
      },
      turnSummaries: [
        {
          turn: 1,
          topic: '历史话题',
          nodeId: 'other-1',
          facts: ['重复事实'],
          missingSlots: [],
          riskSignals: [],
        },
        {
          turn: 2,
          topic: '请介绍你的推荐系统项目。',
          nodeId: 'q-1',
          facts: ['重复事实'],
          missingSlots: [],
          riskSignals: [],
        },
      ],
      currentQuestion: { id: 'q-1', content: '请介绍你的推荐系统项目。' },
    });
    const gate = await policyGateNode(state, makeDecision());

    expect(gate.strategistDecision.action).toBe('switch_topic');
    expect(gate.policyOverrides[0]).toEqual(
      expect.objectContaining({ ruleId: 'R7' }),
    );
  });

  it('R8：本轮无新增事实且未形成连续追问 → clarify（直接单测可达）', async () => {
    const state = buildPolicyState({
      listenerOutput: {
        summary: 's',
        entities: [],
        facts: ['重复事实'],
        missingSlots: [],
        riskSignals: [],
      },
      turnSummaries: [
        {
          turn: 1,
          topic: '历史话题',
          nodeId: 'other-1',
          facts: ['重复事实'],
          missingSlots: [],
          riskSignals: [],
        },
        {
          turn: 2,
          topic: '当前追问节点',
          facts: ['重复事实'],
          missingSlots: [],
          riskSignals: [],
        },
      ],
    });
    const gate = await policyGateNode(state, makeDecision());

    expect(gate.strategistDecision.action).toBe('clarify');
    expect(gate.policyOverrides[0]).toEqual(
      expect.objectContaining({
        ruleId: 'R8',
        from: 'continue_deep_dive',
        to: 'clarify',
      }),
    );
  });

  it('R9：非法动作 → 确定性兜底并记录 from/to', async () => {
    const state = buildPolicyState();
    const illegal = {
      ...makeDecision(),
      action: 'illegal_action',
    } as unknown as StrategistDecision;
    const gate = await policyGateNode(state, illegal);

    expect(gate.strategistDecision.action).toBe('continue_deep_dive');
    expect(gate.strategistDecision.nextState).toBe('S2_CORE_DEEP_DIVE');
    expect(gate.strategistDecision.messageType).toBe('follow_up');
    expect(gate.policyOverrides).toEqual([
      expect.objectContaining({
        ruleId: 'R9',
        from: 'illegal_action',
        to: 'continue_deep_dive',
      }),
    ]);
  });

  it('R10：合规决策保持不变且无覆盖记录', async () => {
    const state = buildPolicyState();
    const decision = makeDecision('pressure_test');
    const gate = await policyGateNode(state, decision);

    expect(gate.strategistDecision).toEqual(decision);
    expect(gate.policyOverrides).toEqual([]);
    expect(gate.status).toBeUndefined();
    expect(gate.endReason).toBeUndefined();
  });
});

describe('Step 3：Topic Manager 节点（直接单测，不经过图）', () => {
  function buildTopicState(
    overrides: Partial<InterviewGraphAnnotationState> = {},
  ): InterviewGraphAnnotationState {
    return {
      sessionId: 'topic-test',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      status: 'ACTIVE',
      turnCount: 0,
      maxTurns: 12,
      latestAnswer: '',
      recentRawMessages: [],
      turnSummaries: [],
      questionPool: [],
      completedTopicIds: [],
      skippedTopicIds: [],
      coverageState: { covered: [], uncovered: [], ratio: 0 },
      routeTrace: [],
      strategySnapshot: null,
      memoryState: null,
      policyOverrides: [],
      evaluationState: null,
      ...overrides,
    };
  }

  function makePoolQuestion(
    id: string,
    order: number,
    extra: Partial<QuestionPoolItem> = {},
  ): QuestionPoolItem {
    return {
      id,
      order,
      content: `第 ${order} 题：${id}`,
      dimension: 'professional',
      ...extra,
    };
  }

  it('有下一题：按 order 升序选择未跳过、未完成节点，并更新覆盖状态与阶段', async () => {
    const state = buildTopicState({
      stage: 'S2_CORE_DEEP_DIVE',
      currentQuestion: makePoolQuestion('q-2', 2),
      questionPool: [
        makePoolQuestion('q-1', 1),
        makePoolQuestion('q-2', 2),
        makePoolQuestion('q-3', 3),
        makePoolQuestion('q-4', 4),
      ],
      completedTopicIds: ['q-1'],
    });
    const output = await topicManagerNode(state);

    expect(output.nextQuestion).toEqual(
      expect.objectContaining({ id: 'q-3', order: 3 }),
    );
    expect(output.currentQuestion?.id).toBe('q-3');
    expect(output.completedTopicIds).toEqual(['q-1', 'q-2']);
    expect(output.coverageState).toEqual({
      covered: ['q-1', 'q-2'],
      uncovered: ['q-3', 'q-4'],
      ratio: 0.5,
    });
  });

  it('全部节点已跳过：无下一题（exhausted）', async () => {
    const state = buildTopicState({
      currentQuestion: makePoolQuestion('q-1', 1),
      questionPool: [
        makePoolQuestion('q-1', 1, { skipped: true }),
        makePoolQuestion('q-2', 2, { skipped: true }),
      ],
    });
    const output = await topicManagerNode(state);

    expect(output.nextQuestion).toBeUndefined();
    expect(output.currentQuestion).toBeUndefined();
    expect(output.completedTopicIds).toEqual(['q-1']);
    expect(output.coverageState).toEqual({
      covered: [],
      uncovered: [],
      ratio: 0,
    });
  });

  it('无下一题：所有节点均已完成 → exhausted', async () => {
    const state = buildTopicState({
      currentQuestion: makePoolQuestion('q-2', 2),
      questionPool: [makePoolQuestion('q-1', 1), makePoolQuestion('q-2', 2)],
      completedTopicIds: ['q-1', 'q-2'],
    });
    const output = await topicManagerNode(state);

    expect(output.nextQuestion).toBeUndefined();
    expect(output.currentQuestion).toBeUndefined();
    expect(output.completedTopicIds).toEqual(['q-1', 'q-2']);
    expect(output.coverageState).toEqual({
      covered: ['q-1', 'q-2'],
      uncovered: [],
      ratio: 1,
    });
  });

  it('空题目池：无下一题（exhausted）', async () => {
    const output = await topicManagerNode(buildTopicState());

    expect(output.nextQuestion).toBeUndefined();
    expect(output.coverageState).toEqual({
      covered: [],
      uncovered: [],
      ratio: 0,
    });
  });

  it('order 缺失时按候选顺序兜底选择', async () => {
    const state = buildTopicState({
      currentQuestion: makePoolQuestion('q-1', 1),
      questionPool: [
        { id: 'q-a', content: '无序号题 A', dimension: 'professional' },
        { id: 'q-b', content: '无序号题 B', dimension: 'professional' },
      ],
    });
    const output = await topicManagerNode(state);

    expect(output.nextQuestion?.id).toBe('q-a');
    expect(output.completedTopicIds).toEqual(['q-1']);
  });

  it('从 S1 切题保持 S1（阶段映射基线：仅 S2 → S3）', async () => {
    const state = buildTopicState({
      stage: 'S1_PROJECT_ENTRY',
      currentQuestion: makePoolQuestion('q-1', 1),
      questionPool: [makePoolQuestion('q-1', 1), makePoolQuestion('q-2', 2)],
      completedTopicIds: ['q-1'],
    });
    const output = await topicManagerNode(state);

    expect(output.nextQuestion?.id).toBe('q-2');
  });
});

describe('Step 4 基线：v2 条件路由（12 行路由矩阵，节点桩不调 LLM）', () => {
  const V2_QUESTION = {
    id: 'q-1',
    order: 1,
    content: '第 1 题：请介绍一个代表性项目。',
    dimension: 'professional',
  };

  function buildV2Pool() {
    return [
      V2_QUESTION,
      {
        id: 'q-2',
        order: 2,
        content: '第 2 题：请介绍第二个项目。',
        dimension: 'professional',
      },
    ];
  }

  it('continue_deep_dive → Speaker 深挖（保持当前主题）', async () => {
    const result = await new InterviewGraphService().runTurn({
      sessionId: 'v2-deep',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
    });

    expect(result.strategistDecision?.action).toBe('continue_deep_dive');
    expect(result.status).toBe('ACTIVE');
    expect(result.speakerOutput?.content).toContain('你刚才提到');
    expect(result.nextQuestion).toBeUndefined();
  });

  it('clarify → Speaker 澄清（保持当前主题）', async () => {
    const result = await new InterviewGraphService().runTurn({
      sessionId: 'v2-clarify',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: '我负责推荐系统。',
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
    });

    expect(result.strategistDecision?.action).toBe('clarify');
    expect(result.status).toBe('ACTIVE');
    expect(result.speakerOutput?.content).toContain('你刚才提到');
  });

  it('pressure_test → Speaker 压力测试（桩 AI，原样通过）', async () => {
    const aiService = createAiStub({
      strategist: {
        action: 'pressure_test',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'pressure_test',
        reason: '数据缺乏依据。',
        targetCapability: '数据真实性',
        speakerInstruction: '请说明数据依据。',
        memoryPatch: [],
      },
    });
    const result = await new InterviewGraphService(aiService as never).runTurn({
      sessionId: 'v2-pressure',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
    });

    expect(result.strategistDecision?.action).toBe('pressure_test');
    expect(result.speakerOutput?.content).toBe('面试官追问内容。');
    expect(result.status).toBe('ACTIVE');
  });

  it('guide_back → Speaker 拉回（策略覆盖，桩 AI）', async () => {
    const aiService = createAiStub({
      listener: {
        summary: 's',
        entities: [],
        facts: ['f'],
        missingSlots: [],
        riskSignals: ['回答明显跑题，与当前问题无关'],
      },
    });
    const result = await new InterviewGraphService(aiService as never).runTurn({
      sessionId: 'v2-guide-back',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
    });

    expect(result.strategistDecision?.action).toBe('guide_back');
    expect(result.speakerOutput?.content).toBe('面试官追问内容。');
  });

  it('switch_topic + 存在下一节点 → Topic Manager 选题后进入 Speaker', async () => {
    const result = await new InterviewGraphService().runTurn({
      sessionId: 'v2-switch-next',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
      turnSummaries: buildTurnSummaries(2, true),
    });

    expect(result.strategistDecision?.action).toBe('switch_topic');
    expect(result.nextQuestion?.id).toBe('q-2');
    expect(result.currentQuestion?.id).toBe('q-2');
    expect(result.completedTopicIds).toContain('q-1');
    expect(result.coverageState).toEqual({
      covered: ['q-1'],
      uncovered: ['q-2'],
      ratio: 0.5,
    });
    expect(result.stage).toBe('S3_EXTENSION');
    expect(result.status).toBe('ACTIVE');
    expect(result.speakerOutput?.content).toContain(
      '第 2 题：请介绍第二个项目。',
    );
  });

  it('switch_topic + 无下一节点 → Evaluator 结束（status=FINISHED，endReason=no_available_nodes）', async () => {
    const result = await new InterviewGraphService().runTurn({
      sessionId: 'v2-switch-exhausted',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: [V2_QUESTION],
      turnSummaries: buildTurnSummaries(2, true),
    });

    expect(result.strategistDecision?.action).toBe('switch_topic');
    expect(result.nextQuestion).toBeUndefined();
    expect(result.status).toBe('FINISHED');
    expect(result.endReason).toBe('no_available_nodes');
    expect(result.speakerOutput).toBeUndefined();
    const evaluation = result.evaluationState as { overallScore?: number };
    expect(typeof evaluation.overallScore).toBe('number');
  });

  it('达到最大轮数 → wrap_up 进入 Evaluator 结束（status=FINISHED，endReason=max_turns）', async () => {
    const result = await new InterviewGraphService().runTurn({
      sessionId: 'v2-wrap',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
      turnSummaries: buildTurnSummaries(11),
    });

    expect(result.strategistDecision?.action).toBe('wrap_up');
    expect(result.status).toBe('FINISHED');
    expect(result.endReason).toBe('max_turns');
    expect(result.speakerOutput).toBeUndefined();
    const evaluation = result.evaluationState as { overallScore?: number };
    expect(typeof evaluation.overallScore).toBe('number');
  });

  it('非法动作 → R9 兜底为合法动作后进入 Speaker（合法分支）', async () => {
    const aiService = createAiStub({
      strategist: {
        action: 'illegal_action',
        nextState: 'S2_CORE_DEEP_DIVE',
        messageType: 'follow_up',
        reason: 'r',
        targetCapability: 'c',
        speakerInstruction: 's',
        memoryPatch: [],
      },
    });
    const result = await new InterviewGraphService(aiService as never).runTurn({
      sessionId: 'v2-illegal',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
    });

    expect(result.strategistDecision?.action).toBe('continue_deep_dive');
    expect(result.policyOverrides[0]).toEqual(
      expect.objectContaining({ ruleId: 'R9', to: 'continue_deep_dive' }),
    );
    expect(result.speakerOutput?.content).toBe('面试官追问内容。');
  });

  it('Speaker 调用失败 → 模板兜底问题并保存（保持动作）', async () => {
    const aiService = createAiStub({ fail: ['speaker'] });
    const result = await new InterviewGraphService(aiService as never).runTurn({
      sessionId: 'v2-speaker-fallback',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
    });

    expect(result.strategistDecision?.action).toBe('continue_deep_dive');
    expect(result.speakerOutput?.content).toContain('你刚才提到');
    expect(result.status).toBe('ACTIVE');
    expect(result.turnCount).toBe(1);
  });

  it('v1（默认）不进入 Topic Manager / Evaluator，wrap_up 仍走 Speaker（legacy 行为）', async () => {
    const result = await new InterviewGraphService().runTurn({
      sessionId: 'v1-legacy-routing',
      userId: 10,
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: V2_QUESTION,
      questionPool: buildV2Pool(),
      turnSummaries: buildTurnSummaries(11),
    });

    // v1：wrap_up 不触发 Evaluator，Speaker 照常生成收尾话术
    expect(result.strategistDecision?.action).toBe('wrap_up');
    expect(result.status).toBe('ACTIVE');
    expect(result.speakerOutput?.content).toContain('你刚才提到');
    expect(result.evaluationState).toBeNull();
  });

  it('Step 5：runTurnWithProgress 支持 graphVersion=v2，走编译图并产出 nextQuestion/status', async () => {
    const service = new InterviewGraphService();
    const events: string[] = [];
    const result = await service.runTurnWithProgress(
      {
        sessionId: 'v2-stream',
        userId: 10,
        graphVersion: 'v2',
        stage: 'S2_CORE_DEEP_DIVE',
        latestAnswer: LONG_ANSWER,
        currentQuestion: V2_QUESTION,
        questionPool: buildV2Pool(),
        turnSummaries: buildTurnSummaries(2, true),
      },
      (event) => {
        events.push(event.type);
      },
    );

    expect(result.strategistDecision?.action).toBe('switch_topic');
    expect(result.nextQuestion?.id).toBe('q-2');
    expect(result.status).toBe('ACTIVE');
    expect(events).toEqual(
      expect.arrayContaining([
        'thinking_start',
        'listener_done',
        'strategist_done',
        'policy_checked',
        'route_selected',
        'topic_switched',
        'speaker_delta',
        'speaker_done',
        'turn_saved',
      ]),
    );
  });

  it('Step 6：v2 结束路径输出 evaluation_done / interview_finished（wrap_up → Evaluator）', async () => {
    const service = new InterviewGraphService();
    const events: string[] = [];
    const result = await service.runTurnWithProgress(
      {
        sessionId: 'v2-events-finish',
        userId: 10,
        graphVersion: 'v2',
        stage: 'S2_CORE_DEEP_DIVE',
        latestAnswer: LONG_ANSWER,
        currentQuestion: V2_QUESTION,
        questionPool: [V2_QUESTION],
        turnSummaries: buildTurnSummaries(11),
      },
      (event) => {
        events.push(event.type);
      },
    );

    expect(result.status).toBe('FINISHED');
    expect(events).toEqual(
      expect.arrayContaining([
        'thinking_start',
        'listener_done',
        'strategist_done',
        'policy_checked',
        'route_selected',
        'evaluation_done',
        'interview_finished',
      ]),
    );
    expect(events).not.toContain('topic_switched');
  });

  it('Step 7：Speaker 原生流式失败时回退完整输出（单次 speaker_delta）', async () => {
    const aiService = {
      ...createAiStub({}),
      streamSpeaker: jest.fn(() => Promise.reject(new Error('stream failed'))),
    };
    const events: string[] = [];
    const result = await new InterviewGraphService(
      aiService as never,
    ).runTurnWithProgress(
      {
        sessionId: 'v2-stream-fallback',
        userId: 10,
        graphVersion: 'v2',
        stage: 'S2_CORE_DEEP_DIVE',
        latestAnswer: LONG_ANSWER,
        currentQuestion: V2_QUESTION,
        questionPool: buildV2Pool(),
      },
      (event) => {
        events.push(event.type);
      },
    );

    expect(result.speakerOutput?.content).toContain('你刚才提到');
    expect(events).toEqual(
      expect.arrayContaining(['speaker_delta', 'speaker_done', 'turn_saved']),
    );
  });
});

describe('Step 8：持久化与 Checkpoint（内存 Repository）', () => {
  const S8_QUESTION = {
    id: 'q-1',
    order: 1,
    content: '第 1 题：请介绍一个代表性项目。',
    dimension: 'professional',
  };

  function s8Pool() {
    return [S8_QUESTION];
  }

  function createInMemoryRepo() {
    const store = new Map<string, Record<string, unknown>>();
    return {
      store,
      getSnapshot: jest.fn((sessionId: string) => {
        const row = store.get(sessionId);
        if (!row) {
          return null;
        }
        return row as never;
      }),
      saveTurn: jest.fn((sessionId: string, input: { turnId: string }) => {
        const row = store.get(sessionId) ?? {};
        const saved = Array.isArray(row.savedTurnIds)
          ? (row.savedTurnIds as string[])
          : [];
        if (saved.includes(input.turnId)) {
          return { applied: false };
        }
        store.set(sessionId, {
          ...row,
          savedTurnIds: [...saved, input.turnId],
        });
        return { applied: true };
      }),
      saveFinal: jest.fn((sessionId: string) => {
        store.set(sessionId, {
          ...(store.get(sessionId) ?? {}),
          status: 'FINISHED',
        });
      }),
    };
  }

  it('断连后通过 hydrateFromRepository 从快照恢复会话状态', async () => {
    const repo = createInMemoryRepo();
    repo.store.set('session-restore', {
      sessionId: 'session-restore',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      status: 'ACTIVE',
      maxTurns: 8,
      turnCount: 2,
      questionPool: [
        { id: 'q-1', order: 1, content: '第 1 题', dimension: 'professional' },
      ],
      completedTopicIds: [],
      skippedTopicIds: [],
      coverageState: { covered: [], uncovered: ['q-1'], ratio: 0 },
      turnSummaries: [],
      recentRawMessages: [],
    });
    const service = new InterviewGraphService(undefined, repo);
    const result = await service.runTurn({
      sessionId: 'session-restore',
      userId: 10,
      graphVersion: 'v2',
      latestAnswer: LONG_ANSWER,
      hydrateFromRepository: true,
    });

    expect(repo.getSnapshot).toHaveBeenCalledWith('session-restore');
    expect(result.stage).toBe('S2_CORE_DEEP_DIVE');
    expect(result.maxTurns).toBe(8);
    expect(result.turnCount).toBe(3);
    expect(result.questionPool[0]?.id).toBe('q-1');
  });

  it('persistTurn 时 save_turn_state 经 Repository 落库，同 turnId 不重复', async () => {
    const repo = createInMemoryRepo();
    const service = new InterviewGraphService(undefined, repo);
    const input = {
      sessionId: 'session-persist',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: S8_QUESTION,
      questionPool: s8Pool(),
      persistTurn: true,
    };

    await service.runTurn(input);
    expect(repo.saveTurn).toHaveBeenCalledTimes(1);
    const firstCall = repo.saveTurn.mock.calls[0] as unknown as [
      string,
      { turnId?: string },
    ];
    expect(firstCall?.[0]).toBe('session-persist');
    expect(firstCall?.[1]?.turnId).toBe('session-persist:1');

    // 同一轮再次运行 → turnId 相同 → 仓库幂等去重，仍只有一条记录
    await service.runTurn(input);
    expect(repo.store.get('session-persist')?.savedTurnIds).toEqual([
      'session-persist:1',
    ]);
  });

  it('FINISHED 会话不能重新进入 Speaker（R1 拦截）', async () => {
    const result = await new InterviewGraphService().runTurn({
      sessionId: 'v2-finished-invariant',
      userId: 10,
      graphVersion: 'v2',
      status: 'FINISHED',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: S8_QUESTION,
      questionPool: s8Pool(),
    });

    expect(result.strategistDecision?.action).toBe('wrap_up');
    expect(result.speakerOutput).toBeUndefined();
    expect(result.status).toBe('FINISHED');
    expect(result.evaluationState).not.toBeNull();
  });
});

describe('Step 9：失败回退与超时控制', () => {
  const S9_QUESTION = {
    id: 'q-1',
    order: 1,
    content: '第 1 题：请介绍一个代表性项目。',
    dimension: 'professional',
  };

  function s9Input(overrides: Record<string, unknown> = {}) {
    return {
      sessionId: 's9',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: S9_QUESTION,
      questionPool: [S9_QUESTION],
      ...overrides,
    };
  }

  function lastFallbackTrace(
    routeTrace: Array<{ node?: string; detail?: string }>,
  ) {
    return [...routeTrace]
      .reverse()
      .find((entry) => entry.detail?.startsWith('fallback:'));
  }

  it('Listener 失败 → 本地兜底并写入 routeTrace fallback 记录', async () => {
    const aiService = createAiStub({ fail: ['listener'] });
    const result = await new InterviewGraphService(aiService as never).runTurn(
      s9Input(),
    );

    expect(result.listenerOutput?.summary).toContain('候选人回答摘要');
    expect(aiService.runListener).toHaveBeenCalledTimes(1);
    const fallback = lastFallbackTrace(result.routeTrace);
    expect(fallback?.node).toBe('listener');
    expect(fallback?.detail ?? '').toContain('fallback:');
    expect(result.status).toBe('ACTIVE');
  });

  it('Strategist 失败 → 本地确定性策略兜底且仍受 Policy Gate 校验', async () => {
    const aiService = createAiStub({ fail: ['strategist'] });
    const result = await new InterviewGraphService(aiService as never).runTurn(
      s9Input(),
    );

    expect(result.strategistDecision?.action).toBe('continue_deep_dive');
    expect(lastFallbackTrace(result.routeTrace)?.node).toBe('strategist');
  });

  it('Speaker 失败 → 本地模板兜底并记录 fallback', async () => {
    const aiService = createAiStub({ fail: ['speaker'] });
    const result = await new InterviewGraphService(aiService as never).runTurn(
      s9Input(),
    );

    expect(result.speakerOutput?.content).toContain('你刚才提到');
    expect(lastFallbackTrace(result.routeTrace)?.node).toBe('speaker');
  });

  it('Evaluator AI 失败 → 本地评分兜底（status=FINISHED，不回滚）且记录 fallback', async () => {
    const aiService = {
      ...createAiStub({}),
      runEvaluator: jest.fn(() => Promise.reject(new Error('evaluator boom'))),
    };
    const result = await new InterviewGraphService(aiService as never).runTurn(
      s9Input({ turnSummaries: buildTurnSummaries(11) }),
    );

    expect(result.status).toBe('FINISHED');
    const evaluation = result.evaluationState as { overallScore?: number };
    expect(typeof evaluation.overallScore).toBe('number');
    expect(lastFallbackTrace(result.routeTrace)?.node).toBe('evaluator');
  });

  it('流式路径在节点兜底时发出 node_fallback 事件', async () => {
    const aiService = createAiStub({ fail: ['listener'] });
    const events: string[] = [];
    await new InterviewGraphService(aiService as never).runTurnWithProgress(
      s9Input(),
      (event) => {
        events.push(event.type);
      },
    );

    expect(events).toContain('node_fallback');
  });

  it('节点超时（INTERVIEW_LISTENER_TIMEOUT_MS）后走兜底', async () => {
    process.env.INTERVIEW_LISTENER_TIMEOUT_MS = '50';
    try {
      const aiService = {
        ...createAiStub({}),
        runListener: jest.fn(() => new Promise(() => {})),
      };
      const result = await new InterviewGraphService(
        aiService as never,
      ).runTurn(s9Input());

      expect(result.listenerOutput?.summary).toContain('候选人回答摘要');
      const fallback = lastFallbackTrace(result.routeTrace);
      expect(fallback?.node).toBe('listener');
      expect(fallback?.detail ?? '').toContain('fallback:');
    } finally {
      delete process.env.INTERVIEW_LISTENER_TIMEOUT_MS;
    }
  });

  it('INTERVIEW_NODE_RETRIES 控制重试次数（总调用 = 1 + retries）', async () => {
    process.env.INTERVIEW_NODE_RETRIES = '2';
    try {
      const aiService = createAiStub({ fail: ['strategist'] });
      const result = await new InterviewGraphService(
        aiService as never,
      ).runTurn(s9Input());

      expect(aiService.runStrategist).toHaveBeenCalledTimes(3);
      expect(result.strategistDecision?.action).toBe('continue_deep_dive');
    } finally {
      delete process.env.INTERVIEW_NODE_RETRIES;
    }
  });
});

describe('Step 10：观测、性能与实验验证', () => {
  const S10_QUESTION = {
    id: 'q-1',
    order: 1,
    content: '第 1 题：请介绍一个代表性项目。',
    dimension: 'professional',
  };

  function s10Input(overrides: Record<string, unknown> = {}) {
    return {
      sessionId: 's10',
      userId: 10,
      graphVersion: 'v2',
      stage: 'S2_CORE_DEEP_DIVE',
      latestAnswer: LONG_ANSWER,
      currentQuestion: S10_QUESTION,
      questionPool: [S10_QUESTION],
      ...overrides,
    };
  }

  it('routeTrace 承载完整决策链（listener → strategist → speaker → save）', async () => {
    const aiService = createAiStub({});
    const result = await new InterviewGraphService(aiService as never).runTurn(
      s10Input(),
    );

    const nodes = result.routeTrace.map((entry) => entry.node);
    expect(nodes).toEqual([
      'listener',
      'strategist',
      'speaker',
      'save_turn_state',
    ]);
  });

  it('v2 切题路径 LLM 调用次数 = 3（切题/结束为纯函数，不新增调用）', async () => {
    const aiService = createAiStub({});
    await new InterviewGraphService(aiService as never).runTurn(
      s10Input({
        turnSummaries: buildTurnSummaries(2, true),
        questionPool: [
          S10_QUESTION,
          {
            id: 'q-2',
            order: 2,
            content: '第 2 题',
            dimension: 'professional',
          },
        ],
      }),
    );

    expect(aiService.runListener).toHaveBeenCalledTimes(1);
    expect(aiService.runStrategist).toHaveBeenCalledTimes(1);
    expect(aiService.runSpeaker).toHaveBeenCalledTimes(1);
  });

  it('INTERVIEW_EVALUATOR_ASYNC=1 时 Evaluator 移出关键路径（AI 评估不执行，status=FINISHED）', async () => {
    process.env.INTERVIEW_EVALUATOR_ASYNC = '1';
    try {
      const aiService = {
        ...createAiStub({}),
        runEvaluator: jest.fn(),
      };
      const result = await new InterviewGraphService(
        aiService as never,
      ).runTurn(s10Input({ turnSummaries: buildTurnSummaries(11) }));

      expect(aiService.runEvaluator).not.toHaveBeenCalled();
      expect(result.status).toBe('FINISHED');
      const evaluation = result.evaluationState as { overallScore?: number };
      expect(typeof evaluation.overallScore).toBe('number');
    } finally {
      delete process.env.INTERVIEW_EVALUATOR_ASYNC;
    }
  });

  it('routeTrace 保留最近 N 条（避免 JSON 膨胀）', async () => {
    const longTrace = Array.from({ length: 45 }, (_, index) => ({
      node: `seed-${index}`,
      at: '2026-08-16T00:00:00.000Z',
    }));
    const result = await new InterviewGraphService().runTurn(
      s10Input({ routeTrace: longTrace }),
    );

    expect(result.routeTrace.length).toBeLessThanOrEqual(40);
    expect(result.routeTrace.at(-1)?.node).toBe('save_turn_state');
  });
});
