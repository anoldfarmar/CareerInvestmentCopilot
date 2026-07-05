import type {
  InterviewGraphAction,
  InterviewGraphAnnotationState,
  InterviewGraphMessageType,
  InterviewStage,
  StrategistDecision,
} from '../interview-graph.state';

const MAX_DEEP_DIVE_TURNS = 3;
const WRAP_UP_TURN_THRESHOLD = 8;

export async function strategistNode(
  state: InterviewGraphAnnotationState,
): Promise<{ strategistDecision: StrategistDecision; stage: InterviewStage; memoryState: unknown }> {
  const listener = state.listenerOutput;
  const turnCount = state.turnSummaries.length;
  const isShortAnswer = Boolean(listener?.riskSignals.some((signal) => signal.includes('回答过短')));
  const hasDriftRisk = Boolean(listener?.riskSignals.some((signal) => /跑偏|回避|无关/.test(signal)));
  const consecutiveNodeTurns = countConsecutiveNodeTurns(state);
  const hasNewFacts = hasNewListenerFacts(state);
  const shouldWrapUp = turnCount >= WRAP_UP_TURN_THRESHOLD;
  const shouldSwitchTopic = consecutiveNodeTurns >= MAX_DEEP_DIVE_TURNS || (!hasNewFacts && consecutiveNodeTurns >= 2);
  const action: InterviewGraphAction = shouldWrapUp
    ? 'wrap_up'
    : hasDriftRisk
      ? 'guide_back'
      : isShortAnswer || (!hasNewFacts && consecutiveNodeTurns < 2)
      ? 'clarify'
      : shouldSwitchTopic
        ? 'switch_topic'
        : 'continue_deep_dive';
  const nextState = decideNextState(state.stage, action);
  const messageType = toMessageType(action);
  const targetCapability = isShortAnswer ? '表达完整度和证据密度' : '项目真实性和岗位匹配度';
  const decision: StrategistDecision = {
    action,
    nextState,
    messageType,
    reason: buildReason(action, listener?.missingSlots ?? []),
    targetCapability,
    speakerInstruction: buildSpeakerInstruction(action, listener?.missingSlots ?? []),
    memoryPatch: listener?.facts ?? [],
  };

  return {
    strategistDecision: decision,
    stage: nextState,
    memoryState: mergeMemoryState(state.memoryState, decision.memoryPatch),
  };
}

function countConsecutiveNodeTurns(state: InterviewGraphAnnotationState) {
  const nodeId = state.currentQuestion?.id ?? state.currentQuestion?.content ?? state.stage;
  let count = 0;
  for (let index = state.turnSummaries.length - 1; index >= 0; index -= 1) {
    const item = state.turnSummaries[index];
    const itemNodeId = item.nodeId ?? item.topic;
    if (itemNodeId !== nodeId && item.topic !== state.currentQuestion?.content) {
      break;
    }
    count += 1;
  }

  return count;
}

function hasNewListenerFacts(state: InterviewGraphAnnotationState) {
  const facts = state.listenerOutput?.facts ?? [];
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

  return facts.some((fact) => !previousFacts.has(fact.trim()));
}

function decideNextState(current: InterviewStage, action: InterviewGraphAction): InterviewStage {
  if (action === 'wrap_up') return 'S4_REVERSE_QUESTION';
  if (action === 'switch_topic') return current === 'S2_CORE_DEEP_DIVE' ? 'S3_EXTENSION' : 'S1_PROJECT_ENTRY';
  if (current === 'S0_ICE_BREAK') return 'S1_PROJECT_ENTRY';
  if (current === 'S1_PROJECT_ENTRY') return 'S2_CORE_DEEP_DIVE';
  return current;
}

function toMessageType(action: InterviewGraphAction): InterviewGraphMessageType {
  if (action === 'pressure_test') return 'pressure_test';
  if (action === 'switch_topic') return 'topic_switch';
  if (action === 'wrap_up') return 'closing';
  return 'follow_up';
}

function buildReason(action: InterviewGraphAction, missingSlots: string[]) {
  if (action === 'clarify') {
    return `候选人的回答信息不足，需要补齐：${missingSlots.join('、') || '背景、行动、结果'}`;
  }
  if (action === 'switch_topic') {
    return '当前节点已连续追问多轮，需要切换到新的能力维度。';
  }
  if (action === 'guide_back') {
    return '候选人的回答有跑偏或回避迹象，需要拉回当前问题和 JD 核心要求。';
  }
  if (action === 'wrap_up') {
    return '本轮核心追问已覆盖，准备进入收尾或反问。';
  }
  return `候选人回答中仍有可验证空间，需要继续深挖：${missingSlots.join('、') || '指标和贡献边界'}`;
}

function buildSpeakerInstruction(action: InterviewGraphAction, missingSlots: string[]) {
  if (action === 'clarify') {
    return `请围绕 ${missingSlots.join('、') || '背景、行动、结果'} 做一次澄清追问，只问一个问题。`;
  }
  if (action === 'switch_topic') {
    return '请自然切换到另一个与 JD 相关的能力点，保持真实面试官口吻，只问一个问题。';
  }
  if (action === 'guide_back') {
    return '候选人回答有跑偏或回避迹象，请礼貌拉回当前 JD 和问题，只问一个核心澄清问题。';
  }
  if (action === 'wrap_up') {
    return '请进入收尾或反问环节，用简洁自然的面试官口吻提出最后一个问题。';
  }
  return `请围绕 ${missingSlots.join('、') || '量化结果和个人贡献边界'} 继续深挖，只问一个核心问题。`;
}

function mergeMemoryState(memoryState: unknown, memoryPatch: string[]) {
  const base = memoryState && typeof memoryState === 'object' && !Array.isArray(memoryState)
    ? memoryState as Record<string, unknown>
    : {};
  const existing = Array.isArray(base.candidateClaims)
    ? base.candidateClaims.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    ...base,
    candidateClaims: [...existing, ...memoryPatch].slice(-20),
  };
}
