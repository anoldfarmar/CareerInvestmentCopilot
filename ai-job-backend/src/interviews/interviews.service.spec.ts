import { PrismaService } from '../prisma/prisma.service';
import { InterviewsService } from './interviews.service';

describe('InterviewsService', () => {
  const startedAt = new Date('2026-06-11T00:00:00.000Z');

  function createPrismaMock() {
    return {
      interviewSession: {
        create: jest.fn(({ data }) =>
          Promise.resolve({
            id: 'session-1',
            ...data,
            startedAt,
          }),
        ),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      resume: {
        findFirst: jest.fn(),
      },
      realInterviewRecord: {
        findMany: jest.fn(),
      },
    };
  }

  beforeEach(() => {
    delete process.env.INTERVIEW_OPENING_AI_MODE;
    delete process.env.INTERVIEW_PROFESSIONAL_AI_MODE;
  });

  it('creates a session with fallback questions and an initial assistant message', async () => {
    const prisma = createPrismaMock();
    const service = new InterviewsService(prisma as unknown as PrismaService);

    const result = await service.createSession(10, {
      interviewType: 'professional',
      questionCount: 5,
      jobDescription: 'React TypeScript performance role',
      knowledgeBaseIds: ['kb-1'],
      enableFollowUp: true,
      enableVoiceInput: true,
      language: 'zh-CN',
    });

    expect(prisma.interviewSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'professional',
        totalQuestions: 5,
        userId: 10,
        knowledgeBaseIds: ['kb-1'],
        questions: expect.any(Array),
        strategySnapshot: expect.objectContaining({ version: 'v1' }),
      }),
    });
    expect(result.questionsPreview).toHaveLength(5);
    expect(result.messages[0]).toEqual(
      expect.objectContaining({
        role: 'assistant',
        questionId: 'q-1',
      }),
    );
    expect(result.messages[0].content).toBe(result.questionsPreview[0].content);
  });

  it('skips blocking strategy and opening AI calls when creating a professional session', async () => {
    const prisma = createPrismaMock();
    const aiService = {
      generateQuestionPlan: jest.fn().mockResolvedValue([]),
      generateInterviewStrategy: jest.fn(),
      generateOpeningQuestion: jest.fn().mockResolvedValue({
        messageType: 'question',
        content: 'opening question from AI',
      }),
    };
    const service = new InterviewsService(
      prisma as unknown as PrismaService,
      aiService as never,
    );

    const result = await service.createSession(10, {
      interviewType: 'professional',
      questionCount: 3,
      jobDescription: 'AI agent engineering role',
      knowledgeBaseIds: [],
      enableFollowUp: true,
      enableVoiceInput: true,
      language: 'zh-CN',
    });

    expect(aiService.generateQuestionPlan).toHaveBeenCalledTimes(1);
    expect(aiService.generateInterviewStrategy).not.toHaveBeenCalled();
    expect(aiService.generateOpeningQuestion).not.toHaveBeenCalled();
    expect(result.messages[0].content).toBe(result.questionsPreview[0].content);
  });

  it('loads knowledge snippets once and reuses compact RAG context for question generation', async () => {
    const prisma = createPrismaMock();
    const aiService = {
      generateQuestionPlan: jest.fn().mockResolvedValue([]),
      generateInterviewStrategy: jest.fn(),
      generateOpeningQuestion: jest.fn(),
    };
    const ragService = {
      retrieveRelevantChunks: jest.fn().mockReturnValue([
        {
          recordId: 'record-1',
          recordTitle: 'Record 1',
          title: 'RAG chunk',
          content: 'compact chunk content',
          keywords: ['rag'],
          sourceType: 'answer',
          score: 0.9,
        },
      ]),
      buildMockInterviewContext: jest.fn().mockReturnValue({
        target: 'professional',
        prompt: 'compact rag context',
        retrievedChunkCount: 1,
      }),
    };
    const service = new InterviewsService(
      prisma as unknown as PrismaService,
      aiService as never,
      undefined,
      undefined,
      ragService as never,
    );
    prisma.realInterviewRecord.findMany.mockResolvedValue([
      {
        id: 'record-1',
        title: 'Record 1',
        transcript: 'full interview transcript',
        structuredContent: null,
        chunks: [
          {
            title: 'RAG chunk',
            content: 'compact chunk content',
            keywords: ['rag'],
            sourceType: 'answer',
          },
        ],
      },
    ]);

    await service.createSession(10, {
      interviewType: 'professional',
      questionCount: 3,
      jobDescription: 'target role',
      knowledgeBaseIds: ['kb-1'],
      enableFollowUp: true,
      enableVoiceInput: true,
      language: 'zh-CN',
    });

    expect(prisma.realInterviewRecord.findMany).toHaveBeenCalledTimes(1);
    expect(ragService.retrieveRelevantChunks).toHaveBeenCalledTimes(1);
    expect(aiService.generateQuestionPlan).toHaveBeenCalledTimes(1);
    expect(aiService.generateInterviewStrategy).not.toHaveBeenCalled();
    expect(aiService.generateOpeningQuestion).not.toHaveBeenCalled();
    expect(aiService.generateQuestionPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeSnippets: [
          expect.objectContaining({
            recordId: 'rag-retrieval',
            transcript: 'compact rag context',
          }),
        ],
      }),
    );
  });

  it('skips only the current question and moves to the next active question', async () => {
    const prisma = createPrismaMock();
    const service = new InterviewsService(prisma as unknown as PrismaService);
    const questions = [
      {
        id: 'q-1',
        order: 1,
        content: '第 1 题',
        dimension: 'general',
        difficulty: 'easy',
        sourceType: 'rule',
        sourceLabel: '基础智能问题',
        skipped: false,
      },
      {
        id: 'q-2',
        order: 2,
        content: '第 2 题',
        dimension: 'professional',
        difficulty: 'medium',
        sourceType: 'rule',
        sourceLabel: '基础智能问题',
        skipped: false,
      },
      {
        id: 'q-3',
        order: 3,
        content: '第 3 题',
        dimension: 'professional',
        difficulty: 'medium',
        sourceType: 'rule',
        sourceLabel: '基础智能问题',
        skipped: false,
      },
      {
        id: 'q-4',
        order: 4,
        content: '第 4 题',
        dimension: 'professional',
        difficulty: 'medium',
        sourceType: 'rule',
        sourceLabel: '基础智能问题',
        skipped: false,
      },
    ];
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-skip',
      type: 'professional',
      totalQuestions: 4,
      currentQuestion: 2,
      ended: false,
      startedAt,
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      messages: [
        {
          id: 'assistant-q2',
          sessionId: 'session-skip',
          role: 'assistant',
          questionId: 'q-2',
          content: '第 2 题',
          createdAt: startedAt.toISOString(),
        },
      ],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-skip',
        type: 'professional',
        totalQuestions: 4,
        currentQuestion: 2,
        ended: false,
        startedAt,
        knowledgeBaseIds: [],
        questionFeedback: {},
        ...data,
      }),
    );

    const result = await service.skipQuestion(10, 'session-skip', 'q-2');

    expect(result.currentQuestion).toBe(3);
    expect(
      result.questionsPreview.find((question) => question.id === 'q-2')
        ?.skipped,
    ).toBe(true);
    expect(result.messages.at(-1)).toEqual(
      expect.objectContaining({
        role: 'assistant',
        questionId: 'q-3',
        content: '第 3 题',
      }),
    );
    expect(prisma.interviewSession.update).toHaveBeenCalledWith({
      where: { id: 'session-skip' },
      data: expect.objectContaining({
        totalQuestions: 3,
        currentQuestion: 3,
      }),
    });
  });
});

