import type { UserProfile } from "./types";

export const mockProfile: UserProfile = {
  name: "求职中的你",
  jobMode: "junior",
  targetDirection: "internet",
  targetDirections: ["internet", "finance"],
  customTargetDirection: "",
  subscriptionPlan: "free",
  subscription: {
    plan: "free",
    planLabel: "免费版",
    limits: ["每月 5 场免费模拟面试", "基础复盘报告", "本地知识库记录"],
    benefits: ["无限模拟面试", "专家级复盘建议", "真实面试知识库增强", "简历多模板导出"],
    upgradeEnabled: true,
  },
  language: "zh-CN",
  questionCount: 8,
  enableVoiceInput: true,
  showStarTips: true,
};
