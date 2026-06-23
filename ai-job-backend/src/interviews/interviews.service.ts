import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { AddInterviewQuestionDto } from './dto/add-interview-question.dto';
import { CreateInterviewSessionDto } from './dto/create-interview-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SubmitQuestionFeedbackDto } from './dto/submit-question-feedback.dto';
import { InterviewAiService, type InterviewKnowledgeSnippet, type InterviewStrategySnapshot } from './interview-ai.service';
import { InterviewRagService, type RagRecord } from './interview-rag.service';

type InterviewQuestionDifficulty = 'easy' | 'medium' | 'hard';
type InterviewQuestionSourceType = 'rule' | 'resume' | 'job_description' | 'knowledge_base' | 'custom';

export type InterviewQuestionPreview = {
  id: string;
  order: number;
  content: string;
  dimension: string;
  dimensionLabel: string;
  difficulty: InterviewQuestionDifficulty;
  difficultyLabel: string;
  sourceType: InterviewQuestionSourceType;
  sourceLabel: string;
  skipped?: boolean;
};

type InterviewMessage = {
  id: string;
  sessionId: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  questionId?: string;
  messageType?: 'question' | 'follow_up' | 'answer_feedback' | 'closing';
  dimension?: string;
  difficulty?: InterviewQuestionDifficulty;
  sourceLabel?: string;
  sourceType?: InterviewQuestionSourceType;
  feedbackScore?: number;
  feedbackStrengths?: string[];
  feedbackImprovements?: string[];
};

type QuestionFeedbackRecord = SubmitQuestionFeedbackDto & {
  submittedAt: string;
};

