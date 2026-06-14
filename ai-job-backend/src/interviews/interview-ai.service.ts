import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { extractJsonObject } from '../common/ai/json.util';
import { externalFetch } from '../common/http/external-http.client';
import type { InterviewQuestionPreview } from './interviews.service';

type DeepseekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export type InterviewKnowledgeSnippet = {
  recordId: string;
  title: string;
  transcript: string;
  structuredContent?: unknown;
  chunks?: unknown;
};

export type InterviewKnowledgeBuildResult = {
  summary: string;
  tags: string[];
  focusAreas: string[];
  questions: Array<{
    question: string;
    answer?: string;
    dimension: string;
    difficulty: 'easy' | 'medium' | 'hard';
    keywords: string[];
  }>;
  weakPoints: string[];
  followUpSuggestions: string[];
  chunks: Array<{
    id: string;
    title: string;
    content: string;
    keywords: string[];
    sourceType: 'question' | 'answer' | 'summary' | 'weak_point';
  }>;
};

export type InterviewAnswerFeedbackResult = {
  feedback: string;
  strengths: string[];
  improvements: string[];
  followUp?: string;
  score: number;
};

export type InterviewFollowUpQuestionResult = {
  question: string;
};

@Injectable()
export class InterviewAiService {
  private readonly baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  private readonly model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro';

  async generateQuestionPlan(input: {
    interviewType: string;
    questionCount: number;
    jobDescription?: string;
    resumeContext?: {
      title: string;
      focus: string;
      text: string;
    };
    language?: string;
    enableFollowUp?: boolean;
    knowledgeSnippets: InterviewKnowledgeSnippet[];
  }): Promise<InterviewQuestionPreview[]> {
    const content = await this.chatJson(
      this.createInterviewSystemPrompt(),
      this.createInterviewUserPrompt(input),
    );
    const parsed = this.parseJsonObject(content);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    return questions.slice(0, input.questionCount).map((item, index) =>
      this.normalizeQuestion(item, index + 1, input),
    );
  }

  async buildKnowledgeRecord(input: {
    title: string;
    transcript: string;
    focusAreas?: string[];
  }): Promise<InterviewKnowledgeBuildResult> {
    const content = await this.chatJson(
      this.createKnowledgeBuildSystemPrompt(),
      this.createKnowledgeBuildUserPrompt(input),
    );
    const parsed = this.parseJsonObject(content);

    return {
      summary: this.toText(parsed.summary, '暂无总结'),
      tags: this.toStringArray(parsed.tags),
      focusAreas: this.toStringArray(parsed.focusAreas),
      questions: this.toArray(parsed.questions).map((item, index) => ({
        question: this.toText(item.question, `问题 ${index + 1}`),
        answer: this.toOptionalText(item.answer),
        dimension: this.toText(item.dimension, '综合能力'),
        difficulty: this.toDifficulty(item.difficulty),
        keywords: this.toStringArray(item.keywords),
      })),
      weakPoints: this.toStringArray(parsed.weakPoints),
      followUpSuggestions: this.toStringArray(parsed.followUpSuggestions),
      chunks: this.toArray(parsed.chunks).map((item, index) => ({
        id: this.toText(item.id, `chunk-${index + 1}`),
        title: this.toText(item.title, `片段 ${index + 1}`),
        content: this.toText(item.content, ''),
        keywords: this.toStringArray(item.keywords),
        sourceType: this.toChunkSourceType(item.sourceType),
      })).filter((chunk) => chunk.content.trim().length > 0),
    };
  }

  async evaluateAnswer(input: {
    question: InterviewQuestionPreview;
    answer: string;
    jobDescription?: string;
    recentMessages: Array<{ role: 'assistant' | 'user'; content: string }>;
  }): Promise<InterviewAnswerFeedbackResult> {
    const content = await this.chatJson(
      this.createAnswerFeedbackSystemPrompt(),
      this.createAnswerFeedbackUserPrompt(input),
    );
    const parsed = this.parseJsonObject(content);

    return {
      feedback: this.toText(parsed.feedback, '你的回答已经记录。建议继续补充更具体的背景、行动和结果。'),
      strengths: this.toStringArray(parsed.strengths),
      improvements: this.toStringArray(parsed.improvements),
      followUp: this.toOptionalText(parsed.followUp),
      score: this.toScore(parsed.score),
    };
  }

