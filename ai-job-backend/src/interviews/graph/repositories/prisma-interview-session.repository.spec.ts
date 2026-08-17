import { PrismaInterviewSessionRepository } from './prisma-interview-session.repository';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PrismaInterviewSessionRepository（Step 8：快照解析与幂等保存）', () => {
  function createPrismaMock() {
    return {
      interviewSession: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
  }

  function makeSessionRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'session-repo',
      userId: 10,
      type: 'professional',
      totalQuestions: 2,
      currentQuestion: 1,
      ended: false,
      jobDescription: 'JD',
      knowledgeBaseIds: [],
      questions: [
        {
          id: 'q-1',
          order: 1,
          content: '第 1 题',
          dimension: 'professional',
          sourceType: 'rule',
          sourceLabel: '基础智能问题',
          skipped: false,
        },
        {
          id: 'q-2',
          order: 2,
          content: '第 2 题',
          dimension: 'professional',
          sourceType: 'rule',
          sourceLabel: '基础智能问题',
          skipped: false,
        },
      ],
      questionFeedback: {},
      strategySnapshot: null,
      interviewState: {
        graphVersion: 'v2',
        status: 'ACTIVE',
        turnCount: 2,
        stage: 'S2_CORE_DEEP_DIVE',
        completedTopicIds: ['q-1'],
        coverageState: { covered: ['q-1'], uncovered: ['q-2'], ratio: 0.5 },
      },
      memoryState: {
        turnSummaries: [
          {
            turn: 1,
            topic: 't',
            facts: ['f'],
            missingSlots: [],
            riskSignals: [],
          },
        ],
      },
      evaluationState: null,
      messages: [
        { role: 'assistant', content: 'q1' },
        { role: 'user', content: 'a1' },
        { role: 'assistant', content: 'r1' },
      ],
      startedAt: new Date(),
      endedAt: null,
      updatedAt: new Date(),
      resumeId: null,
      ...overrides,
    };
  }

  function readUpdateData(prisma: ReturnType<typeof createPrismaMock>) {
    const call = prisma.interviewSession.update.mock.calls[0] as unknown as [
      { where: { id: string }; data: Record<string, unknown> },
    ];
    return call?.[0]?.data ?? {};
  }

  it('getSnapshot 解析会话行为快照', async () => {
    const prisma = createPrismaMock();
    prisma.interviewSession.findFirst.mockResolvedValue(makeSessionRow());
    const repo = new PrismaInterviewSessionRepository(
      prisma as unknown as PrismaService,
    );

    const snapshot = await repo.getSnapshot('session-repo');

    expect(snapshot).not.toBeNull();
    expect(snapshot?.graphVersion).toBe('v2');
    expect(snapshot?.status).toBe('ACTIVE');
    expect(snapshot?.turnCount).toBe(2);
    expect(snapshot?.maxTurns).toBe(12);
    expect(snapshot?.stage).toBe('S2_CORE_DEEP_DIVE');
    expect(snapshot?.questionPool).toHaveLength(2);
    expect(snapshot?.currentQuestion?.id).toBe('q-1');
    expect(snapshot?.completedTopicIds).toEqual(['q-1']);
    expect(snapshot?.coverageState).toEqual({
      covered: ['q-1'],
      uncovered: ['q-2'],
      ratio: 0.5,
    });
    expect(snapshot?.turnSummaries).toHaveLength(1);
    expect(snapshot?.recentRawMessages).toHaveLength(3);
  });

  it('saveTurn 按 turnId 幂等去重', async () => {
    const prisma = createPrismaMock();
    prisma.interviewSession.findFirst.mockResolvedValue(makeSessionRow());
    prisma.interviewSession.update.mockResolvedValue({});
    const repo = new PrismaInterviewSessionRepository(
      prisma as unknown as PrismaService,
    );

    const first = await repo.saveTurn('session-repo', {
      turnId: 'session-repo:3',
      interviewState: { turnCount: 3 },
    });
    expect(first.applied).toBe(true);
    expect(prisma.interviewSession.update).toHaveBeenCalledTimes(1);
    expect(readUpdateData(prisma).interviewState).toMatchObject({
      savedTurnIds: ['session-repo:3'],
      turnCount: 3,
    });

    // 第二次同一 turnId → 幂等跳过
    prisma.interviewSession.findFirst.mockResolvedValue(
      makeSessionRow({
        interviewState: {
          graphVersion: 'v2',
          savedTurnIds: ['session-repo:3'],
        },
      }),
    );
    const second = await repo.saveTurn('session-repo', {
      turnId: 'session-repo:3',
      interviewState: { turnCount: 3 },
    });
    expect(second.applied).toBe(false);
    expect(prisma.interviewSession.update).toHaveBeenCalledTimes(1);
  });

  it('saveFinal 写入 FINISHED 状态与评估结果', async () => {
    const prisma = createPrismaMock();
    prisma.interviewSession.findFirst.mockResolvedValue(makeSessionRow());
    prisma.interviewSession.update.mockResolvedValue({});
    const repo = new PrismaInterviewSessionRepository(
      prisma as unknown as PrismaService,
    );

    await repo.saveFinal('session-repo', {
      interviewState: { endReason: 'max_turns' },
      evaluationState: { overallScore: 88 },
    });

    expect(prisma.interviewSession.update).toHaveBeenCalledTimes(1);
    expect(readUpdateData(prisma).interviewState).toMatchObject({
      status: 'FINISHED',
      endReason: 'max_turns',
    });
    expect(readUpdateData(prisma).evaluationState).toMatchObject({
      overallScore: 88,
    });
  });
});
