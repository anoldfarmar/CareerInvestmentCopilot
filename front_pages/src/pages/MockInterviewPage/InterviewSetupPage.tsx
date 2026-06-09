import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Selector, Switch, TextArea } from "antd-mobile";
import { Brain, Flame, Languages, MessageCircle, Target } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { InterviewTypeCard } from "@/components/interview/InterviewTypeCard/InterviewTypeCard";
import type { InterviewSetupFormValues, InterviewType } from "@/features/interview/types";
import { useCreateInterviewSession } from "@/features/interview/hooks";
import { useKnowledgeBases } from "@/features/knowledgeBase/hooks";
import { useInterviewStore } from "@/stores/interviewStore";
import { interviewSetupSchema } from "@/utils/validators";

const typeCards = [
  { type: "general" as const, title: "通用面试", description: "自我介绍、经历梳理、动机匹配", icon: <MessageCircle size={20} /> },
  { type: "professional" as const, title: "岗位专业面试", description: "围绕 JD 进行专业追问", icon: <Target size={20} /> },
  { type: "behavioral" as const, title: "行为面试", description: "用 STAR 结构训练案例表达", icon: <Brain size={20} /> },
  { type: "stress" as const, title: "压力面试", description: "训练追问与反驳场景", icon: <Flame size={20} /> },
  { type: "english" as const, title: "英文面试", description: "英文问答表达训练", icon: <Languages size={20} /> },
];

export function InterviewSetupPage() {
  const navigate = useNavigate();
  const setCurrentSessionId = useInterviewStore((state) => state.setCurrentSessionId);
  const createMutation = useCreateInterviewSession();
  const { data: knowledgeBases, isLoading: isLoadingKnowledgeBases } = useKnowledgeBases();
  const { watch, setValue, handleSubmit } = useForm<InterviewSetupFormValues>({
    resolver: zodResolver(interviewSetupSchema),
    defaultValues: {
      interviewType: "professional",
      resumeId: "resume_001",
      jobDescription: "",
      knowledgeBaseIds: [],
      questionCount: 8,
      enableFollowUp: true,
      enableVoiceInput: true,
      language: "zh-CN",
    },
  });
  const values = watch();

  async function onSubmit(data: InterviewSetupFormValues) {
    const session = await createMutation.mutateAsync(data);
    setCurrentSessionId(session.sessionId);
    navigate(routePaths.interviewChat(session.sessionId));
  }

  return (
    <AppShell title="开始模拟面试" showBack showTabBar={false}>
      <form className="page-stack" onSubmit={handleSubmit(onSubmit)}>
        <section className="page-stack">
          {typeCards.map((item) => (
            <InterviewTypeCard
              key={item.type}
              icon={item.icon}
              type={item.type}
              title={item.title}
              description={item.description}
              selected={values.interviewType === item.type}
              onSelect={(type: InterviewType) => setValue("interviewType", type)}
            />
          ))}
        </section>

        <section className="card page-stack">
          <strong>使用资料</strong>
          <span className="pill">已关联最近优化简历 resume_001</span>
          <TextArea
            rows={4}
            placeholder="可粘贴岗位 JD，让 AI 更贴合目标岗位提问"
            onChange={(value) => setValue("jobDescription", value)}
          />
        </section>

        <section className="card page-stack">
          <div>
            <strong>真实面试知识库</strong>
            <p className="muted" style={{ margin: "5px 0 0", lineHeight: 1.5 }}>
              可多选。AI 会结合真实面试问题发散，并侧重训练薄弱环节。
            </p>
          </div>
          {isLoadingKnowledgeBases ? <span className="muted">正在加载知识库...</span> : null}
          {knowledgeBases?.length ? (
            <Selector
              multiple
              value={values.knowledgeBaseIds}
              options={knowledgeBases.map((item) => ({
                label: `${item.name} · ${item.recordCount} 场`,
                value: item.id,
              }))}
              onChange={(value) => setValue("knowledgeBaseIds", value)}
            />
          ) : (
            <span className="muted">暂无知识库，可在“复盘 → 真实面试复盘”中创建。</span>
          )}
        </section>

        <section className="card page-stack">
          <strong>面试配置</strong>
          <Selector
            multiple={false}
            value={[String(values.questionCount)]}
            options={[
              { label: "5 题", value: "5" },
              { label: "8 题", value: "8" },
              { label: "10 题", value: "10" },
            ]}
            onChange={(value) => setValue("questionCount", Number(value[0]) as 5 | 8 | 10)}
          />
          <div className="row">
            <span>允许追问</span>
            <Switch checked={values.enableFollowUp} onChange={(checked) => setValue("enableFollowUp", checked)} />
          </div>
          <div className="row">
            <span>语音输入</span>
            <Switch checked={values.enableVoiceInput} onChange={(checked) => setValue("enableVoiceInput", checked)} />
          </div>
          <Selector
            multiple={false}
            value={[values.language]}
            options={[
              { label: "中文", value: "zh-CN" },
              { label: "英文", value: "en-US" },
            ]}
            onChange={(value) => setValue("language", (value[0] as "zh-CN" | "en-US") ?? "zh-CN")}
          />
        </section>

        <Button block color="primary" type="submit" loading={createMutation.isPending}>
          开始面试
        </Button>
      </form>
    </AppShell>
  );
}
