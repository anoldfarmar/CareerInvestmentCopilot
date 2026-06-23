import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const originalDeepSeekApiKey = process.env.DEEPSEEK_API_KEY;
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
});
