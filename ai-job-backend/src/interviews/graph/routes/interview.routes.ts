import type {
  InterviewGraphAction,
  InterviewGraphAnnotationState,
  InterviewGraphMessageType,
  InterviewStage,
} from '../interview-graph.state';

// Step 4：动作 → 节点映射（集中声明，供 v2 图条件边使用）。
// routeAfterPolicy：按 Policy Gate 校验后的 finalAction 决定下一节点；
// routeAfterTopicManager：Topic Manager 选出下一题则继续 Speaker，否则进入 Evaluator。

export function routeAfterPolicy(
  state: InterviewGraphAnnotationState,
): 'speaker' | 'topic_manager' | 'evaluator' {
  const action = state.strategistDecision?.action;
  if (action === 'switch_topic') return 'topic_manager';
  if (action === 'wrap_up') return 'evaluator';
  // continue_deep_dive / clarify / pressure_test / guide_back 保持当前主题
  return 'speaker';
}

export function routeAfterTopicManager(
  state: InterviewGraphAnnotationState,
): 'speaker' | 'evaluator' {
  return state.nextQuestion ? 'speaker' : 'evaluator';
}

// —— 动作 → 阶段 / 消息类型 / 话术指令 映射（从 policy-gate.node.ts 迁入共享模块）——

export function nextStageForAction(
  stage: InterviewStage,
  action: InterviewGraphAction,
): InterviewStage {
  if (action === 'wrap_up') return 'S4_REVERSE_QUESTION';
  if (action === 'switch_topic')
    return stage === 'S2_CORE_DEEP_DIVE' ? 'S3_EXTENSION' : 'S1_PROJECT_ENTRY';
  if (action === 'guide_back') return stage;
  if (stage === 'S0_ICE_BREAK') return 'S1_PROJECT_ENTRY';
  if (stage === 'S1_PROJECT_ENTRY') return 'S2_CORE_DEEP_DIVE';
  return stage;
}

export function messageTypeForAction(
  action: InterviewGraphAction,
): InterviewGraphMessageType {
  if (action === 'pressure_test') return 'pressure_test';
  if (action === 'switch_topic') return 'topic_switch';
  if (action === 'wrap_up') return 'closing';
  return 'follow_up';
}

export function speakerInstructionForAction(
  action: InterviewGraphAction,
  fallback: string,
) {
  if (action === 'switch_topic') {
    return '请只用一句自然过渡语说明进入下一道主问题，不要提出具体追问，不要引用候选人刚才的回答。';
  }
  if (action === 'guide_back') {
    return '请礼貌拉回当前问题和 JD 核心要求，围绕候选人刚才回避或跑偏的点问一个澄清问题。';
  }
  if (action === 'wrap_up') {
    return '请进入收尾或反问环节，用简洁自然的面试官口吻提出最后一个问题。';
  }
  if (action === 'clarify') {
    return '请要求候选人补充背景、具体行动或量化结果，只问一个澄清问题。';
  }
  return fallback;
}
