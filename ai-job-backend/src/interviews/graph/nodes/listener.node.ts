import type {
  InterviewGraphAnnotationState,
  ListenerOutput,
} from '../interview-graph.state';

const SHORT_ANSWER_THRESHOLD = 80;

export async function listenerNode(
  state: InterviewGraphAnnotationState,
): Promise<{ listenerOutput: ListenerOutput; turnSummaries: InterviewGraphAnnotationState['turnSummaries'] }> {
  const answer = state.latestAnswer.trim();
  const topic = state.stage === 'S0_ICE_BREAK' ? '自我介绍' : '当前追问节点';
  const listenerOutput: ListenerOutput = {
    summary: answer
      ? `候选人回答摘要：${answer.slice(0, 160)}${answer.length > 160 ? '...' : ''}`
      : '候选人尚未提供有效回答。',
    entities: extractLightweightEntities(answer),
    facts: answer ? [answer.slice(0, 120)] : [],
    missingSlots: answer.length < SHORT_ANSWER_THRESHOLD
      ? ['背景信息', '具体行动', '量化结果']
      : ['量化结果', '个人贡献边界'],
    riskSignals: answer.length < SHORT_ANSWER_THRESHOLD
      ? ['回答过短，证据密度不足']
      : ['需要继续验证指标和贡献边界'],
  };

  return {
    listenerOutput,
    turnSummaries: [
      ...state.turnSummaries,
      {
        turn: state.turnSummaries.length + 1,
        topic,
        nodeId: state.currentQuestion?.id,
        facts: listenerOutput.facts,
        missingSlots: listenerOutput.missingSlots,
        riskSignals: listenerOutput.riskSignals,
      },
    ],
  };
}

function extractLightweightEntities(answer: string) {
  return Array.from(new Set(answer.match(/[A-Za-z][A-Za-z0-9+#._-]{1,}|[\u4e00-\u9fa5]{2,}/g) ?? []))
    .slice(0, 12);
}
