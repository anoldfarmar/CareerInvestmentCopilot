import { PrismaService } from '../prisma/prisma.service';
import { InterviewsService } from './interviews.service';

describe('InterviewsService', () => {
  const prisma = {
    interviewSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new InterviewsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const startedAt = new Date('2026-06-11T00:00:00.000Z');
  const questions = [
    {
      id: 'q-1',
      order: 1,
      content: '第 1 题：请做一个自我介绍。',
      dimension: 'general',
      dimensionLabel: '通用表达',
      difficulty: 'easy',
      difficultyLabel: '简单',
      sourceType: 'rule',
      sourceLabel: '基础智能问题',
      skipped: false,
    },
    {
      id: 'q-2',
      order: 2,
      content: '第 2 题：请介绍一个代表性项目。',
      dimension: 'professional',
      dimensionLabel: '技能深挖',
      difficulty: 'medium',
      difficultyLabel: '中等',
      sourceType: 'job_description',
      sourceLabel: '基于目标 JD',
      skipped: false,
    },
  ];

  it('创建面试会话时会生成题目预览和第一道正式问题', async () => {
    prisma.interviewSession.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-1',
        ...data,
        startedAt,
      }),
    );

    const result = await service.createSession(10, {
      interviewType: 'professional',
      questionCount: 5,
      jobDescription: '需要熟悉 React、TypeScript、工程化和性能优化。',
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
      }),
    });
    expect(result.questionsPreview).toHaveLength(5);
    expect(result.messages[0].role).toBe('assistant');
    expect(result.messages[0].content).toContain('第');
  });

  it('提交回答后停留在当前题，并生成面试官追问', async () => {
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      type: 'general',
      totalQuestions: 2,
      currentQuestion: 1,
      ended: false,
      startedAt,
      jobDescription: '',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      messages: [
        {
          id: 'assistant-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: questions[0].content,
          questionId: 'q-1',
          createdAt: startedAt.toISOString(),
        },
      ],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-1',
        type: 'general',
        totalQuestions: 2,
        currentQuestion: 1,
        ended: false,
        startedAt,
        knowledgeBaseIds: [],
        questions,
        questionFeedback: {},
        ...data,
      }),
    );

    const result = await service.submitAnswer(10, 'session-1', {
      answer: '我主要负责前端工程化和性能优化。',
    });

    expect(result.currentQuestion).toBe(1);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[1]).toEqual(expect.objectContaining({ role: 'user' }));
    expect(result.messages[2]).toEqual(
      expect.objectContaining({
        role: 'assistant',
        questionId: 'q-1',
        messageType: 'follow_up',
      }),
    );
    expect(result.ended).toBe(false);
  });

  it('does not create another follow-up when answering a follow-up', async () => {
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      type: 'general',
      totalQuestions: 2,
      currentQuestion: 1,
      ended: false,
      startedAt,
      jobDescription: '',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      messages: [
        {
          id: 'assistant-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: questions[0].content,
          questionId: 'q-1',
          createdAt: startedAt.toISOString(),
        },
        {
          id: 'user-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'I improved frontend performance.',
          questionId: 'q-1',
          createdAt: startedAt.toISOString(),
        },
        {
          id: 'assistant-follow-up-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Please explain the metrics.',
          questionId: 'q-1',
          messageType: 'follow_up',
          createdAt: startedAt.toISOString(),
        },
      ],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-1',
        type: 'general',
        totalQuestions: 2,
        currentQuestion: 1,
        ended: false,
        startedAt,
        knowledgeBaseIds: [],
        questions,
        questionFeedback: {},
        ...data,
      }),
    );

    const result = await service.submitAnswer(10, 'session-1', {
      answer: 'I would use FCP and conversion rate to prove impact.',
    });

    expect(result.currentQuestion).toBe(1);
    expect(result.messages).toHaveLength(4);
    expect(result.messages[3]).toEqual(expect.objectContaining({ role: 'user', questionId: 'q-1' }));
    expect(result.messages.filter((message) => message.messageType === 'follow_up')).toHaveLength(1);
  });

  it('用户手动进入下一题时才推进 currentQuestion', async () => {
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      type: 'general',
      totalQuestions: 2,
      currentQuestion: 1,
      ended: false,
      startedAt,
      jobDescription: '',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      messages: [],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-1',
        type: 'general',
        totalQuestions: 2,
        startedAt,
        knowledgeBaseIds: [],
        questions,
        questionFeedback: {},
        ...data,
      }),
    );

    const result = await service.moveToNextQuestion(10, 'session-1');

    expect(result.currentQuestion).toBe(2);
    expect(result.messages[0]).toEqual(
      expect.objectContaining({
        role: 'assistant',
        questionId: 'q-2',
      }),
    );
    expect(result.ended).toBe(false);
  });

  it('跳过题目时会更新题目预览和题目总数', async () => {
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      type: 'general',
      totalQuestions: 2,
      currentQuestion: 1,
      ended: false,
      startedAt,
      jobDescription: '',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      messages: [],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-1',
        type: 'general',
        startedAt,
        ended: false,
        knowledgeBaseIds: [],
        questionFeedback: {},
        ...data,
      }),
    );

    const result = await service.skipQuestion(10, 'session-1', 'q-1');

    expect(result.totalQuestions).toBe(1);
    expect(result.questionsPreview[0].skipped).toBe(true);
    expect(result.currentQuestion).toBe(2);
  });

  it('可以保存单道题反馈，供后续优化出题质量', async () => {
    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      type: 'general',
      totalQuestions: 1,
      currentQuestion: 1,
      ended: true,
      startedAt,
      jobDescription: '',
      knowledgeBaseIds: [],
      questions: [],
      questionFeedback: {},
      messages: [],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-1',
        type: 'general',
        totalQuestions: 1,
        currentQuestion: 1,
        startedAt,
        ended: true,
        knowledgeBaseIds: [],
        questions: [],
        messages: [],
        ...data,
      }),
    );

    const result = await service.submitQuestionFeedback(10, 'session-1', 'q-1', {
      difficultyRating: 3,
      relevanceRating: 4,
      isRepeated: false,
      comment: '希望更偏项目深挖。',
    });

    expect(result.questionFeedback['q-1']).toEqual(
      expect.objectContaining({
        difficultyRating: 3,
        relevanceRating: 4,
        isRepeated: false,
      }),
    );
  });
});