type ResumeInterviewContext = {
  id: number;
  title: string;
  content: unknown;
  text: string;
  focus: string;
};

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interviewAiService?: InterviewAiService,
    private readonly reportsService?: ReportsService,
    private readonly interviewRagService?: InterviewRagService,
    private readonly activityService?: ActivityService,
  ) {}

  async createSession(userId: number, data: CreateInterviewSessionDto) {
    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'interview.createSession.start',
        userId,
        interviewType: data.interviewType,
        questionCount: data.questionCount,
        resumeId: data.resumeId,
        knowledgeBaseCount: data.knowledgeBaseIds?.length ?? 0,
      }),
    );

    const resumeContext = await this.loadResumeContext(userId, data.resumeId);
    const questions = await this.buildQuestionPlanWithAi(userId, data, resumeContext);
    const strategySnapshot = await this.buildStrategySnapshot(userId, data, resumeContext, questions);
    const firstQuestion = this.findFirstActiveQuestion(questions);
    const session = await this.prisma.interviewSession.create({
      data: {
        type: data.interviewType,
        totalQuestions: this.countActiveQuestions(questions),
        currentQuestion: firstQuestion?.order ?? 1,
        resumeId: resumeContext?.id,
        jobDescription: data.jobDescription,
        knowledgeBaseIds: data.knowledgeBaseIds ?? [],
        questions: questions as unknown as Prisma.InputJsonValue,
        questionFeedback: {},
        strategySnapshot: strategySnapshot as unknown as Prisma.InputJsonValue,
        messages: firstQuestion
          ? [this.createAssistantMessage('pending', firstQuestion)] satisfies InterviewMessage[]
          : [],
        userId,
      },
    });
    await this.activityService?.incrementMockInterview(userId, session.startedAt);

    this.logger.log(
      JSON.stringify({
        event: 'interview.createSession.done',
        userId,
        sessionId: session.id,
        questionCount: questions.length,
        durationMs: Date.now() - startedAt,
      }),
    );

    return this.toSessionResponse(session);
  }

  private async buildQuestionPlanWithAi(
    userId: number,
    data: CreateInterviewSessionDto,
    resumeContext?: ResumeInterviewContext,
  ) {
    const fallbackQuestions = this.buildQuestionPlan(data, resumeContext);

    if (!this.interviewAiService) {
      return fallbackQuestions;
    }

    try {
      const startedAt = Date.now();
      const retrievalQuery = this.buildRetrievalQuery(data, resumeContext);
      const knowledgeSnippets = await this.loadKnowledgeSnippets(
        userId,
        data.knowledgeBaseIds ?? [],
        retrievalQuery,
        resumeContext,
        data.jobDescription,
      );
      const aiQuestions = await this.interviewAiService.generateQuestionPlan({
        interviewType: data.interviewType,
        questionCount: data.questionCount,
        difficulty: data.difficulty,
        jobDescription: data.jobDescription,
        resumeContext: resumeContext
          ? {
              title: resumeContext.title,
              focus: resumeContext.focus,
              text: resumeContext.text.slice(0, 3000),
            }
          : undefined,
        language: data.language,
        enableFollowUp: data.enableFollowUp,
        knowledgeSnippets,
      });
      this.logger.log(
        JSON.stringify({
          event: 'interview.questionPlan.ai.done',
          userId,
          aiQuestionCount: aiQuestions.length,
          knowledgeSnippetCount: knowledgeSnippets.length,
          durationMs: Date.now() - startedAt,
        }),
      );

      if (aiQuestions.length === 0) {
        return fallbackQuestions;
      }

      return this.ensureQuestionCount(aiQuestions, fallbackQuestions, data.questionCount);
    } catch (error) {
      this.logger.warn(`DeepSeek 面试题生成失败，已回落到规则题：${error instanceof Error ? error.message : String(error)}`);
      return fallbackQuestions;
    }
  }

  private async buildStrategySnapshot(
    userId: number,
    data: CreateInterviewSessionDto,
    resumeContext: ResumeInterviewContext | undefined,
    questions: InterviewQuestionPreview[],
  ): Promise<InterviewStrategySnapshot> {
    const fallbackStrategy = this.buildLocalStrategySnapshot(data, resumeContext, questions);

    if (!this.interviewAiService) {
      return fallbackStrategy;
    }

    try {
      const startedAt = Date.now();
      const retrievalQuery = this.buildRetrievalQuery(data, resumeContext);
      const knowledgeSnippets = await this.loadKnowledgeSnippets(
        userId,
        data.knowledgeBaseIds ?? [],
        retrievalQuery,
        resumeContext,
        data.jobDescription,
      );
      const strategy = await this.interviewAiService.generateInterviewStrategy({
        interviewType: data.interviewType,
        questionCount: data.questionCount,
        jobDescription: data.jobDescription,
        resumeContext: resumeContext
          ? {
              title: resumeContext.title,
              focus: resumeContext.focus,
              text: resumeContext.text.slice(0, 3000),
            }
          : undefined,
        questions,
        knowledgeSnippets,
      });

      this.logger.log(
        JSON.stringify({
          event: 'interview.strategy.ai.done',
          userId,
          advantageCount: strategy.advantageProfile.length,
          weaknessCount: strategy.weaknessProfile.length,
          durationMs: Date.now() - startedAt,
        }),
      );
      return strategy;
    } catch (error) {
      this.logger.warn(`DeepSeek 面试策略生成失败，已使用本地策略：${error instanceof Error ? error.message : String(error)}`);
      return fallbackStrategy;
    }
  }

  private buildLocalStrategySnapshot(
    data: CreateInterviewSessionDto,
    resumeContext: ResumeInterviewContext | undefined,
    questions: InterviewQuestionPreview[],
  ): InterviewStrategySnapshot {
    const hasJobDescription = Boolean(data.jobDescription?.trim());
    const hasKnowledgeBase = Boolean(data.knowledgeBaseIds?.length);
    const focus = resumeContext?.focus ?? '项目经历和岗位匹配表达';
    const sourceLabels = [...new Set(questions.map((question) => question.sourceLabel).filter(Boolean))];

    return {
      version: 'v1',
      generatedAt: new Date().toISOString(),
      advantageProfile: [
        {
          area: focus,
          evidence: [
            resumeContext ? `已关联简历《${resumeContext.title}》` : '本轮未关联可分析简历',
            hasJobDescription ? '本轮提供了目标 JD，可围绕岗位关键词展开' : '本轮未提供 JD，先训练通用表达',
            hasKnowledgeBase ? '已选择真实面试知识库，可复用历史面试经验' : '未选择知识库，优先用简历和当前回答训练',
          ],
          jdRelevance: hasJobDescription ? '需要把简历亮点映射到 JD 中的职责、技能和业务场景。' : '建议补充目标 JD，让优势更贴近真实岗位。',
          confidence: resumeContext ? 0.72 : 0.55,
          interviewerHooks: [
            '请展开一个最能证明该优势的项目细节。',
            '你在这个成果中的个人贡献边界是什么？',
            '如果面试官继续追问指标和取舍，你会怎么证明？',
          ],
          candidateSteeringSentences: [
            `这个问题我可以结合${focus}里的一个具体经历来说明。`,
            '我先回答结论，再补充一个和目标岗位更相关的项目例子。',
          ],
        },
      ],
      weaknessProfile: [
        {
          area: '回答证据密度',
          risk: '如果只讲结论、不讲事实和指标，真实面试中容易被认为项目深度不足。',
          triggerQuestions: [
            '这个项目里你具体负责哪一块？',
            '最后怎么证明你的方案有效？',
          ],
          repairActions: [
            '每道题至少补充 1 个具体动作。',
            '尽量补充规模、耗时、效率、转化率或稳定性指标。',
          ],
        },
        {
          area: hasJobDescription ? 'JD 贴合度' : '目标岗位信息不足',
          risk: hasJobDescription ? '回答如果不映射 JD，优势会显得泛泛而谈。' : '没有 JD 时，题目只能偏通用，训练针对性会下降。',
          triggerQuestions: sourceLabels.length ? sourceLabels : ['为什么你适合这个岗位？'],
          repairActions: hasJobDescription
            ? ['回答时主动提到 JD 中的关键词，并绑定自己的项目证据。']
            : ['下一轮建议粘贴目标 JD，再做岗位专项追问。'],
        },
      ],
      interviewStrategy: {
        mainGoal: '暴露短板，同时训练把优势自然引导到岗位相关证据上。',
        questionMix: {
          advantageVerification: 30,
          weaknessExposure: 40,
          jdFit: hasJobDescription ? 20 : 10,
          pressureTest: hasKnowledgeBase ? 10 : 20,
        },
        allowedSteeringRule: '用户可以把回答自然引导到优势经历，但必须与当前问题、简历证据或 JD 有明确关联。',
        antiDriftRule: '如果用户强行转移到无关经历，AI 面试官应礼貌拉回当前问题，继续追问事实、指标和个人贡献。',
      },
    };
  }

  async findSession(userId: number, sessionId: string) {
    const session = await this.findOwnedSession(userId, sessionId);
    return this.toSessionResponse(session);
  }

  async findLatestActiveSession(userId: number) {
    const session = await this.prisma.interviewSession.findFirst({
      where: { userId, ended: false },
      orderBy: { updatedAt: 'desc' },
    });

    return session ? this.toSessionResponse(session) : null;
  }

  async skipQuestion(userId: number, sessionId: string, questionId: string) {
    const session = await this.findOwnedSession(userId, sessionId);
    const questions = this.readQuestions(session.questions);
    const nextQuestions = questions.map((question) =>
      question.id === questionId ? { ...question, skipped: true } : question,
    );
    const currentActiveQuestion = this.findCurrentActiveQuestion(nextQuestions, session.currentQuestion);
    const messages = this.ensureCurrentQuestionMessage(
      this.readMessages(session.messages),
      currentActiveQuestion,
      session.id,
    );

    const updated = await this.prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        totalQuestions: this.countActiveQuestions(nextQuestions),
        currentQuestion: currentActiveQuestion?.order ?? session.currentQuestion,
        questions: nextQuestions as unknown as Prisma.InputJsonValue,
        messages: messages as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toSessionResponse(updated);
  }

  async addQuestion(userId: number, sessionId: string, data: AddInterviewQuestionDto) {
    const session = await this.findOwnedSession(userId, sessionId);
    const questions = this.readQuestions(session.questions);
    const nextOrder = questions.length + 1;
    const dimension = data.dimension ?? session.type;
    const question = this.buildQuestion({
      type: dimension,
      order: nextOrder,
      jobDescription: session.jobDescription ?? undefined,
      knowledgeBaseCount: this.readKnowledgeBaseIds(session.knowledgeBaseIds).length,
      customContent: data.content,
      sourceType: data.content ? 'custom' : undefined,
    });
    const nextQuestions = [...questions, question];

    const updated = await this.prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        totalQuestions: this.countActiveQuestions(nextQuestions),
        questions: nextQuestions as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toSessionResponse(updated);
  }

  async submitQuestionFeedback(
    userId: number,
    sessionId: string,
    questionId: string,
    data: SubmitQuestionFeedbackDto,
  ) {
    const session = await this.findOwnedSession(userId, sessionId);
    const feedback = this.readQuestionFeedback(session.questionFeedback);
    const updatedFeedback = {
      ...feedback,
      [questionId]: {
        ...data,
        submittedAt: new Date().toISOString(),
      },
    };

    const updated = await this.prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        questionFeedback: updatedFeedback as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toSessionResponse(updated);
  }

  async submitAnswer(userId: number, sessionId: string, data: SubmitAnswerDto) {
    const session = await this.findOwnedSession(userId, sessionId);
    if (session.ended) {
      return this.toSessionResponse(session);
    }

    const questions = this.readQuestions(session.questions);
    const currentQuestion = this.findQuestionByOrder(questions, session.currentQuestion);
    const messages = this.readMessages(session.messages);
    messages.push(this.createMessage('user', data.answer, session.id, currentQuestion?.id));

    const followUpMessage = await this.createFollowUpQuestionMessage(
      session.id,
      currentQuestion,
      data.answer,
      session.jobDescription ?? undefined,
      messages,
      this.readStrategySnapshot(session.strategySnapshot),
    );
    if (followUpMessage) {
      messages.push(followUpMessage);
    }

    const updated = await this.prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        messages: messages as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toSessionResponse(updated);
  }

  async moveToNextQuestion(userId: number, sessionId: string) {
    const session = await this.findOwnedSession(userId, sessionId);
    if (session.ended) {
      return this.toSessionResponse(session);
    }

    const messages = this.readMessages(session.messages);
    const questions = this.readQuestions(session.questions);
    const nextQuestion = this.findNextActiveQuestion(questions, session.currentQuestion);

    if (nextQuestion) {
      messages.push(this.createAssistantMessage(session.id, nextQuestion));
    } else {
      messages.push(this.createClosingMessage(session.id));
    }

    const updated = await this.prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        currentQuestion: nextQuestion?.order ?? session.currentQuestion,
        ended: !nextQuestion,
        endedAt: nextQuestion ? undefined : new Date(),
        messages: messages as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toSessionResponse(updated);
  }

  private async createFollowUpQuestionMessage(
    sessionId: string,
    question: InterviewQuestionPreview | undefined,
    answer: string,
    jobDescription: string | undefined,
    messages: InterviewMessage[],
    strategySnapshot?: InterviewStrategySnapshot,
  ): Promise<InterviewMessage | undefined> {
    if (!question) {
      return undefined;
    }

    if (!this.interviewAiService) {
      return this.createLocalFollowUpMessage(sessionId, question, answer);
    }

    try {
      const followUp = await this.interviewAiService.generateFollowUpQuestion({
        question,
        answer,
        jobDescription,
        recentMessages: messages.map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        })),
        strategySnapshot,
      });

      return {
        ...this.createMessage('assistant', followUp.question, sessionId, question.id),
        messageType: 'follow_up',
        dimension: question.dimension,
        difficulty: question.difficulty,
        sourceLabel: 'AI 追问',
        sourceType: question.sourceType,
      };
    } catch (error) {
      this.logger.warn(`DeepSeek 面试追问生成失败，已使用本地追问：${error instanceof Error ? error.message : String(error)}`);
      return this.createLocalFollowUpMessage(sessionId, question, answer);
    }
  }

  private createLocalFollowUpMessage(sessionId: string, question: InterviewQuestionPreview, answer: string) {
    const wordCount = this.countWords(answer);
    const content =
      wordCount < 80
        ? '我想继续追问一下：你刚才提到的经历里，具体背景是什么？你当时负责哪一块，最后怎么证明这件事是有效的？'
        : '我继续追问一个更细的问题：如果让你量化这段经历的结果，你会用哪些指标证明自己的贡献？请尽量给出数据、对比或复盘结论。';

    return {
      ...this.createMessage('assistant', content, sessionId, question.id),
      messageType: 'follow_up' as const,
      dimension: question.dimension,
      difficulty: question.difficulty,
      sourceLabel: '本地追问',
      sourceType: question.sourceType,
    };
  }

  private async createAnswerFeedbackMessage(
    sessionId: string,
    question: InterviewQuestionPreview | undefined,
    answer: string,
    jobDescription: string | undefined,
    messages: InterviewMessage[],
  ): Promise<InterviewMessage | undefined> {
    if (!question) {
      return undefined;
    }

    if (!this.interviewAiService) {
      return this.createLocalFeedbackMessage(sessionId, question, answer);
    }

    try {
      const feedback = await this.interviewAiService.evaluateAnswer({
        question,
        answer,
        jobDescription,
        recentMessages: messages.map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        })),
      });

      const content = this.formatFeedbackContent(feedback);
      return {
        ...this.createMessage('assistant', content, sessionId, question.id),
        messageType: 'answer_feedback',
        dimension: question.dimension,
        difficulty: question.difficulty,
        sourceLabel: 'AI 即时反馈',
        sourceType: question.sourceType,
        feedbackScore: feedback.score,
        feedbackStrengths: feedback.strengths,
        feedbackImprovements: feedback.improvements,
      };
    } catch (error) {
      this.logger.warn(`DeepSeek 回答点评失败，已使用本地点评：${error instanceof Error ? error.message : String(error)}`);
      return this.createLocalFeedbackMessage(sessionId, question, answer);
    }
  }

  private createLocalFeedbackMessage(sessionId: string, question: InterviewQuestionPreview, answer: string) {
    const wordCount = this.countWords(answer);
    const improvements =
      wordCount < 80
        ? ['回答偏短，建议补充背景、行动、结果三段信息。']
        : ['可以进一步加入量化结果、技术取舍和复盘反思。'];
    const strengths =
      wordCount >= 80 ? ['回答内容较完整，已经能支撑继续追问。'] : ['你已经给出了基本方向。'];
    const feedback = {
      feedback:
        wordCount < 80
          ? '你的回答已经记录，但信息量还不够。建议按照 STAR 结构补充：当时背景是什么、你具体做了什么、最终结果如何。'
          : '你的回答已经记录，整体表达较完整。下一步建议补充更具体的技术细节、量化指标，以及你在团队中的真实贡献边界。',
      strengths,
      improvements,
      followUp: '',
      score: wordCount < 80 ? 5 : 7,
    };

    return {
      ...this.createMessage('assistant', this.formatFeedbackContent(feedback), sessionId, question.id),
      messageType: 'answer_feedback' as const,
      dimension: question.dimension,
      difficulty: question.difficulty,
      sourceLabel: '本地即时反馈',
      sourceType: question.sourceType,
      feedbackScore: feedback.score,
      feedbackStrengths: strengths,
      feedbackImprovements: improvements,
    };
  }

  private formatFeedbackContent(feedback: {
    feedback: string;
    strengths: string[];
    improvements: string[];
    followUp?: string;
    score: number;
  }) {
    const strengths = feedback.strengths.length ? `\n\n优点：${feedback.strengths.join('；')}` : '';
    const improvements = feedback.improvements.length ? `\n改进：${feedback.improvements.join('；')}` : '';
    const followUp = feedback.followUp?.trim() ? `\n追问建议：${feedback.followUp.trim()}` : '';
    return `即时反馈（${feedback.score}/10）：${feedback.feedback}${strengths}${improvements}${followUp}`;
  }

  private createClosingMessage(sessionId: string) {
    return {
      ...this.createMessage(
        'assistant',
        '本轮题目已经完成。你可以点击“结束”进入复盘报告，系统会根据你的回答生成整体评分、薄弱点和下一步练习建议。',
        sessionId,
      ),
      messageType: 'closing' as const,
      sourceLabel: '面试结束提示',
      sourceType: 'rule' as const,
    };
  }

  async endSession(userId: number, sessionId: string) {
    await this.findOwnedSession(userId, sessionId);

    await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        ended: true,
        endedAt: new Date(),
      },
    });

    void this.ensureReportGenerated(userId, sessionId);

    return this.getProgress(userId, sessionId);
  }

  private async ensureReportGenerated(userId: number, sessionId: string) {
    if (!this.reportsService) return;

    try {
      await this.reportsService.generate(userId, { sessionId });
    } catch (error) {
      this.logger.warn(
        `面试结束后自动生成复盘报告失败，可由前端手动重试：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getProgress(userId: number, sessionId: string) {
    const session = await this.findOwnedSession(userId, sessionId);
    const messages = this.readMessages(session.messages);
    const answers = messages.filter((message) => message.role === 'user');
    const totalWords = answers.reduce((sum, message) => sum + this.countWords(message.content), 0);
    const usedMinutes = Math.max(
      1,
      Math.ceil((Date.now() - session.startedAt.getTime()) / 1000 / 60),
    );

    return {
      sessionId: session.id,
      stage: session.ended ? 'ended' : 'running',
      currentQuestion: session.currentQuestion,
      totalQuestions: this.countActiveQuestions(this.readQuestions(session.questions)),
      usedMinutes,
      averageAnswerSeconds: answers.length > 0 ? Math.round((usedMinutes * 60) / answers.length) : 0,
      totalWords,
      distribution: [
        { label: '已回答', done: answers.length, total: session.totalQuestions },
        {
          label: '待完成',
          done: Math.max(session.totalQuestions - answers.length, 0),
          total: session.totalQuestions,
        },
      ],
    };
  }

  private ensureQuestionCount(
    aiQuestions: InterviewQuestionPreview[],
    fallbackQuestions: InterviewQuestionPreview[],
    expectedCount: number,
  ) {
    const normalized = aiQuestions.slice(0, expectedCount).map((question, index) => ({
      ...question,
      id: `q-${index + 1}`,
      order: index + 1,
      content: question.content.startsWith(`第 ${index + 1} 题`)
        ? question.content
        : `第 ${index + 1} 题：${question.content}`,
      skipped: false,
    }));

    if (normalized.length >= expectedCount) {
      return normalized;
    }

    const existingContents = new Set(normalized.map((question) => question.content));
    const supplements = fallbackQuestions
      .filter((question) => !existingContents.has(question.content))
      .slice(0, expectedCount - normalized.length)
      .map((question, index) => ({
        ...question,
        id: `q-${normalized.length + index + 1}`,
        order: normalized.length + index + 1,
      }));

    return [...normalized, ...supplements];
  }

  private async loadResumeContext(
    userId: number,
    resumeId?: number | string,
  ): Promise<ResumeInterviewContext | undefined> {
    if (!resumeId) return undefined;

    const numericResumeId = Number(resumeId);
    if (!Number.isInteger(numericResumeId)) {
      throw new NotFoundException('关联简历不存在');
    }

    const resume = await this.prisma.resume.findFirst({
      where: { id: numericResumeId, userId },
      select: {
        id: true,
        title: true,
        structuredContent: true,
        optimizedContent: true,
        finalizedContent: true,
      },
    });

    if (!resume) {
      throw new NotFoundException('关联简历不存在');
    }

    const optimizedContent = resume.optimizedContent as
      | { optimizedResume?: unknown }
      | null;
    const finalizedContent = resume.finalizedContent as
      | { optimizedResume?: unknown }
      | null;
    const content =
      finalizedContent?.optimizedResume ??
      optimizedContent?.optimizedResume ??
      resume.structuredContent;

    if (!content) {
      throw new NotFoundException('关联简历尚未结构化，无法用于模拟面试出题');
    }

    const text = this.flattenText(content);
    return {
      id: resume.id,
      title: resume.title,
      content,
      text,
      focus: this.extractResumeFocus(content),
    };
  }

  private flattenText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map((item) => this.flattenText(item)).join('、');
    if (typeof value === 'object') {
      return Object.values(value)
        .map((item) => this.flattenText(item))
        .join('、');
    }
    return '';
  }

  private extractResumeFocus(content: unknown) {
    const resume = content as {
      skills?: string[];
      projects?: Array<{ name?: string }>;
      workExperiences?: Array<{ company?: string; position?: string }>;
    };
    const skills = Array.isArray(resume.skills) ? resume.skills.slice(0, 5) : [];
    const projects = Array.isArray(resume.projects)
      ? resume.projects.map((item) => item.name).filter(Boolean).slice(0, 3)
      : [];
    const jobs = Array.isArray(resume.workExperiences)
      ? resume.workExperiences
          .map((item) => [item.company, item.position].filter(Boolean).join(' '))
          .filter(Boolean)
          .slice(0, 2)
      : [];
    const focus = [...skills, ...projects, ...jobs].filter(Boolean);

    return focus.length ? focus.join('、') : '项目经历和技能栈';
  }

  private buildRetrievalQuery(data: CreateInterviewSessionDto, resumeContext?: ResumeInterviewContext) {
    return [
      data.interviewType,
      data.jobDescription,
      resumeContext?.title,
      resumeContext?.focus,
      resumeContext?.text.slice(0, 1200),
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async loadKnowledgeSnippets(
    userId: number,
    knowledgeBaseIds: string[],
    retrievalQuery: string,
    resumeContext?: ResumeInterviewContext,
    jobDescription?: string,
  ) {
    const uniqueIds = [...new Set(knowledgeBaseIds)].filter(Boolean);
    if (uniqueIds.length === 0) {
      return [] satisfies InterviewKnowledgeSnippet[];
    }

    const startedAt = Date.now();
    const records = await this.prisma.realInterviewRecord.findMany({
      where: {
        knowledgeBase: {
          userId,
          id: { in: uniqueIds },
        },
        transcript: { not: null },
        status: { in: ['ready', 'built'] },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        title: true,
        transcript: true,
        structuredContent: true,
        chunks: true,
      },
    });

    const baseRecords = records
      .filter((record) => record.transcript?.trim())
      .map((record) => ({
        recordId: record.id,
        title: record.title,
        transcript: record.transcript ?? '',
        structuredContent: record.structuredContent,
        chunks: record.chunks,
      })) satisfies RagRecord[];

    if (!this.interviewRagService || baseRecords.length === 0) {
      this.logger.log(
        JSON.stringify({
          event: 'interview.knowledgeSnippets.loaded',
          selectedKnowledgeBaseCount: uniqueIds.length,
          recordCount: baseRecords.length,
          snippetCount: baseRecords.length,
          retrievedChunkCount: 0,
          durationMs: Date.now() - startedAt,
        }),
      );
      return baseRecords satisfies InterviewKnowledgeSnippet[];
    }

    const retrievedChunks = this.interviewRagService.retrieveRelevantChunks(
      baseRecords,
      retrievalQuery,
      8,
    );
    const context = this.interviewRagService.buildMockInterviewContext({
      target: retrievalQuery || '模拟面试',
      resumeText: resumeContext?.text,
      jobDescription,
      retrievedChunks,
    });

    const snippets = [
      ...baseRecords.slice(0, 4),
      {
        recordId: 'rag-retrieval',
        title: 'RAG 召回上下文',
        transcript: context.prompt,
        structuredContent: {
          target: context.target,
          retrievedChunkCount: context.retrievedChunkCount,
        },
        chunks: retrievedChunks.map((chunk) => ({
          title: `${chunk.recordTitle} / ${chunk.title}`,
          content: chunk.content,
          keywords: chunk.keywords,
          sourceType: chunk.sourceType,
          score: chunk.score,
        })),
      },
    ] satisfies InterviewKnowledgeSnippet[];

    this.logger.log(
      JSON.stringify({
        event: 'interview.knowledgeSnippets.loaded',
        selectedKnowledgeBaseCount: uniqueIds.length,
        recordCount: baseRecords.length,
        snippetCount: snippets.length,
        retrievedChunkCount: retrievedChunks.length,
        durationMs: Date.now() - startedAt,
      }),
    );

    return snippets;
  }

  private async findOwnedSession(userId: number, sessionId: string) {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('面试会话不存在');
    }

    return session;
  }

  private buildQuestionPlan(
    data: CreateInterviewSessionDto,
    resumeContext?: ResumeInterviewContext,
  ): InterviewQuestionPreview[] {
    const count = data.questionCount;
    const knowledgeBaseCount = data.knowledgeBaseIds?.length ?? 0;
    const dimensions = this.buildDimensionPlan(data.interviewType, count);

    return dimensions.map((dimension, index) =>
      this.buildQuestion({
        type: dimension,
        order: index + 1,
        difficulty: data.difficulty,
        jobDescription: data.jobDescription,
        knowledgeBaseCount,
        resumeContext,
      }),
    );
  }

  private buildDimensionPlan(type: string, count: number) {
    if (type === 'professional') {
      return Array.from({ length: count }, (_, index) =>
        index % 4 === 0 ? 'behavioral' : index % 3 === 0 ? 'stress' : 'professional',
      );
    }
    return Array.from({ length: count }, () => type);
  }

  private buildQuestion(params: {
    type: string;
    order: number;
    difficulty?: InterviewQuestionDifficulty;
    jobDescription?: string;
    resumeContext?: ResumeInterviewContext;
    knowledgeBaseCount?: number;
    customContent?: string;
    sourceType?: InterviewQuestionSourceType;
  }): InterviewQuestionPreview {
    const resumeHint = params.resumeContext
      ? `请结合已关联简历《${params.resumeContext.title}》中的${params.resumeContext.focus}来回答。`
      : '';
    const jdHint = params.jobDescription?.trim()
      ? '请尽量结合你对目标岗位 JD 的理解来回答。'
      : '请结合你最近一个真实项目来回答。';
    const questionPool: Record<string, string[]> = {
      general: [
        '请做一个 1 分钟自我介绍。',
        '你为什么想换工作或寻找新机会？',
        '你如何判断一个机会是否适合自己？',
      ],
      professional: [
        '请介绍一个你最有代表性的项目，并说明你的核心贡献。',
        '你如何处理项目中的性能或稳定性问题？',
        '你最近解决过的一个技术难点是什么？',
      ],
      behavioral: [
        '请讲一次你和同事出现分歧并解决的经历。',
        '请讲一次你主动推动事情落地的经历。',
        '你如何面对不确定需求？',
      ],
      stress: [
        '如果上线前一天发现核心功能有风险，你会怎么处理？',
        '如果面试官认为你的项目深度不够，你会如何补充说明？',
        '你如何面对连续面试失败？',
      ],
      english: [
        'Please introduce yourself briefly.',
        'Please describe a challenging project you worked on.',
        'Why are you interested in this role?',
      ],
    };
    const pool = questionPool[params.type] ?? questionPool.general;
    const baseQuestion = params.customContent?.trim() || pool[(params.order - 1) % pool.length];
    const sourceType =
      params.sourceType ??
      this.resolveQuestionSource(
        params.jobDescription,
        params.knowledgeBaseCount,
        Boolean(params.resumeContext),
      );
    const hint = params.customContent
      ? ''
      : `${resumeHint || jdHint} ${resumeHint && params.jobDescription?.trim() ? jdHint : ''}`;

    return {
      id: `q-${params.order}`,
      order: params.order,
      content: `第 ${params.order} 题：${baseQuestion} ${hint}`.trim(),
      dimension: params.type,
      dimensionLabel: this.getDimensionLabel(params.type),
      difficulty: this.getDifficulty(params.type, params.order, params.difficulty),
      difficultyLabel: this.getDifficultyLabel(this.getDifficulty(params.type, params.order, params.difficulty)),
      sourceType,
      sourceLabel: this.getSourceLabel(sourceType),
      skipped: false,
    };
  }

  private resolveQuestionSource(
    jobDescription?: string,
    knowledgeBaseCount = 0,
    hasResumeContext = false,
  ): InterviewQuestionSourceType {
    if (knowledgeBaseCount > 0) {
      return 'knowledge_base';
    }
    if (hasResumeContext) {
      return 'resume';
    }
    if (jobDescription?.trim()) {
      return 'job_description';
    }
    return 'rule';
  }

  private getDimensionLabel(type: string) {
    const labels: Record<string, string> = {
      general: '通用表达',
      professional: '技能深挖',
      behavioral: '行为面试',
      stress: '压力测试',
      english: '英文表达',
    };
    return labels[type] ?? '综合问题';
  }

  private getDifficulty(type: string, order: number, preferredDifficulty?: InterviewQuestionDifficulty): InterviewQuestionDifficulty {
    if (preferredDifficulty) {
      return preferredDifficulty;
    }
    if (type === 'stress' || order >= 7) {
      return 'hard';
    }
    if (type === 'professional' || order >= 4) {
      return 'medium';
    }
    return 'easy';
  }

  private getDifficultyLabel(difficulty: InterviewQuestionDifficulty) {
    const labels: Record<InterviewQuestionDifficulty, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return labels[difficulty];
  }

  private getSourceLabel(sourceType: InterviewQuestionSourceType) {
    const labels: Record<InterviewQuestionSourceType, string> = {
      rule: '基础智能问题',
      resume: '基于关联简历',
      job_description: '基于目标 JD',
      knowledge_base: '基于你的真实面试经验',
      custom: '你手动追加的问题',
    };
    return labels[sourceType];
  }

  private createAssistantMessage(sessionId: string, question: InterviewQuestionPreview): InterviewMessage {
    return {
      ...this.createMessage('assistant', question.content, sessionId, question.id),
      dimension: question.dimension,
      difficulty: question.difficulty,
      sourceLabel: question.sourceLabel,
      sourceType: question.sourceType,
    };
  }

  private createMessage(
    role: 'assistant' | 'user',
    content: string,
    sessionId: string,
    questionId?: string,
  ): InterviewMessage {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      role,
      content,
      createdAt: new Date().toISOString(),
      questionId,
    };
  }

  private ensureCurrentQuestionMessage(
    messages: InterviewMessage[],
    question: InterviewQuestionPreview | undefined,
    sessionId: string,
  ) {
    if (!question) {
      return messages;
    }
    const alreadyAsked = messages.some((message) => message.questionId === question.id);
    if (alreadyAsked) {
      return messages;
    }
    return [...messages, this.createAssistantMessage(sessionId, question)];
  }

  private findFirstActiveQuestion(questions: InterviewQuestionPreview[]) {
    return questions.find((question) => !question.skipped);
  }

  private findCurrentActiveQuestion(questions: InterviewQuestionPreview[], currentOrder: number) {
    return (
      questions.find((question) => !question.skipped && question.order >= currentOrder) ??
      questions.find((question) => !question.skipped)
    );
  }

  private findNextActiveQuestion(questions: InterviewQuestionPreview[], currentOrder: number) {
    return questions.find((question) => !question.skipped && question.order > currentOrder);
  }

  private findQuestionByOrder(questions: InterviewQuestionPreview[], order: number) {
    return questions.find((question) => question.order === order && !question.skipped);
  }

  private countActiveQuestions(questions: InterviewQuestionPreview[]) {
    return questions.filter((question) => !question.skipped).length;
  }

  private readMessages(value: Prisma.JsonValue): InterviewMessage[] {
    return Array.isArray(value) ? (value as InterviewMessage[]) : [];
  }

  private readQuestions(value: Prisma.JsonValue | null): InterviewQuestionPreview[] {
    return Array.isArray(value) ? (value as InterviewQuestionPreview[]) : [];
  }

  private readQuestionFeedback(value: Prisma.JsonValue | null): Record<string, QuestionFeedbackRecord> {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }
    return value as unknown as Record<string, QuestionFeedbackRecord>;
  }

  private readKnowledgeBaseIds(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private readStrategySnapshot(value: Prisma.JsonValue | null): InterviewStrategySnapshot | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    const snapshot = value as unknown as InterviewStrategySnapshot;
    return snapshot.version === 'v1' ? snapshot : undefined;
  }

  private countWords(content: string) {
    const chineseChars = content.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
    const englishWords = content.match(/[a-zA-Z0-9]+/g)?.length ?? 0;
    return chineseChars + englishWords;
  }

  private toSessionResponse(session: {
    id: string;
    type: string;
    totalQuestions: number;
    currentQuestion: number;
    startedAt: Date;
    ended: boolean;
    messages: Prisma.JsonValue;
    questions?: Prisma.JsonValue | null;
    questionFeedback?: Prisma.JsonValue | null;
    strategySnapshot?: Prisma.JsonValue | null;
    knowledgeBaseIds: Prisma.JsonValue | null;
    resumeId?: number | null;
  }) {
    const questions = this.readQuestions(session.questions ?? null);
    return {
      sessionId: session.id,
      type: session.type,
      totalQuestions: questions.length > 0 ? this.countActiveQuestions(questions) : session.totalQuestions,
      currentQuestion: session.currentQuestion,
      startedAt: session.startedAt.toISOString(),
      ended: session.ended,
      messages: this.readMessages(session.messages),
      questionsPreview: questions,
      questionFeedback: this.readQuestionFeedback(session.questionFeedback ?? null),
      strategySnapshot: this.readStrategySnapshot(session.strategySnapshot ?? null),
      knowledgeBaseIds: this.readKnowledgeBaseIds(session.knowledgeBaseIds),
      resumeId: session.resumeId ?? undefined,
    };
  }
}
