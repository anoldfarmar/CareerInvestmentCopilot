import { http } from "@/services/http";

import { mockLinks } from "./mock";
import type { LinkRecord, LinkRecordInput, LinkStatus } from "./types";

// 投递管理后端尚未接入，当前继续使用本地 Mock。
const useMock = true;
let linkStore = [...mockLinks];

export async function getLinks(status?: LinkStatus | "all"): Promise<LinkRecord[]> {
  if (!useMock) {
    const { data } = await http.get<LinkRecord[]>("/links", { params: { status } });
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  if (!status || status === "all") return linkStore;
  return linkStore.filter((item) => item.status === status);
}

export async function createLink(input: LinkRecordInput): Promise<LinkRecord> {
  if (!useMock) {
    const { data } = await http.post<LinkRecord>("/links", input);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  const record: LinkRecord = {
    ...input,
    id: `link_${Date.now()}`,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  linkStore = [record, ...linkStore];
  return record;
}

export async function updateLink(id: string, input: LinkRecordInput): Promise<LinkRecord> {
  if (!useMock) {
    const { data } = await http.put<LinkRecord>(`/links/${id}`, input);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  const updated: LinkRecord = { ...input, id, updatedAt: new Date().toISOString().slice(0, 10) };
  linkStore = linkStore.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function deleteLink(id: string): Promise<string> {
  if (!useMock) {
    await http.delete(`/links/${id}`);
    return id;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  linkStore = linkStore.filter((item) => item.id !== id);
  return id;
}
