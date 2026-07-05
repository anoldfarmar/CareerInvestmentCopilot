import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ActivityDay, Todo, Resume, Job, InterviewReport, InterviewSession, InterviewTranscriptItem } from "./types";
import { BackendReport, backendApi, mapBackendJob, mapBackendReport, mapBackendResume } from "./api/backend";
import { clearAuthToken, getAuthToken } from "./api/client";

// Import Custom Subviews
import WorkbenchView from "./components/WorkbenchView";
import JobMatchingView from "./components/JobMatchingView";
import KnowledgeBaseView from "./components/KnowledgeBaseView";
import ProfileView from "./components/ProfileView";
import InterviewSetupView from "./components/InterviewSetupView";
import MockInterviewView from "./components/MockInterviewView";
import FeedbackView from "./components/FeedbackView";
import ReportView from "./components/ReportView";
import LoginView from "./components/LoginView";
import ResumeOptimizeView from "./components/ResumeOptimizeView";
import AudioReviewView from "./components/AudioReviewView";
import DeliveryManagementView from "./components/DeliveryManagementView";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function getPipelineCounts(jobs: Job[]) {
  return {
    applications: jobs.filter((job) => job.status === "applied").length,
    interviews: jobs.filter((job) => job.status === "interviewing").length,
    offers: jobs.filter((job) => job.status === "offer").length,
  };
}

