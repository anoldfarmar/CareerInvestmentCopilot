import React, { useEffect, useMemo, useState } from "react";
import { backendApi } from "../api/backend";
import { InterviewSession, Resume } from "../types";

interface InterviewSetupViewProps {
  resumes: Resume[];
  initialCompany: string;
  initialPosition: string;
  onNavigate: (viewName: "workbench" | "matching" | "knowledge" | "profile" | "interview-setup" | "mock-interview") => void;
  onStartInterview: (setupData: {
    company: string;
    position: string;
    resumeId?: string;
    resumeName: string;
    jobDescription: string;
  }) => Promise<void>;
  onResumeInterview: (session: InterviewSession) => void;
}

export default function InterviewSetupView({
  resumes,
  initialCompany,
  initialPosition,
  onNavigate,
  onStartInterview,
  onResumeInterview,
}: InterviewSetupViewProps) {
  const interviewReadyResumes = useMemo(
    () => resumes.filter((resume) => resume.isInterviewReady),
    [resumes],
  );
  const [selectedResumeId, setSelectedResumeId] = useState<string>(interviewReadyResumes[0]?.id || "");
  const [company, setCompany] = useState(initialCompany);
  const [position, setPosition] = useState(initialPosition);
  const [jdText, setJdText] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [isCheckingActive, setIsCheckingActive] = useState(true);

  useEffect(() => {
    if (!selectedResumeId && interviewReadyResumes[0]) {
      setSelectedResumeId(interviewReadyResumes[0].id);
    }
  }, [interviewReadyResumes, selectedResumeId]);

  useEffect(() => {
    const loadActiveSession = async () => {
      setIsCheckingActive(true);
      try {
        const latest = await backendApi.latestActiveInterviewSession();
        setActiveSession(latest);
      } catch {
        setActiveSession(null);
      } finally {
        setIsCheckingActive(false);
      }
    };

    void loadActiveSession();
  }, []);

  const selectedResume = interviewReadyResumes.find((r) => r.id === selectedResumeId);
  const canStart = Boolean(selectedResume) && !isStarting;

  const handleChipClick = (comp: string) => {
    setCompany(comp);
    // Standard matches to reflect actual job profiles
    if (comp === "Google") {
      setPosition("Senior PM (AI Solutions)");
      setJdText("Responsible for AI ecosystem, coordinate engineering define LLM scenarios. Requirements: 5+ years experience.");
    } else if (comp === "Tencent") {
      setPosition("产品专家 - 社交云");
      setJdText("深耕社交分发逻辑，对C端流量增长有独到见解。负责微信生态内新功能孵化。");
    } else if (comp === "ByteDance") {
      setPosition("Lead Product Manager");
      setJdText("Develop monetization strategy, lead core product team. Requirements: English fluency, data engineering.");
    } else {
      setPosition("高级产品经理");
    }
  };

  const handleStart = async () => {
    if (!selectedResume || isStarting) {
      setStartError("请先选择一份已结构化的简历。");
      return;
    }

    setStartError("");
    setIsStarting(true);
    try {
      await onStartInterview({
        company: company || "字节跳动",
        position: position || "产品经理",
        resumeId: selectedResume.id,
        resumeName: selectedResume.name,
        jobDescription: jdText,
      });
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "模拟面试创建失败，请稍后重试。");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div id="interview-prep-root" className="animate-fade-in-up bg-background min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white border-b border-border-subtle h-16 flex justify-between items-center px-4 max-w-md mx-auto left-0 right-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("workbench")}
            className="p-1 hover:bg-zinc-100 transition-colors rounded-full flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="font-sans text-base font-extrabold text-primary tracking-tight">
            面试准备
          </h1>
        </div>
        <div className="flex items-center">
          <span className="font-mono text-[9px] text-on-surface-variant bg-zinc-100 px-2 py-1 rounded font-bold">
            MOCK_v2.4
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="mt-16 flex-grow max-w-md mx-auto px-5 pt-5 pb-32 space-y-6">
        {/* 1. Resume Selection */}
        {activeSession && (
          <section className="rounded-xl border border-primary-container/40 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">history</span>
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-sans text-sm font-extrabold text-on-surface">继续上次模拟面试</h2>
                <p className="mt-1 font-sans text-[11px] leading-relaxed text-on-surface-variant">
                  当前进行到第 {activeSession.currentQuestion} / {activeSession.totalQuestions} 题，已保存对话记录。
                </p>
                <button
                  type="button"
                  onClick={() => onResumeInterview(activeSession)}
                  className="mt-3 w-full h-10 rounded-xl bg-primary text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[17px]">play_arrow</span>
                  继续面试
                </button>
              </div>
            </div>
          </section>
        )}
        {isCheckingActive && (
          <p className="text-center text-[10px] font-mono text-outline">Checking active session...</p>
        )}

        {/* 1. Resume Selection */}
        <section className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="font-sans text-sm font-bold text-on-surface">选择简历</label>
            <span className="font-mono text-[10px] text-primary bg-primary-container/15 px-2 py-0.5 rounded font-bold">
              已同步 {resumes.length} 份
            </span>
          </div>

          <div className="flex overflow-x-auto gap-3 py-1.5 hide-scrollbar -mx-5 px-5">
            {resumes.length === 0 && (
              <div className="w-full border border-dashed border-border-subtle rounded-xl bg-white px-4 py-5 text-center">
                <p className="font-sans text-xs font-bold text-on-surface">还没有可用简历</p>
                <p className="font-sans text-[11px] text-outline mt-1">请先到档案页上传并完成解析。</p>
              </div>
            )}

            {resumes.map((res) => {
              const acts = selectedResumeId === res.id;
              const isReady = Boolean(res.isInterviewReady);
              return (
                <div
                  key={res.id}
                  onClick={() => {
                    if (isReady) {
                      setSelectedResumeId(res.id);
                      setStartError("");
                    }
                  }}
                  className={`flex-shrink-0 w-44 p-4 bg-white rounded-xl border transition-all cursor-pointer ${
                    acts
                      ? "border-primary ring-2 ring-primary/10 shadow-sm"
                      : "border-border-subtle hover:border-zinc-300"
                  } ${isReady ? "" : "opacity-60 cursor-not-allowed"}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`material-symbols-outlined text-lg ${acts ? "text-primary filled-icon" : "text-outline-variant"}`}
                    >
                      description
                    </span>
                    {acts && (
                      <span className="material-symbols-outlined text-primary text-sm filled-icon">
                        check_circle
                      </span>
                    )}
                  </div>
                  <h3 className="font-sans text-xs font-bold text-on-surface truncate leading-tight pr-1">
                    {res.name}
                  </h3>
                  <p className="font-mono text-[9px] text-on-surface-variant font-medium mt-1">
                    更新于 {res.lastUpdated}
                  </p>
                  <span
                    className={`inline-flex mt-2 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                      isReady
                        ? "bg-primary-container/20 text-primary"
                        : "bg-zinc-100 text-outline"
                    }`}
                  >
                    {isReady ? "可用于面试" : res.tag ?? "待结构化"}
                  </span>
                </div>
              );
            })}
          </div>
          {resumes.length > 0 && interviewReadyResumes.length === 0 && (
            <p className="font-sans text-[11px] text-tertiary-container">
              当前简历仍在解析或结构化中，完成后才能作为模拟面试上下文。
            </p>
          )}
        </section>

        {/* 2. Target Company Selection */}
        <section className="space-y-2">
          <label htmlFor="company-name-input" className="font-sans text-sm font-bold text-on-surface block">目标公司</label>
          <div className="relative">
            <input
              id="company-name-input"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full h-12 bg-white border border-border-subtle rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-sans text-sm"
              placeholder="输入公司名称 (如：字节跳动)"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
              <span className="material-symbols-outlined">search</span>
            </div>
          </div>
          {/* Quick chips matching mockups */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["Google", "Tencent", "ByteDance", "Alibaba"].map((comp) => (
              <button
                key={comp}
                onClick={() => handleChipClick(comp)}
                className="px-2.5 py-0.5 bg-zinc-100 rounded-full font-mono text-[10px] font-bold text-on-surface-variant hover:bg-primary-container/20 hover:text-primary transition-colors cursor-pointer"
              >
                {comp}
              </button>
            ))}
          </div>
        </section>

        {/* 3. Position Name */}
        <section className="space-y-2">
          <label htmlFor="position-name-input" className="font-sans text-sm font-bold text-on-surface block">目标岗位名称</label>
          <input
            id="position-name-input"
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full h-12 bg-white border border-border-subtle rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-sans text-sm"
            placeholder="例如：高级产品经理 / Senior PM"
          />
        </section>

        {/* 4. Job Description JD */}
        <section className="space-y-2">
          <div className="flex justify-between items-end">
            <label htmlFor="jd-text-area" className="font-sans text-sm font-bold text-on-surface">职位详情 (JD)</label>
            <button className="flex items-center gap-0.5 text-primary hover:underline text-xs">
              <span className="material-symbols-outlined text-[14px]">cloud_download</span>
              <span className="font-mono text-[10px]">从投递助手导入</span>
            </button>
          </div>
          <div className="relative">
            <textarea
              id="jd-text-area"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="w-full h-32 bg-white border border-border-subtle rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-sans text-xs resize-none"
              placeholder="粘贴职位描述或关键要求..."
            />
            <div className="absolute bottom-3 right-3 flex items-center text-outline/50">
              <span className="font-mono text-[9px] font-semibold">字数建议: 200+</span>
            </div>
          </div>
        </section>

        {/* AI Readiness Context */}
        <div className="p-4 bg-primary-fixed-dim/5 rounded-xl border border-primary-container/20 flex gap-3.5 items-start">
          <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center flex-shrink-0 animate-pulse">
            <span className="material-symbols-outlined text-lg filled-icon">psychology</span>
          </div>
          <div>
            <h4 className="font-sans text-xs font-bold text-primary mb-0.5">Copilot 已就绪</h4>
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
              AI 将基于已选简历与 JD 进行深度匹配，自动提炼考核要点，并加载 5 个高频业务面试问题。
            </p>
          </div>
        </div>
        {startError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-sans text-red-700">
            {startError}
          </div>
        )}
      </main>

      {/* Persistent action triggers */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-subtle p-4 z-50 max-w-md mx-auto">
        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full h-14 font-sans text-base font-extrabold rounded-xl flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-primary/10 transition-all ${
            canStart
              ? "bg-primary text-white hover:scale-[1.01] cursor-pointer"
              : "bg-zinc-200 text-outline cursor-not-allowed"
          }`}
        >
          <span className={`material-symbols-outlined ${isStarting ? "animate-spin" : ""}`}>
            {isStarting ? "progress_activity" : "rocket_launch"}
          </span>
          {isStarting ? "正在创建面试" : "开始模拟面试"}
        </button>
        <p className="text-center mt-1.5 font-mono text-[9px] text-on-surface-variant font-semibold">
          预计时长：15-20 分钟 • AI 实时评分辅导
        </p>
      </footer>
    </div>
  );
}
