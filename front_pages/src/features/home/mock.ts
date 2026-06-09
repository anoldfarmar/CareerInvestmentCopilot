import type { HomeOverview } from "./types";

export const mockHomeOverview: HomeOverview = {
  kpis: [
    { label: "已上传简历", value: 3, unit: "份" },
    { label: "已优化次数", value: 8, unit: "次" },
    { label: "模拟面试", value: 5, unit: "次" },
    { label: "待查看复盘", value: 2, unit: "份" },
  ],
  recentReportTitle: "前端开发岗一面复盘",
  mode: "有经验求职者模式",
};
