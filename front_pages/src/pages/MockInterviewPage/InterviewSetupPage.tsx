import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Selector, Switch, TextArea, Toast } from "antd-mobile";
import axios from "axios";
import { Brain, Flame, Languages, MessageCircle, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { InterviewTypeCard } from "@/components/interview/InterviewTypeCard/InterviewTypeCard";
import {
  useAddInterviewQuestion,
  useCreateInterviewSession,
  useSkipInterviewQuestion,
} from "@/features/interview/hooks";
import type { InterviewSession, InterviewSetupFormValues, InterviewType } from "@/features/interview/types";
import { useKnowledgeBases } from "@/features/knowledgeBase/hooks";
import { useResumes } from "@/features/resume/hooks";
import { useInterviewStore } from "@/stores/interviewStore";
import { useResumeStore } from "@/stores/resumeStore";
import { interviewSetupSchema } from "@/utils/validators";

const typeCards = [
  {
    type: "general" as const,
    title: "通用面试",
    description: "自我介绍、经历梳理、求职动机匹配",
    icon: <MessageCircle size={20} />,
  },
  {
    type: "professional" as const,
    title: "岗位专业面试",
    description: "围绕 JD、项目经历和技能栈深挖",
    icon: <Target size={20} />,
  },
  {
    type: "behavioral" as const,
    title: "行为面试",
    description: "用 STAR 结构训练协作、冲突和推动力",
    icon: <Brain size={20} />,
  },
  {
    type: "stress" as const,
    title: "压力面试",
    description: "训练追问、反驳和高压表达",
    icon: <Flame size={20} />,
  },
  {
    type: "english" as const,
    title: "英文面试",
    description: "英文自我介绍和项目表达训练",
    icon: <Languages size={20} />,
  },
];

export function InterviewSetupPage() {
  const navigate = useNavigate();
  const setCurrentSessionId = useInterviewStore((state) => state.setCurrentSessionId);
  const currentResumeId = useResumeStore((state) => state.currentResumeId);
  const createMutation = useCreateInterviewSession();
  const skipMutation = useSkipInterviewQuestion();
  const addQuestionMutation = useAddInterviewQuestion();
  const { data: knowledgeBases, isLoading: isLoadingKnowledgeBases } = useKnowledgeBases();
  const resumesQuery = useResumes();
  const [previewSession, setPreviewSession] = useState<InterviewSession | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const { watch, setValue, handleSubmit } = useForm<InterviewSetupFormValues>({
    resolver: zodResolver(interviewSetupSchema),
    defaultValues: {
      interviewType: "professional",
      resumeId: "",
      jobDescription: "",
      knowledgeBaseIds: [],
      questionCount: 8,
      enableFollowUp: true,
      enableVoiceInput: true,
      language: "zh-CN",
    },
  });
  const values = watch();
  const selectableResumes = useMemo(
    () =>
      resumesQuery.data?.filter((resume) => resume.structuredContent || resume.optimizedContent || resume.finalizedContent) ?? [],
    [resumesQuery.data],
  );
  const selectedResume = selectableResumes.find((resume) => String(resume.id) === values.resumeId);
  const activeQuestions = previewSession?.questionsPreview.filter((question) => !question.skipped) ?? [];

  useEffect(() => {
    if (values.resumeId || !selectableResumes.length) return;

    const recentResume = selectableResumes.find((resume) => String(resume.id) === currentResumeId);
    const bestResume =
      recentResume ??
      selectableResumes.find((resume) => resume.finalizedContent) ??
      selectableResumes.find((resume) => resume.optimizedContent) ??
      selectableResumes[0];

    if (bestResume) {
      setValue("resumeId", String(bestResume.id), { shouldValidate: true });
    }
  }, [currentResumeId, selectableResumes, setValue, values.resumeId]);

  async function onSubmit(data: InterviewSetupFormValues) {
    if (!data.resumeId) {
      Toast.show("请先选择一份已结构化或已优化的简历");
      return;
    }

    const session = await createMutation.mutateAsync(data).catch((error) => {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? (error.code === "ECONNABORTED" ? "生成题目超时，请稍后重试" : error.message)
        : error instanceof Error
          ? error.message
          : "生成题目失败，请稍后重试";
      Toast.show(message);
      throw error;
    });
    setPreviewSession(session);
    Toast.show("题目预览已生成，可以先检查再开始");
  }

  async function handleSkipQuestion(questionId: string) {
    if (!previewSession) return;
    const session = await skipMutation.mutateAsync({ sessionId: previewSession.sessionId, questionId });
    setPreviewSession(session);
  }

  async function handleAddQuestion() {
    if (!previewSession) return;
    const session = await addQuestionMutation.mutateAsync({
      sessionId: previewSession.sessionId,
      content: customQuestion.trim() || undefined,
      dimension: values.interviewType,
    });
    setCustomQuestion("");
    setPreviewSession(session);
  }

  function handleStartInterview() {
    if (!previewSession || activeQuestions.length === 0) {
      Toast.show("至少保留 1 道题才能开始面试");
      return;
    }
    setCurrentSessionId(previewSession.sessionId);
    navigate(routePaths.interviewChat(previewSession.sessionId));
  }

  return (
    <AppShell title="开始模拟面试" showBack>
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
          {resumesQuery.isLoading ? <span className="muted">正在加载可用于面试的简历...</span> : null}
          {selectableResumes.length ? (
            <>
              <Selector
                multiple={false}
                value={values.resumeId ? [values.resumeId] : []}
                options={selectableResumes.map((resume) => ({
                  label: `${resume.title} · #${resume.id}`,
                  value: String(resume.id),
                }))}
                onChange={(value) => setValue("resumeId", value[0] ?? "", { shouldValidate: true })}
              />
              <span className="pill">
                已关联：{selectedResume ? selectedResume.title : "请选择一份简历"}
              </span>
            </>
          ) : (
            <div className="page-stack" style={{ gap: 8 }}>
              <span className="muted">
                还没有可用于面试的结构化简历。请先在“简历”页面完成上传、解析和结构化。
              </span>
              <Button block fill="outline" type="button" onClick={() => navigate(routePaths.resumeOptimize)}>
                去准备简历
              </Button>
            </div>
          )}
          <TextArea
            rows={4}
            placeholder="可粘贴岗位 JD，让题目更贴合目标岗位。"
            onChange={(value) => setValue("jobDescription", value)}
          />
        </section>

        <section className="card page-stack">
          <div>
            <strong>真实面试知识库</strong>
            <p className="muted mt-1">
              可多选。当前会诚实标注题目来源，已选知识库会显示为“基于你的真实面试经验”。
            </p>
          </div>
          {isLoadingKnowledgeBases ? <span className="muted">正在加载知识库...</span> : null}
          {knowledgeBases?.length ? (
            <Selector
              multiple
              value={values.knowledgeBaseIds}
              options={knowledgeBases.map((item) => ({
                label: `${item.name} · ${item.recordCount} 条`,
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

        <Button
          block
          color="primary"
          type="submit"
          loading={createMutation.isPending}
          disabled={!values.resumeId || selectableResumes.length === 0}
        >
          生成题目预览
        </Button>
      </form>

      {previewSession ? (
        <section className="card page-stack interview-preview-panel fade-in">
          <div className="section-title">
            <h2>题目预览</h2>
            <span className="pill">
              {activeQuestions.length}/{previewSession.questionsPreview.length} 道将会提问
            </span>
          </div>
          <p className="text-block">
            这里先展示系统将要问的问题。当前为规则生成，所以来源会诚实标注为基础智能问题、JD 或知识库；后续接入 RAG 后可升级为深度定制问题。
          </p>

          {previewSession.questionsPreview.map((question) => (
            <article className="interview-question-card" key={question.id}>
              <div className="row">
                <strong>{question.dimensionLabel}</strong>
                <span className="pill">{question.difficultyLabel}</span>
              </div>
              <p>{question.content}</p>
              <div className="pill-list">
                <span className="pill">{question.sourceLabel}</span>
                {question.skipped ? <span className="pill interview-pill-muted">已跳过</span> : null}
              </div>
              {!question.skipped ? (
                <Button
                  size="small"
                  fill="outline"
                  loading={skipMutation.isPending}
                  onClick={() => void handleSkipQuestion(question.id)}
                >
                  跳过这题
                </Button>
              ) : null}
            </article>
          ))}

          <section className="interview-add-question">
            <TextArea
              rows={2}
              value={customQuestion}
              placeholder="可选：写下你想追加的问题；留空则按当前面试类型自动加一道。"
              onChange={setCustomQuestion}
            />
            <Button fill="outline" loading={addQuestionMutation.isPending} onClick={() => void handleAddQuestion()}>
              追加一道题
            </Button>
          </section>

          <Button block color="primary" onClick={handleStartInterview}>
            开始正式面试
          </Button>
        </section>
      ) : null}
    </AppShell>
  );
}
