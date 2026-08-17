import {
  DEFAULT_INTERVIEW_STAGE,
  type InterviewEndReason,
  type InterviewGraphAction,
  type InterviewGraphAnnotationState,
  type InterviewGraphMessageType,
  type InterviewSessionStatus,
  type InterviewStage,
  type PolicyOverrideEntry,
  type StrategistDecision,
} from '../interview-graph.state';
import {
  messageTypeForAction,
  nextStageForAction,
  speakerInstructionForAction,
} from '../routes/interview.routes';

// Step 2：Policy Gate —— 把面试硬约束从 InterviewGraphService 抽离为独立、纯函数、可单测的图节点。
// 规则编号 R1..R10，按《迁移计划》§7.2 顺序执行并保留 Step 0 基线行为；
// 每次覆盖同时写入结构化 policyOverrides[]（ruleId/from/to/reason）与决策上的
// policyOverride 字符串（最后一次覆盖，兼容现有测试与日志消费方）。

export type PolicyGateOutput = {
  strategistDecision: StrategistDecision;
  policyOverrides: PolicyOverrideEntry[];
  status?: InterviewSessionStatus;
  endReason?: InterviewEndReason;
};

const LEGAL_ACTIONS: ReadonlySet<string> = new Set([
  'continue_deep_dive',
  'clarify',
  'pressure_test',
  'switch_topic',
  'guide_back',
  'wrap_up',
]);

const LEGAL_STAGES: ReadonlySet<string> = new Set([
  'S0_ICE_BREAK',
  'S1_PROJECT_ENTRY',
  'S2_CORE_DEEP_DIVE',
  'S3_EXTENSION',
  'S4_REVERSE_QUESTION',
  'FINISHED',
]);

const LEGAL_MESSAGE_TYPES: ReadonlySet<string> = new Set([
  'question',
  'follow_up',
  'pressure_test',
  'topic_switch',
  'closing',
]);

export async function policyGateNode(
  state: InterviewGraphAnnotationState,
  proposed: StrategistDecision | undefined,
): Promise<PolicyGateOutput> {
  const decision = normalizeDecision(state, proposed);
  const turnCount = Math.max(state.turnCount, state.turnSummaries.length);
  const consecutiveNodeTurns = countConsecutiveNodeTurns(state);
  const hasNewFacts = hasNewListenerFacts(state);
  const hasDriftRisk = hasDriftRiskSignals(state);
  const isComprehensive = isComprehensiveAnswer(state);

  // R1 会话已结束（status !== 'ACTIVE'）：拒绝继续生成问题，直接收尾
  if (state.status !== 'ACTIVE' && decision.action !== 'wrap_up') {
    return finalize(
      state,
      decision,
      'R1',
      'wrap_up',
      '会话已结束，拒绝继续生成问题。',
      {
        endReason: state.status === 'FAILED' ? 'error' : 'user_ended',
      },
    );
  }

  // R2 达到最大轮数：强制收尾（已提案 wrap_up 时只补齐结束原因，不重复覆盖）
  if (turnCount >= state.maxTurns) {
    if (decision.action !== 'wrap_up') {
      return finalize(
        state,
        decision,
        'R2',
        'wrap_up',
        '核心轮次已覆盖，进入收尾或反问环节。',
        {
          endReason: 'max_turns',
        },
      );
    }
    return {
      strategistDecision: decision,
      policyOverrides: [],
      endReason: 'max_turns',
    };
  }

  // R3 所有关键能力已覆盖且无未覆盖节点：允许/强制收尾（Step 3 填充 coverageState 后生效）
  if (
    state.coverageState.covered.length > 0 &&
    state.coverageState.uncovered.length === 0 &&
    decision.action !== 'wrap_up'
  ) {
    return finalize(
      state,
      decision,
      'R3',
      'wrap_up',
      '所有关键能力节点均已覆盖，进入收尾或反问环节。',
      {
        endReason: 'coverage_complete',
      },
    );
  }

  // R4 回答明显跑题：优先拉回当前问题
  if (hasDriftRisk && decision.action !== 'guide_back') {
    return finalize(
      state,
      decision,
      'R4',
      'guide_back',
      '检测到跑偏或回避风险，优先拉回当前问题。',
    );
  }

  // R5 回答较完整且已追问过：切换到下一道主问题
  if (
    isComprehensive &&
    consecutiveNodeTurns >= 1 &&
    decision.action !== 'switch_topic' &&
    decision.action !== 'wrap_up'
  ) {
    return finalize(
      state,
      decision,
      'R5',
      'switch_topic',
      '候选人已给出较完整答案，按主问题覆盖优先规则进入下一题。',
    );
  }

  // R6 当前节点连续追问达到上限：切换到下一道主问题
  if (
    consecutiveNodeTurns >= 2 &&
    decision.action !== 'switch_topic' &&
    decision.action !== 'wrap_up' &&
    decision.action !== 'guide_back'
  ) {
    return finalize(
      state,
      decision,
      'R6',
      'switch_topic',
      '当前主问题已追问 2 次，按覆盖优先规则切换到下一道主问题。',
    );
  }

  // R7 连续回答无新增事实且已追问过：切换到下一道主问题
  if (
    !hasNewFacts &&
    consecutiveNodeTurns >= 1 &&
    decision.action === 'continue_deep_dive'
  ) {
    return finalize(
      state,
      decision,
      'R7',
      'switch_topic',
      '连续回答没有新增关键事实，按覆盖优先规则切换到下一道主问题。',
    );
  }

  // R8 本轮无新增事实：先澄清
  if (!hasNewFacts && decision.action === 'continue_deep_dive') {
    return finalize(
      state,
      decision,
      'R8',
      'clarify',
      '本轮没有新增事实，先澄清背景、行动或指标。',
    );
  }

  // R9 决策字段非法（动作/阶段/消息类型）：确定性兜底
  if (
    !LEGAL_ACTIONS.has(decision.action) ||
    !LEGAL_STAGES.has(decision.nextState) ||
    !LEGAL_MESSAGE_TYPES.has(decision.messageType)
  ) {
    return finalize(
      state,
      decision,
      'R9',
      'continue_deep_dive',
      '决策字段非法，使用确定性兜底动作。',
    );
  }

  // R10 原决策合规：保持不变，避免过度干预
  return {
    strategistDecision: decision,
    policyOverrides: [],
  };
}