  async generateFollowUpQuestion(input: {
    question: InterviewQuestionPreview;
    answer: string;
    jobDescription?: string;
    recentMessages: Array<{ role: 'assistant' | 'user'; content: string }>;
  }): Promise<InterviewFollowUpQuestionResult> {
    const content = await this.chatJson(
      this.createFollowUpQuestionSystemPrompt(),
      this.createFollowUpQuestionUserPrompt(input),
    );
    const parsed = this.parseJsonObject(content);

    return {
      question: this.toText(
        parsed.question,
        '我继续追问一下：请你把刚才回答里的背景、你的具体动作和最终结果再展开讲清楚。',
      ),
    };
  }

  private createInterviewSystemPrompt() {
    return [
      '你是一名资深中文技术面试官，正在为 AI 求职助手生成结构化模拟面试题。',
      '请严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"questions":[{"content":"题目文本","dimension":"general|professional|behavioral|stress|english","dimensionLabel":"中文维度名","difficulty":"easy|medium|hard","sourceType":"rule|resume|job_description|knowledge_base","sourceLabel":"中文来源说明"}]}',
      '如果提供 resumeContext，必须优先围绕简历中的项目、技能、工作经历生成问题，sourceType 使用 resume，sourceLabel 使用“基于关联简历”。',
      '题目必须具体、可回答、适合口头面试。若提供知识库素材，优先结合真实面试记录追问。',
    ].join('\n');
  }

  private createInterviewUserPrompt(input: {
    interviewType: string;
    questionCount: number;
    jobDescription?: string;
    resumeContext?: {
      title: string;
      focus: string;
      text: string;
    };
    language?: string;
    enableFollowUp?: boolean;
    knowledgeSnippets: InterviewKnowledgeSnippet[];
  }) {
    return JSON.stringify({
      task: 'generate_interview_questions',
      interviewType: input.interviewType,
      questionCount: input.questionCount,
      language: input.language ?? 'zh-CN',
      enableFollowUp: input.enableFollowUp ?? true,
      jobDescription: input.jobDescription ?? '',
      resumeContext: input.resumeContext ?? null,
      knowledgeSnippets: input.knowledgeSnippets.map((snippet) => ({
        title: snippet.title,
        transcript: snippet.transcript.slice(0, 1800),
        structuredContent: snippet.structuredContent ?? null,
        chunks: snippet.chunks ?? null,
      })),
    });
  }

  private createKnowledgeBuildSystemPrompt() {
    return [
      '你是一名面试复盘知识库工程师，需要把真实面试记录结构化为后续 RAG 可检索素材。',
      '请严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"summary":"总结","tags":["标签"],"focusAreas":["高频方向"],"questions":[{"question":"面试题","answer":"候选人回答或要点","dimension":"能力维度","difficulty":"easy|medium|hard","keywords":["关键词"]}],"weakPoints":["薄弱点"],"followUpSuggestions":["后续训练建议"],"chunks":[{"id":"chunk-1","title":"片段标题","content":"可独立检索的完整片段","keywords":["关键词"],"sourceType":"question|answer|summary|weak_point"}]}',
      'chunks 必须短而完整，每个 120-400 字，适合后续 embedding。',
    ].join('\n');
  }

  private createKnowledgeBuildUserPrompt(input: {
    title: string;
    transcript: string;
    focusAreas?: string[];
  }) {
    return JSON.stringify({
      task: 'build_interview_knowledge_base_record',
      title: input.title,
      focusAreas: input.focusAreas ?? [],
      transcript: input.transcript,
    });
  }

  private createAnswerFeedbackSystemPrompt() {
    return [
      '你是一名严格但友好的 AI 面试官。',
      '用户刚回答了一道模拟面试题，你需要给出即时反馈，并判断是否需要追问。',
      '请严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"feedback":"给候选人的简短中文反馈，80-180字","strengths":["优点"],"improvements":["改进点"],"followUp":"可选追问，若不需要则为空字符串","score":1-10}',
      '反馈要具体，指出回答里缺少的 STAR/项目指标/技术细节，不要空泛鼓励。',
    ].join('\n');
  }

  private createFollowUpQuestionSystemPrompt() {
    return [
      '你是一名严格但友好的中文 AI 面试官。',
      '当前处于同一道题的多轮追问阶段。你不能给评分，不能总结优缺点，不能说“回答得不错”。',
      '你的任务是基于候选人刚才的回答，继续提出一个有压力、有针对性的追问。',
      '追问应围绕：事实细节、技术取舍、量化结果、个人贡献、失败复盘、边界条件、团队协作。',
      '如果回答很泛，要追问具体背景、行动和结果；如果回答较完整，要追问指标、权衡或反事实。',
      '严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"question":"面试官下一句追问，40-120字"}',
    ].join('\n');
  }

