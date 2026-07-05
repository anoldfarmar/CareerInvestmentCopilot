import type {
  EvaluatorOutput,
  InterviewGraphAnnotationState,
} from '../interview-graph.state';

export async function evaluatorNode(
  state: InterviewGraphAnnotationState,
): Promise<{ evaluationState: EvaluatorOutput }> {
  const riskCount = state.turnSummaries.reduce((sum, item) => sum + item.riskSignals.length, 0);
  const evidenceCount = state.turnSummaries.reduce((sum, item) => sum + item.facts.length, 0);
  const score = Math.max(50, Math.min(88, 72 + evidenceCount * 2 - riskCount * 3));

  return {
    evaluationState: {
      overallScore: score,
      dimensionScores: {
        technicalDepth: score,
        logic: Math.min(score + 3, 95),
        jdFit: Math.max(score - 4, 45),
        evidenceDensity: Math.max(score - riskCount * 2, 40),
        communication: Math.min(score + 5, 95),
      },
      verifiedStrengths: state.turnSummaries.flatMap((item) => item.facts).slice(0, 5),
      unverifiedClaims: state.turnSummaries.flatMap((item) => item.missingSlots).slice(0, 5),
      followUpChainReview: [
        {
          topic: state.turnSummaries.at(-1)?.topic ?? '本轮专业面试',
          chain: state.turnSummaries.map((item) => item.topic).slice(-5),
          result: riskCount > 0 ? '候选人有可继续验证的表达缺口。' : '候选人回答整体较完整。',
        },
      ],
      nextPracticeActions: riskCount > 0
        ? ['补齐量化指标', '练习个人贡献边界表达']
        : ['继续准备反事实追问', '补充与 JD 更直接相关的证据'],
    },
  };
}
