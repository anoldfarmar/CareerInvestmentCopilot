import type { InterviewKnowledgeBase } from "./types";

export const mockKnowledgeBases: InterviewKnowledgeBase[] = [
  {
    id: "kb_frontend",
    name: "前端开发",
    description: "沉淀一线互联网公司的前端岗位真实面试问题，关注工程化、性能优化与项目深挖。",
    recordCount: 2,
    focusAreas: ["项目深挖", "性能优化", "工程化"],
    updatedAt: "2026-05-29",
    impactStats: {
      monthlyQuestionCount: 6,
      relatedSessionCount: 2,
      lastUsedAt: "2026-06-12",
      recommendation: "这个知识库已经明显影响出题，建议继续补充高频追问和失败复盘。",
    },
    records: [
      {
        id: "real_interview_001",
        knowledgeBaseId: "kb_frontend",
        title: "星河科技前端一面",
        sourceType: "manual",
        interviewDate: "2026-05-27",
        transcript:
          "面试官：请介绍一次首屏性能优化的实践。\n候选人：我从构建产物、关键资源和缓存策略三个方向推进。\n面试官：如何判断优化动作真正影响了业务指标？",
        status: "ready",
        impactStats: {
          monthlyQuestionCount: 3,
          recommendation: "这条记录所在知识库已被用于出题，建议继续补充面试官追问和你的真实回答。",
        },
        createdAt: "2026-05-27",
      },
      {
        id: "real_interview_002",
        knowledgeBaseId: "kb_frontend",
        title: "云栖智能 React 岗技术面",
        sourceType: "audio",
        interviewDate: "2026-05-29",
        audioFileName: "react-interview.m4a",
        audioFileSize: 4521984,
        transcript: "录音转写完成：重点追问了复杂表单状态管理、组件复用和异常监控。",
        status: "ready",
        impactStats: {
          monthlyQuestionCount: 3,
          recommendation: "这条记录所在知识库已被用于出题，建议继续补充面试官追问和你的真实回答。",
        },
        createdAt: "2026-05-29",
      },
    ],
  },
  {
    id: "kb_llm",
    name: "大模型开发",
    description: "整理 RAG、Agent、评测和模型应用工程相关真实面试内容。",
    recordCount: 1,
    focusAreas: ["RAG", "Agent", "模型评测"],
    updatedAt: "2026-05-26",
    impactStats: {
      monthlyQuestionCount: 0,
      relatedSessionCount: 0,
      recommendation: "建议在下次模拟面试中勾选这个知识库，验证它对出题是否有帮助。",
    },
    records: [
      {
        id: "real_interview_003",
        knowledgeBaseId: "kb_llm",
        title: "AI 应用工程师面试记录",
        sourceType: "manual",
        interviewDate: "2026-05-26",
        transcript: "面试官：RAG 召回质量不稳定时，你会如何定位问题？",
        status: "ready",
        impactStats: {
          monthlyQuestionCount: 0,
          recommendation: "这条记录还没有明显影响出题，建议下次模拟面试勾选该知识库。",
        },
        createdAt: "2026-05-26",
      },
    ],
  },
];
