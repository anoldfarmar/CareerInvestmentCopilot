import type { LinkRecord } from "./types";

export const mockLinks: LinkRecord[] = [
  {
    id: "link_001",
    companyName: "星河科技",
    jobTitle: "前端开发工程师",
    url: "https://example.com/jobs/frontend",
    status: "interview",
    remark: "约了下周二技术面",
    updatedAt: "2026-05-29",
  },
  {
    id: "link_002",
    companyName: "云杉智能",
    jobTitle: "React 工程师",
    url: "https://example.com/jobs/react",
    status: "applied",
    remark: "已内推",
    updatedAt: "2026-05-26",
  },
];
