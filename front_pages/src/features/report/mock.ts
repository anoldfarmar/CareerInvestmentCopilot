import type { ReviewReport } from "./types";

export const mockReports: ReviewReport[] = [
  {
    reportId: "report_001",
    title: "前端开发岗一面复盘",
    score: 85,
    level: "良好",
    summary: "回答整体结构清楚，能说明关键行动，但部分结果缺少业务指标支撑。",
    createdAt: "2026-05-27",
    dimensions: [
      { label: "内容完整性", score: 86 },
      { label: "逻辑清晰度", score: 82 },
      { label: "岗位相关性", score: 88 },
      { label: "表达流畅度", score: 80 },
      { label: "亮点呈现", score: 84 },
      { label: "STAR 使用", score: 78 },
    ],
    questions: [
      {
        id: "qr_001",
        question: "介绍一个最能体现前端工程能力的项目。",
        answer: "我负责一个活动平台的性能优化和组件建设。",
        comment: "方向正确，但背景、任务和结果之间的连接还可以更明确。",
        issues: ["结果指标不够具体", "个人贡献边界需要前置"],
        advice: "先说明业务目标，再讲技术动作，最后给出性能和转化指标。",
        referenceAnswer:
          "在活动平台项目中，我负责首屏性能和组件复用。通过拆包、图片策略和缓存优化，将 LCP 降低 44%，活动搭建效率提升 25%。",
      },
    ],
    nextActions: ["加强项目经历类问题训练", "使用 STAR 结构回答行为题", "增加具体数据和结果"],
  },
  {
    reportId: "report_002",
    title: "行为面试专项训练",
    score: 78,
    level: "可提升",
    summary: "行为题能够给出案例，但任务和行动拆解不够充分。",
    createdAt: "2026-05-21",
    dimensions: [
      { label: "内容完整性", score: 76 },
      { label: "逻辑清晰度", score: 74 },
      { label: "岗位相关性", score: 80 },
      { label: "表达流畅度", score: 82 },
      { label: "亮点呈现", score: 72 },
      { label: "STAR 使用", score: 70 },
    ],
    questions: [],
    nextActions: ["补充冲突处理案例", "准备失败复盘类问题"],
  },
];
