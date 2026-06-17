import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { externalFetch } from '../common/http/external-http.client';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { getPagination, paginatedResponse } from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateReportDto } from './dto/generate-report.dto';

type InterviewMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  questionId?: string;
  messageType?: 'question' | 'follow_up' | 'answer_feedback' | 'closing';
  dimension?: string;
  difficulty?: string;
  sourceLabel?: string;
};

type InterviewQuestionPreview = {
  id: string;
  order: number;
  content: string;
  dimension?: string;
  dimensionLabel?: string;
  difficulty?: string;
  sourceLabel?: string;
  skipped?: boolean;
};

type QuestionThread = {
  id: string;
  question: string;
  dimension?: string;
  difficulty?: string;
  sourceLabel?: string;
  answers: string[];
  followUps: string[];
  transcript: Array<{ role: 'assistant' | 'user'; content: string }>;
};

type QuestionReview = {
  id: string;
  question: string;
  answer: string;
  comment: string;
  issues: string[];
  advice: string;
  referenceAnswer: string;
  diagnosis: {
    content: string;
    logic: string;
    expression: string;
    depth: string;
  };
  improvement: {
    summary: string;
    example: string;
    nextTry: string;
  };
  practiceResources: string[];
  correctPoints?: string[];
  wrongPoints?: string[];
  knowledgeTags?: string[];
  qaTranscript?: Array<{ role: 'assistant' | 'user'; content: string }>;
};

type TopDirection = {
  title: string;
  reason: string;
  actions: string[];
};

type ReviewDimension = {
  label: string;
  score: number;
};

type AiReportPayload = {
  score: number;
  level: string;
  summary: string;
  dimensions: ReviewDimension[];
  questions: QuestionReview[];
  nextActions: string[];
  topDirections: TopDirection[];
};

type DeepseekChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  private readonly model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro';

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const [reports, total] = await Promise.all([
      this.prisma.reviewReport.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.reviewReport.count({ where: { userId } }),
    ]);

    return paginatedResponse(
      reports.map((report) => this.toReportResponse(report)),
      total,
      query,
    );
  }

  async findOne(userId: number, reportId: string) {
    const report = await this.prisma.reviewReport.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new NotFoundException('复盘报告不存在');
    }

    return this.toReportResponse(report);
  }

  async remove(userId: number, reportId: string) {
    await this.findOne(userId, reportId);

    await this.prisma.reviewReport.delete({
      where: { id: reportId },
    });

    return { reportId };
  }

  async generate(userId: number, data: GenerateReportDto) {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: data.sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('面试会话不存在');
    }

    const messages = this.readMessages(session.messages);
    const questions = this.readQuestions(session.questions);
    const threads = this.buildQuestionThreads(questions, messages);
    const reportData = await this.buildReportData(session.type, session.totalQuestions, threads);

    const report = await this.prisma.reviewReport.upsert({
      where: { sessionId: session.id },
      create: {
        ...reportData,
        dimensions: reportData.dimensions as unknown as Prisma.InputJsonValue,
        questions: reportData.questions as unknown as Prisma.InputJsonValue,
        nextActions: reportData.nextActions as unknown as Prisma.InputJsonValue,
        topDirections: reportData.topDirections as unknown as Prisma.InputJsonValue,
        userId,
        sessionId: session.id,
      },
      update: {
        ...reportData,
        dimensions: reportData.dimensions as unknown as Prisma.InputJsonValue,
        questions: reportData.questions as unknown as Prisma.InputJsonValue,
        nextActions: reportData.nextActions as unknown as Prisma.InputJsonValue,
        topDirections: reportData.topDirections as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toReportResponse(report);
  }

  private async buildReportData(type: string, totalQuestions: number, threads: QuestionThread[]) {
    try {
      const aiReport = await this.generateAiReport(type, totalQuestions, threads);
      return {
        title: `${this.typeLabel(type)}复盘报告`,
        score: this.clampScore(aiReport.score),
        level: aiReport.level || this.scoreLevel(aiReport.score),
        summary: aiReport.summary,
        dimensions: this.normalizeDimensions(aiReport.dimensions, aiReport.score),
        questions: this.normalizeQuestionReviews(aiReport.questions, threads),
        nextActions: this.normalizeStringArray(aiReport.nextActions, this.buildLocalNextActions(aiReport.score)),
        topDirections: this.normalizeTopDirections(aiReport.topDirections),
      };
    } catch (error) {
      this.logger.warn(`DeepSeek 复盘报告生成失败，已使用本地规则报告：${error instanceof Error ? error.message : String(error)}`);
      return this.buildLocalReport(type, totalQuestions, threads);
    }
  }

  private async generateAiReport(type: string, totalQuestions: number, threads: QuestionThread[]): Promise<AiReportPayload> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('缺少 DEEPSEEK_API_KEY');
    }

    const response = await externalFetch(`${this.baseUrl}/chat/completions`, {
      serviceName: 'DeepSeek',
      timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 60000),
      userMessage: 'AI 复盘报告生成失败，请稍后重试',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.createReportSystemPrompt() },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'generate_mock_interview_review_report',
              interviewType: type,
              totalQuestions,
              answeredQuestions: threads.filter((thread) => thread.answers.length > 0).length,
              questionThreads: threads.map((thread) => ({
                id: thread.id,
                question: thread.question,
                dimension: thread.dimension,
                difficulty: thread.difficulty,
                answers: thread.answers,
                followUps: thread.followUps,
                transcript: thread.transcript,
              })),
            }),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    const result = (await response.json()) as DeepseekChatResponse;
    if (!response.ok) {
      throw new Error(result.error?.message ?? 'DeepSeek 请求失败');
    }

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek 没有返回报告内容');
    }

    return this.parseJsonObject(content) as unknown as AiReportPayload;
  }

  private createReportSystemPrompt() {
    return [
      '你是一名资深中文面试复盘教练，正在为 AI 求职助手生成结构化面试复盘报告。',
      '注意：面试过程中 AI 只负责追问，所有评分、正确/错误分析、改进建议都必须在本报告中完成。',
      '请逐题分析候选人的每次回答质量，尤其关注：是否正面回答、事实是否具体、逻辑是否清晰、是否有量化结果、技术细节是否可信、个人贡献是否明确。',
      '每道题必须包含 correctPoints、wrongPoints、diagnosis、improvement、referenceAnswer、knowledgeTags 和 qaTranscript。knowledgeTags 后续会作为知识库标签。',
      'wrongPoints 不是羞辱用户，而是指出回答中的缺失、风险、模糊、逻辑漏洞或下次需要修正的地方。',
      '严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"score":1-100,"level":"优秀|良好|待提升|需要补强","summary":"整体总结","dimensions":[{"label":"内容完整度","score":1-100}],"questions":[{"id":"q-1","question":"题目","answer":"用户回答汇总","comment":"总体点评","correctPoints":["答得好的地方"],"wrongPoints":["错误或缺失"],"issues":["短标签"],"advice":"下次怎么改","referenceAnswer":"参考表达","diagnosis":{"content":"内容诊断","logic":"逻辑诊断","expression":"表达诊断","depth":"深度诊断"},"improvement":{"summary":"改进摘要","example":"可直接照着练的示例","nextTry":"下一次练习要求"},"practiceResources":["练习建议"],"knowledgeTags":["知识库标签"],"qaTranscript":[{"role":"assistant","content":"问题或追问"},{"role":"user","content":"回答"}]}],"nextActions":["下一步行动"],"topDirections":[{"title":"方向","reason":"原因","actions":["动作"]}]}',
    ].join('\n');
  }

  private buildLocalReport(type: string, totalQuestions: number, threads: QuestionThread[]) {
    const answered = threads.filter((thread) => thread.answers.length > 0);
    const score = this.calculateScore(answered, totalQuestions);
    const questionReviews = threads.map((thread) => this.buildLocalQuestionReview(thread));
    const topDirections = this.buildLocalTopDirections(questionReviews, score);

    return {
      title: `${this.typeLabel(type)}复盘报告`,
      score,
      level: this.scoreLevel(score),
      summary: this.buildLocalSummary(score, answered.length, totalQuestions, topDirections),
      dimensions: this.buildLocalDimensions(score, questionReviews),
      questions: questionReviews,
      nextActions: this.buildLocalNextActions(score, topDirections),
      topDirections,
    };
  }

  private buildQuestionThreads(questions: InterviewQuestionPreview[], messages: InterviewMessage[]): QuestionThread[] {
    const questionMap = new Map<string, QuestionThread>();

    questions
      .filter((question) => !question.skipped)
      .forEach((question) => {
        questionMap.set(question.id, {
          id: question.id,
          question: question.content,
          dimension: question.dimension,
          difficulty: question.difficulty,
          sourceLabel: question.sourceLabel,
          answers: [],
          followUps: [],
          transcript: [],
        });
      });

    let currentQuestionId = questions.find((question) => !question.skipped)?.id;

    for (const message of messages) {
      if (message.messageType === 'closing' || message.messageType === 'answer_feedback') {
        continue;
      }

      if (message.role === 'assistant') {
        const questionId = message.questionId ?? currentQuestionId;
        if (!questionId) {
          continue;
        }

        currentQuestionId = questionId;
        const thread = this.ensureThread(questionMap, questionId, message);
        thread.transcript.push({ role: 'assistant', content: message.content });

        if (message.messageType === 'follow_up') {
          thread.followUps.push(message.content);
        } else if (!thread.question || thread.question === questionId) {
          thread.question = message.content;
        }
        continue;
      }

      if (message.role === 'user') {
        const questionId = message.questionId ?? currentQuestionId;
        if (!questionId) {
          continue;
        }

        const thread = this.ensureThread(questionMap, questionId, message);
        thread.answers.push(message.content);
        thread.transcript.push({ role: 'user', content: message.content });
      }
    }

    return Array.from(questionMap.values());
  }

  private ensureThread(questionMap: Map<string, QuestionThread>, questionId: string, message: InterviewMessage) {
    const existing = questionMap.get(questionId);
    if (existing) {
      return existing;
    }

    const thread = {
      id: questionId,
      question: message.role === 'assistant' ? message.content : questionId,
      dimension: message.dimension,
      difficulty: message.difficulty,
      sourceLabel: message.sourceLabel,
      answers: [],
      followUps: [],
      transcript: [],
    };
    questionMap.set(questionId, thread);
    return thread;
  }

  private buildLocalQuestionReview(thread: QuestionThread): QuestionReview {
    const answer = thread.answers.join('\n\n');
    const issues = answer ? this.detectIssues(answer) : ['缺少回答内容'];
    const diagnosis = this.buildLocalDiagnosis(answer, issues);
    const improvement = this.buildLocalImprovement(thread, answer, issues);
    const correctPoints = this.detectCorrectPoints(answer);
    const wrongPoints = this.detectWrongPoints(answer, issues);

    return {
      id: thread.id,
      question: thread.question,
      answer,
      comment: answer
        ? '回答已记录。下面按内容、逻辑、表达和深度拆解可改进点。'
        : '这一题还没有回答，建议下一轮优先补齐。',
      correctPoints,
      wrongPoints,
      issues,
      advice: improvement.summary,
      referenceAnswer: improvement.example,
      diagnosis,
      improvement,
      practiceResources: this.buildPracticeResources(thread, issues),
      knowledgeTags: this.buildKnowledgeTags(thread, issues),
      qaTranscript: thread.transcript,
    };
  }

  private calculateScore(answeredThreads: QuestionThread[], totalQuestions: number) {
    const completionScore = Math.round((answeredThreads.length / Math.max(totalQuestions, 1)) * 30);
    const answerText = answeredThreads.flatMap((thread) => thread.answers).join('\n');
    const wordScore = Math.min(30, Math.round(this.countWords(answerText) / Math.max(answeredThreads.length, 1) / 5));
    const structureScore = /首先|其次|最后|第一|第二|总结|背景|任务|行动|结果|STAR/i.test(answerText) ? 20 : 8;
    const metricScore = /[0-9%]/.test(answerText) ? 20 : 6;

    return Math.min(completionScore + wordScore + structureScore + metricScore, 100);
  }

  private scoreLevel(score: number) {
    if (score >= 85) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 55) return '待提升';
    return '需要补强';
  }

  private buildLocalSummary(score: number, answered: number, total: number, topDirections: TopDirection[]) {
    const directionText = topDirections.map((item) => item.title).join('、');
    return `本次面试完成 ${answered}/${total} 题，综合评分 ${score}。后续重点建议：${directionText}。`;
  }

  private buildLocalDimensions(score: number, reviews: QuestionReview[]) {
    const shortAnswerCount = reviews.filter((review) => review.issues.includes('回答偏短')).length;
    const noMetricCount = reviews.filter((review) => review.issues.includes('缺少量化结果')).length;
    const weakLogicCount = reviews.filter((review) => review.issues.includes('逻辑链不够清晰')).length;

    return [
      { label: '内容完整度', score: Math.max(score - shortAnswerCount * 8, 0) },
      { label: '逻辑清晰度', score: Math.max(score - weakLogicCount * 8, 0) },
      { label: '岗位相关性', score: Math.min(score + 4, 100) },
      { label: '表达流畅度', score },
      { label: '结果量化', score: Math.max(score - noMetricCount * 10, 0) },
      { label: 'STAR 使用', score: Math.max(score - weakLogicCount * 6, 0) },
    ];
  }

  private buildLocalDiagnosis(answer: string, issues: string[]) {
    if (!answer) {
      return {
        content: '没有可分析的回答内容。',
        logic: '缺少完整表达链路。',
        expression: '暂未形成可评价表达。',
        depth: '缺少项目细节和结果。',
      };
    }

    return {
      content: issues.includes('回答偏短')
        ? '内容密度不足，背景、任务、行动或结果至少缺少一块。'
        : '内容覆盖了基础信息，可以继续补充更具体的上下文。',
      logic: issues.includes('逻辑链不够清晰')
        ? '回答里的因果关系和推进顺序不够明确，面试官可能难以判断你的决策过程。'
        : '整体逻辑可理解，建议用“背景-任务-行动-结果”进一步固定结构。',
      expression: this.countWords(answer) > 160
        ? '表达较充分，但需要注意先给结论，避免信息堆叠。'
        : '表达比较简洁，建议增加关键动作和结果描述。',
      depth: issues.includes('缺少量化结果')
        ? '缺少指标或对比数据，项目价值感不够强。'
        : '已有量化意识，可以继续补充技术取舍和业务影响。',
    };
  }

  private buildLocalImprovement(thread: QuestionThread, answer: string, issues: string[]) {
    const theme = this.dimensionLabel(thread.dimension);
    const metricAdvice = issues.includes('缺少量化结果')
      ? '补充一个数字化结果，例如耗时、转化率、稳定性或效率提升。'
      : '保留已有量化表达，并说明指标变化背后的动作。';
    const structureAdvice = issues.includes('逻辑链不够清晰')
      ? '按 STAR 顺序重排回答，让每句话承担一个明确角色。'
      : '保持当前结构，开头先给结论，后面再展开细节。';

    return {
      summary: `${theme}题建议下一次重点做到：${structureAdvice}${metricAdvice}`,
      example: answer
        ? '可以这样重写开头：这个项目的目标是解决 X 问题，我负责 Y 模块。我的关键动作是 A/B/C，最终让核心指标提升或风险下降 Z%。'
        : '可以先按模板准备：背景是什么、你的任务是什么、你做了哪 3 个动作、最后带来了什么结果。',
      nextTry: '下一轮练习时，请在 90 秒内回答，并至少包含 1 个具体指标和 1 个个人贡献边界。',
    };
  }

  private detectIssues(answer: string) {
    const issues: string[] = [];
    if (this.countWords(answer) < 80) {
      issues.push('回答偏短');
    }
    if (!/[0-9%]/.test(answer)) {
      issues.push('缺少量化结果');
    }
    if (!/因为|所以|导致|结果|提升|降低|优化|首先|其次|最后|背景|任务|行动/.test(answer)) {
      issues.push('逻辑链不够清晰');
    }
    return issues.length > 0 ? issues : ['整体表达较完整'];
  }

  private detectCorrectPoints(answer: string) {
    const points: string[] = [];
    if (answer.trim()) points.push('能够围绕问题给出具体经历或观点');
    if (/[0-9%]/.test(answer)) points.push('包含量化意识或结果描述');
    if (/我|负责|主导|参与|推进|优化/.test(answer)) points.push('有个人贡献表达');
    return points.length ? points : ['暂未形成明显有效回答'];
  }

  private detectWrongPoints(answer: string, issues: string[]) {
    if (!answer.trim()) {
      return ['没有回答，无法判断能力表现'];
    }

    return issues
      .filter((issue) => issue !== '整体表达较完整')
      .map((issue) => {
        if (issue === '回答偏短') return '回答信息量不足，容易被继续追问细节';
        if (issue === '缺少量化结果') return '没有用指标证明结果，可信度和说服力不足';
        if (issue === '逻辑链不够清晰') return '表达顺序不够结构化，面试官难以快速抓住重点';
        return issue;
      });
  }

  private buildPracticeResources(thread: QuestionThread, issues: string[]) {
    const resources = [`针对“${this.dimensionLabel(thread.dimension)}”准备 2 个可复用案例`];
    if (issues.includes('缺少量化结果')) {
      resources.push('回到简历中为相关项目补充指标：规模、效率、转化、稳定性');
    }
    if (issues.includes('逻辑链不够清晰')) {
      resources.push('用 STAR 模板重写一次答案，并录音检查是否先结论后展开');
    }
    return resources;
  }

  private buildKnowledgeTags(thread: QuestionThread, issues: string[]) {
    return [
      this.dimensionLabel(thread.dimension),
      thread.difficulty ? `难度:${thread.difficulty}` : '综合追问',
      ...issues.slice(0, 3),
    ];
  }

  private buildLocalTopDirections(reviews: QuestionReview[], score: number): TopDirection[] {
    const issueCount = (issue: string) => reviews.filter((review) => review.issues.includes(issue)).length;
    return [
      {
        title: '量化结果表达',
        reason: issueCount('缺少量化结果') > 0 ? '多道题缺少指标支撑，项目价值感会被削弱。' : '已有量化意识，继续把指标和个人动作绑定会更有说服力。',
        actions: ['为每段项目准备 1 个核心指标', '回答时用“动作 + 指标变化”收尾'],
      },
      {
        title: '结构化回答',
        reason: issueCount('逻辑链不够清晰') > 0 ? '部分回答缺少清晰的背景、行动和结果顺序。' : '结构基础可用，建议进一步压缩开头并突出结论。',
        actions: ['用 STAR 模板重写 2 道题', '每次回答先讲结论，再讲过程'],
      },
      {
        title: score >= 75 ? '岗位匹配强化' : '案例完整度补强',
        reason: score >= 75 ? '当前回答能覆盖基础信息，但还需要更贴近目标岗位 JD。' : '回答内容偏薄，需要先把项目案例讲完整。',
        actions: score >= 75
          ? ['把 JD 关键词映射到项目经历', '准备 2 个岗位相关追问答案']
          : ['每个案例补齐背景、任务、行动、结果', '控制单题回答在 60-90 秒'],
      },
    ];
  }

  private buildLocalNextActions(score: number, topDirections?: TopDirection[]) {
    const directions = topDirections ?? [];
    const actions = directions.flatMap((direction) => direction.actions);
    if (score >= 80) {
      return ['进行一轮压力面试训练', ...actions.slice(0, 3)];
    }

    return ['重写自我介绍并控制在 60 秒内', ...actions.slice(0, 4)];
  }

  private normalizeQuestionReviews(aiQuestions: QuestionReview[] | undefined, threads: QuestionThread[]) {
    if (!Array.isArray(aiQuestions) || aiQuestions.length === 0) {
      return threads.map((thread) => this.buildLocalQuestionReview(thread));
    }

    const fallbackMap = new Map(threads.map((thread) => [thread.id, this.buildLocalQuestionReview(thread)]));
    return aiQuestions.map((item, index) => {
      const fallback = fallbackMap.get(item.id) ?? this.buildLocalQuestionReview(threads[index] ?? {
        id: item.id ?? `q-${index + 1}`,
        question: item.question ?? `第 ${index + 1} 题`,
        answers: [],
        followUps: [],
        transcript: [],
      });

      return {
        ...fallback,
        ...item,
        id: item.id || fallback.id,
        issues: this.normalizeStringArray(item.issues, fallback.issues),
        correctPoints: this.normalizeStringArray(item.correctPoints, fallback.correctPoints ?? []),
        wrongPoints: this.normalizeStringArray(item.wrongPoints, fallback.wrongPoints ?? []),
        practiceResources: this.normalizeStringArray(item.practiceResources, fallback.practiceResources),
        knowledgeTags: this.normalizeStringArray(item.knowledgeTags, fallback.knowledgeTags ?? []),
        diagnosis: { ...fallback.diagnosis, ...(item.diagnosis ?? {}) },
        improvement: { ...fallback.improvement, ...(item.improvement ?? {}) },
        qaTranscript: Array.isArray(item.qaTranscript) ? item.qaTranscript : fallback.qaTranscript,
      };
    });
  }

  private normalizeDimensions(dimensions: ReviewDimension[] | undefined, score: number) {
    if (!Array.isArray(dimensions) || dimensions.length === 0) {
      return [
        { label: '内容完整度', score },
        { label: '逻辑清晰度', score },
        { label: '岗位相关性', score },
        { label: '表达流畅度', score },
        { label: '结果量化', score },
        { label: 'STAR 使用', score },
      ];
    }

    return dimensions.map((dimension) => ({
      label: String(dimension.label || '综合能力'),
      score: this.clampScore(dimension.score),
    }));
  }

  private normalizeTopDirections(directions: TopDirection[] | undefined) {
    if (!Array.isArray(directions)) {
      return [];
    }

    return directions.map((direction) => ({
      title: String(direction.title || '综合提升'),
      reason: String(direction.reason || ''),
      actions: this.normalizeStringArray(direction.actions, []),
    }));
  }

  private normalizeStringArray(value: unknown, fallback: string[]) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
  }

  private parseJsonObject(content: string): Record<string, unknown> {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('DeepSeek 返回的报告不是 JSON object');
    }
    return parsed as Record<string, unknown>;
  }

  private readMessages(value: Prisma.JsonValue): InterviewMessage[] {
    return Array.isArray(value) ? (value as InterviewMessage[]) : [];
  }

  private readQuestions(value: Prisma.JsonValue | null): InterviewQuestionPreview[] {
    return Array.isArray(value) ? (value as InterviewQuestionPreview[]) : [];
  }

  private countWords(content: string) {
    const chineseChars = content.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
    const englishWords = content.match(/[a-zA-Z0-9]+/g)?.length ?? 0;
    return chineseChars + englishWords;
  }

  private clampScore(value: unknown) {
    const score = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(score)) {
      return 60;
    }
    return Math.min(Math.max(Math.round(score), 1), 100);
  }

  private typeLabel(type: string) {
    const labels: Record<string, string> = {
      general: '通用面试',
      professional: '专业面试',
      behavioral: '行为面试',
      stress: '压力面试',
      english: '英文面试',
    };

    return labels[type] ?? '模拟面试';
  }

  private dimensionLabel(dimension?: string) {
    const labels: Record<string, string> = {
      general: '通用表达',
      professional: '技能深挖',
      behavioral: '行为面试',
      stress: '压力测试',
      english: '英文表达',
    };
    return dimension ? (labels[dimension] ?? '综合问题') : '综合问题';
  }

  private toReportResponse(report: {
    id: string;
    title: string;
    score: number;
    level: string;
    summary: string;
    createdAt: Date;
    dimensions: Prisma.JsonValue;
    questions: Prisma.JsonValue;
    nextActions: Prisma.JsonValue;
    topDirections?: Prisma.JsonValue | null;
  }) {
    return {
      reportId: report.id,
      title: report.title,
      score: report.score,
      level: report.level,
      summary: report.summary,
      createdAt: report.createdAt.toISOString(),
      dimensions: report.dimensions,
      questions: report.questions,
      nextActions: report.nextActions,
      topDirections: report.topDirections ?? [],
    };
  }
}
