export type JobMode = "student" | "career-switcher" | "experienced";
export type TargetDirection = "tech" | "product" | "operation" | "data" | "design" | "marketing";

export type UserProfile = {
  name: string;
  jobMode: JobMode;
  targetDirection: TargetDirection;
  language: "zh-CN" | "en-US";
  questionCount: 5 | 8 | 10;
  enableVoiceInput: boolean;
  showStarTips: boolean;
};
