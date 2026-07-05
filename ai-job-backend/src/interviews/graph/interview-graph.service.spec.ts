import { InterviewGraphService } from './interview-graph.service';
import type { InterviewMemoryState } from './interview-graph.state';

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
    expect(memoryState.candidateClaims).toContain('我使用 SARIMAX 做销量预测。');
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
        facts: ['说明了数据场景', '说明了参数选择方法', '说明了验证指标和业务结果'],
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
