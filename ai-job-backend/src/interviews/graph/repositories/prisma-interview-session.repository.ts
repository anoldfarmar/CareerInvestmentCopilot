import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEFAULT_INTERVIEW_STAGE } from '../interview-graph.state';
import type {
  InterviewTurnSummary,
  QuestionPoolItem,
} from '../interview-graph.state';
import type {
  InterviewSessionRepository,
  InterviewSessionSnapshot,
  SaveFinalInput,
  SaveTurnInput,
} from './interview-session.repository';

// Step 8：Prisma 实现 —— 封装会话快照读取与幂等保存（turnId 去重）。
// 读取辅助与 interviews.service 存在部分重叠，后续统一收口到本仓库（Step 10 清理项）。

@Injectable()
export class PrismaInterviewSessionRepository implements InterviewSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(
    sessionId: string,
  ): Promise<InterviewSessionSnapshot | null> {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId },
    });
    if (!session) {
      return null;
    }

    const interviewState = this.readJsonObject(session.interviewState) ?? {};
    const memoryState = this.readJsonObject(session.memoryState) ?? {};
    const questions = Array.isArray(session.questions)
      ? (session.questions as Array<Record<string, unknown>>)
      : [];
    const messages = Array.isArray(session.messages)
      ? (session.messages as Array<Record<string, unknown>>)
      : [];

    const status = this.toStatus(interviewState.status);
    const turnSummaries = this.parseTurnSummaries(memoryState.turnSummaries);

    return {
      sessionId: session.id,
      userId: session.userId,
      graphVersion: interviewState.graphVersion === 'v2' ? 'v2' : 'v1',
      stage: this.toStage(interviewState.stage),
      status,
      maxTurns: Number.isFinite(Number(interviewState.maxTurns))
        ? Number(interviewState.maxTurns)
        : 12,
      turnCount: Number.isFinite(Number(interviewState.turnCount))
        ? Number(interviewState.turnCount)
        : turnSummaries.length,
      currentQuestion: this.pickQuestion(questions, session.currentQuestion),
      questionPool: this.toQuestionPool(questions),
      completedTopicIds: this.stringArray(interviewState.completedTopicIds),
      skippedTopicIds: Array.isArray(interviewState.skippedTopicIds)
        ? interviewState.skippedTopicIds
            .filter(
              (item): item is { id: string; reason?: string } =>
                Boolean(item) &&
                typeof item === 'object' &&
                !Array.isArray(item) &&
                typeof (item as { id?: unknown }).id === 'string',
            )
            .map((item) => ({
              id: (item as { id: string }).id,
              reason:
                typeof (item as { reason?: unknown }).reason === 'string'
                  ? (item as { reason: string }).reason
                  : undefined,
            }))
        : [],
      coverageState: this.normalizeCoverage(interviewState.coverageState),
      turnSummaries,
      strategySnapshot: session.strategySnapshot,
      memoryState: session.memoryState,
      evaluationState: session.evaluationState,
      recentRawMessages: messages.slice(-6).map((message) => ({
        role:
          message.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: typeof message.content === 'string' ? message.content : '',
      })),
      jobDescription:
        typeof session.jobDescription === 'string'
          ? session.jobDescription
          : undefined,
    };
  }

  async saveTurn(
    sessionId: string,
    input: SaveTurnInput,
  ): Promise<{ applied: boolean }> {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId },
    });
    if (!session) {
      return { applied: false };
    }

    const existing = this.readJsonObject(session.interviewState) ?? {};
    const savedTurnIds = this.stringArray(existing.savedTurnIds);
    if (savedTurnIds.includes(input.turnId)) {
      return { applied: false };
    }

    await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        interviewState: {
          ...existing,
          ...input.interviewState,
          savedTurnIds: [...savedTurnIds, input.turnId],
        },
        ...(input.memoryState
          ? {
              memoryState: input.memoryState,
            }
          : {}),
        ...(input.evaluationState
          ? {
              evaluationState: input.evaluationState,
            }
          : {}),
      },
    });
    return { applied: true };
  }

  async saveFinal(sessionId: string, input: SaveFinalInput): Promise<void> {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId },
    });
    if (!session) {
      return;
    }

    await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        interviewState: {
          ...(this.readJsonObject(session.interviewState) ?? {}),
          ...input.interviewState,
          status: 'FINISHED',
        },
        ...(input.evaluationState
          ? {
              evaluationState: input.evaluationState,
            }
          : {}),
      },
    });
  }

  private toQuestionPool(
    questions: Array<Record<string, unknown>>,
  ): QuestionPoolItem[] {
    return questions.map((question, index) => ({
      id: typeof question.id === 'string' ? question.id : `q-${index + 1}`,
      order: Number.isFinite(Number(question.order))
        ? Number(question.order)
        : index + 1,
      content: typeof question.content === 'string' ? question.content : '',
      dimension:
        typeof question.dimension === 'string' ? question.dimension : undefined,
      difficulty:
        typeof question.difficulty === 'string'
          ? question.difficulty
          : undefined,
      sourceType:
        typeof question.sourceType === 'string'
          ? question.sourceType
          : undefined,
      sourceLabel:
        typeof question.sourceLabel === 'string'
          ? question.sourceLabel
          : undefined,
      skipped: Boolean(question.skipped),
    }));
  }

  private pickQuestion(
    questions: Array<Record<string, unknown>>,
    currentOrder: number,
  ): QuestionPoolItem | undefined {
    const pool = this.toQuestionPool(questions);
    return pool.find(
      (question) => question.order === currentOrder && !question.skipped,
    );
  }

  private parseTurnSummaries(value: unknown): InterviewTurnSummary[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
      .map((item) => ({
        turn: Number.isFinite(Number(item.turn)) ? Number(item.turn) : 0,
        topic: typeof item.topic === 'string' ? item.topic : '专业面试',
        nodeId: typeof item.nodeId === 'string' ? item.nodeId : undefined,
        facts: this.stringArray(item.facts),
        missingSlots: this.stringArray(item.missingSlots),
        riskSignals: this.stringArray(item.riskSignals),
      }));
  }

  private normalizeCoverage(value: unknown) {
    const coverage =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return {
      covered: this.stringArray(coverage.covered),
      uncovered: this.stringArray(coverage.uncovered),
      ratio: Number.isFinite(Number(coverage.ratio))
        ? Number(coverage.ratio)
        : 0,
    };
  }

  private toStatus(value: unknown) {
    return value === 'EVALUATING' || value === 'FINISHED' || value === 'FAILED'
      ? value
      : 'ACTIVE';
  }

  private toStage(value: unknown) {
    return value === 'S0_ICE_BREAK' ||
      value === 'S1_PROJECT_ENTRY' ||
      value === 'S2_CORE_DEEP_DIVE' ||
      value === 'S3_EXTENSION' ||
      value === 'S4_REVERSE_QUESTION' ||
      value === 'FINISHED'
      ? value
      : DEFAULT_INTERVIEW_STAGE;
  }

  private readJsonObject(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private stringArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
