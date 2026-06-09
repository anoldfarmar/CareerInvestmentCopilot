import { http } from "@/services/http";

import { mockKnowledgeBases } from "./mock";
import type {
  CreateAudioRecordInput,
  CreateKnowledgeBaseInput,
  CreateManualRecordInput,
  InterviewKnowledgeBase,
  RealInterviewRecord,
} from "./types";

// 知识库后端尚未接入，当前继续使用本地 Mock。
const useMock = true;
let knowledgeBaseStore = structuredClone(mockKnowledgeBases);

function wait(duration = 350) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function findKnowledgeBase(knowledgeBaseId: string) {
  const knowledgeBase = knowledgeBaseStore.find((item) => item.id === knowledgeBaseId);
  if (!knowledgeBase) throw new Error("知识库不存在");
  return knowledgeBase;
}

function appendRecord(knowledgeBaseId: string, record: RealInterviewRecord) {
  knowledgeBaseStore = knowledgeBaseStore.map((item) =>
    item.id === knowledgeBaseId
      ? {
          ...item,
          recordCount: item.recordCount + 1,
          updatedAt: record.createdAt,
          records: [record, ...item.records],
        }
      : item,
  );
}

export async function getKnowledgeBases(): Promise<InterviewKnowledgeBase[]> {
  if (!useMock) {
    const { data } = await http.get<InterviewKnowledgeBase[]>("/interview-knowledge-bases");
    return data;
  }
  await wait();
  return knowledgeBaseStore;
}

export async function getKnowledgeBase(knowledgeBaseId: string): Promise<InterviewKnowledgeBase> {
  if (!useMock) {
    const { data } = await http.get<InterviewKnowledgeBase>(`/interview-knowledge-bases/${knowledgeBaseId}`);
    return data;
  }
  await wait(260);
  return findKnowledgeBase(knowledgeBaseId);
}

export async function createKnowledgeBase(input: CreateKnowledgeBaseInput): Promise<InterviewKnowledgeBase> {
  if (!useMock) {
    const { data } = await http.post<InterviewKnowledgeBase>("/interview-knowledge-bases", input);
    return data;
  }
  await wait();
  const knowledgeBase: InterviewKnowledgeBase = {
    id: `kb_${Date.now()}`,
    name: input.name,
    description: input.description,
    recordCount: 0,
    focusAreas: [],
    updatedAt: new Date().toISOString().slice(0, 10),
    records: [],
  };
  knowledgeBaseStore = [knowledgeBase, ...knowledgeBaseStore];
  return knowledgeBase;
}

export async function createManualInterviewRecord(input: CreateManualRecordInput): Promise<RealInterviewRecord> {
  if (!useMock) {
    const { data } = await http.post<RealInterviewRecord>(
      `/interview-knowledge-bases/${input.knowledgeBaseId}/records/manual`,
      input,
    );
    return data;
  }
  await wait(500);
  findKnowledgeBase(input.knowledgeBaseId);
  const record: RealInterviewRecord = {
    id: `real_interview_${Date.now()}`,
    knowledgeBaseId: input.knowledgeBaseId,
    title: input.title,
    interviewDate: input.interviewDate,
    transcript: input.transcript,
    sourceType: "manual",
    status: "ready",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  appendRecord(input.knowledgeBaseId, record);
  return record;
}

export async function uploadInterviewAudio(input: CreateAudioRecordInput): Promise<RealInterviewRecord> {
  if (!useMock) {
    const form = new FormData();
    form.append("title", input.title);
    form.append("interviewDate", input.interviewDate);
    form.append("audioFile", input.audioFile);
    const { data } = await http.post<RealInterviewRecord>(
      `/interview-knowledge-bases/${input.knowledgeBaseId}/records/audio`,
      form,
    );
    return data;
  }
  await wait(700);
  findKnowledgeBase(input.knowledgeBaseId);
  const record: RealInterviewRecord = {
    id: `real_interview_${Date.now()}`,
    knowledgeBaseId: input.knowledgeBaseId,
    title: input.title,
    interviewDate: input.interviewDate,
    sourceType: "audio",
    audioFileName: input.audioFile.name,
    audioFileSize: input.audioFile.size,
    transcript: "录音已上传，等待后端语音转写和知识提取。",
    status: "processing",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  appendRecord(input.knowledgeBaseId, record);
  return record;
}