export default function App() {
  // Navigation & Hierarchy State
  const [currentView, setCurrentView] = useState<
    "login" | "workbench" | "matching" | "delivery-management" | "knowledge" | "profile" | "resume-optimize" | "audio-review" | "interview-setup" | "mock-interview" | "feedback" | "report-detail"
  >("login");
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"workbench" | "matching" | "knowledge" | "profile">("workbench");

  const [deliveryCount, setDeliveryCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [todayActivityCount, setTodayActivityCount] = useState(0);
  const [todayActivityLevel, setTodayActivityLevel] = useState(0);
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);

  // Resume select deck and wellness assets
  const [resumes, setResumes] = useState<Resume[]>([]);

  // AI Insights To-dos on Workbench
  const [todos, setTodos] = useState<Todo[]>([]);

  // Recommended Job entries with correct logos linking design elements
  const [jobs, setJobs] = useState<Job[]>([]);

  // Initial Completed report list (Seeded logs) 
  const [reports, setReports] = useState<InterviewReport[]>([]);

  // Interview preparation state
  const [setupCompany, setSetupCompany] = useState("");
  const [setupPosition, setSetupPosition] = useState("");
  const [setupResume, setSetupResume] = useState("");
  const [activeInterviewSession, setActiveInterviewSession] = useState<InterviewSession | null>(null);

  // Target report selected for detail viewing
  const [activeReport, setActiveReport] = useState<InterviewReport | null>(null);

  const hydrateFromBackend = async () => {
    if (!getAuthToken()) return;

    try {
      const [overviewResponse, jobsResponse, resumesResponse, reportsResponse] = await Promise.all([
        backendApi.overview(),
        backendApi.jobs(),
        backendApi.resumes(),
        backendApi.reports(),
      ]);

      const nextJobs = jobsResponse.items.map(mapBackendJob);
      const nextResumes = resumesResponse.items.map(mapBackendResume);
      const nextReports = reportsResponse.items.map(mapBackendReport);

      setJobs(nextJobs);
      setResumes(nextResumes);
      setReports(nextReports);
      setActiveReport(nextReports[0] ?? null);
      syncPipelineFromJobs(nextJobs);
      setTodayActivityCount(overviewResponse.activity?.todayCount ?? 0);
      setTodayActivityLevel(overviewResponse.activity?.level ?? 0);
      setActivityDays(overviewResponse.activity?.calendar ?? []);
      setTodos(
        (overviewResponse.suggestedTodos ?? []).map((todo) => ({
          ...todo,
          isCompleted: false,
        })),
      );
    } catch (error) {
      console.warn("Backend hydration failed, keeping initialized empty state.", error);
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      const token = getAuthToken();

      if (!token) {
        setCurrentView("login");
        setIsAuthReady(true);
        return;
      }

      try {
        await backendApi.me();
        setCurrentView("workbench");
        setActiveTab("workbench");
        await hydrateFromBackend();
      } catch (error) {
        console.warn("Stored session is invalid, returning to login.", error);
        clearAuthToken();
        setCurrentView("login");
      } finally {
        setIsAuthReady(true);
      }
    };

    void verifySession();
  }, []);

  const handleAuthenticated = async () => {
    await hydrateFromBackend();
    setActiveTab("workbench");
    setCurrentView("workbench");
  };

  const handleLogout = () => {
    clearAuthToken();
    setActiveTab("workbench");
    setCurrentView("login");
  };

  const syncPipelineFromJobs = (nextJobs: Job[]) => {
    const pipeline = getPipelineCounts(nextJobs);
    setDeliveryCount(pipeline.applications);
    setInterviewCount(pipeline.interviews);
    setOfferCount(pipeline.offers);
  };

  const handleJobsChanged = (nextJobs: Job[]) => {
    setJobs(nextJobs);
    syncPipelineFromJobs(nextJobs);
  };

  // Handle active to-do checks
  const handleToggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  // Add a newly suggested action plan to todos list
  const handleAddTodo = (newTodo: Todo) => {
    setTodos((prev) => [newTodo, ...prev]);
  };

  const handleUploadResume = async (file: File) => {
    const uploaded = await backendApi.uploadResume(file);
    const nextResume = mapBackendResume(uploaded);
    setResumes((prev) => [nextResume, ...prev]);
    void advanceResumeParsing(uploaded.id, uploaded.parseStatus);
  };

  const advanceResumeParsing = async (resumeId: number, initialParseStatus?: string | null) => {
    try {
      let parseStatus = initialParseStatus;
      let parsedResume = null as Awaited<ReturnType<typeof backendApi.syncResumeParse>> | null;

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (parseStatus === "done") break;
        if (parseStatus === "failed" || parseStatus === "unsupported") return;

        await sleep(attempt === 0 ? 1200 : 3000);
        parsedResume = await backendApi.syncResumeParse(resumeId);
        parseStatus = parsedResume.parseStatus;
        setResumes((prev) =>
          prev.map((resume) =>
            resume.id === String(resumeId) ? mapBackendResume(parsedResume!) : resume,
          ),
        );
      }

      if (parseStatus !== "done") return;

      const structured = await backendApi.structureResume(resumeId);
      setResumes((prev) =>
        prev.map((resume) =>
          resume.id === String(resumeId) ? mapBackendResume(structured) : resume,
        ),
      );
    } catch (error) {
      console.warn("Resume parsing pipeline failed.", error);
    }
  };

  const handleDeleteResume = async (id: string) => {
    await backendApi.deleteResume(id);
    setResumes((prev) => prev.filter((resume) => resume.id !== id));
  };

  const handleRenameResume = async (id: string, title: string) => {
    const updated = await backendApi.updateResume(id, { title });
    const nextResume = mapBackendResume(updated);
    setResumes((prev) =>
      prev.map((resume) => (resume.id === String(updated.id) ? nextResume : resume)),
    );
    return updated;
  };

  const handleOptimizeResume = async (
    id: string,
    input: { jobDescription?: string; additionalInstruction?: string },
  ) => {
    const optimized = await backendApi.optimizeResume(id, input);
    const nextResume = mapBackendResume(optimized);
    setResumes((prev) =>
      prev.map((resume) => (resume.id === String(optimized.id) ? nextResume : resume)),
    );
    return optimized;
  };

  const handleLoadResumeVersions = async (id: string) => {
    return backendApi.resumeVersions(id);
  };

  const handleSaveOptimizedResume = async (id: string, content: unknown) => {
    const saved = await backendApi.saveOptimizedResume(id, content);
    const nextResume = mapBackendResume(saved);
    setResumes((prev) =>
      prev.map((resume) => (resume.id === String(saved.id) ? nextResume : resume)),
    );
    return saved;
  };

  const handleRenameOptimizeHistory = async (
    resumeId: string,
    versionId: number,
    label: string,
  ) => {
    return backendApi.updateResumeVersion(resumeId, versionId, label);
  };

  const handleFinalizeResume = async (id: string, label?: string) => {
    const finalized = await backendApi.finalizeResume(id, label);
    const nextResume = mapBackendResume(finalized);
    setResumes((prev) =>
      prev.map((resume) => (resume.id === String(finalized.id) ? nextResume : resume)),
    );
    return finalized;
  };

  const handleExportResumePdf = async (id: string) => {
    const blob = await backendApi.exportResumePdf(id, "classic");
    if (!blob.size) {
      throw new Error("PDF 文件为空，请稍后重试。");
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `resume-${id}-classic.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const handleRefreshPipeline = async () => {
    await hydrateFromBackend();
  };

  const handleDeleteJob = async (id: string) => {
    await backendApi.deleteJob(id);
    handleJobsChanged(jobs.filter((job) => job.id !== id));
  };

  const handleUpdateJob = async (id: string, input: Partial<Pick<Job, "notes">>) => {
    const updated = await backendApi.updateJob(id, input);
    const nextJob = mapBackendJob(updated);
    handleJobsChanged(jobs.map((job) => (job.id === id ? nextJob : job)));
    return nextJob;
  };

  // Prepare setups parameters
  const handleSelectJobForSetup = (comp: string, pos: string) => {
    setSetupCompany(comp);
    setSetupPosition(pos);
  };

  // Start simulated dialogue session values
  const handleStartInterview = async (setupData: {
    company: string;
    position: string;
    resumeId?: string;
    resumeName: string;
    jobDescription: string;
  }) => {
    const fullJobDescription = [
      setupData.company ? `目标公司：${setupData.company}` : "",
      setupData.position ? `目标岗位：${setupData.position}` : "",
      setupData.jobDescription ? `职位详情：${setupData.jobDescription}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const session = await backendApi.createInterviewSession({
      interviewType: "professional",
      questionCount: 5,
      resumeId: setupData.resumeId,
      jobDescription: fullJobDescription || undefined,
      knowledgeBaseIds: [],
      enableFollowUp: true,
      enableVoiceInput: true,
      language: "zh-CN",
    });

    setSetupCompany(setupData.company);
    setSetupPosition(setupData.position);
    setSetupResume(setupData.resumeName);
    setActiveInterviewSession(session);
    await hydrateFromBackend();
    setCurrentView("mock-interview");
  };

  const handleResumeInterview = (session: InterviewSession) => {
    setActiveInterviewSession(session);
    setSetupCompany((current) => current || "目标公司");
    setSetupPosition((current) => current || "目标岗位");
    setSetupResume((current) => current || "已选简历");
    setCurrentView("mock-interview");
  };

  // Save completed session report
  const handleCompleteInterview = (score: number, transcript: InterviewTranscriptItem[], backendReport?: BackendReport) => {
    const defaultPlans = [
      { id: "act-1", label: "Action 1", text: "根据STAR原则重新拆解核心攻关数据", completed: false },
      { id: "act-2", label: "Action 2", text: "针对薄弱的分布式事务一致性在此发起仿真模拟", completed: false },
    ];

    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, ".");

    const fallbackReport: InterviewReport = {
      id: "rep-" + Date.now(),
      sessionId: activeInterviewSession?.sessionId ?? null,
      generatedBy: "client-local",
      score,
      evaluation: score >= 88 ? "综合表现：优秀" : "综合表现：良好",
      companyName: setupCompany || "字节跳动",
      positionName: setupPosition || "高级产品经理",
      resumeName: setupResume || "产品经理简历.pdf",
      date: todayStr,
      highlights: [
        "结构化思维清晰，采用了STAR法则详细拆解了过往的项目经历。",
        "情绪价值极高，在压力面试环节保持了职业的冷静与礼貌。",
        "对行业痛点的理解深刻，提出了具有建设性的解决方案建议。"
      ],
      suggestions: [
        "在描述技术挑战时，STAR 原则的“结果”部分数据支撑略显不足。",
        "关于离职原因的口吻表述被动，建议结合新职位发展进行积极化包装。"
      ],
      actionPlans: defaultPlans,
      transcripts: transcript,
    };

    const mappedBackendReport = backendReport ? mapBackendReport(backendReport) : null;
    const newReport: InterviewReport = mappedBackendReport
      ? {
          ...mappedBackendReport,
          companyName: setupCompany || "字节跳动",
          positionName: setupPosition || "高级产品经理",
          resumeName: setupResume || "产品经理简历.pdf",
          transcripts: mappedBackendReport.transcripts.length ? mappedBackendReport.transcripts : transcript,
        }
      : fallbackReport;

    setReports((prev) => [
      newReport,
      ...prev.filter((report) =>
        report.id !== newReport.id &&
        (!newReport.sessionId || report.sessionId !== newReport.sessionId),
      ),
    ]);
    setActiveReport(newReport);
  };

  // Handle addition of custom mock sample logs inside Knowledge Base lists
  const handleAddSimulatedLog = () => {
    const randomCompanies = ["美团", "百度", "哔哩哔哩", "微软"];
    const randomPositions = ["高级产品经理", "全栈开发开发组长", "AI 商业分析师", "解决方案顾问"];
    const chosenCompany = randomCompanies[Math.floor(Math.random() * randomCompanies.length)];
    const chosenPos = randomPositions[Math.floor(Math.random() * randomPositions.length)];
    const randomScore = Math.floor(Math.random() * 15) + 80; // 80-95
    
    // ISO date format replacement
    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, ".");

    const sampleReport: InterviewReport = {
      id: "sample-" + Date.now(),
      score: randomScore,
      evaluation: randomScore >= 88 ? "综合表现：优秀" : "综合表现：良好",
      companyName: chosenCompany,
      positionName: chosenPos,
      resumeName: "产品经理简历.pdf",
      date: todayStr,
      highlights: ["专业技能回答逻辑清晰，思路干练。", "抗压沟通指标极具说服力。"],
      suggestions: ["需要更进一步总结高并发秒级缓存系统的核心数据。"],
      actionPlans: [],
      transcripts: []
    };

    setReports((prev) => [sampleReport, ...prev]);
    alert(`🎉 成功同步了一条关于『${chosenCompany} - ${chosenPos}』的录音至知识库中！`);
  };

  // Uniform bottom navigation tab click handles
  const handleTabClick = (tab: "workbench" | "matching" | "knowledge" | "profile") => {
    setActiveTab(tab);
    setCurrentView(tab);
  };

  // Helper render view dispatcher
  const renderCurrentView = () => {
    switch (currentView) {
      case "login":
        return <LoginView onAuthenticated={handleAuthenticated} />;
      case "workbench":
        return (
          <WorkbenchView
            todos={todos}
            onToggleTodo={handleToggleTodo}
            deliveryCount={deliveryCount}
            interviewCount={interviewCount}
            offerCount={offerCount}
            todayActivityCount={todayActivityCount}
            todayActivityLevel={todayActivityLevel}
            activityDays={activityDays}
            onNavigate={(v) => {
              setCurrentView(v);
              if (["workbench", "matching", "knowledge", "profile"].includes(v)) {
                setActiveTab(v as any);
              }
            }}
            onSelectActionJob={handleSelectJobForSetup}
          />
        );
      case "matching":
        return (
          <JobMatchingView
            jobs={jobs}
            onDeleteJob={handleDeleteJob}
            onUpdateJob={handleUpdateJob}
            onJobsChanged={handleJobsChanged}
            onNavigate={(v) => {
              setCurrentView(v);
              if (["workbench", "matching", "knowledge", "profile"].includes(v)) {
                setActiveTab(v as any);
              }
            }}
            onSelectJobForSetup={handleSelectJobForSetup}
          />
        );
      case "delivery-management":
        return (
          <DeliveryManagementView
            jobs={jobs}
            onJobsChanged={handleJobsChanged}
            onSelectJobForSetup={handleSelectJobForSetup}
            onNavigate={(v) => {
              setCurrentView(v);
              if (["workbench", "matching", "knowledge", "profile"].includes(v)) {
                setActiveTab(v as any);
              }
            }}
          />
        );
      case "knowledge":
        return (
          <KnowledgeBaseView
            reports={reports}
            onSelectReport={(rep) => setActiveReport(rep)}
            onNavigate={(v) => {
              setCurrentView(v);
              if (["workbench", "matching", "knowledge", "profile"].includes(v)) {
                setActiveTab(v as any);
              }
            }}
            onAddSimulatedLog={handleAddSimulatedLog}
          />
        );
      case "profile":
        return (
          <ProfileView
            resumes={resumes}
            onUploadResume={handleUploadResume}
            onDeleteResume={handleDeleteResume}
            onRenameResume={handleRenameResume}
            deliveryCount={deliveryCount}
            offerCount={offerCount}
            onLogout={handleLogout}
          />
        );
      case "resume-optimize":
        return (
          <ResumeOptimizeView
            resumes={resumes}
            onUploadResume={handleUploadResume}
            onOptimizeResume={handleOptimizeResume}
            onLoadOptimizeHistory={handleLoadResumeVersions}
            onSaveOptimizeResult={handleSaveOptimizedResume}
            onRenameOptimizeHistory={handleRenameOptimizeHistory}
            onFinalizeResume={handleFinalizeResume}
            onExportResumePdf={handleExportResumePdf}
            onDeleteResume={handleDeleteResume}
            onNavigate={(v) => {
              setCurrentView(v);
              setActiveTab(v);
            }}
          />
        );
      case "audio-review":
        return (
          <AudioReviewView
            resumes={resumes}
            initialCompany={setupCompany}
            initialPosition={setupPosition}
            onReviewComplete={hydrateFromBackend}
            onNavigate={(v) => {
              setCurrentView(v);
              setActiveTab(v);
            }}
          />
        );
      case "interview-setup":
        return (
          <InterviewSetupView
            resumes={resumes}
            initialCompany={setupCompany}
            initialPosition={setupPosition}
            onNavigate={(v) => {
              setCurrentView(v);
              if (["workbench", "matching", "knowledge", "profile"].includes(v)) {
                setActiveTab(v as any);
              }
            }}
            onStartInterview={handleStartInterview}
            onResumeInterview={handleResumeInterview}
          />
        );
      case "mock-interview":
        return (
          <MockInterviewView
            company={setupCompany}
            position={setupPosition}
            resumeName={setupResume}
            session={activeInterviewSession}
            onNavigate={(v) => {
              setCurrentView(v);
              if (["workbench", "matching", "knowledge", "profile"].includes(v)) {
                setActiveTab(v as any);
              }
            }}
            onCompleteInterview={handleCompleteInterview}
          />
        );
      case "feedback":
        return (
          <FeedbackView
            score={activeReport?.score || 85}
            companyName={setupCompany}
            positionName={setupPosition}
            resumeName={setupResume}
            transcripts={activeReport?.transcripts || []}
            onNavigate={(v) => {
              setCurrentView(v);
              if (["workbench", "matching", "knowledge", "profile"].includes(v)) {
                setActiveTab(v as any);
              }
            }}
            onGenerateReport={async (data) => {
              const sessionId = activeReport?.sessionId ?? activeInterviewSession?.sessionId;
              if (sessionId) {
                const backendReport = await backendApi.generateInterviewReport(sessionId);
                const mapped = mapBackendReport(backendReport);
                const refreshed: InterviewReport = {
                  ...mapped,
                  companyName: data.companyName || mapped.companyName,
                  positionName: data.positionName || mapped.positionName,
                  resumeName: data.resumeName || mapped.resumeName,
                  transcripts: mapped.transcripts.length ? mapped.transcripts : data.transcripts,
                };
                setActiveReport(refreshed);
                setReports((prev) => [
                  refreshed,
                  ...prev.filter((report) =>
                    report.id !== refreshed.id &&
                    (!refreshed.sessionId || report.sessionId !== refreshed.sessionId),
                  ),
                ]);
                return;
              }

              if (activeReport) {
                const refreshed = { ...activeReport, score: data.score };
                setActiveReport(refreshed);
                setReports((prev) => prev.map((r) => (r.id === activeReport.id ? refreshed : r)));
              }
            }}
          />
        );
      case "report-detail":
        return (
          <ReportView
            report={activeReport}
            score={activeReport?.score || 88}
            companyName={activeReport?.companyName || "字节跳动"}
            positionName={activeReport?.positionName || "高级产品经理 / Senior PM"}
            resumeName={activeReport?.resumeName || "产品经理简历.pdf"}
            transcripts={activeReport?.transcripts || []}
            onNavigate={(v) => {
              setCurrentView(v);
              if (["workbench", "matching", "knowledge", "profile"].includes(v)) {
                setActiveTab(v as any);
              }
            }}
            onAddTodo={handleAddTodo}
            onIncrementDeliveries={handleRefreshPipeline}
          />
        );
      default:
        return <div className="p-8 text-center text-outline">加载异常...</div>;
    }
  };

  // Determine if we should show the bottom sticky navigation shell. Only show for core 4 Tab views!
  const shouldShowNavbar = ["workbench", "matching", "knowledge", "profile"].includes(currentView);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          </div>
          <p className="font-mono text-[10px] text-outline font-bold uppercase">Checking session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface relative">
      {/* App main canvas views with screen transitions */}
      <div className="pb-safe">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {renderCurrentView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Sticky Navigation Shell */}
      {shouldShowNavbar && (
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 bg-[#F9FAFB]/95 backdrop-blur-md border-t border-border-subtle flex justify-around items-center h-20 pb-safe px-4 shadow-sm max-w-md mx-auto">
          {/* Tab 1: Workbench */}
          <button
            onClick={() => handleTabClick("workbench")}
            className={`flex flex-col items-center justify-center py-1.5 focus:outline-none transition-all duration-200 cursor-pointer ${
              activeTab === "workbench"
                ? "bg-primary-container text-on-primary-container rounded-xl px-4 py-1"
                : "text-on-surface-variant hover:bg-zinc-150 px-4 py-1 rounded-xl"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                activeTab === "workbench" ? "filled-icon" : "light-icon"
              }`}
            >
              dashboard
            </span>
            <span className="font-sans text-[10px] font-bold mt-0.5">工作台</span>
          </button>

          {/* Tab 2: Job Matching */}
          <button
            onClick={() => handleTabClick("matching")}
            className={`flex flex-col items-center justify-center py-1.5 focus:outline-none transition-all duration-200 cursor-pointer ${
              activeTab === "matching"
                ? "bg-primary-container text-on-primary-container rounded-xl px-4 py-1"
                : "text-on-surface-variant hover:bg-zinc-150 px-4 py-1 rounded-xl"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                activeTab === "matching" ? "filled-icon" : "light-icon"
              }`}
            >
              work
            </span>
            <span className="font-sans text-[10px] font-bold mt-0.5">岗位匹配</span>
          </button>

          {/* Tab 3: Knowledge Base */}
          <button
            onClick={() => handleTabClick("knowledge")}
            className={`flex flex-col items-center justify-center py-1.5 focus:outline-none transition-all duration-200 cursor-pointer ${
              activeTab === "knowledge"
                ? "bg-primary-container text-on-primary-container rounded-xl px-4 py-1"
                : "text-on-surface-variant hover:bg-zinc-150 px-4 py-1 rounded-xl"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                activeTab === "knowledge" ? "filled-icon" : "light-icon"
              }`}
            >
              library_books
            </span>
            <span className="font-sans text-[10px] font-bold mt-0.5">知识库</span>
          </button>

          {/* Tab 4: Assets Profile */}
          <button
            onClick={() => handleTabClick("profile")}
            className={`flex flex-col items-center justify-center py-1.5 focus:outline-none transition-all duration-200 cursor-pointer ${
              activeTab === "profile"
                ? "bg-primary-container text-on-primary-container rounded-xl px-4 py-1"
                : "text-on-surface-variant hover:bg-zinc-150 px-4 py-1 rounded-xl"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                activeTab === "profile" ? "filled-icon" : "light-icon"
              }`}
            >
              account_circle
            </span>
            <span className="font-sans text-[10px] font-bold mt-0.5">档案</span>
          </button>
        </nav>
      )}
    </div>
  );
}