// 归一化决策形状：补齐缺失字段的默认值，但保留原始动作值（非法值由 R9 兜底）。
function normalizeDecision(
  state: InterviewGraphAnnotationState,
  proposed: StrategistDecision | undefined,
): StrategistDecision {
  const base =
    proposed && typeof proposed === 'object' && !Array.isArray(proposed)
      ? (proposed as Record<string, unknown>)
      : {};
  const rawAction =
    typeof base.action === 'string' ? base.action : 'continue_deep_dive';
  return {
    action: rawAction as InterviewGraphAction,
    nextState:
      typeof base.nextState === 'string'
        ? (base.nextState as InterviewStage)
        : nextStageForAction(state.stage, toAction(rawAction)),
    messageType:
      typeof base.messageType === 'string'
        ? (base.messageType as InterviewGraphMessageType)
        : messageTypeForAction(toAction(rawAction)),
    reason:
      typeof base.reason === 'string'
        ? base.reason
        : '需要继续验证候选人的回答真实性和岗位匹配度。',
    targetCapability:
      typeof base.targetCapability === 'string'
        ? base.targetCapability
        : '项目真实性和岗位匹配度',
    targetResumeNode:
      typeof base.targetResumeNode === 'string'
        ? base.targetResumeNode
        : undefined,
    speakerInstruction:
      typeof base.speakerInstruction === 'string'
        ? base.speakerInstruction
        : '请围绕候选人的回答继续追问一个核心问题。',
    memoryPatch: Array.isArray(base.memoryPatch)
      ? base.memoryPatch.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    policyOverride:
      typeof base.policyOverride === 'string' ? base.policyOverride : undefined,
  };
}

