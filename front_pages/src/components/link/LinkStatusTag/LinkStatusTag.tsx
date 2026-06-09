import type { LinkStatus } from "@/features/link/types";

const labels: Record<LinkStatus, string> = {
  pending: "待投递",
  applied: "已投递",
  interview: "面试中",
  offer: "Offer",
  rejected: "未通过",
};

export function LinkStatusTag({ status }: { status: LinkStatus }) {
  return <span className="pill">{labels[status]}</span>;
}

export { labels as linkStatusLabels };
