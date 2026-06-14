import { http } from "@/services/http";
import { unwrapItems, type PaginatedResponse } from "@/services/pagination";

import { mockKnowledgeBases } from "./mock";
import type {
  CreateAudioRecordInput,
  BuildKnowledgeRecordInput,
  CreateKnowledgeBaseInput,
  CreateManualRecordInput,
  InterviewKnowledgeBase,
  RealInterviewRecord,
  TranscribeAudioRecordInput,
} from "./types";

// 真实面试知识库已接入后端真实接口；mock 只作为开发兜底保留。
const useMock = false;
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
    const { data } = await http.get<InterviewKnowledgeBase[] | PaginatedResponse<InterviewKnowledgeBase>>(
      "/interview-knowledge-bases",
    );
    return unwrapItems(data);
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

export async function deleteKnowledgeBase(knowledgeBaseId: string): Promise<{ id: string }> {
  if (!useMock) {
    const { data } = await http.delete<{ id: string }>(`/interview-knowledge-bases/${knowledgeBaseId}`);
    return data;
  }

  await wait(260);
  knowledgeBaseStore = knowledgeBaseStore.filter((item) => item.id !== knowledgeBaseId);
  return { id: knowledgeBaseId };
}

export async function createManualInterviewRecord(input: CreateManualRecordInput): Promise<RealInterviewRecord> {
  if (!useMock) {
    const { knowledgeBaseId, ...body } = input;
    const { data } = await http.post<RealInterviewRecord>(
      `/interview-knowledge-bases/${knowledgeBaseId}/records/manual`,
      body,
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
    buildStatus: "not_built",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  appendRecord(input.knowledgeBaseId, record);
  return record;
}

export async function deleteKnowledgeRecord(input: {
  knowledgeBaseId: string;
  recordId: string;
}): Promise<{ id: string; knowledgeBaseId: string }> {
  if (!useMock) {
    const { data } = await http.delete<{ id: string; knowledgeBaseId: string }>(
      `/interview-knowledge-bases/${input.knowledgeBaseId}/records/${input.recordId}`,
    );
    return data;
  }

  await wait(260);
  findKnowledgeBase(input.knowledgeBaseId);
  knowledgeBaseStore = knowledgeBaseStore.map((item) =>
    item.id === input.knowledgeBaseId
      ? {
          ...item,
          recordCount: Math.max(item.recordCount - 1, 0),
          records: item.records.filter((record) => record.id !== input.recordId),
        }
      : item,
  );
  return { id: input.recordId, knowledgeBaseId: input.knowledgeBaseId };
}

export async function uploadInterviewAudio(input: CreateAudioRecordInput): Promise<RealInterviewRecord> {
  if (!useMock) {
    const form = new FormData();
    form.append("title", input.title);
    form.append("interviewDate", input.interviewDate);
    if (input.audioFile) {
      form.append("audioFile", input.audioFile);
    }
    if (input.audioUrl) {
      form.append("audioUrl", input.audioUrl);
    }
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
    audioFileName: input.audioFile?.name,
    audioFileSize: input.audioFile?.size,
    audioUrl: input.audioUrl,
    transcript: "录音已上传，等待后端语音转写和知识提取。",
    status: "asr_pending",
    buildStatus: "waiting_asr",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  appendRecord(input.knowledgeBaseId, record);
  return record;
}

export async function transcribeAudioRecord(input: TranscribeAudioRecordInput): Promise<RealInterviewRecord> {
  if (!useMock) {
    const { data } = await http.post<RealInterviewRecord>(
      `/interview-knowledge-bases/${input.knowledgeBaseId}/records/${input.recordId}/transcribe`,
      { audioUrl: input.audioUrl },
    );
    return data;
  }
  await wait(1200);
  const knowledgeBase = findKnowledgeBase(input.knowledgeBaseId);
  const record = knowledgeBase.records.find((item) => item.id === input.recordId);
  if (!record) throw new Error("面试记录不存在");
  return {
    ...record,
    audioUrl: input.audioUrl ?? record.audioUrl,
    transcript: "角色判断：0=面试官；1=候选人\n\n面试官：请介绍一个你最有代表性的项目。\n候选人：我负责了核心模块设计和性能优化。",
    status: "ready",
    buildStatus: "not_built",
    asrProvider: "dashscope",
    asrModel: "fun-asr",
    transcribedAt: new Date().toISOString(),
  };
}

export async function buildKnowledgeRecord(input: BuildKnowledgeRecordInput): Promise<RealInterviewRecord> {
  if (!useMock) {
    const { data } = await http.post<RealInterviewRecord>(
      `/interview-knowledge-bases/${input.knowledgeBaseId}/records/${input.recordId}/build`,
    );
    return data;
  }
  await wait(900);
  const knowledgeBase = findKnowledgeBase(input.knowledgeBaseId);
  const record = knowledgeBase.records.find((item) => item.id === input.recordId);
  if (!record) throw new Error("面试记录不存在");
  return {
    ...record,
    buildStatus: "built",
    chunks: [
      {
        id: "chunk-1",
        title: "模拟构建片段",
        content: record.transcript ?? "这是一条模拟知识片段。",
        keywords: ["模拟面试", "知识库"],
        sourceType: "summary",
      },
    ],
  };
}
