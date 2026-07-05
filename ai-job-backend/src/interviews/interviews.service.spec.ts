import { PrismaService } from '../prisma/prisma.service';
import { InterviewsService } from './interviews.service';

describe('InterviewsService', () => {
  const prisma = {
    interviewSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    resume: {
      findFirst: jest.fn(),
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

  it('专业面试有 JD 和简历时，第一题应围绕岗位要求而不是简历技能字段', async () => {
    prisma.resume.findFirst.mockResolvedValue({
      id: 4,
      title: '杨子泰简历.pdf',
      structuredContent: {
        skills: [
          'Python：熟练使用Pandas, NumPy, Sklearn, Matplotlib库进行数据清洗，预处理和图像呈现',
        ],
        projects: [{ name: '全国大学生数学建模大赛' }],
        workExperiences: [{ company: '国投证券股份有限公司', position: '产品实习生' }],
      },
      optimizedContent: null,
      finalizedContent: null,
    });
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
      resumeId: 4,
      jobDescription:
        '目标公司：字节跳动\n目标岗位：AI应用开发实习生-Cross Platform\n职位详情：ByteIntern：面向2027届毕业生（2026年9月-2027年8月期间毕业），为符合岗位要求的同学提供转正机会；团队介绍：字节跳动Cross Platform致力于开发Lynx等业务界面的应用框架，构建LLM驱动的前沿系统和基础设施，提升开发者和用户体验；参与AI应用框架和底层能力建设，支撑豆包等字节跳动AI产品的需求；参与大模型应用开发全流程工作，包括但不限于多模态大模型接入、AI Agent开发、RAG优化、流程编排、MCP及工具开发、AI可观测性和调优等。',
      knowledgeBaseIds: [],
      enableFollowUp: true,
      enableVoiceInput: true,
      language: 'zh-CN',
    });

    const firstQuestion = result.questionsPreview[0];
    expect(firstQuestion.sourceType).toBe('job_description');
    expect(firstQuestion.dimension).toBe('professional');
    expect(firstQuestion.content).toContain('AI应用开发实习生-Cross Platform');
    expect(firstQuestion.content).not.toContain('Python 技能栈');
    expect(firstQuestion.content).not.toContain('ByteIntern');
    expect(firstQuestion.content).not.toContain('团队介绍');
    expect(firstQuestion.content).not.toContain('AI 应用与 Agent 工程');
    expect(firstQuestion.content).not.toContain('选择一段最相关的经历作为证据');
    expect(firstQuestion.content).not.toContain('不要复述 JD 原文');
    expect(firstQuestion.content).toBe(
      '第 1 题：请介绍一段最能证明你匹配字节跳动 · AI应用开发实习生-Cross Platform的项目或实习经历，并说明你的核心贡献、技术方法和结果。',
    );
  });

  it('专业模式首条聊天消息会优先使用 Speaker 生成的自然首问', async () => {
    const aiService = {
      generateQuestionPlan: jest.fn().mockResolvedValue([]),
      generateInterviewStrategy: jest.fn().mockResolvedValue({
        version: 'v1',
        generatedAt: startedAt.toISOString(),
        advantageProfile: [],
        weaknessProfile: [],
        interviewStrategy: {
          mainGoal: '验证岗位匹配度',
          questionMix: {
            advantageVerification: 30,
            weaknessExposure: 40,
            jdFit: 20,
            pressureTest: 10,
          },
          allowedSteeringRule: '允许围绕相关经历展开。',
          antiDriftRule: '跑偏时拉回问题。',
        },
      }),
      generateOpeningQuestion: jest.fn().mockResolvedValue({
        messageType: 'question',
        content: '我们先从你最相关的一段 AI 应用经历开始：你当时具体负责什么，最后怎么判断它做成了？',
      }),
    };
    const aiEnabledService = new InterviewsService(
      prisma as unknown as PrismaService,
      aiService as never,
    );
    prisma.interviewSession.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-ai-opening',
        ...data,
        startedAt,
      }),
    );

    const result = await aiEnabledService.createSession(10, {
      interviewType: 'professional',
      questionCount: 3,
      jobDescription: '目标公司：字节跳动\n目标岗位：AI应用开发实习生-Cross Platform\n职位详情：参与 AI Agent 开发、RAG 优化和工程落地。',
      knowledgeBaseIds: [],
      enableFollowUp: true,
      enableVoiceInput: true,
      language: 'zh-CN',
    });

    expect(aiService.generateOpeningQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        question: expect.objectContaining({ id: 'q-1' }),
      }),
    );
    expect(result.messages[0].content).toBe(
      '我们先从你最相关的一段 AI 应用经历开始：你当时具体负责什么，最后怎么判断它做成了？',
    );
    expect(result.questionsPreview[0].content).toContain('第 1 题');
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

  it('专业模式提交回答时会走 LangGraph 并保存状态补丁', async () => {
    const graphService = {
      runTurn: jest.fn().mockResolvedValue({
        stage: 'S2_CORE_DEEP_DIVE',
        listenerOutput: {
          summary: '候选人介绍了项目但缺少指标。',
          entities: ['SARIMAX'],
          facts: ['使用 SARIMAX 做销量预测'],
          missingSlots: ['MAPE/RMSE 提升幅度'],
          riskSignals: ['指标不明确'],
        },
        strategistDecision: {
          action: 'continue_deep_dive',
          nextState: 'S2_CORE_DEEP_DIVE',
          messageType: 'follow_up',
          reason: '需要继续验证指标。',
          targetCapability: '建模评估',
          speakerInstruction: '追问指标。',
          memoryPatch: ['使用 SARIMAX 做销量预测'],
        },
        speakerOutput: {
          messageType: 'follow_up',
          content: '你刚才提到 SARIMAX，能具体说说 MAPE 或 RMSE 提升了多少吗？',
        },
        turnSummaries: [
          {
            turn: 1,
            topic: '项目经历',
            facts: ['使用 SARIMAX 做销量预测'],
            missingSlots: ['MAPE/RMSE 提升幅度'],
            riskSignals: ['指标不明确'],
          },
        ],
        memoryState: {
          candidateClaims: ['使用 SARIMAX 做销量预测'],
        },
        evaluationState: null,
      }),
    };
    const graphEnabledService = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphService as never,
    );

    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-graph',
      type: 'professional',
      totalQuestions: 2,
      currentQuestion: 2,
      ended: false,
      startedAt,
      jobDescription: '需要建模评估经验。',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      strategySnapshot: { version: 'v1' },
      interviewState: null,
      memoryState: null,
      evaluationState: null,
      messages: [
        {
          id: 'assistant-1',
          sessionId: 'session-graph',
          role: 'assistant',
          content: questions[1].content,
          questionId: 'q-2',
          createdAt: startedAt.toISOString(),
        },
      ],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-graph',
        type: 'professional',
        totalQuestions: 2,
        currentQuestion: 2,
        ended: false,
        startedAt,
        knowledgeBaseIds: [],
        questions,
        questionFeedback: {},
        ...data,
      }),
    );

    const result = await graphEnabledService.submitAnswer(10, 'session-graph', {
      answer: '我使用 SARIMAX 做销量预测。',
    });

    expect(graphService.runTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-graph',
        latestAnswer: '我使用 SARIMAX 做销量预测。',
        currentQuestion: expect.objectContaining({ id: 'q-2' }),
      }),
    );
    expect(prisma.interviewSession.update).toHaveBeenCalledWith({
      where: { id: 'session-graph' },
      data: expect.objectContaining({
        interviewState: expect.objectContaining({
          stage: 'S2_CORE_DEEP_DIVE',
          lastAction: 'continue_deep_dive',
        }),
        memoryState: expect.objectContaining({
          turnSummaries: expect.any(Array),
        }),
      }),
    });
    expect(result.messages.at(-1)).toEqual(
      expect.objectContaining({
        role: 'assistant',
        sourceLabel: 'LangGraph 专业追问',
      }),
    );
  });

  it('专业模式切换话题时会推进 currentQuestion 并把下一问绑定到新题目', async () => {
    const graphService = {
      runTurn: jest.fn().mockResolvedValue({
        stage: 'S3_EXTENSION',
        listenerOutput: {
          summary: '当前项目已完成深挖。',
          entities: [],
          facts: ['使用 SARIMAX 做销量预测'],
          missingSlots: [],
          riskSignals: [],
        },
        strategistDecision: {
          action: 'switch_topic',
          nextState: 'S3_EXTENSION',
          messageType: 'topic_switch',
          reason: '当前节点已连续深挖，切换到下一题。',
          targetCapability: '产品实验设计',
          speakerInstruction: '切到下一题。',
          memoryPatch: ['使用 SARIMAX 做销量预测'],
        },
        speakerOutput: {
          messageType: 'topic_switch',
          content: '好的，我们换一个方向。你能讲讲 A/B 实验设计吗？',
        },
        turnSummaries: [
          {
            turn: 3,
            topic: 'SARIMAX 项目',
            nodeId: 'q-1',
            facts: ['使用 SARIMAX 做销量预测'],
            missingSlots: [],
            riskSignals: [],
          },
        ],
        memoryState: {
          candidateClaims: ['使用 SARIMAX 做销量预测'],
        },
        evaluationState: null,
      }),
    };
    const graphEnabledService = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphService as never,
    );

    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-switch',
      type: 'professional',
      totalQuestions: 2,
      currentQuestion: 1,
      ended: false,
      startedAt,
      jobDescription: '需要建模评估和实验设计经验。',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      strategySnapshot: { version: 'v1' },
      interviewState: { stage: 'S2_CORE_DEEP_DIVE' },
      memoryState: null,
      evaluationState: null,
      messages: [
        {
          id: 'assistant-1',
          sessionId: 'session-switch',
          role: 'assistant',
          content: questions[0].content,
          questionId: 'q-1',
          createdAt: startedAt.toISOString(),
        },
      ],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-switch',
        type: 'professional',
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

    const result = await graphEnabledService.submitAnswer(10, 'session-switch', {
      answer: '我已经补充了 SARIMAX 项目的指标。',
    });

    expect(result.currentQuestion).toBe(2);
    expect(result.messages.at(-1)).toEqual(
      expect.objectContaining({
        role: 'assistant',
        questionId: 'q-2',
        messageType: 'topic_switch',
      }),
    );
    expect(prisma.interviewSession.update).toHaveBeenCalledWith({
      where: { id: 'session-switch' },
      data: expect.objectContaining({
        currentQuestion: 2,
        interviewState: expect.objectContaining({
          stage: 'S0_ICE_BREAK',
          lastAction: 'switch_topic',
        }),
      }),
    });
  });

  it('专业模式流式提交会发送进度事件和最终 session', async () => {
    const graphService = {
      runTurnWithProgress: jest.fn().mockImplementation(async (_input, emit) => {
        await emit({ type: 'thinking_start' });
        await emit({ type: 'speaker_delta', delta: '请补充指标' });
        return {
          stage: 'S2_CORE_DEEP_DIVE',
          listenerOutput: {
            summary: '候选人介绍了项目。',
            entities: [],
            facts: ['使用 SARIMAX 做销量预测'],
            missingSlots: ['指标'],
            riskSignals: [],
          },
          strategistDecision: {
            action: 'continue_deep_dive',
            nextState: 'S2_CORE_DEEP_DIVE',
            messageType: 'follow_up',
            reason: '需要补充指标。',
            targetCapability: '建模评估',
            speakerInstruction: '追问指标。',
            memoryPatch: ['使用 SARIMAX 做销量预测'],
          },
          speakerOutput: {
            messageType: 'follow_up',
            content: '请补充指标',
          },
          turnSummaries: [
            {
              turn: 1,
              topic: '项目经历',
              facts: ['使用 SARIMAX 做销量预测'],
              missingSlots: ['指标'],
              riskSignals: [],
            },
          ],
          memoryState: {
            candidateClaims: ['使用 SARIMAX 做销量预测'],
          },
          evaluationState: null,
        };
      }),
    };
    const graphEnabledService = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphService as never,
    );
    const events: unknown[] = [];

    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-stream',
      type: 'professional',
      totalQuestions: 2,
      currentQuestion: 2,
      ended: false,
      startedAt,
      jobDescription: '需要建模评估经验。',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      strategySnapshot: { version: 'v1' },
      interviewState: null,
      memoryState: null,
      evaluationState: null,
      messages: [
        {
          id: 'assistant-1',
          sessionId: 'session-stream',
          role: 'assistant',
          content: questions[1].content,
          questionId: 'q-2',
          createdAt: startedAt.toISOString(),
        },
      ],
    });
    prisma.interviewSession.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'session-stream',
        type: 'professional',
        totalQuestions: 2,
        currentQuestion: 2,
        ended: false,
        startedAt,
        knowledgeBaseIds: [],
        questions,
        questionFeedback: {},
        ...data,
      }),
    );

    const result = await graphEnabledService.submitAnswerStream(
      10,
      'session-stream',
      { answer: '我使用 SARIMAX 做销量预测。' },
      (event) => {
        events.push(event);
      },
    );

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'thinking_start' }),
        expect.objectContaining({ type: 'speaker_delta', delta: '请补充指标' }),
        expect.objectContaining({ type: 'session' }),
      ]),
    );
    expect(result.messages.at(-1)).toEqual(
      expect.objectContaining({
        role: 'assistant',
        content: '请补充指标',
      }),
    );
  });

  it('结束专业模式面试时会运行最终评估并保存 evaluationState', async () => {
    const graphService = {
      runFinalEvaluation: jest.fn().mockResolvedValue({
        overallScore: 78,
        dimensionScores: {
          technicalDepth: 80,
          logic: 76,
          jdFit: 72,
          evidenceDensity: 74,
          communication: 82,
        },
        verifiedStrengths: ['能说明 SARIMAX 项目'],
        unverifiedClaims: ['缺少个人贡献边界'],
        followUpChainReview: [
          {
            topic: '项目深挖',
            chain: ['项目背景', '指标追问'],
            result: '追问链路基本闭环。',
          },
        ],
        nextPracticeActions: ['补充个人贡献边界'],
      }),
    };
    const graphEnabledService = new InterviewsService(
      prisma as unknown as PrismaService,
      undefined,
      graphService as never,
    );

    prisma.interviewSession.findFirst.mockResolvedValue({
      id: 'session-final',
      userId: 10,
      type: 'professional',
      totalQuestions: 2,
      currentQuestion: 2,
      ended: false,
      startedAt,
      jobDescription: '需要建模评估经验。',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      strategySnapshot: { version: 'v1' },
      interviewState: { stage: 'S2_CORE_DEEP_DIVE' },
      memoryState: {
        turnSummaries: [
          {
            turn: 1,
            topic: '项目经历',
            facts: ['使用 SARIMAX 做销量预测'],
            missingSlots: ['个人贡献边界'],
            riskSignals: [],
          },
        ],
      },
      evaluationState: null,
      messages: [
        {
          id: 'assistant-1',
          sessionId: 'session-final',
          role: 'assistant',
          content: questions[1].content,
          questionId: 'q-2',
          createdAt: startedAt.toISOString(),
        },
        {
          id: 'user-1',
          sessionId: 'session-final',
          role: 'user',
          content: '我使用 SARIMAX 做销量预测。',
          questionId: 'q-2',
          createdAt: startedAt.toISOString(),
        },
      ],
    });
    prisma.interviewSession.update.mockResolvedValue({
      id: 'session-final',
      userId: 10,
      type: 'professional',
      totalQuestions: 2,
      currentQuestion: 2,
      ended: true,
      startedAt,
      jobDescription: '需要建模评估经验。',
      knowledgeBaseIds: [],
      questions,
      questionFeedback: {},
      strategySnapshot: { version: 'v1' },
      interviewState: { stage: 'FINISHED' },
      evaluationState: {
        overallScore: 78,
      },
      messages: [],
    });

    await graphEnabledService.endSession(10, 'session-final');

    expect(graphService.runFinalEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-final',
        stage: 'FINISHED',
        turnSummaries: expect.arrayContaining([
          expect.objectContaining({
            facts: ['使用 SARIMAX 做销量预测'],
          }),
        ]),
      }),
    );
    expect(prisma.interviewSession.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'session-final' },
      data: expect.objectContaining({
        ended: true,
        interviewState: expect.objectContaining({
          stage: 'FINISHED',
          finalEvaluationStatus: 'pending',
        }),
      }),
    });
    expect(prisma.interviewSession.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'session-final' },
      data: expect.objectContaining({
        interviewState: expect.objectContaining({
          stage: 'FINISHED',
          finalEvaluationStatus: 'done',
          finalEvaluatedAt: expect.any(String),
        }),
        evaluationState: expect.objectContaining({
          overallScore: 78,
          verifiedStrengths: ['能说明 SARIMAX 项目'],
        }),
      }),
    });
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