// ============================================================================
// Step 0（M1）：基线 —— 固定 NestJS 对图动作的“二次解释”现状（v1 行为）
// 这些用例在 Step 5 之后会改为“直接消费图结果”，届时同步更新。
// ============================================================================

describe('Step 0 基线：NestJS 对图动作的二次解释（v1 现状）', () => {
  const startedAt = new Date('2026-06-11T00:00:00.000Z');

  function createTransitionPrismaMock() {
    return {
      interviewSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      resume: { findFirst: jest.fn() },
      realInterviewRecord: { findMany: jest.fn() },
    };
  }

  function makeQuestion(order: number) {
    return {
      id: `q-${order}`,
      order,
      content: `第 ${order} 题：请介绍一个代表性项目。`,
      dimension: 'professional',
      dimensionLabel: '技能深挖',
      difficulty: 'medium' as const,
      difficultyLabel: '中等',
      sourceType: 'rule' as const,
      sourceLabel: '基础智能问题',
      skipped: false,
    };
  }

  function makeGraphResult(overrides: { action: string; stage: string }) {
    return {
      stage: overrides.stage,
      strategistDecision: {
        action: overrides.action,
        nextState: overrides.stage,
        messageType:
          overrides.action === 'wrap_up' ? 'closing' : 'topic_switch',
        reason: 'baseline',
        targetCapability: '建模能力',
        speakerInstruction: 'baseline',
        memoryPatch: [],
      },
      memoryState: null,
      turnSummaries: [],
      listenerOutput: undefined,
      speakerOutput: { messageType: 'follow_up', content: '面试官内容。' },
      evaluationState: null,
    };
  }

  function createTransitionSession(
    questions: ReturnType<typeof makeQuestion>[],
    currentQuestion: number,
  ) {
    return {
      id: 'session-transition',
      type: 'professional',
      totalQuestions: questions.length,
      currentQuestion,
      ended: false,
      startedAt,
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      strategySnapshot: null,
      interviewState: null,
      memoryState: null,
      evaluationState: null,
      jobDescription: null,
      messages: [
        {
          id: 'assistant-q1',
          sessionId: 'session-transition',
          role: 'assistant',
          questionId: 'q-1',
          content: '第 1 题',
          createdAt: startedAt.toISOString(),
        },
      ],
    };
  }

  function readUpdateData(
    prisma: ReturnType<typeof createTransitionPrismaMock>,
  ) {
    const call = prisma.interviewSession.update.mock.calls[0] as unknown as [
      { where: { id: string }; data: Record<string, unknown> },
    ];
    return call?.[0]?.data ?? {};
  }

  it('wrap_up 且不存在下一题时，NestJS 标记会话结束（ended=true，stage=FINISHED）', async () => {
    const prisma = createTransitionPrismaMock();
    const questions = [makeQuestion(1), makeQuestion(2)];
    const session = createTransitionSession(questions, 2);
    prisma.interviewSession.findFirst.mockResolvedValue(session);
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...session, ...data }),
    );
    const graphMock = {
      runTurn: jest
        .fn()
        .mockResolvedValue(
          makeGraphResult({ action: 'wrap_up', stage: 'FINISHED' }),
        ),
    };
    const service = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphMock as never,
    );

    await service.submitAnswer(10, 'session-transition', {
      answer: '我的回答内容。',
    });

    expect(graphMock.runTurn).toHaveBeenCalledTimes(1);
    const updateData = readUpdateData(prisma);
    expect(updateData).toMatchObject({ ended: true, currentQuestion: 2 });
    expect(updateData.interviewState).toMatchObject({
      stage: 'FINISHED',
      lastAction: 'wrap_up',
    });
  });

  it('switch_topic 且存在下一题时，NestJS 推进 currentQuestion 并把 stage 重置回 S0（基线怪癖）', async () => {
    const prisma = createTransitionPrismaMock();
    const questions = [makeQuestion(1), makeQuestion(2)];
    const session = createTransitionSession(questions, 1);
    prisma.interviewSession.findFirst.mockResolvedValue(session);
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...session, ...data }),
    );
    const graphMock = {
      runTurn: jest
        .fn()
        .mockResolvedValue(
          makeGraphResult({ action: 'switch_topic', stage: 'S3_EXTENSION' }),
        ),
    };
    const service = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphMock as never,
    );

    const result = await service.submitAnswer(10, 'session-transition', {
      answer: '我的回答内容。',
    });

    const updateData = readUpdateData(prisma);
    expect(updateData).toMatchObject({ ended: false, currentQuestion: 2 });
    expect(updateData.interviewState).toMatchObject({ stage: 'S0_ICE_BREAK' });
    expect(result.messages.at(-1)).toMatchObject({
      role: 'assistant',
      messageType: 'question',
      questionId: 'q-2',
      content: '第 2 题：请介绍一个代表性项目。',
    });
  });
});

