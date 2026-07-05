import { PrismaService } from '../prisma/prisma.service';
import { externalFetch } from '../common/http/external-http.client';
import { ReportsService } from './reports.service';

jest.mock('../common/http/external-http.client', () => ({
  externalFetch: jest.fn(),
}));

describe('ReportsService', () => {
  const originalDeepSeekApiKey = process.env.DEEPSEEK_API_KEY;
  const fetchMock = externalFetch as jest.MockedFunction<typeof externalFetch>;
  const prisma = {
    interviewSession: {
      findFirst: jest.fn(),
    },
    reviewReport: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
  };

  const service = new ReportsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    delete process.env.DEEPSEEK_API_KEY;
  });

  afterAll(() => {
    if (originalDeepSeekApiKey) {
      process.env.DEEPSEEK_API_KEY = originalDeepSeekApiKey;
    }
  });

  it('会根据面试会话生成 QA 级结构化复盘报告', async () => {
    const createdAt = new Date('2026-06-11T00:00:00.000Z');
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      type: 'professional',
      totalQuestions: 1,
      questions: [
        {
          id: 'q-1',
          order: 1,
          content: '第 1 题：请介绍一个代表性项目。',
          dimension: 'professional',
          dimensionLabel: '技能深挖',
          difficulty: 'medium',
          difficultyLabel: '中等',
          sourceType: 'rule',
          sourceLabel: '基础智能问题',
          skipped: false,
        },
      ],
      messages: [
        {
          id: 'q-1',
          role: 'assistant',
          questionId: 'q-1',
          content: '第 1 题：请介绍一个代表性项目。',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'a-1',
          role: 'user',
          questionId: 'q-1',
          content: '首先我负责核心模块，其次优化性能，最后让首屏时间降低 20%。',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'f-1',
          role: 'assistant',
          questionId: 'q-1',
          messageType: 'follow_up',
          content: '你能说明这个 20% 是怎么测出来的吗？',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'a-2',
          role: 'user',
          questionId: 'q-1',
          content: '我用 Lighthouse 和线上埋点对比，优化前后分别统计。',
          createdAt: createdAt.toISOString(),
        },
      ],
    });
    prisma.reviewReport.upsert.mockImplementation(({ create }) =>
      Promise.resolve({
        id: 'report-1',
        ...create,
        createdAt,
      }),
    );

    const result = await service.generate(10, { sessionId: 'session-1' });

    expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 10 },
    });
    expect(prisma.reviewReport.upsert).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
      create: expect.objectContaining({
        userId: 10,
        sessionId: 'session-1',
      }),
      update: expect.any(Object),
    });
    expect(result.reportId).toBe('report-1');
    expect(result.generatedBy).toBe('local');
    expect(result.questions[0]).toEqual(
      expect.objectContaining({
        id: 'q-1',
        question: expect.stringContaining('代表性项目'),
        answer: expect.stringContaining('首屏时间降低 20%'),
        correctPoints: expect.any(Array),
        wrongPoints: expect.any(Array),
        knowledgeTags: expect.any(Array),
        qaTranscript: expect.any(Array),
      }),
    );
  });

  it('本地兜底报告会暴露降级来源，并生成短答/缺少量化结果的引导建议', async () => {
    const createdAt = new Date('2026-06-18T00:00:00.000Z');
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-local',
      type: 'professional',
      totalQuestions: 1,
      questions: [
        {
          id: 'q-1',
          order: 1,
          content: '请介绍一个你做过的项目。',
          dimension: 'professional',
          difficulty: 'medium',
          sourceLabel: '基础智能问题',
          skipped: false,
        },
      ],
      messages: [
        {
          id: 'q-1',
          role: 'assistant',
          questionId: 'q-1',
          content: '请介绍一个你做过的项目。',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'a-1',
          role: 'user',
          questionId: 'q-1',
          content: '我做过一个后台管理项目，负责页面和接口联调。',
          createdAt: createdAt.toISOString(),
        },
      ],
    });
    prisma.reviewReport.upsert.mockImplementation(({ create }) =>
      Promise.resolve({
        id: 'report-local',
        ...create,
        createdAt,
      }),
    );

    const result = await service.generate(10, { sessionId: 'session-local' });

    expect(result.generatedBy).toBe('local');
    expect(result.sessionId).toBe('session-local');
    expect(result.questions[0].issues).toEqual(expect.arrayContaining(['回答偏短', '缺少量化结果']));
    expect(result.questions[0].steeringAdvice).toContain('指标');
    expect(result.interviewerSteeringReview.failedSteering.length).toBeGreaterThan(0);
  });

  it('专业面试只完成部分题目时也会生成逐题诊断', async () => {
    const createdAt = new Date('2026-06-18T00:00:00.000Z');
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-partial',
      type: 'professional',
      totalQuestions: 2,
      questions: [
        {
          id: 'q-1',
          order: 1,
          content: '第 1 题：请介绍 SARIMAX 项目。',
          dimension: 'professional',
          difficulty: 'medium',
          sourceLabel: '基于目标 JD',
          skipped: false,
        },
        {
          id: 'q-2',
          order: 2,
          content: '第 2 题：请介绍 A/B 实验设计。',
          dimension: 'professional',
          difficulty: 'medium',
          sourceLabel: '基于目标 JD',
          skipped: false,
        },
      ],
      messages: [
        {
          id: 'q-1',
          role: 'assistant',
          questionId: 'q-1',
          content: '请介绍 SARIMAX 项目。',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'a-1',
          role: 'user',
          questionId: 'q-1',
          content: '我负责用 SARIMAX 做销量预测，并用误差指标验证。',
          createdAt: createdAt.toISOString(),
        },
      ],
    });
    prisma.reviewReport.upsert.mockImplementation(({ create }) =>
      Promise.resolve({
        id: 'report-partial',
        ...create,
        createdAt,
      }),
    );

    const result = await service.generate(10, { sessionId: 'session-partial' });

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toEqual(expect.objectContaining({ id: 'q-1' }));
    expect(result.questions[1]).toEqual(
      expect.objectContaining({
        id: 'q-2',
        answer: '',
        issues: expect.arrayContaining(['缺少回答内容']),
      }),
    );
  });

  it('AI 复盘少返回题目时会按会话题目补齐逐题诊断', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    const createdAt = new Date('2026-06-18T00:00:00.000Z');
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-ai-partial',
      type: 'professional',
      totalQuestions: 2,
      questions: [
        {
          id: 'q-1',
          order: 1,
          content: '第 1 题：请介绍 SARIMAX 项目。',
          dimension: 'professional',
          difficulty: 'medium',
          sourceLabel: '基于目标 JD',
          skipped: false,
        },
        {
          id: 'q-2',
          order: 2,
          content: '第 2 题：请说明 A/B 实验设计。',
          dimension: 'professional',
          difficulty: 'medium',
          sourceLabel: '基于目标 JD',
          skipped: false,
        },
      ],
      messages: [
        {
          id: 'q-1',
          role: 'assistant',
          questionId: 'q-1',
          content: '第 1 题：请介绍 SARIMAX 项目。',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'a-1',
          role: 'user',
          questionId: 'q-1',
          content: '我负责 SARIMAX 销量预测，通过 RMSE 验证误差并降低库存损耗 10%。',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'q-2',
          role: 'assistant',
          questionId: 'q-2',
          messageType: 'question',
          content: '第 2 题：请说明 A/B 实验设计。',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'a-2',
          role: 'user',
          questionId: 'q-2',
          content: '我会定义核心指标、样本量和分流策略，再用显著性检验判断效果。',
          createdAt: createdAt.toISOString(),
        },
      ],
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                score: 86,
                level: '优秀',
                summary: '整体表现较好。',
                dimensions: [],
                questions: [
                  {
                    id: 'q-1',
                    question: '第 1 题：请介绍 SARIMAX 项目。',
                    answer: 'AI 只返回了第一题。',
                    comment: '第一题诊断。',
                    correctPoints: ['说明了模型经验'],
                    wrongPoints: [],
                    issues: [],
                    advice: '继续补充业务影响。',
                    referenceAnswer: '参考表达。',
                    diagnosis: {
                      content: '内容较完整。',
                      logic: '逻辑清楚。',
                      expression: '表达自然。',
                      depth: '有技术深度。',
                    },
                    improvement: {
                      summary: '继续量化。',
                      example: '示例。',
                      nextTry: '下一次补指标。',
                    },
                    practiceResources: [],
                    knowledgeTags: ['SARIMAX'],
                    qaTranscript: [],
                  },
                ],
                nextActions: [],
                topDirections: [],
                advantageSummary: [],
                weaknessSummary: [],
                interviewerSteeringReview: {
                  successfulSteering: [],
                  failedSteering: [],
                  nextTimeTactics: [],
                },
              }),
            },
          },
        ],
      }),
    } as unknown as Response);
    prisma.reviewReport.upsert.mockImplementation(({ create }) =>
      Promise.resolve({
        id: 'report-ai-partial',
        ...create,
        createdAt,
      }),
    );

    const result = await service.generate(10, { sessionId: 'session-ai-partial' });

    expect(result.generatedBy).toBe('ai');
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toEqual(expect.objectContaining({ id: 'q-1', comment: '第一题诊断。' }));
    expect(result.questions[1]).toEqual(
      expect.objectContaining({
        id: 'q-2',
        question: expect.stringContaining('A/B 实验'),
        diagnosis: expect.objectContaining({
          content: expect.any(String),
          logic: expect.any(String),
          expression: expect.any(String),
          depth: expect.any(String),
        }),
      }),
    );
  });
});
