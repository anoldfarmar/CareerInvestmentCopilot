import { http } from "@/services/http";

import { mockInterviewSession, mockProgress } from "./mock";
import type { InterviewMessage, InterviewProgress, InterviewSession, InterviewSetupFormValues } from "./types";

// 面试后端尚未接入，当前继续使用本地 Mock。
const useMock = true;

let sessionStore: InterviewSession = mockInterviewSession;

export async function createInterviewSession(values: InterviewSetupFormValues): Promise<InterviewSession> {
  if (!useMock) {
    const { data } = await http.post<InterviewSession>("/interviews/sessions", values);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  sessionStore = {
    ...mockInterviewSession,
    sessionId: `session_${Date.now()}`,
    type: values.interviewType,
    totalQuestions: values.questionCount,
    knowledgeBaseIds: values.knowledgeBaseIds,
    currentQuestion: 1,
    ended: false,
  };
  return sessionStore;
}

export async function getInterviewSession(sessionId: string): Promise<InterviewSession> {
  if (!useMock) {
    const { data } = await http.get<InterviewSession>(`/interviews/sessions/${sessionId}`);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 260));
  return { ...sessionStore, sessionId };
}

export async function submitInterviewAnswer(params: {
  sessionId: string;
  answer: string;
}): Promise<InterviewSession> {
  if (!useMock) {
    const { data } = await http.post<InterviewSession>(`/interviews/sessions/${params.sessionId}/answer`, {
      answer: params.answer,
    });
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 650));
  const now = new Date().toISOString();
  const userMessage: InterviewMessage = {
    id: `msg_user_${Date.now()}`,
    sessionId: params.sessionId,
    role: "user",
    content: params.answer,
    createdAt: now,
  };
  const nextIndex = Math.min(sessionStore.currentQuestion + 1, sessionStore.totalQuestions);
  const assistantMessage: InterviewMessage = {
    id: `msg_ai_${Date.now()}`,
    sessionId: params.sessionId,
    role: "assistant",
    content:
      nextIndex % 2 === 0
        ? "这个项目里你遇到的最大技术阻塞是什么？你是如何判断优先级并推进解决的？"
        : "如果让你现在重做一次，你会从架构、协作或性能哪个角度改进？",
    createdAt: now,
    questionId: `q_${nextIndex}`,
  };
  sessionStore = {
    ...sessionStore,
    currentQuestion: nextIndex,
    messages: [...sessionStore.messages, userMessage, assistantMessage],
  };
  return sessionStore;
}

export async function endInterviewSession(sessionId: string): Promise<InterviewProgress> {
  if (!useMock) {
    const { data } = await http.post<InterviewProgress>(`/interviews/sessions/${sessionId}/end`);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 400));
  sessionStore = { ...sessionStore, ended: true };
  return { ...mockProgress, sessionId, currentQuestion: sessionStore.currentQuestion };
}

export async function getInterviewProgress(sessionId: string): Promise<InterviewProgress> {
  if (!useMock) {
    const { data } = await http.get<InterviewProgress>(`/interviews/sessions/${sessionId}/progress`);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return { ...mockProgress, sessionId, currentQuestion: sessionStore.currentQuestion };
}
