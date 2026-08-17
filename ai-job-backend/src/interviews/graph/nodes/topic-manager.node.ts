import {
  type CoverageState,
  type InterviewGraphAnnotationState,
  type QuestionPoolItem,
} from '../interview-graph.state';

// Step 3：Topic Manager —— 题目推进进入图内，替换 NestJS 的 findNextActiveQuestion 语义。
// 第一阶段：从预生成题目池按 order 升序选择未跳过、未完成的节点，并同步维护
// completedTopicIds / coverageState；无有效候选时返回 nextQuestion=undefined
// （exhausted），由 Step 4 的条件边路由进入 Evaluator。
// 注意：阶段（stage）推进统一由 Policy Gate 按动作负责（switch_topic → S3 等），
// Topic Manager 只负责选题与覆盖状态，避免与 Policy Gate 双重推进。
// 预留扩展点（后续阶段启用）：按 JD 核心能力维度优先级、listener 未验证声明、
// RAG 召回（InterviewRagService.retrieveRelevantChunks）动态选题。

export type TopicManagerOutput = {
  currentQuestion?: QuestionPoolItem;
  nextQuestion?: QuestionPoolItem;
  completedTopicIds: string[];
  coverageState: CoverageState;
};

export async function topicManagerNode(
  state: InterviewGraphAnnotationState,
): Promise<TopicManagerOutput> {
  const pool = Array.isArray(state.questionPool) ? state.questionPool : [];
  const completed = new Set(state.completedTopicIds ?? []);
  if (state.currentQuestion?.id) {
    completed.add(state.currentQuestion.id);
  }
  const completedTopicIds = Array.from(completed);

  const next = pickNextQuestion(pool, state.currentQuestion?.order, completed);
  // 覆盖状态只统计未跳过（active）的题目节点：被跳过的题目不参与覆盖评估
  const activePoolIds = pool
    .filter((question) => !question.skipped)
    .map((question) => question.id)
    .filter(Boolean);
  const coveredIds = activePoolIds.filter((id) => completed.has(id));
  const coverageState: CoverageState = {
    covered: coveredIds,
    uncovered: activePoolIds.filter((id) => !completed.has(id)),
    ratio:
      activePoolIds.length > 0 ? coveredIds.length / activePoolIds.length : 0,
  };

  return {
    ...(next ? { currentQuestion: next, nextQuestion: next } : {}),
    completedTopicIds,
    coverageState,
  };
}

function pickNextQuestion(
  pool: QuestionPoolItem[],
  currentOrder: number | undefined,
  completed: Set<string>,
): QuestionPoolItem | undefined {
  const candidates = pool.filter(
    (question) =>
      !question.skipped &&
      typeof question.id === 'string' &&
      !completed.has(question.id),
  );
  if (candidates.length === 0) {
    return undefined;
  }
  const sorted = [...candidates].sort(
    (left, right) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) -
      (right.order ?? Number.MAX_SAFE_INTEGER),
  );
  const afterCurrent = sorted.filter(
    (question) =>
      question.order === undefined ||
      currentOrder === undefined ||
      question.order > currentOrder,
  );
  return afterCurrent.length > 0 ? afterCurrent[0] : sorted[0];
}
