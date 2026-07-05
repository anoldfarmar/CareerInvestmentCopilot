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
    const service = new InterviewsService(prisma as unknown as PrismaService, aiService as never);

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
    expect(result.questionsPreview.find((question) => question.id === 'q-2')?.skipped).toBe(true);
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
