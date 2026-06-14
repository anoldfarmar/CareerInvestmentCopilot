import type { ReviewReport } from "./types";

export const mockReports: ReviewReport[] = [
  {
    reportId: "report_001",
    title: "前端开发岗一面复盘",
    score: 85,
    level: "良好",
    summary: "回答整体结构清晰，能说明关键行动；下一步重点强化量化成果和岗位匹配表达。",
    createdAt: "2026-05-27",
    dimensions: [
      { label: "内容完整度", score: 86 },
      { label: "逻辑清晰度", score: 82 },
      { label: "岗位相关性", score: 88 },
      { label: "表达流畅度", score: 80 },
      { label: "结果量化", score: 84 },
      { label: "STAR 使用", score: 78 },
    ],
    topDirections: [
      {
        title: "量化成果表达",
        reason: "项目结果还可以更具体，建议用指标证明价值。",
        actions: ["为每段项目准备 1 个核心指标", "回答用动作 + 指标变化收尾"],
      },
      {
        title: "结构化回答",
        reason: "已有基本结构，但开头可以更快给结论。",
        actions: ["用 STAR 模板重写 2 道题", "每次回答先讲结论"],
      },
      {
        title: "岗位匹配强化",
        reason: "需要把 JD 关键词更自然地映射到项目经历。",
        actions: ["提炼 JD 高频词", "准备 2 个岗位相关追问答案"],
      },
    ],
    questions: [
      {
        id: "qr_001",
        question: "介绍一个最能体现前端工程能力的项目。",
        answer: "我负责一个活动平台的性能优化和组件建设。",
        comment: "方向正确，但背景、任务和结果之间的连接还可以更明确。",
        issues: ["回答偏短", "缺少量化结果"],
        advice: "先说明业务目标，再讲技术动作，最后给出性能和效率指标。",
        referenceAnswer:
          "在活动平台项目中，我负责首屏性能和组件复用。通过拆包、图片策略和缓存优化，将 LCP 降低 44%，活动搭建效率提升 25%。",
        diagnosis: {
          content: "内容覆盖了项目方向，但缺少背景、个人任务和完整结果。",
          logic: "回答需要按背景、行动、结果重排。",
          expression: "表达简洁，但信息密度偏低。",
          depth: "缺少具体技术取舍和量化指标。",
        },
        improvement: {
          summary: "下一次重点补齐 STAR 结构，并用指标证明结果。",
          example:
            "可以这样开头：这个项目的目标是提升活动页加载速度，我负责性能链路治理，最终 LCP 降低 44%。",
          nextTry: "90 秒内回答，至少包含 1 个指标和 1 个个人贡献边界。",
        },
        practiceResources: ["为活动平台项目补充 3 个指标", "用 STAR 模板重写项目介绍"],
      },
    ],
    nextActions: ["进行一轮压力面试训练", "为每段项目准备 1 个核心指标", "每次回答先讲结论"],
  },
  {
    reportId: "report_002",
    title: "行为面试专项训练",
    score: 78,
    level: "待提升",
    summary: "行为题能够给出案例，但任务和行动拆解不够充分。",
    createdAt: "2026-05-21",
    dimensions: [
      { label: "内容完整度", score: 76 },
      { label: "逻辑清晰度", score: 74 },
      { label: "岗位相关性", score: 80 },
      { label: "表达流畅度", score: 82 },
      { label: "结果量化", score: 72 },
      { label: "STAR 使用", score: 70 },
    ],
    topDirections: [
      {
        title: "案例完整度补强",
        reason: "回答内容偏薄，需要先把案例讲完整。",
        actions: ["补齐背景、任务、行动、结果", "控制单题回答在 60-90 秒"],
      },
    ],
    questions: [],
    nextActions: ["补充冲突处理案例", "准备失败复盘类问题"],
  },
];
