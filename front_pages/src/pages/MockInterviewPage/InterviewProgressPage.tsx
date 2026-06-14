import { Button, Selector, Switch, TextArea, Toast } from "antd-mobile";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import {
  useInterviewProgress,
  useInterviewSession,
  useSubmitQuestionFeedback,
} from "@/features/interview/hooks";
import { useGenerateReport } from "@/features/report/hooks";
import { formatPercent } from "@/utils/format";

export function InterviewProgressPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useInterviewProgress(sessionId);
  const sessionQuery = useInterviewSession(sessionId);
  const generateMutation = useGenerateReport();
  const feedbackMutation = useSubmitQuestionFeedback();
  const isEnded = data?.stage === "ended";
  const questions = sessionQuery.data?.questionsPreview.filter((question) => !question.skipped) ?? [];
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [difficultyRating, setDifficultyRating] = useState("3");
  const [relevanceRating, setRelevanceRating] = useState("4");
  const [isRepeated, setIsRepeated] = useState(false);
  const [comment, setComment] = useState("");
  const activeQuestionId = selectedQuestionId || questions[0]?.id || "";

  async function handleGenerateReport() {
    const report = await generateMutation.mutateAsync(sessionId);
    navigate(routePaths.reportDetail(report.reportId));
  }

  async function handleSubmitFeedback() {
    if (!activeQuestionId) {
      Toast.show("暂无可反馈的题目");
      return;
    }
    await feedbackMutation.mutateAsync({
      sessionId,
      questionId: activeQuestionId,
      feedback: {
        difficultyRating: Number(difficultyRating),
        relevanceRating: Number(relevanceRating),
        isRepeated,
        comment: comment.trim() || undefined,
      },
    });
    setComment("");
    Toast.show("反馈已保存，会用于后续优化出题质量");
  }

  return (
    <AppShell title="面试进度" showBack showTabBar={false}>
      {isLoading ? <LoadingState text="正在同步面试进度" /> : null}
      {isError ? <ErrorState title="面试进度加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <section className="card page-stack">
            <div className="row">
              <strong>{data.stage === "ended" ? "已结束" : "进行中"}</strong>
              <span className="pill">
                {data.currentQuestion}/{data.totalQuestions}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--color-border)" }}>
              <div
                style={{
                  width: formatPercent((data.currentQuestion / data.totalQuestions) * 100),
                  height: 8,
                  borderRadius: 999,
                  background: "var(--color-primary)",
                }}
              />
            </div>
          </section>
          <section className="card page-stack">
            <strong>面试信息</strong>
            <div className="row">
              <span>已用时长</span>
              <span>{data.usedMinutes} 分钟</span>
            </div>
            <div className="row">
              <span>平均回答</span>
              <span>{data.averageAnswerSeconds} 秒</span>
            </div>
            <div className="row">
              <span>回答字数</span>
              <span>{data.totalWords} 字</span>
            </div>
          </section>
          <section className="card page-stack">
            <strong>题型分布</strong>
            {data.distribution.map((item) => (
              <div className="row" key={item.label}>
                <span>{item.label}</span>
                <span className="pill">
                  {item.done}/{item.total}
                </span>
              </div>
            ))}
          </section>

          {isEnded ? (
            <section className="card page-stack">
              <div>
                <strong>题目反馈</strong>
                <p className="muted mt-1">评价题目难度、相关性和重复度，后续会用于优化出题策略。</p>
              </div>
              {questions.length ? (
                <>
                  <Selector
                    multiple={false}
                    value={[activeQuestionId]}
                    options={questions.map((question) => ({
                      label: `${question.order}. ${question.dimensionLabel}`,
                      value: question.id,
                    }))}
                    onChange={(value) => setSelectedQuestionId(value[0] ?? "")}
                  />
                  <div className="interview-feedback-grid">
                    <div className="page-stack">
                      <span className="muted">难度</span>
                      <Selector
                        multiple={false}
                        value={[difficultyRating]}
                        options={[
                          { label: "1", value: "1" },
                          { label: "2", value: "2" },
                          { label: "3", value: "3" },
                          { label: "4", value: "4" },
                          { label: "5", value: "5" },
                        ]}
                        onChange={(value) => setDifficultyRating(value[0] ?? "3")}
                      />
                    </div>
                    <div className="page-stack">
                      <span className="muted">相关性</span>
                      <Selector
                        multiple={false}
                        value={[relevanceRating]}
                        options={[
                          { label: "1", value: "1" },
                          { label: "2", value: "2" },
                          { label: "3", value: "3" },
                          { label: "4", value: "4" },
                          { label: "5", value: "5" },
                        ]}
                        onChange={(value) => setRelevanceRating(value[0] ?? "4")}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <span>这道题是否重复？</span>
                    <Switch checked={isRepeated} onChange={setIsRepeated} />
                  </div>
                  <TextArea
                    rows={3}
                    value={comment}
                    placeholder="可选：比如题目是否贴合岗位、是否太泛、是否希望更偏技术深挖。"
                    onChange={setComment}
                  />
                  <Button
                    block
                    fill="outline"
                    loading={feedbackMutation.isPending}
                    onClick={() => void handleSubmitFeedback()}
                  >
                    保存题目反馈
                  </Button>
                </>
              ) : (
                <span className="muted">暂无题目可反馈。</span>
              )}
            </section>
          ) : null}

          <div className="fixed-actions">
            {!isEnded ? (
              <Button block fill="outline" onClick={() => navigate(routePaths.interviewChat(sessionId))}>
                继续面试
              </Button>
            ) : (
              <Button block fill="outline" onClick={() => navigate(routePaths.interviewSetup)}>
                再练一轮
              </Button>
            )}
            <Button block color="primary" loading={generateMutation.isPending} onClick={() => void handleGenerateReport()}>
              生成复盘报告
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
