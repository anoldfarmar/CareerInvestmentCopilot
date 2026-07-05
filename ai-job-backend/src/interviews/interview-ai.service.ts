import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { extractJsonObject } from '../common/ai/json.util';
import { externalFetch } from '../common/http/external-http.client';
import type {
  InterviewGraphMessage,
  InterviewStage,
  InterviewTurnSummary,
  EvaluatorOutput,
  ListenerOutput,
  SpeakerOutput,
  StrategistDecision,
} from './graph/interview-graph.state';
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

export type InterviewStrategySnapshot = {
  version: 'v1';
  generatedAt: string;
  advantageProfile: Array<{
    area: string;
    evidence: string[];
    jdRelevance: string;
    confidence: number;
    interviewerHooks: string[];
    candidateSteeringSentences: string[];
  }>;
  weaknessProfile: Array<{
    area: string;
    risk: string;
    triggerQuestions: string[];
    repairActions: string[];
  }>;
  interviewStrategy: {
    mainGoal: string;
    questionMix: {
      advantageVerification: number;
      weaknessExposure: number;
      jdFit: number;
      pressureTest: number;
    };
    allowedSteeringRule: string;
    antiDriftRule: string;
  };
};

@Injectable()
export class InterviewAiService {
  private readonly baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  private readonly model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro';
  private readonly listenerModel = process.env.INTERVIEW_LISTENER_MODEL ?? this.model;
  private readonly strategistModel = process.env.INTERVIEW_STRATEGIST_MODEL ?? this.model;
  private readonly speakerModel = process.env.INTERVIEW_SPEAKER_MODEL ?? this.model;
  private readonly evaluatorModel = process.env.INTERVIEW_EVALUATOR_MODEL ?? this.model;