  private createFollowUpQuestionUserPrompt(input: {
    question: InterviewQuestionPreview;
    answer: string;
    jobDescription?: string;
    recentMessages: Array<{ role: 'assistant' | 'user'; content: string }>;
  }) {
    return JSON.stringify({
      task: 'generate_interview_follow_up_question',
      rule: 'Do not evaluate the answer. Ask only one follow-up question as the interviewer.',
      currentQuestion: {
        content: input.question.content,
        dimension: input.question.dimension,
        difficulty: input.question.difficulty,
        sourceType: input.question.sourceType,
      },
      latestAnswer: input.answer,
      jobDescription: input.jobDescription ?? '',
      recentMessages: input.recentMessages.slice(-8),
    });
  }

  private createAnswerFeedbackUserPrompt(input: {
    question: InterviewQuestionPreview;
    answer: string;
    jobDescription?: string;
    recentMessages: Array<{ role: 'assistant' | 'user'; content: string }>;
  }) {
    return JSON.stringify({
      task: 'evaluate_interview_answer',
      question: {
        content: input.question.content,
        dimension: input.question.dimension,
        difficulty: input.question.difficulty,
        sourceType: input.question.sourceType,
      },
      answer: input.answer,
      jobDescription: input.jobDescription ?? '',
      recentMessages: input.recentMessages.slice(-6),
    });
  }

  private async chatJson(systemPrompt: string, userPrompt: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('缺少 DEEPSEEK_API_KEY，请检查 .env 文件');
    }

    const response = await externalFetch(`${this.baseUrl}/chat/completions`, {
      serviceName: 'DeepSeek',
      timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 60000),
      userMessage: 'AI 面试服务繁忙，请稍后重试',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    const result = (await response.json()) as DeepseekChatResponse;
    if (!response.ok) {
      throw new BadGatewayException(result.error?.message ?? 'AI 面试服务繁忙，请稍后重试');
    }

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadGatewayException('DeepSeek 没有返回 JSON 内容');
    }

    return content;
  }

  private parseJsonObject(content: string): Record<string, unknown> {
    try {
      const parsed = extractJsonObject(content);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not object');
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new BadGatewayException('DeepSeek 返回的内容不是合法 JSON object');
    }
  }

  private normalizeQuestion(
    value: unknown,
    order: number,
    input: {
      jobDescription?: string;
      resumeContext?: { title: string; focus: string; text: string };
      knowledgeSnippets: InterviewKnowledgeSnippet[];
      interviewType: string;
    },
  ): InterviewQuestionPreview {
    const item = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const sourceType = this.toSourceType(
      item.sourceType,
      input.knowledgeSnippets.length > 0
        ? 'knowledge_base'
        : input.resumeContext
          ? 'resume'
          : input.jobDescription?.trim()
            ? 'job_description'
            : 'rule',
    );
    const difficulty = this.toDifficulty(item.difficulty);

    return {
      id: `q-${order}`,
      order,
      content: `第 ${order} 题：${this.toText(item.content, '请结合你的真实项目经历做一次完整回答。')}`,
      dimension: this.toText(item.dimension, input.interviewType),
      dimensionLabel: this.toText(item.dimensionLabel, this.getDimensionLabel(input.interviewType)),
      difficulty,
      difficultyLabel: this.getDifficultyLabel(difficulty),
      sourceType,
      sourceLabel: this.toText(item.sourceLabel, this.getSourceLabel(sourceType)),
      skipped: false,
    };
  }

  private toArray(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      : [];
  }

  private toStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private toText(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private toOptionalText(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private toDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
    return value === 'easy' || value === 'medium' || value === 'hard' ? value : 'medium';
  }

  private toScore(value: unknown) {
    const score = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(score)) {
      return 6;
    }
    return Math.min(Math.max(Math.round(score), 1), 10);
  }

  private toSourceType(value: unknown, fallback: 'rule' | 'resume' | 'job_description' | 'knowledge_base') {
    return value === 'rule' || value === 'resume' || value === 'job_description' || value === 'knowledge_base'
      ? value
      : fallback;
  }

  private toChunkSourceType(value: unknown): 'question' | 'answer' | 'summary' | 'weak_point' {
    return value === 'question' || value === 'answer' || value === 'summary' || value === 'weak_point'
      ? value
      : 'summary';
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

  private getDifficultyLabel(difficulty: 'easy' | 'medium' | 'hard') {
    const labels = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return labels[difficulty];
  }

  private getSourceLabel(sourceType: 'rule' | 'resume' | 'job_description' | 'knowledge_base') {
    const labels = {
      rule: '基础智能问题',
      resume: '基于关联简历',
      job_description: '基于目标 JD',
      knowledge_base: '基于你的真实面试经验',
    };
    return labels[sourceType];
  }
}
