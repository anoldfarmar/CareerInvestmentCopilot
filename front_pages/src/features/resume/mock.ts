import type { ResumeAnalysisResult, ResumeCompareResult } from "./types";

export const mockResumeAnalysis: ResumeAnalysisResult = {
  resumeId: "resume_001",
  totalScore: 82,
  summary: "简历结构完整，项目经历有亮点，但量化成果和岗位关键词覆盖仍可提升。",
  metrics: [
    { key: "completeness", label: "简历完整度", score: 86, level: "good" },
    { key: "keywordMatch", label: "关键词匹配度", score: 72, level: "normal" },
    { key: "expression", label: "内容表达质量", score: 78, level: "normal" },
    { key: "ats", label: "ATS 友好度", score: 88, level: "good" },
  ],
  issues: [
    {
      id: "issue_001",
      sectionType: "project",
      sectionTitle: "项目经历",
      severity: "medium",
      title: "项目成果缺少量化表达",
      description: "当前描述说明了参与工作，但没有体现明确结果。",
      suggestion: "建议补充转化率、效率提升、用户增长等可量化数据。",
      originalText: "负责活动页面优化和用户运营。",
    },
    {
      id: "issue_002",
      sectionType: "skill",
      sectionTitle: "技能清单",
      severity: "low",
      title: "关键词覆盖不够聚焦",
      description: "技能项较分散，与目标岗位高频要求的映射不够直接。",
      suggestion: "把 React、TypeScript、工程化、性能优化等关键词前置。",
    },
  ],
  suggestions: [
    {
      id: "sug_001",
      category: "structure",
      title: "把项目经历放在技能之后",
      description: "先建立能力标签，再用项目证明能力，阅读路径更顺。",
      severity: "low",
      sectionName: "整体结构",
      actionType: "manual",
    },
    {
      id: "sug_002",
      category: "keyword",
      title: "补充岗位关键词",
      description: "目标 JD 中多次出现组件化、状态管理、性能优化，建议在经历中自然体现。",
      severity: "medium",
      sectionName: "技能与项目",
      actionType: "manual",
    },
    {
      id: "sug_003",
      category: "rewrite",
      title: "改写项目成果描述",
      description: "把职责型表达改成结果型表达。",
      beforeText: "负责活动页面优化和用户运营。",
      afterText: "主导活动页首屏性能优化，将 LCP 从 3.2s 降至 1.8s，页面转化率提升 12%。",
      severity: "high",
      sectionName: "项目经历",
      actionType: "auto",
    },
    {
      id: "sug_004",
      category: "ats",
      title: "减少非标准标题",
      description: "ATS 更容易识别“项目经历 / 工作经历 / 教育背景”等标准标题。",
      severity: "medium",
      sectionName: "ATS 检查",
      actionType: "manual",
    },
  ],
};

export const mockResumeCompare: ResumeCompareResult = {
  resumeId: "resume_001",
  sections: [
    {
      title: "个人信息",
      before: ["张同学 | 前端开发 | 138****0000"],
      after: ["张同学 | 前端开发工程师 | React / TypeScript / 工程化"],
      highlight: "标题更贴合目标岗位",
    },
    {
      title: "项目经历",
      before: ["负责活动页面优化和用户运营。", "参与后台管理系统页面开发。"],
      after: [
        "主导活动页首屏性能优化，将 LCP 从 3.2s 降至 1.8s，页面转化率提升 12%。",
        "负责后台管理系统组件化建设，沉淀 18 个通用组件，交付效率提升 25%。",
      ],
      highlight: "补充量化结果和行动边界",
    },
    {
      title: "技能",
      before: ["HTML、CSS、JavaScript、Vue、React、Git"],
      after: ["React、TypeScript、Vite、Zustand、性能优化、移动端适配、Git"],
      highlight: "关键词更集中",
    },
  ],
};
