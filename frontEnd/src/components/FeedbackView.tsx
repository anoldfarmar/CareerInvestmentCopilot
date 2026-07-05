import React, { useState } from "react";
import { InterviewTranscriptItem } from "../types";

interface FeedbackViewProps {
  score: number;
  companyName: string;
  positionName: string;
  resumeName: string;
  transcripts: InterviewTranscriptItem[];
  onNavigate: (viewName: "workbench" | "matching" | "knowledge" | "profile" | "interview-setup" | "mock-interview" | "feedback" | "report-detail") => void;
  onGenerateReport: (reportData: {
    score: number;
    companyName: string;
    positionName: string;
    resumeName: string;
    transcripts: InterviewTranscriptItem[];
  }) => void | Promise<void>;
}

export default function FeedbackView({
  score,
  companyName,
  positionName,
  resumeName,
  transcripts,
  onNavigate,
  onGenerateReport,
}: FeedbackViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");

  const handleGenerateDetailedReport = () => {
    setIsGenerating(true);
    setGenStatus("评估指标拟合中...");

    setTimeout(() => {
      setGenStatus("AI STAR话术优选整合中...");
      setTimeout(() => {
        setGenStatus("全维评估报告已就绪！");
        setTimeout(async () => {
          try {
            await onGenerateReport({
              score,
              companyName,
              positionName,
              resumeName,
              transcripts,
            });
            onNavigate("report-detail");
          } catch (error) {
            setGenStatus(error instanceof Error ? error.message : "复盘报告加载失败，请稍后重试。");
          } finally {
            setIsGenerating(false);
          }
        }, 800);
      }, 900);
    }, 900);
  };

  // Circular calculations
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div id="result-feedback-view" className="bg-background min-h-screen pb-24 animate-fade-in-up">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-50 bg-white border-b border-border-subtle h-16 flex items-center justify-between px-5 max-w-md mx-auto left-0 right-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("workbench")}
            className="active:opacity-85 transition-opacity cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-zinc-100"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-sans text-sm font-bold text-on-surface">面试结果反馈</h1>
        </div>
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="material-symbols-outlined hover:bg-zinc-100 p-2 rounded-full cursor-pointer text-base">share</span>
          <span className="material-symbols-outlined hover:bg-zinc-100 p-2 rounded-full cursor-pointer text-base">more_vert</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow px-5 py-5 max-w-md mx-auto w-full space-y-5">
        {/* Progress Circular Widget */}
        <section className="bg-white border border-border-subtle rounded-xl p-5 text-center shadow-sm">
          <div className="flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  className="text-zinc-100"
                  cx="56"
                  cy="56"
                  fill="transparent"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                ></circle>
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
                  strokeWidth="6.5"
                ></circle>
              </svg>
              <span className="absolute font-sans font-bold text-primary text-3xl leading-none">
                {score}
              </span>
            </div>
            <div className="mt-3">
              <span className="font-sans text-sm font-bold text-on-surface">
                综合表现：{score >= 85 ? "良好" : "合格"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[9px] text-outline font-extrabold uppercase tracking-widest leading-none">
              Performance Index
            </p>
          </div>
        </section>

        {/* Insight blocks */}
        <div className="space-y-4">
          {/* Highlights */}
          <section className="bg-green-50/70 border border-primary-container/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary filled-icon text-[20px]">stars</span>
              <h2 className="font-sans text-xs font-bold text-on-primary-container">表现亮点</h2>
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-base select-none mt-0.5">check_circle</span>
                <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
                  专业技能回答逻辑清晰，能够结合实际案例进行深度拆解。
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-base select-none mt-0.5">check_circle</span>
                <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
                  语速平稳，展现了极强的职业素养与抗压沟通能力。
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-base select-none mt-0.5">check_circle</span>
                <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
                  对面试岗位的 JD 理解透彻，自我匹配度论述非常充分。
                </p>
              </li>
            </ul>
          </section>

          {/* Suggestions */}
          <section className="bg-amber-50/40 border border-tertiary-container/25 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-tertiary filled-icon text-[20px]">error_outline</span>
              <h2 className="font-sans text-xs font-bold text-on-tertiary-container">改进建议</h2>
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-tertiary text-base select-none mt-0.5">remove_circle</span>
                <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
                  在描述技术挑战时，STAR 原则的“结果”部分数据支撑略显不足。
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-tertiary text-base select-none mt-0.5">remove_circle</span>
                <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
                  眼神交流（在摄像头视线方面）略显分散，建议保持更专注的注视。
                </p>
              </li>
            </ul>
          </section>

          {/* Action Plans plans */}
          <section className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-secondary filled-icon text-[20px]">rocket_launch</span>
              <h2 className="font-sans text-xs font-bold text-on-secondary-container">后续行动</h2>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-border-subtle">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] font-bold bg-secondary-container/20 text-secondary px-1.5 py-0.5 rounded leading-none">
                    Action 1
                  </span>
                  <span className="font-sans text-xs font-medium text-on-surface">强化核心数据记忆</span>
                </div>
                <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-border-subtle">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] font-bold bg-secondary-container/20 text-secondary px-1.5 py-0.5 rounded leading-none">
                    Action 2
                  </span>
                  <span className="font-sans text-xs font-medium text-on-surface">针对薄弱点再次模拟</span>
                </div>
                <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
              </div>
            </div>
          </section>
        </div>

        {/* Buttons bottom triggers */}
        <section className="space-y-3 pt-2">
          {isGenerating ? (
            <div className="w-full h-16 bg-primary text-white font-sans text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 shadow">
              <span className="material-symbols-outlined text-lg animate-spin">sync</span>
              <p className="animate-pulse">{genStatus}</p>
            </div>
          ) : (
            <button
              onClick={handleGenerateDetailedReport}
              className="w-full h-16 bg-primary text-white font-sans text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform duration-150 shadow-md shadow-primary/10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">analytics</span>
              查看详细复盘报告
            </button>
          )}

          <button
            onClick={() => onNavigate("workbench")}
            className="w-full h-12 border border-primary text-primary font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-1 active:bg-zinc-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            返回工作台 (再试一次)
          </button>
        </section>
      </main>
    </div>
  );
}
