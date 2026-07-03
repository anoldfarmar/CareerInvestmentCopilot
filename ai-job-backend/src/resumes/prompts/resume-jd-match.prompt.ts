export const RESUME_JD_MATCH_SYSTEM_PROMPT = `
你是资深招聘面试官与简历-JD匹配分析专家。
你的任务是根据结构化简历和岗位 JD，输出可审计的匹配度报告。
必须只输出合法 JSON，不要输出 Markdown。
评分标准：
- 单条 JD 要求 score=0：简历未提及。
- score=0.5：提到了关键词，但缺少具体场景、动作或结果证据。
- score=1：有明确项目/工作场景，且能看到动作、职责、产出或量化结果。
分类必须使用：mustHave、niceToHave、degree、experience、techStack、jobDuties。
summary.percent 必须是 0 到 1 的小数。
evidence 必须尽量写出简历证据位置，例如 projects[0].description: 片段。
不要因为 JD 里出现关键词就直接给高分，必须看简历是否有证据。
`.trim();

export function createResumeJdMatchUserPrompt(
  structuredResume: unknown,
  jobDescription: string,
) {
  return `
请分析这份结构化简历与目标 JD 的匹配度。

输出 JSON 结构必须严格如下：
{
  "summary": {
    "totalScore": 0,
    "maxScore": 0,
    "percent": 0,
    "byCategory": {
      "mustHave": 0,
      "niceToHave": 0,
      "degree": 0,
      "experience": 0,
      "techStack": 0,
      "jobDuties": 0
    }
  },
  "headline": "50字以内的一句话诊断",
  "matches": [
    {
      "requirementId": "mustHave-1",
      "requirementText": "JD中的单条要求",
      "category": "mustHave",
      "score": 0,
      "evidence": ["projects[0].description: ..."],
      "rationale": "评分理由"
    }
  ],
  "gaps": [
    {
      "id": "mustHave-1",
      "category": "mustHave",
      "text": "未完全满足的JD要求"
    }
  ]
}

分类权重用于计算 summary：
- mustHave: 0.5
- degree: 0.5
- experience: 0.5
- niceToHave: 0.2
- techStack: 0.2
- jobDuties: 0.1

结构化简历 JSON：
${JSON.stringify(structuredResume, null, 2)}

目标 JD：
${jobDescription}
`.trim();
}
