import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const demoEmail = 'demo@career-copilot.local';
const demoPassword = 'Demo@123456';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL. Please configure ai-job-backend/.env first.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const structuredResume = {
  basicInfo: {
    name: '潘帅',
    phone: '13800000000',
    email: demoEmail,
  },
  summary:
    '具备前端工程化、NestJS 后端开发和 AI 应用集成经验，能独立完成从需求拆解、接口设计、数据库建模到前端交互落地的完整闭环。',
  skills: ['TypeScript', 'React', 'NestJS', 'Prisma', 'PostgreSQL', '大模型提示词设计', 'ASR/RAG 流程'],
  workExperiences: [
    {
      company: 'AI 求职助手项目',
      position: '全栈开发者',
      startDate: '2026-05',
      endDate: '至今',
      description:
        '负责简历解析、结构化、优化、模拟面试、复盘报告、知识库构建和 PDF 导出等核心模块，打通多条 AI 工作流。',
    },
  ],
  projects: [
    {
      name: 'Career Investment Copilot',
      description:
        '基于 NestJS + Prisma + PostgreSQL + React 构建 AI 求职助手，接入 MinerU、DeepSeek、Vivo ASR，实现简历优化、语音面试和复盘知识库闭环。',
    },
    {
      name: '电赛训练项目',
      description:
        '参与电子设计竞赛训练，负责方案验证和调试记录整理，获得省级三等奖，并沉淀可复用的项目复盘材料。',
    },
  ],
  educations: [
    {
      school: '示例大学',
      major: '电子信息工程',
      degree: '本科',
    },
  ],
};

const optimizedResume = {
  optimizedResume: {
    ...structuredResume,
    summary:
      '全栈型 AI 应用开发者，熟悉 React、NestJS、Prisma 和 PostgreSQL，能够把简历解析、结构化优化、模拟面试、语音转写、复盘报告和知识库检索串成可演示的产品闭环。具备从前端体验到后端架构的端到端交付能力。',
    projects: [
      {
        name: 'Career Investment Copilot',
        description:
          '独立搭建 NestJS + Prisma + PostgreSQL 后端与 React 移动端前端，接入 MinerU 简历解析、DeepSeek 结构化/优化/面试复盘、Vivo 流式 ASR 和 Puppeteer PDF 导出。通过状态持久化和兜底策略，让上传解析、简历优化、模拟面试、复盘报告、知识库构建形成完整闭环。',
      },
      {
        name: '电赛训练项目',
        description:
          '参与电子设计竞赛并获得省级三等奖，负责调试记录、方案验证和阶段复盘，能够把技术实践转化为面试中可复用的 STAR 案例。',
      },
    ],
  },
  optimizationNotes: [
    '把“会做功能”改成“能交付 AI 产品闭环”，强化作品价值。',
    '补充 NestJS、Prisma、PostgreSQL、ASR、RAG、PDF 导出等关键词，提高 JD 匹配度。',
    '将电赛经历改写为 STAR 案例素材，方便模拟面试追问。',
  ],
};