describe('Step 5：NestJS 直接消费图结果（v2 会话，legacy 转换不再参与）', () => {
  const startedAt = new Date('2026-06-11T00:00:00.000Z');

  function createV2PrismaMock() {
    return {
      interviewSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      resume: { findFirst: jest.fn() },
      realInterviewRecord: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }

  function makeV2Question(order: number) {
    return {
      id: `q-${order}`,
      order,
      content: `第 ${order} 题：请介绍一个代表性项目。`,
      dimension: 'professional',
      dimensionLabel: '技能深挖',
      difficulty: 'medium' as const,
      difficultyLabel: '中等',
      sourceType: 'rule' as const,
      sourceLabel: '基础智能问题',
      skipped: false,
    };
  }

  function createV2Session(
    questions: ReturnType<typeof makeV2Question>[],
    currentQuestion: number,
  ) {
    return {
      id: 'session-v2',
      type: 'professional',
      totalQuestions: questions.length,
      currentQuestion,
      ended: false,
      startedAt,
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      strategySnapshot: null,
      interviewState: { graphVersion: 'v2' },
      memoryState: null,
      evaluationState: null,
      jobDescription: null,
      messages: [
        {
          id: 'assistant-q1',
          sessionId: 'session-v2',
          role: 'assistant',
          questionId: 'q-1',
          content: '第 1 题',
          createdAt: startedAt.toISOString(),
        },
      ],
    };
  }

  function makeV2GraphResult(overrides: {
    status: 'ACTIVE' | 'FINISHED';
    nextQuestion?: { id: string; order: number; content: string; dimension?: string };
    speakerOutput?: { messageType?: string; content?: string };
    endReason?: string;
    evaluationState?: unknown;
  }) {
    return {
      stage: overrides.status === 'FINISHED' ? 'FINISHED' : 'S3_EXTENSION',
      status: overrides.status,
      endReason: overrides.endReason,
      nextQuestion: overrides.nextQuestion,
      currentQuestion: overrides.nextQuestion,
      strategistDecision: {
        action: overrides.status === 'FINISHED' ? 'wrap_up' : 'switch_topic',
        nextState:
          overrides.status === 'FINISHED' ? 'S4_REVERSE_QUESTION' : 'S3_EXTENSION',
        messageType: overrides.status === 'FINISHED' ? 'closing' : 'topic_switch',
        reason: 'baseline-v2',
        targetCapability: '建模能力',
        speakerInstruction: 'baseline',
        memoryPatch: [],
      },
      proposedDecision: undefined,
      speakerOutput: overrides.speakerOutput,
      routeTrace: [],
      policyOverrides: [],
      memoryState: null,
      turnSummaries: [],
      listenerOutput: undefined,
      evaluationState: overrides.evaluationState ?? null,
    };
  }

  function readV2UpdateData(
    prisma: ReturnType<typeof createV2PrismaMock>,
  ) {
    const call = prisma.interviewSession.update.mock.calls[0] as unknown as [
      { where: { id: string }; data: Record<string, unknown> },
    ];
    return call?.[0]?.data ?? {};
  }

  it('v2：桩图返回 FINISHED → ended/status/endReason 直接来自图结果，evaluationState 落库', async () => {
    const prisma = createV2PrismaMock();
    const questions = [makeV2Question(1)];
    const session = createV2Session(questions, 1);
    prisma.interviewSession.findFirst.mockResolvedValue(session);
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...session, ...data }),
    );
    const graphMock = {
      runTurn: jest
        .fn()
        .mockResolvedValue(
          makeV2GraphResult({
            status: 'FINISHED',
            endReason: 'max_turns',
            evaluationState: { overallScore: 88, dimensionScores: {} },
          }),
        ),
    };
    const service = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphMock as never,
    );

    await service.submitAnswer(10, 'session-v2', { answer: '我的回答内容。' });

    const updateData = readV2UpdateData(prisma);
    expect(updateData).toMatchObject({ ended: true, currentQuestion: 1 });
    expect(updateData.interviewState).toMatchObject({
      status: 'FINISHED',
      endReason: 'max_turns',
      graphVersion: 'v2',
    });
    expect(updateData.evaluationState).toMatchObject({ overallScore: 88 });
  });

  it('v2：切题成功 → currentQuestion 由图返回的 nextQuestion 驱动，消息为下一题', async () => {
    const prisma = createV2PrismaMock();
    const questions = [makeV2Question(1), makeV2Question(2)];
    const session = createV2Session(questions, 1);
    prisma.interviewSession.findFirst.mockResolvedValue(session);
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...session, ...data }),
    );
    const graphMock = {
      runTurn: jest.fn().mockResolvedValue(
        makeV2GraphResult({
          status: 'ACTIVE',
          nextQuestion: {
            id: 'q-2',
            order: 2,
            content: '第 2 题：请介绍一个代表性项目。',
            dimension: 'professional',
          },
          speakerOutput: {
            messageType: 'question',
            content: '请以自然口吻提出下一道主问题：第 2 题：请介绍一个代表性项目。',
          },
        }),
      ),
    };
    const service = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphMock as never,
    );

    const result = await service.submitAnswer(10, 'session-v2', {
      answer: '我的回答内容。',
    });

    const updateData = readV2UpdateData(prisma);
    expect(updateData).toMatchObject({ ended: false, currentQuestion: 2 });
    expect(updateData.interviewState).toMatchObject({
      status: 'ACTIVE',
      graphVersion: 'v2',
    });
    expect(result.messages.at(-1)).toMatchObject({
      role: 'assistant',
      messageType: 'question',
      questionId: 'q-2',
      content: '请以自然口吻提出下一道主问题：第 2 题：请介绍一个代表性项目。',
    });
  });

  it('v2 会话创建时按环境变量记录 graphVersion（开/关）', async () => {
    const prisma = createV2PrismaMock();
    prisma.interviewSession.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'session-new', ...data, startedAt }),
    );
    const service = new InterviewsService(prisma as unknown as PrismaService);
    const input = {
      interviewType: 'professional',
      questionCount: 2,
      jobDescription: 'job',
      knowledgeBaseIds: [],
      enableFollowUp: true,
      enableVoiceInput: true,
      language: 'zh-CN',
    };

    process.env.INTERVIEW_GRAPH_V2_ENABLED = '1';
    await service.createSession(10, input);
    const v2Call = prisma.interviewSession.create.mock.calls[0] as unknown as [
      { data?: { interviewState?: { graphVersion?: string } } },
    ];
    expect(v2Call?.[0]?.data?.interviewState?.graphVersion).toBe('v2');

    delete process.env.INTERVIEW_GRAPH_V2_ENABLED;
    await service.createSession(10, input);
    const v1Call = prisma.interviewSession.create.mock.calls.at(-1) as unknown as [
      { data?: { interviewState?: { graphVersion?: string } } },
    ];
    expect(v1Call?.[0]?.data?.interviewState?.graphVersion).toBe('v1');
  });

  it('Step 8：同一轮回答重复提交幂等拦截，不产生重复消息', async () => {
    const prisma = createV2PrismaMock();
    const questions = [makeV2Question(1)];
    const session = createV2Session(questions, 1);
    // 模拟上一轮已完成：最后一条消息是面试官回复
    session.messages = [
      {
        id: 'assistant-q1',
        sessionId: 'session-v2',
        role: 'assistant',
        questionId: 'q-1',
        content: '第 1 题',
        createdAt: startedAt.toISOString(),
      },
      {
        id: 'user-1',
        sessionId: 'session-v2',
        role: 'user',
        content: '我的回答内容。',
        createdAt: startedAt.toISOString(),
      },
      {
        id: 'assistant-reply',
        sessionId: 'session-v2',
        role: 'assistant',
        content: '追问内容。',
        createdAt: startedAt.toISOString(),
      },
    ];
    prisma.interviewSession.findFirst.mockResolvedValue(session);
    const graphMock = { runTurn: jest.fn() };
    const service = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphMock as never,
    );

    const result = await service.submitAnswer(10, 'session-v2', {
      answer: '我的回答内容。',
    });

    expect(graphMock.runTurn).not.toHaveBeenCalled();
    expect(prisma.interviewSession.update).not.toHaveBeenCalled();
    expect(result.messages).toHaveLength(3);
  });
});
