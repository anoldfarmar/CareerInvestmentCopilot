import type { LinkStatus } from "@/features/link/types";

export const linkStatusLabels: Record<LinkStatus, string> = {
  draft: "草稿",
  interested: "感兴趣",
  applied: "已投递",
  interviewing: "面试中",
  offer: "Offer",
  rejected: "未通过",
  archived: "已归档",
};
