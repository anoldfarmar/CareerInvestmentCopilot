import { http } from "@/services/http";

import { mockProfile } from "./mock";
import type { SubscriptionPlan, TargetDirection, UserProfile, UserSubscription } from "./types";

// 个人偏好已接入后端真实接口；mock 只作为开发兜底保留。
const useMock = false;
let profileStore = mockProfile;

const defaultSubscription: UserSubscription = {
  plan: "free",
  planLabel: "免费版",
  limits: ["每月 5 场免费模拟面试", "基础复盘报告", "本地知识库记录"],
  benefits: ["无限模拟面试", "专家级复盘建议", "真实面试知识库增强", "简历多模板导出"],
  upgradeEnabled: true,
};

function normalizeProfile(profile: Partial<UserProfile>): UserProfile {
  const targetDirection = (profile.targetDirection ?? "internet") as TargetDirection;
  const targetDirections = profile.targetDirections?.length ? profile.targetDirections : [targetDirection];
  const subscriptionPlan = (profile.subscriptionPlan ?? profile.subscription?.plan ?? "free") as SubscriptionPlan;
  const subscription = profile.subscription ?? {
    ...defaultSubscription,
    plan: subscriptionPlan,
    planLabel: subscriptionPlan === "premium" ? "高级版" : "免费版",
    upgradeEnabled: subscriptionPlan !== "premium",
  };

  return {
    name: profile.name ?? "求职中的你",
    jobMode: profile.jobMode ?? "junior",
    targetDirection,
    targetDirections,
    customTargetDirection: profile.customTargetDirection ?? "",
    subscriptionPlan,
    subscription,
    language: profile.language ?? "zh-CN",
    questionCount: profile.questionCount ?? 8,
    enableVoiceInput: profile.enableVoiceInput ?? true,
    showStarTips: profile.showStarTips ?? true,
  };
}

export async function getProfile(): Promise<UserProfile> {
  if (!useMock) {
    const { data } = await http.get<Partial<UserProfile>>("/profile");
    return normalizeProfile(data);
  }
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return normalizeProfile(profileStore);
}

export async function updateProfile(profile: UserProfile): Promise<UserProfile> {
  if (!useMock) {
    const { data } = await http.put<Partial<UserProfile>>("/profile", profile);
    return normalizeProfile(data);
  }
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  profileStore = normalizeProfile(profile);
  return profileStore;
}
