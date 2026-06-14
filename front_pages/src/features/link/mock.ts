import type { LinkRecord } from "./types";

export const mockLinks: LinkRecord[] = [
  {
    id: 1,
    company: "星河科技",
    title: "前端开发工程师",
    description: "负责 React、TypeScript 和前端工程化建设，参与复杂业务页面开发与性能优化。",
    sourceUrl: "https://example.com/jobs/frontend",
    status: "interviewing",
    createdAt: "2026-05-29T00:00:00.000Z",
    updatedAt: "2026-05-29T00:00:00.000Z",
  },
  {
    id: 2,
    company: "云栖智能",
    title: "React 工程师",
    description: "负责组件库建设、状态管理优化和跨端页面体验改进，要求熟悉 React 和 TypeScript。",
    sourceUrl: "https://example.com/jobs/react",
    status: "applied",
    createdAt: "2026-05-26T00:00:00.000Z",
    updatedAt: "2026-05-26T00:00:00.000Z",
  },
];
