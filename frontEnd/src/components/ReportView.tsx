import React, { useMemo, useState } from "react";
import { backendApi } from "../api/backend";
import { InterviewReport, InterviewTranscriptItem, Todo } from "../types";

interface ReportViewProps {
  report?: InterviewReport | null;
  score: number;
  companyName: string;
  positionName: string;
  resumeName: string;
  transcripts: InterviewTranscriptItem[];
  onNavigate: (viewName: "workbench" | "matching" | "knowledge" | "profile" | "interview-setup" | "mock-interview" | "feedback" | "report-detail") => void;
  onAddTodo: (todo: Todo) => void;
  onIncrementDeliveries: () => void | Promise<void>;
}

export default function ReportView({
  report,
  score,
  companyName,
  positionName,
  resumeName,
  transcripts,
  onNavigate,
  onAddTodo,
  onIncrementDeliveries,
}: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "transcript">("overview");
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});
  const [isSavingInterviewData, setIsSavingInterviewData] = useState(false);
  const [saveInterviewDataMessage, setSaveInterviewDataMessage] = useState("");

  const reportScore = report?.score ?? score;
  const dimensions = report?.dimensions ?? [];
  const questions = report?.questions ?? [];
  const nextActions = report?.nextActions?.length
    ? report.nextActions
    : report?.actionPlans?.map((action) => action.text) ?? [];
  const topDirections = report?.topDirections ?? [];
  const advantageSummary = report?.advantageSummary ?? [];
  const weaknessSummary = report?.weaknessSummary ?? [];
  const steeringReview = report?.interviewerSteeringReview;
  const hasProfessionalEvaluation =
    advantageSummary.length > 0 ||
    weaknessSummary.length > 0 ||
    Boolean(
      steeringReview?.successfulSteering.length ||
      steeringReview?.failedSteering.length ||
      steeringReview?.nextTimeTactics.length,
    );
  const transcriptList = useMemo(
    () => (report?.transcripts?.length ? report.transcripts : transcripts),
    [report?.transcripts, transcripts],
  );

  const highlights = report?.highlights?.length
    ? report.highlights
    : questions.flatMap((question) => question.correctPoints ?? []).slice(0, 3);
  const suggestions = report?.suggestions?.length
    ? report.suggestions
    : questions.flatMap((question) => question.wrongPoints?.length ? question.wrongPoints : question.issues).slice(0, 3);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (reportScore / 100) * circumference;

  const handleAdoptAction = (text: string) => {
    onAddTodo({
      id: "added-todo-" + Date.now(),
      text: `复盘行动：${text} (${report?.companyName || companyName})`,
      icon: "rocket_launch",
      isCompleted: false,
      isHighPriority: true,
    });
    window.alert(`「${text}」已同步到工作台待办。`);
  };

  const handleFinishReportFlow = async () => {
    await onIncrementDeliveries();
    onNavigate("workbench");
  };

  const handleSaveInterviewData = async () => {
    if (isSavingInterviewData) return;
    setIsSavingInterviewData(true);
    setSaveInterviewDataMessage("");
    try {
      const title = `${report?.companyName || companyName} - ${report?.positionName || positionName} 模拟面试`;
      const transcriptText = buildInterviewReviewText({
        report,
        score: reportScore,
        transcripts: transcriptList,
        nextActions,
      });
      await backendApi.saveInterviewReview({
        title,
        interviewDate: new Date().toISOString().slice(0, 10),
        transcript: transcriptText,
      });
      setSaveInterviewDataMessage("面试数据已保存到知识库。");
    } catch (error) {
      setSaveInterviewDataMessage(error instanceof Error ? error.message : "保存面试数据失败，请稍后重试。");
    } finally {
      setIsSavingInterviewData(false);
    }
  };

  return (
    <div id="detailed-report-root" className="bg-background min-h-screen text-on-surface font-sans animate-fade-in-up pb-32">
      <header className="bg-white w-full top-0 sticky z-50 border-b border-border-subtle h-16 flex items-center justify-between px-5 max-w-md mx-auto left-0 right-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("workbench")}
            className="material-symbols-outlined text-primary cursor-pointer hover:bg-zinc-100 p-1 rounded-full flex items-center justify-center"
            aria-label="返回工作台"
          >
            arrow_back
          </button>
          <h1 className="font-sans text-sm font-bold text-primary">复盘报告</h1>
        </div>
        <span className="bg-primary/10 text-primary font-mono text-[9px] px-2 py-1 rounded font-bold">
          {report?.id ? "DB SYNCED" : "LOCAL"}
        </span>
      </header>

      <main className="max-w-md mx-auto min-h-screen space-y-6 pt-5">
        <section className="flex flex-col items-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle className="text-zinc-100" cx="56" cy="56" fill="transparent" r={radius} stroke="currentColor" strokeWidth="7" />
              <circle
                className="text-primary-container"
                cx="56"
                cy="56"
                fill="transparent"
                r={radius}
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                strokeWidth="7.5"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-sans text-3xl font-bold tracking-tight text-primary leading-none">{reportScore}</span>
              <span className="font-mono text-[8px] text-outline font-extrabold uppercase mt-1 tracking-wider">SCORE</span>
            </div>
          </div>
          <div className="px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10">
            <p className="text-primary font-bold text-xs">
              表现评价：{report?.level || (reportScore >= 85 ? "优秀" : reportScore >= 70 ? "良好" : "待提升")}
            </p>
          </div>
        </section>

        <section className="px-5">
          <div className="bg-[#f0faf9] border border-primary-container/20 rounded-xl p-3 flex justify-between items-center text-xs">
            <div className="min-w-0">
              <p className="font-sans font-bold text-on-primary-container truncate">
                {report?.companyName || companyName} · {report?.positionName || positionName}
              </p>
              <p className="font-mono text-[10px] text-outline mt-0.5 truncate">
                配合简历: {report?.resumeName || resumeName}
              </p>
            </div>
            <span className="bg-primary/10 text-primary font-mono text-[9px] px-2 py-0.5 rounded font-bold">ANALYZED</span>
          </div>
        </section>

        <section className="px-5">
          <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-[20px]">summarize</span>
              <h2 className="font-sans text-xs font-bold text-primary">整体总结</h2>
            </div>
            <p className="text-[12px] leading-relaxed text-on-surface-variant">
              {report?.summary || report?.evaluation || "暂无报告总结。"}
            </p>
          </div>
        </section>

        <section className="px-5 grid grid-cols-1 gap-4">
          <InsightCard title="面试亮点" icon="auto_awesome" tone="primary" items={highlights} emptyText="暂无亮点记录" />
          <InsightCard title="改进建议" icon="tips_and_updates" tone="tertiary" items={suggestions} emptyText="暂无改进建议" />
        </section>

        <section>
          <div className="flex border-b border-border-subtle px-5">
            <TabButton label="总览" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
            <TabButton label="逐题诊断" active={activeTab === "questions"} onClick={() => setActiveTab("questions")} />
            <TabButton label="对话原文" active={activeTab === "transcript"} onClick={() => setActiveTab("transcript")} />
          </div>

          <div className="p-5">
            {activeTab === "overview" && (
              <div className="space-y-4 animate-fade-in-up">
                <section className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
                  <p className="font-mono text-[9px] text-primary mb-3 font-bold tracking-widest leading-none">
                    DIMENSION SCORES
                  </p>
                  <div className="space-y-3">
                    {(dimensions.length ? dimensions : [{ label: "综合能力", score: reportScore }]).map((dimension) => (
                      <div key={dimension.label}>
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span>{dimension.label}</span>
                          <span className="text-primary">{dimension.score}</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div className="h-full rounded-full bg-primary-container" style={{ width: `${dimension.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {topDirections.length > 0 && (
                  <section className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-primary text-[18px]">assistant_direction</span>
                      <h3 className="font-sans text-xs font-bold text-on-surface">重点提升方向</h3>
                    </div>
                    <div className="space-y-3">
                      {topDirections.map((direction) => (
                        <div key={direction.title} className="rounded-lg bg-surface-container-low p-3">
                          <p className="text-xs font-extrabold text-on-surface">{direction.title}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">{direction.reason}</p>
                          {direction.actions.length > 0 && (
                            <p className="mt-2 text-[10px] font-mono text-primary">{direction.actions.join(" / ")}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {hasProfessionalEvaluation && (
                  <section className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-primary text-[18px]">fact_check</span>
                      <h3 className="font-sans text-xs font-bold text-on-surface">专业模式最终评估</h3>
                    </div>

                    {advantageSummary.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="font-mono text-[9px] text-primary font-bold tracking-widest">VERIFIED STRENGTHS</p>
                        {advantageSummary.map((item) => (
                          <EvaluationBlock
                            key={item.advantage}
                            title={item.advantage}
                            body={item.evidence.length ? item.evidence.join("；") : item.howToAmplify}
                            footer={item.risk ? `风险：${item.risk}` : item.howToAmplify}
                            tone="primary"
                          />
                        ))}
                      </div>
                    )}

                    {weaknessSummary.length > 0 && (
                      <div className="mt-4 space-y-2.5">
                        <p className="font-mono text-[9px] text-tertiary font-bold tracking-widest">UNVERIFIED / RISKS</p>
                        {weaknessSummary.map((item) => (
                          <EvaluationBlock
                            key={item.weakness}
                            title={item.weakness}
                            body={item.whyItMatters || item.observedIn.join("；")}
                            footer={item.repairPlan.length ? `修复：${item.repairPlan.join(" / ")}` : ""}
                            tone="tertiary"
                          />
                        ))}
                      </div>
                    )}

                    {steeringReview && (
                      <div className="mt-4 rounded-lg bg-surface-container-low p-3">
                        <p className="font-mono text-[9px] text-primary font-bold tracking-widest">FOLLOW-UP CHAIN</p>
                        <CompactList title="有效引导" items={steeringReview.successfulSteering} />
                        <CompactList title="待修正引导" items={steeringReview.failedSteering} />
                        <CompactList title="下次策略" items={steeringReview.nextTimeTactics} />
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}

            {activeTab === "questions" && (
              <div className="space-y-4 animate-fade-in-up">
                {questions.map((question, index) => (
                  <QuestionReviewCard key={question.id} question={question} index={index} />
                ))}
                {questions.length === 0 && (
                  <div className="bg-white border border-border-subtle rounded-xl p-8 text-center text-xs text-outline">
                    暂无逐题诊断
                  </div>
                )}
              </div>
            )}

            {activeTab === "transcript" && (
              <div className="space-y-4 animate-fade-in-up">
                {transcriptList.map((tr) => (
                  <div key={tr.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className="font-mono text-[9px] text-primary font-bold">{tr.time}</span>
                      <div className="w-px h-full bg-border-subtle my-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-mono text-[9px] mb-1 font-bold ${tr.isUser ? "text-primary" : "text-on-surface-variant"}`}>
                        {tr.speaker}
                      </p>
                      <div className={`rounded-xl p-3 text-[11px] leading-relaxed border ${
                        tr.isUser
                          ? "bg-primary-container/10 border-primary-container/20 text-on-surface"
                          : "bg-zinc-50 border-zinc-200 text-on-surface"
                      }`}>
                        {tr.text}
                      </div>
                    </div>
                  </div>
                ))}
                {transcriptList.length === 0 && (
                  <div className="bg-white border border-border-subtle rounded-xl p-8 text-center text-xs text-outline">
                    暂无对话原文
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="px-5 space-y-3">
          <h3 className="font-sans text-xs font-bold text-on-surface">下一步行动</h3>
          <div className="space-y-2.5">
            {(nextActions.length ? nextActions : ["根据逐题诊断重练薄弱问题"]).map((action, index) => {
              const key = `${index}-${action}`;
              const done = completedActions[key] ?? false;
              return (
                <div
                  key={key}
                  onClick={() => setCompletedActions((prev) => ({ ...prev, [key]: !done }))}
                  className={`flex items-start gap-3 bg-white p-3.5 border border-border-subtle rounded-xl relative overflow-hidden transition-all duration-200 cursor-pointer ${
                    done ? "opacity-45" : ""
                  }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-primary focus:ring-primary mt-0.5"
                  />
                  <p className={`flex-1 text-[11px] ${done ? "line-through text-outline" : "text-on-surface"}`}>
                    {action}
                  </p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAdoptAction(action);
                    }}
                    className="text-[10px] font-bold text-primary hover:underline font-mono"
                  >
                    加入待办
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-5">
          <button
            type="button"
            onClick={handleSaveInterviewData}
            disabled={isSavingInterviewData}
            className="w-full h-12 rounded-xl border border-primary/30 bg-white text-primary text-xs font-extrabold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSavingInterviewData ? "animate-spin" : ""}`}>
              {isSavingInterviewData ? "progress_activity" : "save"}
            </span>
            {isSavingInterviewData ? "保存中" : "保存面试数据到知识库"}
          </button>
          {saveInterviewDataMessage && (
            <p className="mt-2 text-center text-[11px] text-on-surface-variant">{saveInterviewDataMessage}</p>
          )}
        </section>
      </main>

      <footer className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-border-subtle z-50 left-0 right-0 max-w-md mx-auto">
        <div className="p-4 flex gap-3">
          <button
            onClick={() => onNavigate("interview-setup")}
            className="flex-1 h-14 border border-primary text-primary font-bold text-xs rounded-xl active:scale-95 transition-transform cursor-pointer"
          >
            再练一次
          </button>
          <button
            onClick={handleFinishReportFlow}
            className="flex-1 h-14 bg-primary text-white font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            回到工作台
          </button>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-center text-xs font-bold transition-all focus:outline-none cursor-pointer ${
        active ? "text-primary border-b-2 border-primary" : "text-on-surface-variant opacity-60"
      }`}
    >
      {label}
    </button>
  );
}

function buildInterviewReviewText({
  report,
  score,
  transcripts,
  nextActions,
}: {
  report?: InterviewReport | null;
  score: number;
  transcripts: InterviewTranscriptItem[];
  nextActions: string[];
}) {
  const lines = [
    `复盘标题：${report?.companyName ?? "目标公司"} - ${report?.positionName ?? "目标岗位"}`,
    `综合评分：${score}`,
    report?.summary ? `整体总结：${report.summary}` : report?.evaluation ? `整体总结：${report.evaluation}` : "",
    report?.highlights?.length ? `面试亮点：${report.highlights.join("；")}` : "",
    report?.suggestions?.length ? `改进建议：${report.suggestions.join("；")}` : "",
    report?.advantageSummary?.length
      ? `已验证亮点：${report.advantageSummary.map((item) => `${item.advantage}（${item.evidence.join("；")}）`).join("；")}`
      : "",
    report?.weaknessSummary?.length
      ? `未验证或风险：${report.weaknessSummary.map((item) => `${item.weakness}：${item.whyItMatters}`).join("；")}`
      : "",
    nextActions.length ? `下一步行动：${nextActions.join("；")}` : "",
    "",
    "逐题诊断：",
    ...(report?.questions ?? []).map((question, index) =>
      `${index + 1}. ${question.question}\n回答：${question.answer || "未记录"}\n诊断：${question.comment || question.advice || "暂无"}`,
    ),
    "",
    "对话原文：",
    ...transcripts.map((item) => `${item.speaker}：${item.text}`),
  ];

  return lines.filter((line) => line.trim().length > 0).join("\n");
}

function InsightCard({
  title,
  icon,
  tone,
  items,
  emptyText,
}: {
  title: string;
  icon: string;
  tone: "primary" | "tertiary";
  items: string[];
  emptyText: string;
}) {
  const colorClass = tone === "primary" ? "text-primary" : "text-tertiary";
  return (
    <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className={`material-symbols-outlined filled-icon text-[20px] ${colorClass}`}>{icon}</span>
        <h3 className={`font-sans text-xs font-bold ${colorClass}`}>{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {(items.length ? items : [emptyText]).map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2.5">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${tone === "primary" ? "bg-primary" : "bg-tertiary"}`} />
            <p className="text-on-surface-variant text-[11px] leading-relaxed">{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvaluationBlock({
  title,
  body,
  footer,
  tone,
}: {
  key?: React.Key;
  title: string;
  body: string;
  footer?: string;
  tone: "primary" | "tertiary";
}) {
  const toneClass = tone === "primary"
    ? "bg-primary-container/10 border-primary-container/20 text-primary"
    : "bg-tertiary-container/15 border-tertiary-container/25 text-tertiary";
  return (
    <article className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs font-extrabold text-on-surface leading-relaxed">{title}</p>
      {body && <p className="mt-1.5 text-[11px] leading-relaxed text-on-surface-variant">{body}</p>}
      {footer && <p className="mt-2 text-[10px] leading-relaxed font-mono text-outline">{footer}</p>}
    </article>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2.5">
      <p className="text-[10px] font-extrabold text-on-surface mb-1">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <p key={`${title}-${index}`} className="text-[11px] leading-relaxed text-on-surface-variant">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function QuestionReviewCard({
  question,
  index,
}: {
  key?: React.Key;
  question: NonNullable<InterviewReport["questions"]>[number];
  index: number;
}) {
  const diagnosisItems = [
    ["内容", question.diagnosis?.content],
    ["逻辑", question.diagnosis?.logic],
    ["表达", question.diagnosis?.expression],
    ["深度", question.diagnosis?.depth],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <article className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center font-mono text-[10px] font-extrabold flex-shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-extrabold text-on-surface leading-relaxed">{question.question}</h3>
          {question.comment && (
            <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">{question.comment}</p>
          )}
        </div>
      </div>

      {question.answer && (
        <div className="mt-3 rounded-lg bg-primary-container/10 border border-primary-container/20 p-3">
          <p className="font-mono text-[9px] text-primary font-bold mb-1">你的回答</p>
          <p className="text-[11px] leading-relaxed text-on-surface-variant whitespace-pre-wrap">{question.answer}</p>
        </div>
      )}

      <PointGroup title="答得好的地方" icon="check_circle" items={question.correctPoints ?? []} tone="primary" />
      <PointGroup title="需要修正" icon="error" items={question.wrongPoints?.length ? question.wrongPoints : question.issues} tone="tertiary" />

      {diagnosisItems.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {diagnosisItems.map(([label, text]) => (
            <div key={label} className="rounded-lg bg-surface-container-low p-3">
              <p className="font-mono text-[9px] text-primary font-bold mb-1">{label}</p>
              <p className="text-[11px] leading-relaxed text-on-surface-variant">{text}</p>
            </div>
          ))}
        </div>
      )}

      {(question.advice || question.improvement?.example || question.referenceAnswer) && (
        <div className="mt-3 rounded-lg border border-border-subtle p-3">
          <p className="font-mono text-[9px] text-primary font-bold mb-1">下次怎么答</p>
          <p className="text-[11px] leading-relaxed text-on-surface-variant">
            {question.advice || question.improvement?.summary}
          </p>
          {(question.improvement?.example || question.referenceAnswer) && (
            <p className="mt-2 text-[11px] leading-relaxed text-on-surface bg-zinc-50 rounded p-2">
              {question.improvement?.example || question.referenceAnswer}
            </p>
          )}
        </div>
      )}

      {question.knowledgeTags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {question.knowledgeTags.map((tag) => (
            <span key={tag} className="px-2 py-1 rounded bg-primary-container/15 text-primary text-[9px] font-mono font-bold">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function PointGroup({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: string;
  items: string[];
  tone: "primary" | "tertiary";
}) {
  if (!items.length) return null;
  const colorClass = tone === "primary" ? "text-primary" : "text-tertiary";
  return (
    <div className="mt-3">
      <div className={`flex items-center gap-1.5 mb-2 ${colorClass}`}>
        <span className="material-symbols-outlined text-[15px]">{icon}</span>
        <p className="text-[10px] font-extrabold">{title}</p>
      </div>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <p key={`${item}-${index}`} className="text-[11px] leading-relaxed text-on-surface-variant pl-5">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
