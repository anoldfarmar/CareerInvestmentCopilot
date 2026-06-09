import type { InterviewProgress, InterviewSession } from "./types";

export const mockInterviewSession: InterviewSession = {
  sessionId: "session_001",
  type: "professional",
  totalQuestions: 8,
  currentQuestion: 1,
  startedAt: new Date().toISOString(),
  ended: false,
  knowledgeBaseIds: [],
  messages: [
    {
      id: "msg_001",
      sessionId: "session_001",
      role: "system",
      content: "本轮将围绕前端开发岗位展开，建议用 STAR 结构回答。",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg_002",
      sessionId: "session_001",
      role: "assistant",
      content: "请先用 2 分钟介绍一个你最能体现前端工程能力的项目。",
      createdAt: new Date().toISOString(),
      questionId: "q_001",
    },
  ],
};

export const mockProgress: InterviewProgress = {
  sessionId: "session_001",
  stage: "岗位专业面试阶段",
  currentQuestion: 3,
  totalQuestions: 8,
  usedMinutes: 12,
  averageAnswerSeconds: 86,
  totalWords: 760,
  distribution: [
    { label: "自我介绍", done: 1, total: 1 },
    { label: "项目经历", done: 1, total: 3 },
    { label: "行为面试", done: 1, total: 3 },
    { label: "职业规划", done: 0, total: 1 },
  ],
};