const reportQuestions = [
  {
    id: 'q-1',
    question: '请介绍一下 AI 求职助手这个项目中你最能体现全栈能力的部分。',
    answer:
      '我负责把简历解析、结构化、优化、面试和复盘串成完整链路。后端用 NestJS 拆分模块，用 Prisma 管理 PostgreSQL 数据，前端用 React 做移动端交互。为了演示稳定，我还做了解析状态恢复、AI 失败兜底和 PDF 模板导出。',
    comment: '回答能突出端到端闭环，但还可以补充具体指标，比如接口响应、解析成功率或演示耗时。',
    correctPoints: ['能讲清楚项目边界和个人职责', '体现了前后端联动和 AI 工作流意识'],
    wrongPoints: ['缺少更明确的量化结果'],
    issues: ['缺少量化结果'],
    advice: '下次加入“从上传到导出控制在几分钟内”“支持 5 套模板”等量化表达。',
    referenceAnswer:
      '我主导了从 PDF 上传到结构化、优化、面试、复盘和导出的完整链路，并通过状态持久化、AI 兜底和模板化导出保证演示稳定。',
    diagnosis: {
      content: '内容完整，能覆盖项目主线。',
      logic: '表达顺序清楚。',
      expression: '术语准确，但可更口语化。',
      depth: '技术深度可通过指标和异常处理继续加强。',
    },
    improvement: {
      summary: '补充量化指标和异常处理细节。',
      example: '我把解析、结构化、优化、复盘和 PDF 导出串成闭环，并为每个外部 AI 调用增加状态恢复和本地兜底。',
      nextTry: '下一轮控制在 90 秒内回答，并至少说出 2 个技术取舍。',
    },
    practiceResources: ['准备一版 60 秒项目介绍', '准备一版系统架构图讲解'],
    steeringAdvice: '可以自然引导到“AI 失败兜底”和“演示稳定性”这两个强项。',
    knowledgeTags: ['项目介绍', '全栈闭环', 'AI 工程化'],
    qaTranscript: [
      { role: 'assistant', content: '请介绍一下 AI 求职助手这个项目中你最能体现全栈能力的部分。' },
      {
        role: 'user',
        content:
          '我负责把简历解析、结构化、优化、面试和复盘串成完整链路。后端用 NestJS 拆分模块，用 Prisma 管理 PostgreSQL 数据，前端用 React 做移动端交互。',
      },
    ],
  },
];

async function resetDemoUser() {
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }
}

