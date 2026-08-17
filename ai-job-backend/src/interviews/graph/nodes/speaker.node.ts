import type {
  InterviewGraphAnnotationState,
  SpeakerOutput,
  StrategistDecision,
} from '../interview-graph.state';

export async function speakerNode(
  state: InterviewGraphAnnotationState,
  decision: StrategistDecision | undefined = state.strategistDecision,
): Promise<{ speakerOutput: SpeakerOutput }> {
  const instruction =
    decision?.speakerInstruction ?? '请继续围绕候选人的回答追问一个核心问题。';
  const latestAnswer = state.latestAnswer.trim();
  const anchor = latestAnswer
    ? `你刚才提到“${latestAnswer.slice(0, 32)}${latestAnswer.length > 32 ? '...' : ''}”，`
    : '';
  const content = `${anchor}${instruction}`;

  return {
    speakerOutput: {
      messageType: decision?.messageType ?? 'follow_up',
      content,
    },
  };
}