function finalize(
  state: InterviewGraphAnnotationState,
  decision: StrategistDecision,
  ruleId: string,
  action: InterviewGraphAction,
  reason: string,
  extras?: { status?: InterviewSessionStatus; endReason?: InterviewEndReason },
): PolicyGateOutput {
  const corrected: StrategistDecision = {
    ...decision,
    action,
    nextState: nextStageForAction(state.stage, action),
    messageType: messageTypeForAction(action),
    reason,
    speakerInstruction: speakerInstructionForAction(
      action,
      decision.speakerInstruction,
    ),
    policyOverride: reason,
  };
  return {
    strategistDecision: corrected,
    policyOverrides: [{ ruleId, from: decision.action, to: action, reason }],
    status: extras?.status,
    endReason: extras?.endReason,
  };
}

// —— 动作/阶段/消息类型辅助（从 InterviewGraphService 迁入，Step 4 可再迁往 routes）——

export function toAction(value: unknown): InterviewGraphAction {
  return value === 'continue_deep_dive' ||
    value === 'clarify' ||
    value === 'pressure_test' ||
    value === 'switch_topic' ||
    value === 'guide_back' ||
    value === 'wrap_up'
    ? value
    : 'continue_deep_dive';
}

export function toStage(
  value: unknown,
  fallback: InterviewStage = DEFAULT_INTERVIEW_STAGE,
): InterviewStage {
  return value === 'S0_ICE_BREAK' ||
    value === 'S1_PROJECT_ENTRY' ||
    value === 'S2_CORE_DEEP_DIVE' ||
    value === 'S3_EXTENSION' ||
    value === 'S4_REVERSE_QUESTION' ||
    value === 'FINISHED'
    ? value
    : fallback;
}

// —— 状态信号辅助（从 InterviewGraphService 迁入）——

function hasDriftRiskSignals(state: InterviewGraphAnnotationState) {
  return Boolean(
    state.listenerOutput?.riskSignals.some((signal) =>
      /跑偏|回避|无关/.test(signal),
    ),
  );
}

function countConsecutiveNodeTurns(state: InterviewGraphAnnotationState) {
  const nodeId =
    state.currentQuestion?.id ?? state.currentQuestion?.content ?? state.stage;
  let count = 0;
  for (let index = state.turnSummaries.length - 1; index >= 0; index -= 1) {
    const summary = state.turnSummaries[index];
    const summaryNodeId = summary.nodeId ?? summary.topic;
    if (
      summaryNodeId !== nodeId &&
      summary.topic !== state.currentQuestion?.content
    ) {
      break;
    }
    count += 1;
  }
  return count;
}

function hasNewListenerFacts(state: InterviewGraphAnnotationState) {
  const facts =
    state.listenerOutput?.facts.map((fact) => fact.trim()).filter(Boolean) ??
    [];
  if (facts.length === 0) {
    return false;
  }
  const previousFacts = new Set(
    state.turnSummaries
      .slice(0, -1)
      .flatMap((summary) => summary.facts)
      .map((fact) => fact.trim())
      .filter(Boolean),
  );
  return facts.some((fact) => !previousFacts.has(fact));
}

function isComprehensiveAnswer(state: InterviewGraphAnnotationState) {
  const answer = state.latestAnswer.trim();
  const answerLength = countAnswerUnits(answer);
  const factCount = state.listenerOutput?.facts.length ?? 0;
  const riskSignals = state.listenerOutput?.riskSignals ?? [];
  const hasMetric =
    /[0-9０-９]|%|％|提升|降低|准确率|召回率|AUC|RMSE|MAPE|显著|指标|验证|评估|收益|成本|耗时|效率/.test(
      answer,
    );
  const hasMethod =
    /模型|算法|方案|流程|步骤|首先|其次|然后|最后|通过|采用|使用|训练|验证|评估|实验|对比|优化|实现/.test(
      answer,
    );
  const hasResult =
    /结果|最终|因此|所以|达到|提升|降低|验证|证明|收敛|稳定|有效|产出|落地/.test(
      answer,
    );
  const hasShortOrDriftRisk = riskSignals.some((signal) =>
    /回答过短|信息不足|跑偏|回避|无关/.test(signal),
  );

  return (
    !hasShortOrDriftRisk &&
    answerLength >= 120 &&
    factCount >= 2 &&
    hasMetric &&
    hasMethod &&
    hasResult
  );
}

function countAnswerUnits(content: string) {
  const chineseChars = content.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
  const englishWords = content.match(/[a-zA-Z0-9_+-]+/g)?.length ?? 0;
  return chineseChars + englishWords;
}