async function main() {
  await resetDemoUser();

  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      name: '演示账号',
      passwordHash: await hash(demoPassword, 12),
      profile: {
        create: {
          name: '演示账号',
          jobMode: 'junior',
          targetDirection: 'tech',
          targetDirections: ['tech', 'internet'] as unknown as Prisma.InputJsonValue,
          customTargetDirection: 'AI 全栈应用开发',
          language: 'zh-CN',
          questionCount: 5,
          enableVoiceInput: true,
          showStarTips: true,
        },
      },
      jobs: {
        create: {
          title: 'AI 全栈开发工程师',
          company: '示例科技',
          description:
            '岗位要求：熟悉 TypeScript、React、NestJS、PostgreSQL，了解大模型 API、RAG、ASR、PDF 导出，能够独立完成 AI 应用从原型到可演示产品的闭环。',
          status: 'interested',
        },
      },
    },
  });

  const resume = await prisma.resume.create({
    data: {
      title: '演示简历 - AI 全栈开发',
      originalContent:
        '# 潘帅\n\n## 个人总结\n具备前端、后端和 AI 应用集成经验。\n\n## 项目经历\nCareer Investment Copilot：AI 求职助手，包含简历优化、模拟面试和复盘知识库。',
      structuredContent: structuredResume as unknown as Prisma.InputJsonValue,
      optimizedContent: optimizedResume as unknown as Prisma.InputJsonValue,
      finalizedContent: optimizedResume as unknown as Prisma.InputJsonValue,
      finalizedAt: new Date(),
      optimizationVersion: 2,
      parseStatus: 'done',
      structureStatus: 'done',
      optimizeStatus: 'done',
      userId: user.id,
      versions: {
        create: [
          {
            version: 1,
            label: 'AI 优化稿 v1',
            source: 'manual_save',
            content: optimizedResume as unknown as Prisma.InputJsonValue,
            notes: ['首版 AI 优化稿'] as unknown as Prisma.InputJsonValue,
          },
          {
            version: 2,
            label: '最终演示版',
            source: 'finalized',
            content: optimizedResume as unknown as Prisma.InputJsonValue,
            notes: optimizedResume.optimizationNotes as unknown as Prisma.InputJsonValue,
            isFinal: true,
          },
        ],
      },
    },
  });

  const knowledgeBase = await prisma.interviewKnowledgeBase.create({
    data: {
      name: '第一次面试',
      description: '演示用真实面试知识库，已完成转写和结构化构建。',
      focusAreas: ['项目介绍', '全栈能力', 'AI 工程化'] as unknown as Prisma.InputJsonValue,
      userId: user.id,
      records: {
        create: {
          title: 'AI 全栈岗位一面复盘录音',
          sourceType: 'audio',
          interviewDate: new Date('2026-06-13'),
          transcript:
            '面试官：请介绍你的 AI 求职助手项目。候选人：我主要负责 NestJS 后端、Prisma 数据建模、React 前端联调，以及 DeepSeek、MinerU、ASR、PDF 导出的链路整合。面试官：你怎么保证演示稳定？候选人：我做了状态持久化、本地兜底、报告降级标识和种子数据。',
          audioUrl: 'https://example.com/demo-interview.m4a',
          asrProvider: 'seed',
          asrModel: 'demo-transcript',
          speakerTranscript:
            '面试官：请介绍你的 AI 求职助手项目。\n候选人：我主要负责 NestJS 后端、Prisma 数据建模、React 前端联调，以及 DeepSeek、MinerU、ASR、PDF 导出的链路整合。',
          roleTranscript:
            '面试官：请介绍你的 AI 求职助手项目。\n候选人：我主要负责 NestJS 后端、Prisma 数据建模、React 前端联调，以及 DeepSeek、MinerU、ASR、PDF 导出的链路整合。',
          transcribedAt: new Date(),
          status: 'ready',
          buildStatus: 'built',
          structuredContent: {
            summary: '候选人重点展示了 AI 求职助手项目闭环和演示稳定性设计。',
            tags: ['AI 求职助手', 'NestJS', 'Prisma', '演示稳定性'],
            focusAreas: ['项目介绍', '工程化', '兜底策略'],
            weakPoints: ['量化指标不足'],
          } as unknown as Prisma.InputJsonValue,
          chunks: [
            {
              id: 'chunk-1',
              title: '项目闭环介绍',
              content:
                '候选人负责 NestJS 后端、Prisma 数据建模、React 前端联调，以及 DeepSeek、MinerU、ASR、PDF 导出的链路整合。',
              keywords: ['NestJS', 'Prisma', 'React', 'AI 工作流'],
              sourceType: 'answer',
            },
            {
              id: 'chunk-2',
              title: '演示稳定性',
              content: '候选人通过状态持久化、本地兜底、报告降级标识和种子数据保证演示稳定。',
              keywords: ['兜底', '状态恢复', 'seed'],
              sourceType: 'summary',
            },
          ] as unknown as Prisma.InputJsonValue,
        },
      },
    },
  });

  const session = await prisma.interviewSession.create({
    data: {
      type: 'professional',
      totalQuestions: 3,
      currentQuestion: 3,
      ended: true,
      endedAt: new Date(),
      jobDescription:
        'AI 全栈开发工程师，需要 TypeScript、React、NestJS、PostgreSQL、大模型 API、RAG 和 ASR 经验。',
      knowledgeBaseIds: [knowledgeBase.id] as unknown as Prisma.InputJsonValue,
      resumeId: resume.id,
      userId: user.id,
      strategySnapshot: {
        version: 'v1',
        generatedAt: new Date().toISOString(),
        advantageProfile: [
          {
            area: 'AI 产品闭环',
            evidence: ['简历优化', '模拟面试', '复盘报告', '知识库构建'],
            jdRelevance: '高度相关',
            confidence: 0.86,
            interviewerHooks: ['如何保证外部 AI 失败时可用？'],
            candidateSteeringSentences: ['我可以结合这个项目讲一下如何做 AI 失败兜底。'],
          },
        ],
        weaknessProfile: [
          {
            area: '量化表达',
            risk: '项目价值感可能不足',
            triggerQuestions: ['这个功能提升了什么指标？'],
            repairActions: ['补充耗时、成功率、模板数量等指标'],
          },
        ],
        interviewStrategy: {
          mainGoal: '验证候选人的全栈闭环和 AI 工程化能力',
          questionMix: {
            advantageVerification: 40,
            weaknessExposure: 20,
            jdFit: 30,
            pressureTest: 10,
          },
          allowedSteeringRule: '先正面回答，再自然引到项目证据。',
          antiDriftRule: '不能用项目介绍回避问题本身。',
        },
      } as unknown as Prisma.InputJsonValue,
      questions: [
        {
          id: 'q-1',
          order: 1,
          content: '请介绍一下 AI 求职助手这个项目中你最能体现全栈能力的部分。',
          dimension: 'professional',
          dimensionLabel: '技术深挖',
          difficulty: 'medium',
          difficultyLabel: '中等',
          sourceType: 'resume',
          sourceLabel: '基于关联简历',
          skipped: false,
        },
        {
          id: 'q-2',
          order: 2,
          content: '你如何保证 ASR、DeepSeek、MinerU 这些外部服务不稳定时，演示仍然能继续？',
          dimension: 'stress',
          dimensionLabel: '压力测试',
          difficulty: 'hard',
          difficultyLabel: '困难',
          sourceType: 'knowledge_base',
          sourceLabel: '来自真实面试知识库',
          skipped: false,
        },
      ] as unknown as Prisma.InputJsonValue,
      messages: [
        {
          id: 'm-1',
          role: 'assistant',
          questionId: 'q-1',
          messageType: 'question',
          content: '请介绍一下 AI 求职助手这个项目中你最能体现全栈能力的部分。',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'm-2',
          role: 'user',
          questionId: 'q-1',
          content:
            '我负责把简历解析、结构化、优化、面试和复盘串成完整链路。后端用 NestJS 拆分模块，用 Prisma 管理 PostgreSQL 数据，前端用 React 做移动端交互。',
          createdAt: new Date().toISOString(),
        },
      ] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.reviewReport.create({
    data: {
      title: 'AI 全栈岗位模拟面试复盘报告',
      generatedBy: 'ai',
      score: 86,
      level: '良好',
      summary: '候选人能够讲清楚 AI 求职助手的完整闭环，工程化意识较强；下一步需要增强量化指标和异常场景表达。',
      dimensions: [
        { label: '内容完整度', score: 88 },
        { label: '逻辑清晰度', score: 84 },
        { label: '岗位相关性', score: 90 },
        { label: '结果量化', score: 74 },
        { label: '表达流畅度', score: 86 },
      ] as unknown as Prisma.InputJsonValue,
      questions: reportQuestions as unknown as Prisma.InputJsonValue,
      nextActions: ['准备 60 秒项目闭环介绍', '补充 3 个量化指标', '用 STAR 重写电赛经历'] as unknown as Prisma.InputJsonValue,
      topDirections: [
        {
          title: '量化项目价值',
          reason: '当前项目描述很完整，但还缺少让评委快速感知价值的数字。',
          actions: ['补充外部 API 失败兜底次数', '补充 PDF 模板数量', '补充端到端演示耗时'],
        },
      ] as unknown as Prisma.InputJsonValue,
      advantageSummary: [
        {
          advantage: '全栈闭环意识',
          evidence: ['简历优化链路', '模拟面试链路', '知识库链路'],
          howToAmplify: '回答项目题时先给产品闭环，再展开关键技术取舍。',
          steeringExamples: ['我可以从这个项目的端到端链路讲一下我的全栈能力。'],
          risk: '如果只讲功能点，容易显得像拼装 API。',
        },
      ] as unknown as Prisma.InputJsonValue,
      weaknessSummary: [
        {
          weakness: '量化结果不足',
          observedIn: ['项目介绍题'],
          whyItMatters: '没有数字时，评委不容易判断工程难度和成果价值。',
          repairPlan: ['准备 3 个核心指标', '把指标放进简历项目描述', '面试时主动说出前后对比'],
        },
      ] as unknown as Prisma.InputJsonValue,
      interviewerSteeringReview: {
        successfulSteering: ['能把问题自然引导到 AI 产品闭环。'],
        failedSteering: ['量化指标没有主动抛出。'],
        nextTimeTactics: ['先回答问题，再用“我可以结合项目闭环展开”自然引导。'],
      } as unknown as Prisma.InputJsonValue,
      userId: user.id,
      sessionId: session.id,
    },
  });

  console.log(`Seed completed. Demo account: ${demoEmail} / ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