  async generateQuestionPlan(input: {
    interviewType: string;
    questionCount: number;
    difficulty?: 'easy' | 'medium' | 'hard';
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

  async generateInterviewStrategy(input: {
    interviewType: string;
    questionCount: number;
    jobDescription?: string;
    resumeContext?: {
      title: string;
      focus: string;
      text: string;
    };
    questions: InterviewQuestionPreview[];
    knowledgeSnippets: InterviewKnowledgeSnippet[];
  }): Promise<InterviewStrategySnapshot> {
    const content = await this.chatJson(
      this.createInterviewStrategySystemPrompt(),
      this.createInterviewStrategyUserPrompt(input),
    );
    const parsed = this.parseJsonObject(content);

    return {
      version: 'v1',
      generatedAt: new Date().toISOString(),
      advantageProfile: this.toArray(parsed.advantageProfile).map((item) => ({
        area: this.toText(item.area, '可放大的优势点'),
        evidence: this.toStringArray(item.evidence),
        jdRelevance: this.toText(item.jdRelevance, '需要结合目标岗位继续验证'),
        confidence: this.toConfidence(item.confidence),
        interviewerHooks: this.toStringArray(item.interviewerHooks),
        candidateSteeringSentences: this.toStringArray(item.candidateSteeringSentences),
      })).slice(0, 5),
      weaknessProfile: this.toArray(parsed.weaknessProfile).map((item) => ({
        area: this.toText(item.area, '需要补强的能力点'),
        risk: this.toText(item.risk, '真实面试中可能被继续追问'),
        triggerQuestions: this.toStringArray(item.triggerQuestions),
        repairActions: this.toStringArray(item.repairActions),
      })).slice(0, 5),
      interviewStrategy: {
        mainGoal: this.toText(parsed.interviewStrategy && typeof parsed.interviewStrategy === 'object' && !Array.isArray(parsed.interviewStrategy)
          ? (parsed.interviewStrategy as Record<string, unknown>).mainGoal
          : undefined, '暴露短板，同时训练把优势讲清楚'),
        questionMix: this.normalizeQuestionMix(
          parsed.interviewStrategy && typeof parsed.interviewStrategy === 'object' && !Array.isArray(parsed.interviewStrategy)
            ? (parsed.interviewStrategy as Record<string, unknown>).questionMix
            : undefined,
        ),
        allowedSteeringRule: this.toText(
          parsed.interviewStrategy && typeof parsed.interviewStrategy === 'object' && !Array.isArray(parsed.interviewStrategy)
            ? (parsed.interviewStrategy as Record<string, unknown>).allowedSteeringRule
            : undefined,
          '候选人可以自然引导到优势点，但必须与当前问题、简历证据或 JD 有合理关联。',
        ),
        antiDriftRule: this.toText(
          parsed.interviewStrategy && typeof parsed.interviewStrategy === 'object' && !Array.isArray(parsed.interviewStrategy)
            ? (parsed.interviewStrategy as Record<string, unknown>).antiDriftRule
            : undefined,
          '如果候选人强行转移到无关主题，面试官应礼貌拉回当前问题。',
        ),
      },
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
    strategySnapshot?: InterviewStrategySnapshot;
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

  async generateOpeningQuestion(input: {
    question: InterviewQuestionPreview;
    jobDescription?: string;
    resumeContext?: {
      title: string;
      focus: string;
      text: string;
    };
    strategySnapshot?: InterviewStrategySnapshot;
  }): Promise<SpeakerOutput> {
    const content = await this.chatJson(
      this.createSpeakerSystemPrompt(),
      JSON.stringify({
        task: 'professional_interview_opening_speaker',
        stage: 'S0_ICE_BREAK',
        rule: 'Generate the first visible interviewer question. Ask one concrete, natural question. Do not expose JD/resume instructions, rubrics, capability tags, or strategy.',
        currentQuestionDraft: {
          content: input.question.content,
          dimension: input.question.dimension,
          difficulty: input.question.difficulty,
          sourceType: input.question.sourceType,
        },
        jobDescription: input.jobDescription ?? '',
        resumeContext: input.resumeContext
          ? {
              title: input.resumeContext.title,
              focus: input.resumeContext.focus,
              text: input.resumeContext.text.slice(0, 1600),
            }
          : null,
        strategySnapshot: input.strategySnapshot
          ? {
              advantageProfile: input.strategySnapshot.advantageProfile.slice(0, 3),
              weaknessProfile: input.strategySnapshot.weaknessProfile.slice(0, 3),
              mainGoal: input.strategySnapshot.interviewStrategy.mainGoal,
            }
          : null,
      }),
      this.speakerModel,
    );
    const parsed = this.parseJsonObject(content);

    return {
      messageType: this.toGraphMessageType(parsed.messageType, 'continue_deep_dive'),
      content: this.toText(parsed.content, input.question.content),
    };
  }

  async runListener(input: {
    stage: InterviewStage;
    currentQuestion?: { content: string; dimension?: string; difficulty?: string };
    latestAnswer: string;
    recentRawMessages: InterviewGraphMessage[];
    turnSummaries: InterviewTurnSummary[];
    jobDescription?: string;
    memoryState?: unknown;
  }): Promise<ListenerOutput> {
    const content = await this.chatJson(
      this.createListenerSystemPrompt(),
      JSON.stringify({
        task: 'professional_interview_listener',
        stage: input.stage,
        currentQuestion: input.currentQuestion ?? null,
        latestAnswer: input.latestAnswer,
        recentRawMessages: input.recentRawMessages.slice(-6),
        turnSummaries: input.turnSummaries.slice(-10),
        jobDescription: input.jobDescription ?? '',
        memoryState: input.memoryState ?? null,
      }),
      this.listenerModel,
    );
    const parsed = this.parseJsonObject(content);

    return {
      summary: this.toText(parsed.summary, '候选人回答已记录，但摘要不足。'),
      entities: this.toStringArray(parsed.entities).slice(0, 12),
      facts: this.toStringArray(parsed.facts).slice(0, 8),
      missingSlots: this.toStringArray(parsed.missingSlots).slice(0, 8),
      riskSignals: this.toStringArray(parsed.riskSignals).slice(0, 8),
    };
  }

  async runStrategist(input: {
    stage: InterviewStage;
    listenerOutput: ListenerOutput;
    turnSummaries: InterviewTurnSummary[];
    strategySnapshot?: unknown;
    memoryState?: unknown;
    jobDescription?: string;
  }): Promise<StrategistDecision> {
    const content = await this.chatJson(
      this.createStrategistSystemPrompt(),
      JSON.stringify({
        task: 'professional_interview_strategy_decision',
        stage: input.stage,
        listenerOutput: input.listenerOutput,
        turnSummaries: input.turnSummaries.slice(-10),
        strategySnapshot: input.strategySnapshot ?? null,
        memoryState: input.memoryState ?? null,
        jobDescription: input.jobDescription ?? '',
      }),
      this.strategistModel,
    );
    const parsed = this.parseJsonObject(content);
    const action = this.toGraphAction(parsed.action);
    const nextState = this.toGraphStage(parsed.nextState, this.defaultNextStage(input.stage, action));

    return {
      action,
      nextState,
      messageType: this.toGraphMessageType(parsed.messageType, action),
      reason: this.toText(parsed.reason, '需要继续验证候选人的回答真实性和岗位匹配度。'),
      targetCapability: this.toText(parsed.targetCapability, '项目真实性和岗位匹配度'),
      targetResumeNode: this.toOptionalText(parsed.targetResumeNode),
      speakerInstruction: this.toText(parsed.speakerInstruction, '请围绕候选人的回答继续追问一个核心问题。'),
      memoryPatch: this.toStringArray(parsed.memoryPatch).slice(0, 8),
    };
  }

  async runSpeaker(input: {
    stage: InterviewStage;
    latestAnswer: string;
    recentRawMessages: InterviewGraphMessage[];
    decision: StrategistDecision;
    jobDescription?: string;
  }): Promise<SpeakerOutput> {
    const content = await this.chatJson(
      this.createSpeakerSystemPrompt(),
      JSON.stringify({
        task: 'professional_interview_speaker',
        stage: input.stage,
        latestAnswer: input.latestAnswer,
        recentRawMessages: input.recentRawMessages.slice(-6),
        decision: input.decision,
        jobDescription: input.jobDescription ?? '',
      }),
      this.speakerModel,
    );
    const parsed = this.parseJsonObject(content);

    return {
      messageType: this.toGraphMessageType(parsed.messageType, input.decision.action),
      content: this.toText(parsed.content, input.decision.speakerInstruction),
    };
  }

  async runEvaluator(input: {
    turnSummaries: InterviewTurnSummary[];
    strategistDecisionLog?: unknown;
    memoryState?: unknown;
    strategySnapshot?: unknown;
    jobDescription?: string;
    recentRawMessages: InterviewGraphMessage[];
  }): Promise<EvaluatorOutput> {
    const content = await this.chatJson(
      this.createEvaluatorSystemPrompt(),
      JSON.stringify({
        task: 'professional_interview_final_evaluation',
        rule: 'Only evaluate after the interview is finished. Do not invent evidence.',
        turnSummaries: input.turnSummaries.slice(-20),
        strategistDecisionLog: input.strategistDecisionLog ?? null,
        memoryState: input.memoryState ?? null,
        strategySnapshot: input.strategySnapshot ?? null,
        jobDescription: input.jobDescription ?? '',
        recentRawMessages: input.recentRawMessages.slice(-6),
      }),
      this.evaluatorModel,
    );
    const parsed = this.parseJsonObject(content);

    return {
      overallScore: this.toHundredScore(parsed.overallScore, 70),
      dimensionScores: this.normalizeEvaluatorDimensionScores(parsed.dimensionScores),
      verifiedStrengths: this.toStringArray(parsed.verifiedStrengths).slice(0, 8),
      unverifiedClaims: this.toStringArray(parsed.unverifiedClaims).slice(0, 8),
      followUpChainReview: this.toArray(parsed.followUpChainReview).map((item) => ({
        topic: this.toText(item.topic, '本轮专业面试'),
        chain: this.toStringArray(item.chain).slice(0, 8),
        result: this.toText(item.result, '追问链路已完成，需要结合复盘继续训练。'),
      })).slice(0, 6),
      nextPracticeActions: this.toStringArray(parsed.nextPracticeActions).slice(0, 8),
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

  private createListenerSystemPrompt() {
    return [
      '你是专业模拟面试 LangGraph 管线中的 Listener Agent。',
      '职责：只听懂候选人回答，抽取事实、实体、槽位缺口和风险信号。',
      '禁止提出问题，禁止做面试决策，禁止评价候选人好坏。',
      '请严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"summary":"回答摘要","entities":["实体"],"facts":["事实"],"missingSlots":["缺失槽位"],"riskSignals":["风险信号"]}',
    ].join('\n');
  }

  private createStrategistSystemPrompt() {
    return [
      '你是专业模拟面试 LangGraph 管线中的 Strategist Agent。',
      '职责：根据 Listener 输出、状态机、JD 和记忆池，下达下一步面试决策。',
      '禁止写最终自然语言问题，最终话术交给 Speaker Agent。',
      'action 只能是 continue_deep_dive、clarify、pressure_test、switch_topic、guide_back、wrap_up。',
      'nextState 只能是 S0_ICE_BREAK、S1_PROJECT_ENTRY、S2_CORE_DEEP_DIVE、S3_EXTENSION、S4_REVERSE_QUESTION、FINISHED。',
      '请严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"action":"continue_deep_dive","nextState":"S2_CORE_DEEP_DIVE","messageType":"follow_up","reason":"决策原因","targetCapability":"能力点","targetResumeNode":"可选简历节点","speakerInstruction":"给 Speaker 的话术指令，只要求问一个核心问题","memoryPatch":["记忆补丁"]}',
    ].join('\n');
  }

  private createSpeakerSystemPrompt() {
    return [
      '你是专业模拟面试 LangGraph 管线中的 Speaker Agent。',
      '职责：把 Strategist 的决策转成真实、自然、专业的中文面试官口吻。',
      '每次只能问一个核心问题。不要评分，不要总结优缺点，不要解释你的策略。',
      '必须尽量引用候选人上一轮回答中的关键词，让追问显得贴着回答走。',
      '请严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"messageType":"follow_up|pressure_test|topic_switch|closing|question","content":"面试官下一句话"}',
    ].join('\n');
  }

  private createEvaluatorSystemPrompt() {
    return [
      '你是专业模拟面试 LangGraph 管线中的 Evaluator Agent，只在面试结束后工作。',
      '职责：根据 Listener 摘要、Strategist 决策日志、记忆池、JD 和最近原始对话，生成最终复盘评估。',
      '必须区分“已被回答证据支撑的优势”和“候选人声称但未被追问验证的内容”。',
      '不要再提出面试问题，不要改写候选人简历，不要凭空补充经历。',
      '评分要保守：证据越具体、追问链越闭环，分数越高；泛泛而谈、缺指标、回避问题要扣分。',
      '请严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"overallScore":1-100,"dimensionScores":{"technicalDepth":1-100,"logic":1-100,"jdFit":1-100,"evidenceDensity":1-100,"communication":1-100},"verifiedStrengths":["有证据支撑的优势"],"unverifiedClaims":["未验证或缺证据的主张"],"followUpChainReview":[{"topic":"话题","chain":["追问节点"],"result":"链路结果"}],"nextPracticeActions":["下一步练习动作"]}',
    ].join('\n');
  }

  private createInterviewUserPrompt(input: {
    interviewType: string;
    questionCount: number;
    difficulty?: 'easy' | 'medium' | 'hard';
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
      targetDifficulty: input.difficulty ?? 'medium',
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
      '你可以接受候选人把话题自然引导到自己的优势点，但前提是该优势与当前题目、简历证据或目标 JD 有明确关联。',
      '如果候选人强行转移到无关经历、回避当前问题或绕开 JD 核心要求，你必须礼貌拉回当前问题继续追问。',
      '不要被候选人盲目带偏；最终仍要验证岗位匹配度、能力真实性和表达可信度。',
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
    strategySnapshot?: InterviewStrategySnapshot;
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
      strategySnapshot: input.strategySnapshot
        ? {
            advantageProfile: input.strategySnapshot.advantageProfile.slice(0, 4),
            weaknessProfile: input.strategySnapshot.weaknessProfile.slice(0, 4),
            allowedSteeringRule: input.strategySnapshot.interviewStrategy.allowedSteeringRule,
            antiDriftRule: input.strategySnapshot.interviewStrategy.antiDriftRule,
          }
        : null,
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

  private async chatJson(systemPrompt: string, userPrompt: string, model = this.model) {
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
        model,
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
        : input.jobDescription?.trim()
          ? 'job_description'
          : input.resumeContext
            ? 'resume'
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

  private toHundredScore(value: unknown, fallback: number) {
    const score = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(score)) {
      return fallback;
    }
    return Math.min(Math.max(Math.round(score), 1), 100);
  }

  private normalizeEvaluatorDimensionScores(value: unknown) {
    const scores = value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};

    return {
      technicalDepth: this.toHundredScore(scores.technicalDepth, 70),
      logic: this.toHundredScore(scores.logic, 70),
      jdFit: this.toHundredScore(scores.jdFit, 70),
      evidenceDensity: this.toHundredScore(scores.evidenceDensity, 70),
      communication: this.toHundredScore(scores.communication, 70),
    };
  }

  private toConfidence(value: unknown) {
    const confidence = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(confidence)) {
      return 0.6;
    }
    return Math.min(Math.max(confidence, 0), 1);
  }

  private toGraphAction(value: unknown): StrategistDecision['action'] {
    return value === 'continue_deep_dive' ||
      value === 'clarify' ||
      value === 'pressure_test' ||
      value === 'switch_topic' ||
      value === 'guide_back' ||
      value === 'wrap_up'
      ? value
      : 'continue_deep_dive';
  }

  private toGraphStage(value: unknown, fallback: InterviewStage): InterviewStage {
    return value === 'S0_ICE_BREAK' ||
      value === 'S1_PROJECT_ENTRY' ||
      value === 'S2_CORE_DEEP_DIVE' ||
      value === 'S3_EXTENSION' ||
      value === 'S4_REVERSE_QUESTION' ||
      value === 'FINISHED'
      ? value
      : fallback;
  }

  private toGraphMessageType(
    value: unknown,
    action: StrategistDecision['action'],
  ): StrategistDecision['messageType'] {
    if (
      value === 'question' ||
      value === 'follow_up' ||
      value === 'pressure_test' ||
      value === 'topic_switch' ||
      value === 'closing'
    ) {
      return value;
    }
    if (action === 'pressure_test') return 'pressure_test';
    if (action === 'switch_topic') return 'topic_switch';
    if (action === 'wrap_up') return 'closing';
    return 'follow_up';
  }

  private defaultNextStage(stage: InterviewStage, action: StrategistDecision['action']): InterviewStage {
    if (action === 'wrap_up') return 'S4_REVERSE_QUESTION';
    if (stage === 'S0_ICE_BREAK') return 'S1_PROJECT_ENTRY';
    if (stage === 'S1_PROJECT_ENTRY') return 'S2_CORE_DEEP_DIVE';
    if (action === 'switch_topic') return 'S3_EXTENSION';
    return stage;
  }

  private normalizeQuestionMix(value: unknown) {
    const mix = value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};

    return {
      advantageVerification: this.toPercent(mix.advantageVerification, 30),
      weaknessExposure: this.toPercent(mix.weaknessExposure, 40),
      jdFit: this.toPercent(mix.jdFit, 20),
      pressureTest: this.toPercent(mix.pressureTest, 10),
    };
  }

  private toPercent(value: unknown, fallback: number) {
    const percent = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(percent)) {
      return fallback;
    }
    return Math.min(Math.max(Math.round(percent), 0), 100);
  }

  private createInterviewStrategySystemPrompt() {
    return [
      '你是一名求职面试策略教练，不是面试官。',
      '你的任务是根据候选人的简历、目标 JD、真实面试知识库和即将进行的题目，生成本轮模拟面试训练策略。',
      '优势必须有证据，不允许凭空夸；短板必须能映射到岗位要求或面试风险。',
      '引导话术必须自然，不能建议造假，只能建议候选人重组表达顺序。',
      '你要区分有效引导和逃避问题：有效引导必须与当前问题、简历证据或 JD 相关；逃避问题要被面试官拉回。',
      '严格返回 JSON object，不要 Markdown，不要解释。',
      'JSON 格式：{"advantageProfile":[{"area":"优势方向","evidence":["证据"],"jdRelevance":"与JD关联","confidence":0.8,"interviewerHooks":["面试官可深挖切口"],"candidateSteeringSentences":["候选人自然引导话术"]}],"weaknessProfile":[{"area":"短板方向","risk":"风险","triggerQuestions":["触发问题"],"repairActions":["修复动作"]}],"interviewStrategy":{"mainGoal":"本轮训练目标","questionMix":{"advantageVerification":30,"weaknessExposure":40,"jdFit":20,"pressureTest":10},"allowedSteeringRule":"允许引导规则","antiDriftRule":"防跑偏规则"}}',
    ].join('\n');
  }

  private createInterviewStrategyUserPrompt(input: {
    interviewType: string;
    questionCount: number;
    jobDescription?: string;
    resumeContext?: {
      title: string;
      focus: string;
      text: string;
    };
    questions: InterviewQuestionPreview[];
    knowledgeSnippets: InterviewKnowledgeSnippet[];
  }) {
    return JSON.stringify({
      task: 'generate_interview_strategy_snapshot',
      interviewType: input.interviewType,
      questionCount: input.questionCount,
      jobDescription: input.jobDescription ?? '',
      resumeContext: input.resumeContext
        ? {
            title: input.resumeContext.title,
            focus: input.resumeContext.focus,
            text: input.resumeContext.text.slice(0, 3000),
          }
        : null,
      questions: input.questions.map((question) => ({
        id: question.id,
        content: question.content,
        dimension: question.dimension,
        difficulty: question.difficulty,
        sourceType: question.sourceType,
      })),
      knowledgeSnippets: input.knowledgeSnippets.map((snippet) => ({
        title: snippet.title,
        transcript: snippet.transcript.slice(0, 1200),
        chunks: snippet.chunks ?? null,
      })),
    });
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
