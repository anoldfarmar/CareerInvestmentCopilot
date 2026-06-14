export type JobMode = "student" | "junior" | "mid" | "senior" | "career-switcher" | "entrepreneur";
export type TargetDirection =
  | "internet"
  | "finance"
  | "manufacturing"
  | "medical"
  | "education"
  | "other"
  | "tech";
export type SubscriptionPlan = "free" | "premium";

export type UserSubscription = {
  plan: SubscriptionPlan;
  planLabel: string;
  limits: string[];
  benefits: string[];
  upgradeEnabled: boolean;
};

export type UserProfile = {
  name: string;
  jobMode: JobMode;
  targetDirection: TargetDirection;
  targetDirections: TargetDirection[];
  customTargetDirection: string;
  subscriptionPlan: SubscriptionPlan;
  subscription: UserSubscription;
  language: "zh-CN" | "en-US";
  questionCount: 5 | 8 | 10;
  enableVoiceInput: boolean;
  showStarTips: boolean;
};
