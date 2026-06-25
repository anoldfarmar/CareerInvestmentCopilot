import React, { useState, useEffect, useRef } from "react";
import { BackendInterviewProgress, BackendReport, backendApi } from "../api/backend";
import { canRecordAudio, startRealtimeTranscription, type RealtimeSpeechEvent, type RealtimeSpeechSession } from "../services/speech";
import { ChatMessage, InterviewSession, InterviewTranscriptItem } from "../types";

type TranscriptSegment = {
  id: number;
  text: string;
  finalized: boolean;
  recognitionRound?: number;
};

interface MockInterviewViewProps {
  company: string;
  position: string;
  resumeName: string;
  session: InterviewSession | null;
  onNavigate: (viewName: "workbench" | "matching" | "knowledge" | "profile" | "interview-setup" | "mock-interview" | "feedback") => void;
  onCompleteInterview: (score: number, transcript: InterviewTranscriptItem[], report?: BackendReport) => void;
}

export default function MockInterviewView({
  company,
  position,
  resumeName,
  session,
  onNavigate,
  onCompleteInterview,
}: MockInterviewViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState(0); 
  const [isTyping, setIsTyping] = useState(false);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(session);
  const [errorMessage, setErrorMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [progress, setProgress] = useState<BackendInterviewProgress | null>(null);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState({
    difficultyRating: 3,
    relevanceRating: 4,
    isRepeated: false,
    comment: "",
  });
  const [customQuestion, setCustomQuestion] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const realtimeSpeechSessionRef = useRef<RealtimeSpeechSession | null>(null);
  const voiceBaseTextRef = useRef("");
  const voiceSegmentsRef = useRef<TranscriptSegment[]>([]);
  const voiceNextSegmentIdRef = useRef(1);

  // Question bank based on company profiles
  const fallbackQuestions = [
    `你好！我是你的 AI 面试官。今天我们将针对你申请 ${company} 的 [${position}] 岗位进行一次模拟面试。我已结合你的《${resumeName}》加载了专属考纲。准备好了吗？`,
    "非常好，那我们正式进入第一关。请简单进行一段1-2分钟的自我介绍，着重突出同你所申请的 `Senior` 角色匹配的业务数据或项目突破点。",
    "在上一份工作经历中，你遇到了什么技术瓶颈或产品业务危机？你是如何利用你的专业技能和关键资源，带领团队突破这个难点的？",
    "如果在项目交付极度紧张的阶段，核心开发人员和产品设计师在业务逻辑排序上产生严重分歧，作为负责人你如何平衡、协调、做出决策？",
    "非常棒！今天的模拟面试问答部分已经全部结束。Copilot 正在实时生成你的专业力表现指数以及全维度复盘报告，请点击右下角结束面试，查看最终报告！"
  ];
  const backendQuestions = session?.questionsPreview?.map((question) => question.content).filter(Boolean) ?? [];
  const questions =
    backendQuestions.length > 0
      ? [
          `你好！我是你的 AI 面试官。今天我们将针对你申请 ${company || "目标公司"} 的 [${position || "目标岗位"}] 岗位进行一次模拟面试。我已结合你的《${resumeName}》和岗位信息生成专属问题。准备好后请直接作答。`,
          ...backendQuestions,
          "本轮题目已经完成。你可以点击“结束面试”进入复盘报告。",
        ]
      : fallbackQuestions;

  // System responses simulator based on what user entered
  const replies = [
    "准备好了，我们开始吧。",
    "我在上一家公司主导了核心高并发系统的架构演进，通过引入新的微服务分流规范，成功把接口 QPS 提升了将近 45%，并且在大型电商大促日实现了历史性的零宕机交付。",
    "当时最困难的是面对不稳定的第三方数据通道。我果断实行了异步补偿削峰机制，并且搭建了主动降级热点缓存，将原本 230ms 的延时拉回了 60ms 内。",
    "我会建立定量的业务价值漏斗，拉齐双方在投入产出比（ROI）和里程碑目标上的共识，迅速排除情绪干扰，进行数据导向的迭代阶段排序。"
  ];

  useEffect(() => {
    setCurrentSession(session);
    if (session?.messages?.length) {
      setMessages(mapSessionMessages(session));
    } else {
      setMessages([
        {
          id: "msg-0",
          sender: "ai",
          text: questions[0],
          timestamp: "00:00",
        },
      ]);
    }
    setStep(0);
  }, [session?.sessionId]);

  useEffect(() => {
    if (!currentSession?.sessionId) return;
    void refreshProgress(currentSession.sessionId);
  }, [currentSession?.sessionId, currentSession?.messages.length, currentSession?.currentQuestion]);

  useEffect(() => {
    return () => {
      realtimeSpeechSessionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    // Scroll block automatically to bottom whenever messages list grows
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const syncSessionToChat = (nextSession: InterviewSession) => {
    setCurrentSession(nextSession);
    setMessages(mapSessionMessages(nextSession));
    setStep(nextSession.currentQuestion);
  };

  const refreshProgress = async (sessionId: string) => {
    try {
      const nextProgress = await backendApi.interviewProgress(sessionId);
      setProgress(nextProgress);
    } catch {
      setProgress(null);
    }
  };

  const currentQuestion = currentSession?.questionsPreview.find(
    (question) => question.order === currentSession.currentQuestion && !question.skipped,
  ) ?? currentSession?.questionsPreview.find((question) => !question.skipped);
  const currentQuestionFeedback =
    currentQuestion && currentSession?.questionFeedback
      ? currentSession.questionFeedback[currentQuestion.id]
      : undefined;
  const answeredCount = currentSession?.messages.filter((message) => message.role === "user").length ?? 0;
  const progressPercent = currentSession
    ? Math.min(100, Math.round((answeredCount / Math.max(currentSession.totalQuestions, 1)) * 100))
    : 0;

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userText = inputValue;
    const times = new Date().toLocaleTimeString("zh-CN", { minute: "2-digit", second: "2-digit" });
    const optimisticMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: times,
    };
    setInputValue("");
    setErrorMessage("");
    setMessages((prev) => [...prev, optimisticMessage]);

    if (!currentSession?.sessionId) {
      return;
    }

    setIsTyping(true);
    try {
      const answered = await backendApi.submitInterviewAnswer(currentSession.sessionId, userText);
      syncSessionToChat(answered);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "\u56de\u7b54\u63d0\u4ea4\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
    } finally {
      setIsTyping(false);
    }
  };
  const handleToggleVoiceInput = async () => {
    if (isTyping) return;

    if (isListening) {
      realtimeSpeechSessionRef.current?.stop();
      realtimeSpeechSessionRef.current = null;
      setIsListening(false);
      return;
    }

    if (!canRecordAudio()) {
      setErrorMessage("\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u5b9e\u65f6\u5f55\u97f3\uff0c\u8bf7\u68c0\u67e5\u6d4f\u89c8\u5668\u9ea6\u514b\u98ce\u6743\u9650\u3002");
      return;
    }

    try {
      setErrorMessage("");
      setIsListening(true);
      voiceBaseTextRef.current = inputValue.trim() ? `${inputValue.trim()} ` : "";
      voiceSegmentsRef.current = [];
      voiceNextSegmentIdRef.current = 1;

      realtimeSpeechSessionRef.current = await startRealtimeTranscription({
        language: "zh-CN",
        onMessage: handleRealtimeSpeechMessage,
        onError: (message) => {
          setErrorMessage(message);
          setIsListening(false);
        },
        onClose: () => {
          realtimeSpeechSessionRef.current = null;
          setIsListening(false);
        },
      });
    } catch {
      realtimeSpeechSessionRef.current = null;
      setIsListening(false);
      setErrorMessage("\u65e0\u6cd5\u6253\u5f00\u9ea6\u514b\u98ce\uff0c\u8bf7\u68c0\u67e5\u6d4f\u89c8\u5668\u6743\u9650\u3002");
    }
  };

  const handleRealtimeSpeechMessage = (event: RealtimeSpeechEvent) => {
    if (event.type === "ready") {
      setErrorMessage("");
      return;
    }

    if (event.type === "error") {
      setErrorMessage(event.message ?? "\u5b9e\u65f6\u8bed\u97f3\u670d\u52a1\u6682\u4e0d\u53ef\u7528\u3002");
      return;
    }

    if (event.type === "partial" || event.type === "final") {
      upsertVoiceSegment(event);
      setInputValue(buildVoiceTranscript());
    }
  };

  const upsertVoiceSegment = (event: RealtimeSpeechEvent) => {
    const text = (event.text ?? "").trim();
    if (!text) return;

    const id = event.resultId ?? voiceNextSegmentIdRef.current;
    const nextSegment: TranscriptSegment = {
      id,
      text,
      finalized: event.type === "final" || event.isLast === true || event.isFinish === true,
      recognitionRound: event.recognitionRound,
    };
    const existingIndex = voiceSegmentsRef.current.findIndex((segment) => segment.id === id);

    if (existingIndex >= 0) {
      voiceSegmentsRef.current[existingIndex] = nextSegment;
      return;
    }

    const lastSegment = voiceSegmentsRef.current[voiceSegmentsRef.current.length - 1];
    const canReformLastSegment =
      event.reformation === 1 &&
      lastSegment &&
      !lastSegment.finalized &&
      (event.recognitionRound === undefined || lastSegment.recognitionRound === event.recognitionRound);

    if (canReformLastSegment) {
      voiceSegmentsRef.current[voiceSegmentsRef.current.length - 1] = nextSegment;
    } else {
      voiceSegmentsRef.current.push(nextSegment);
    }

    voiceNextSegmentIdRef.current = Math.max(voiceNextSegmentIdRef.current, id + 1);
  };

  const buildVoiceTranscript = () => {
    const merged = voiceSegmentsRef.current
      .slice()
      .sort((left, right) => left.id - right.id)
      .map((segment) => segment.text)
      .join("");

    return `${voiceBaseTextRef.current}${merged}`.trimStart();
  };

  const handleInsertPresetReply = () => {
    // Simulate smart autofill on clicking "我应该怎么回答" / presets
    const textToPut = replies[step] || "我的经历充分契合，随时接受深度提问。";
    setInputValue(textToPut);
  };

  const handleNextQuestion = async () => {
    if (!currentSession?.sessionId || isTyping) return;
    setIsTyping(true);
    setErrorMessage("");
    try {
      const nextSession = await backendApi.nextInterviewQuestion(currentSession.sessionId);
      syncSessionToChat(nextSession);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "切换题目失败，请稍后重试。");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSkipCurrentQuestion = async () => {
    if (!currentSession?.sessionId || !currentQuestion || isTyping) return;
    setIsTyping(true);
    setErrorMessage("");
    try {
      const nextSession = await backendApi.skipInterviewQuestion(currentSession.sessionId, currentQuestion.id);
      const movedSession = nextSession.ended ? nextSession : await backendApi.nextInterviewQuestion(nextSession.sessionId);
      syncSessionToChat(movedSession);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "跳过题目失败，请稍后重试。");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!currentSession?.sessionId || !currentQuestion || isTyping) return;
    setIsTyping(true);
    setErrorMessage("");
    try {
      const nextSession = await backendApi.submitQuestionFeedback(
        currentSession.sessionId,
        currentQuestion.id,
        feedbackDraft,
      );
      syncSessionToChat(nextSession);
      setShowFeedbackPanel(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "题目反馈提交失败，请稍后重试。");
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!currentSession?.sessionId || isTyping) return;
    setIsTyping(true);
    setErrorMessage("");
    try {
      const nextSession = await backendApi.addInterviewQuestion(currentSession.sessionId, {
        content: customQuestion.trim() || undefined,
        dimension: "professional",
      });
      syncSessionToChat(nextSession);
      setCustomQuestion("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "追加题目失败，请稍后重试。");
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndInterviewFlow = async () => {
    // Convert current chat room state directly to a logical transcript item
    const transcripts: InterviewTranscriptItem[] = messages.map((m, idx) => ({
      id: m.id,
      time: m.timestamp,
      speaker: m.sender === "ai" ? "INTERVIEWER" : "YOU (MANDARIN)",
      text: m.text,
      isUser: m.sender === "user",
    }));

    // Auto calculate highly responsive scoring based on answer length & user engagement
    let finalScore = 85; 
    const answeredCount = transcripts.filter((t) => t.isUser).length;
    if (answeredCount >= 3) {
      finalScore = 88; // Excellent effort!
    } else if (answeredCount === 0) {
      finalScore = 40; // Empty session
    }

    setIsTyping(true);
    setErrorMessage("");
    try {
      let generatedReport: BackendReport | undefined;
      if (currentSession?.sessionId) {
        await backendApi.endInterviewSession(currentSession.sessionId);
        generatedReport = await backendApi.generateInterviewReport(currentSession.sessionId);
      }
      onCompleteInterview(finalScore, transcripts, generatedReport);
      onNavigate("feedback");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "结束面试或生成报告失败，请稍后重试。");
    } finally {
      setIsTyping(false);
    }
  };


  const mapSessionMessages = (value: InterviewSession): ChatMessage[] =>
    value.messages.map((message) => ({
      id: message.id,
      sender: message.role === "assistant" ? "ai" : "user",
      text: message.content,
      timestamp: new Date(message.createdAt).toLocaleTimeString("zh-CN", {
        minute: "2-digit",
        second: "2-digit",
      }),
    }));

  return (
    <div id="mock-interview-root" className="flex flex-col h-screen max-w-md mx-auto relative bg-background overflow-hidden pb-36">
      {/* TopAppBar */}
      <header className="w-full bg-white border-b border-border-subtle h-16 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("workbench")}
            className="p-1 hover:bg-zinc-100 rounded-full flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <span className="material-symbols-outlined text-primary filled-icon text-xl">analytics</span>
          <h1 className="font-sans text-sm font-extrabold text-primary">模拟面试</h1>
        </div>
        <button
          onClick={() => onNavigate("workbench")}
          className="bg-zinc-100 text-on-surface-variant px-3 py-1 rounded-full font-mono text-[9px] font-bold hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer"
        >
          EXIT
        </button>
      </header>

      {/* Chat Area Scroll block */}
      <main
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar bg-background"
      >
        {/* Status Indicator */}
        <div className="flex justify-center my-1.5">
          <span className="text-[9px] font-mono font-bold text-outline uppercase tracking-widest px-3 py-1 bg-zinc-100/80 rounded-full border border-border-subtle shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
            AI Interviewer Session: {currentSession?.sessionId ? "SYNCED" : "LOCAL"}
          </span>
        </div>

        {currentSession && (
          <section className="rounded-xl border border-border-subtle bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-sans text-xs font-extrabold text-on-surface">
                  第 {currentSession.currentQuestion} / {currentSession.totalQuestions} 题
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-outline">
                  {progress ? `${progress.usedMinutes} min · ${progress.totalWords} words` : "progress syncing"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestionPanel((value) => !value)}
                className="h-8 px-3 rounded-lg bg-primary-container/15 text-primary text-[10px] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">format_list_bulleted</span>
                题目
              </button>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full rounded-full bg-primary-container" style={{ width: `${progressPercent}%` }} />
            </div>
            {currentQuestion && (
              <div className="mt-3 rounded-lg bg-surface-container-low p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-sans text-[11px] font-bold text-primary">
                    当前题 · {currentQuestion.dimensionLabel ?? currentQuestion.dimension ?? "综合"}
                  </p>
                  {currentQuestionFeedback && (
                    <span className="font-mono text-[9px] text-primary bg-white px-2 py-0.5 rounded">
                      已反馈
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant line-clamp-2">
                  {currentQuestion.content}
                </p>
              </div>
            )}
          </section>
        )}

        {showQuestionPanel && currentSession && (
          <section className="rounded-xl border border-border-subtle bg-white p-3 shadow-sm animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-sans text-xs font-extrabold text-on-surface">题目清单</h2>
              <button
                type="button"
                onClick={() => setShowQuestionPanel(false)}
                className="text-outline hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {currentSession.questionsPreview.map((question) => (
                <div
                  key={question.id}
                  className={`rounded-lg border p-3 ${
                    question.skipped
                      ? "border-zinc-200 bg-zinc-50 opacity-60"
                      : question.order === currentSession.currentQuestion
                        ? "border-primary bg-primary-container/10"
                        : "border-border-subtle bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[9px] text-primary font-bold">
                      Q{question.order} · {question.difficultyLabel ?? question.difficulty}
                    </p>
                    {currentSession.questionFeedback?.[question.id] && (
                      <span className="font-mono text-[8px] text-primary">FEEDBACK</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
                    {question.content}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={customQuestion}
                onChange={(event) => setCustomQuestion(event.target.value)}
                className="min-w-0 flex-1 h-10 rounded-lg border border-border-subtle px-3 text-[11px] outline-none focus:border-primary"
                placeholder="追加一道自定义题..."
              />
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={isTyping}
                className="h-10 px-3 rounded-lg bg-primary text-white text-[10px] font-extrabold disabled:opacity-60"
              >
                追加
              </button>
            </div>
          </section>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 w-full animate-fade-in-up ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {/* AI Avatar */}
            {msg.sender === "ai" && (
              <div className="w-8 h-8 rounded-full bg-[#4ECDC4] flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm animate-pulse-border">
                <span className="material-symbols-outlined text-white text-base filled-icon">smart_toy</span>
              </div>
            )}

            {/* Bubble */}
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm transition-all border ${
                msg.sender === "user"
                  ? "bg-primary-container text-on-primary-container font-sans border-primary/10 rounded-br-[3px]"
                  : "bg-white text-on-surface border-border-subtle rounded-bl-[3px]"
              }`}
            >
              <p>{msg.text}</p>
              <div
                className={`text-[8px] font-mono mt-1 text-right leading-none ${
                  msg.sender === "user" ? "text-on-primary-container/60" : "text-outline"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {/* AI Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-3 w-full animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#4ECDC4] flex items-center justify-center flex-shrink-0 border border-primary/20">
              <span className="material-symbols-outlined text-white text-base filled-icon animate-spin">sync</span>
            </div>
            <div className="bg-white text-on-surface border border-border-subtle rounded-2xl rounded-bl-[3px] px-4 py-3 text-xs flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {showFeedbackPanel && currentQuestion && (
          <section className="rounded-xl border border-primary-container/40 bg-white p-4 shadow-sm animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-xs font-extrabold text-on-surface">当前题反馈</h2>
              <button type="button" onClick={() => setShowFeedbackPanel(false)} className="text-outline">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <RatingField
                label="难度"
                value={feedbackDraft.difficultyRating}
                onChange={(value) => setFeedbackDraft((prev) => ({ ...prev, difficultyRating: value }))}
              />
              <RatingField
                label="相关性"
                value={feedbackDraft.relevanceRating}
                onChange={(value) => setFeedbackDraft((prev) => ({ ...prev, relevanceRating: value }))}
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-[11px] font-bold text-on-surface-variant">
              <input
                type="checkbox"
                checked={feedbackDraft.isRepeated}
                onChange={(event) => setFeedbackDraft((prev) => ({ ...prev, isRepeated: event.target.checked }))}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              这题和前面重复
            </label>
            <textarea
              value={feedbackDraft.comment}
              onChange={(event) => setFeedbackDraft((prev) => ({ ...prev, comment: event.target.value }))}
              className="mt-3 w-full h-20 rounded-lg border border-border-subtle px-3 py-2 text-[11px] resize-none outline-none focus:border-primary"
              placeholder="例如：题目贴合 JD，但希望更偏项目深挖..."
            />
            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={isTyping}
              className="mt-3 w-full h-10 rounded-xl bg-primary text-white text-xs font-extrabold disabled:opacity-60"
            >
              提交反馈
            </button>
          </section>
        )}
      </main>

      {/* Persistent Glass-like haptic inputs bar */}
      <footer className="absolute bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-border-subtle px-5 dark:border-zinc-200/50 pt-3 pb-8 z-50">
        <div className="flex items-center gap-2 bg-zinc-50 border border-border-subtle rounded-xl p-1 shadow-inner focus-within:ring-2 focus-within:ring-primary-container/40 transition-all">
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            disabled={isTyping}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer disabled:opacity-50 ${
              isListening ? "bg-primary text-white" : "text-outline hover:text-primary hover:bg-zinc-100"
            }`}
            title={isListening ? "\u505c\u6b62\u8bed\u97f3\u8f93\u5165" : "\u8bed\u97f3\u8f6c\u6587\u5b57"}
          >
            <span className="material-symbols-outlined text-xl">{isListening ? "stop_circle" : "mic"}</span>
          </button>
          <input
            id="chat-user-textbox"
            name="chat-user-textbox"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            className="flex-1 bg-transparent border-none focus:ring-0 text-xs px-1 text-on-surface"
            placeholder="输入你的回答，或使用下方辅导提示..."
          />
          <button
            onClick={handleSend}
            className="bg-primary text-white p-2 text-xs font-bold rounded-lg hover:bg-primary/95 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_upward</span>
          </button>
        </div>

        {/* Suggestion pills matching mockups exactly */}
        <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar select-none py-0.5">
          <button
            onClick={handleInsertPresetReply}
            className="whitespace-nowrap px-3 py-1 rounded-full border border-border-subtle text-[10px] font-sans font-bold text-on-surface-variant hover:bg-zinc-150 transition-colors uppercase active:scale-95 cursor-pointer"
          >
            我需要一点提示 💡
          </button>
          <button
            onClick={handleNextQuestion}
            className="whitespace-nowrap px-3 py-1 rounded-full border border-border-subtle text-[10px] font-sans font-bold text-on-surface-variant hover:bg-zinc-150 transition-colors uppercase active:scale-95 cursor-pointer"
          >
            换个问题 🔄
          </button>
          <button
            onClick={handleSkipCurrentQuestion}
            disabled={!currentQuestion || isTyping}
            className="whitespace-nowrap px-3 py-1 rounded-full border border-border-subtle text-[10px] font-sans font-bold text-on-surface-variant hover:bg-zinc-150 transition-colors uppercase active:scale-95 cursor-pointer disabled:opacity-50"
          >
            跳过当前题 ⏭
          </button>
          <button
            onClick={() => setShowFeedbackPanel((value) => !value)}
            disabled={!currentQuestion}
            className="whitespace-nowrap px-3 py-1 rounded-full border border-primary-container/50 text-[10px] font-sans font-bold text-primary hover:bg-primary-container/10 transition-colors uppercase active:scale-95 cursor-pointer disabled:opacity-50"
          >
            题目反馈 ⭐
          </button>
          <button
            onClick={handleEndInterviewFlow}
            className="whitespace-nowrap px-3 py-1 rounded-full bg-tertiary-container/20 border border-tertiary/20 text-[10px] font-sans font-bold text-on-tertiary-container hover:bg-tertiary-container/30 transition-colors uppercase active:scale-95 cursor-pointer"
          >
            结束面试 🎯
          </button>
        </div>
      </footer>
    </div>
  );
}

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] text-outline font-bold">{label}</span>
        <span className="font-mono text-[9px] text-primary font-bold">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
