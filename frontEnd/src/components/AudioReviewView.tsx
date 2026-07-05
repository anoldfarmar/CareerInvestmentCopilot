import React, { useEffect, useRef, useState } from "react";
import { BackendKnowledgeRecord, backendApi } from "../api/backend";
import { Resume } from "../types";

interface AudioReviewViewProps {
  resumes: Resume[];
  initialCompany: string;
  initialPosition: string;
  onNavigate: (viewName: "workbench") => void;
  onReviewComplete?: () => void | Promise<void>;
}

export default function AudioReviewView({
  resumes,
  initialCompany,
  initialPosition,
  onNavigate,
  onReviewComplete,
}: AudioReviewViewProps) {
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [company, setCompany] = useState(initialCompany);
  const [position, setPosition] = useState(initialPosition);
  const [jobDescription, setJobDescription] = useState("");
  const [selectedAudioName, setSelectedAudioName] = useState("");
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processMessage, setProcessMessage] = useState("");
  const [processError, setProcessError] = useState("");
  const [reviewRecord, setReviewRecord] = useState<BackendKnowledgeRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const isReviewStored = reviewRecord?.buildStatus === "built";

  useEffect(() => {
    if (!selectedResumeId && resumes[0]) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      setSelectedAudioName(file.name);
      setSelectedAudioFile(file);
      setProcessMessage("");
      setProcessError("");
      setReviewRecord(null);
      await uploadAndProcessAudio(file);
    }
  };

  const uploadAndProcessAudio = async (file: File) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setUploadProgress(0);
    setProcessError("");
    setProcessMessage("正在上传录音到服务器...");

    try {
      const title = [company, position, file.name]
        .filter(Boolean)
        .join(" - ")
        .slice(0, 120);

      const record = await backendApi.uploadAudioReview({
        title: title || file.name,
        interviewDate: new Date().toISOString().slice(0, 10),
        file,
        onUploadProgress: (progress) => {
          setUploadProgress(progress);
          if (progress >= 100) {
            setProcessMessage("录音已上传，正在进行 ASR 转写和复盘总结...");
          }
        },
      });

      setReviewRecord(record);
      setProcessMessage(
        record.buildStatus === "built"
          ? "复盘解析完成，录音、转写文本和结构化知识已写入数据库。"
          : `录音已上传，当前状态：${record.status} / ${record.buildStatus}`,
      );
      await onReviewComplete?.();
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch (error) {
      setProcessError(error instanceof Error ? error.message : "复盘解析失败，请稍后重试。");
      setProcessMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartReview = async () => {
    if (!selectedAudioFile || isProcessing || isReviewStored) return;
    await uploadAndProcessAudio(selectedAudioFile);
  };

  const handleFooterAction = async () => {
    if (isReviewStored) {
      handleStartAnotherReview();
      return;
    }
    await handleStartReview();
  };

  const handleStartAnotherReview = () => {
    setSelectedAudioName("");
    setSelectedAudioFile(null);
    setUploadProgress(0);
    setProcessMessage("");
    setProcessError("");
    setReviewRecord(null);
    fileInputRef.current?.click();
  };

  return (
    <div id="audio-review-root" className="min-h-screen bg-background text-on-surface animate-fade-in-up">
      <header className="sticky top-0 z-40 h-14 bg-white border-b border-border-subtle flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate("workbench")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
            aria-label="返回工作台"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <span className="material-symbols-outlined text-primary text-[18px]">analytics</span>
          <h1 className="font-sans text-base font-extrabold text-primary">面试复盘</h1>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">help</span>
      </header>

      <main className="px-4 pt-5 pb-32 max-w-md mx-auto space-y-5">
        <section className="space-y-3">
          <h2 className="font-sans text-sm font-extrabold text-on-surface">选择简历</h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
            {resumes.map((resume) => {
              const isSelected = selectedResumeId === resume.id;
              return (
                <button
                  key={resume.id}
                  type="button"
                  onClick={() => setSelectedResumeId(resume.id)}
                  className={`flex-shrink-0 w-32 h-20 rounded-xl bg-white border p-3 text-left transition-colors ${
                    isSelected ? "border-primary shadow-sm" : "border-border-subtle"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-[15px]">check_circle</span>
                    )}
                  </div>
                  <p className="font-sans text-[11px] font-extrabold text-on-surface mt-2 truncate">
                    {resume.name}
                  </p>
                  <p className="font-mono text-[8px] text-on-surface-variant mt-0.5">
                    {resume.lastUpdated}
                  </p>
                </button>
              );
            })}
            {resumes.length === 0 && (
              <div className="w-full h-20 rounded-xl border border-dashed border-border-subtle bg-white/60 flex items-center justify-center text-xs font-bold text-outline">
                暂无简历
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <label htmlFor="review-company" className="font-sans text-xs font-extrabold text-on-surface block">
            目标公司
          </label>
          <div className="relative">
            <input
              id="review-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="w-full h-11 rounded-xl border border-border-subtle bg-white px-4 pr-10 font-sans text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
              placeholder="例如：腾讯、阿里巴巴..."
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant text-[22px]">
              search
            </span>
          </div>
        </section>

        <section className="space-y-2">
          <label htmlFor="review-position" className="font-sans text-xs font-extrabold text-on-surface block">
            目标岗位
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              business_center
            </span>
            <input
              id="review-position"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="w-full h-11 rounded-xl border border-border-subtle bg-white pl-10 pr-4 font-sans text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
              placeholder="例如：高级产品经理"
            />
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="review-jd" className="font-sans text-xs font-extrabold text-on-surface">
              职位详情（JD）
            </label>
            <button
              type="button"
              className="flex items-center gap-1 text-primary text-[10px] font-bold"
            >
              <span className="material-symbols-outlined text-[14px]">sync_alt</span>
              从投递助手导入
            </button>
          </div>
          <textarea
            id="review-jd"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="w-full h-24 resize-none rounded-xl border border-border-subtle bg-white px-4 py-3 font-sans text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
            placeholder="粘贴职位描述或岗位要求..."
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-sm font-extrabold text-on-surface">上传录音</h2>
          <button
            type="button"
            onClick={openFilePicker}
            className="w-full h-36 rounded-xl border border-dashed border-border-subtle bg-white/60 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-white transition-colors"
          >
            <span className="w-12 h-12 rounded-full bg-primary-container/60 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">upload_file</span>
            </span>
            <span className="font-sans text-xs font-extrabold text-on-surface">
              {selectedAudioName || "点击或拖拽上传面试录音"}
            </span>
            <span className="font-sans text-[10px] font-bold text-on-surface-variant">
              {isProcessing ? `上传进度 ${uploadProgress}%` : "支持 MP3、M4A、WAV 等主流格式"}
            </span>
            {isProcessing && (
              <span className="mt-2 h-1.5 w-40 rounded-full bg-zinc-200 overflow-hidden">
                <span
                  className="block h-full rounded-full bg-primary transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="audio/*,.mp3,.m4a,.wav,.webm,.aac"
            onChange={handleFileChange}
          />
          {(processMessage || processError) && (
            <div
              className={`rounded-xl border px-4 py-3 font-sans text-xs leading-relaxed ${
                processError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-primary-container/40 bg-primary-container/10 text-primary"
              }`}
            >
              {processError || processMessage}
            </div>
          )}
        </section>

        {reviewRecord && (
          <section ref={resultRef} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-sm font-extrabold text-on-surface">复盘结果</h2>
              <span className="font-mono text-[9px] font-bold text-primary bg-primary-container/15 px-2 py-1 rounded">
                {statusLabel(reviewRecord.buildStatus)}
              </span>
            </div>
            <AudioReviewResult record={reviewRecord} onStartAnotherReview={handleStartAnotherReview} />
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/95 backdrop-blur border-t border-border-subtle px-4 pt-3 pb-safe z-50">
        <button
          type="button"
          onClick={handleFooterAction}
          disabled={isProcessing || (!selectedAudioFile && !isReviewStored)}
          className={`w-full h-14 rounded-xl font-sans text-base font-extrabold flex items-center justify-center gap-2 shadow-md shadow-primary/10 transition-all ${
            (selectedAudioFile && !isProcessing && !isReviewStored) || (isReviewStored && !isProcessing)
              ? "bg-primary text-white active:scale-95"
              : "bg-primary text-white opacity-70 cursor-not-allowed"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${isProcessing ? "animate-spin" : ""}`}>
            {isProcessing ? "progress_activity" : isReviewStored ? "add_circle" : "rocket_launch"}
          </span>
          {isProcessing ? "正在复盘解析" : isReviewStored ? "再存一段" : "开始复盘解析"}
        </button>
      </footer>
    </div>
  );
}

export function AudioReviewResult({
  record,
  onStartAnotherReview,
}: {
  record: BackendKnowledgeRecord;
  onStartAnotherReview?: () => void;
}) {
  const structured = normalizeStructuredContent(record.structuredContent);
  const chunks = normalizeChunks(record.chunks);
  const transcript = record.roleTranscript || record.speakerTranscript || record.transcript || "";
  const audioSize = typeof record.audioFileSize === "number" ? formatFileSize(record.audioFileSize) : "";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">summarize</span>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-sans text-sm font-extrabold text-on-surface leading-snug">
              {record.title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <MetaPill icon="event" text={record.interviewDate} />
              {record.audioFileName && <MetaPill icon="graphic_eq" text={record.audioFileName} />}
              {audioSize && <MetaPill icon="sd_storage" text={audioSize} />}
              {record.asrProvider && <MetaPill icon="cloud_done" text={record.asrModel || record.asrProvider} />}
            </div>
          </div>
        </div>
        {record.audioUrl && (
          <audio controls className="mt-4 w-full h-9">
            <source src={record.audioUrl} />
          </audio>
        )}
      </div>

      {record.buildError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-700">
          <p className="font-extrabold mb-1">处理失败</p>
          <p className="break-words">{record.buildError}</p>
        </div>
      )}

      <ResultBlock title="AI 复盘摘要" icon="psychology_alt">
        <p className="text-xs leading-relaxed text-on-surface-variant">
          {structured.summary || "暂无摘要。若 ASR 成功但没有摘要，请在知识库中重新构建该记录。"}
        </p>
        {structured.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {structured.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 rounded bg-primary-container/15 text-primary text-[10px] font-mono font-bold">
                {tag}
              </span>
            ))}
          </div>
        )}
      </ResultBlock>

      {(structured.questions.length > 0 || structured.weakPoints.length > 0) && (
        <ResultBlock title="结构化复盘" icon="fact_check">
          {structured.questions.length > 0 && (
            <div className="space-y-3">
              {structured.questions.map((question, index) => (
                <div key={`${question.question}-${index}`} className="rounded-lg bg-surface-container-low p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-on-surface leading-snug">
                      {index + 1}. {question.question}
                    </p>
                    {question.difficulty && (
                      <span className="text-[9px] font-mono text-outline bg-white rounded px-1.5 py-0.5">
                        {question.difficulty}
                      </span>
                    )}
                  </div>
                  {question.answer && (
                    <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
                      {question.answer}
                    </p>
                  )}
                  {question.keywords.length > 0 && (
                    <p className="mt-2 text-[10px] font-mono text-primary">
                      {question.keywords.join(" / ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {structured.weakPoints.length > 0 && (
            <ListGroup title="薄弱点" items={structured.weakPoints} />
          )}
        </ResultBlock>
      )}

      {structured.followUpSuggestions.length > 0 && (
        <ResultBlock title="后续训练建议" icon="checklist">
          <ListGroup items={structured.followUpSuggestions} />
        </ResultBlock>
      )}

      {chunks.length > 0 && (
        <ResultBlock title="知识库 Chunks" icon="hub">
          <div className="space-y-3">
            {chunks.map((chunk, index) => (
              <div key={chunk.id || index} className="rounded-lg border border-border-subtle bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-extrabold text-on-surface leading-snug">
                    {chunk.title || `片段 ${index + 1}`}
                  </p>
                  <span className="text-[9px] font-mono text-primary bg-primary-container/15 rounded px-1.5 py-0.5">
                    {chunk.sourceType || "chunk"}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                  {chunk.content}
                </p>
                {chunk.keywords.length > 0 && (
                  <p className="mt-2 text-[10px] font-mono text-outline">
                    {chunk.keywords.join(" / ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ResultBlock>
      )}

      <ResultBlock title="ASR 转写文本" icon="record_voice_over">
        <div className="max-h-64 overflow-y-auto rounded-lg bg-surface-container-low p-3">
          <p className="text-[11px] leading-relaxed text-on-surface-variant whitespace-pre-wrap">
            {transcript || "暂无转写文本。"}
          </p>
        </div>
      </ResultBlock>

      {record.transcribedAt && (
        <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-outline">
          <span>已于 {formatDateTime(record.transcribedAt)} 写入数据库 RealInterviewRecord</span>
          {onStartAnotherReview && (
            <button
              type="button"
              onClick={onStartAnotherReview}
              className="inline-flex items-center gap-1 rounded-full border border-primary-container/40 bg-white px-2.5 py-1 font-sans text-[10px] font-bold text-primary active:scale-95"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>
              再存一段
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ResultBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
        <h3 className="font-sans text-xs font-extrabold text-on-surface">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MetaPill({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-[9px] font-mono font-bold text-on-surface-variant">
      <span className="material-symbols-outlined text-[12px] flex-shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  );
}

function ListGroup({ title, items }: { title?: string; items: string[] }) {
  return (
    <div className={title ? "mt-4" : ""}>
      {title && <p className="text-[11px] font-extrabold text-on-surface mb-2">{title}</p>}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex gap-2 text-[11px] leading-relaxed text-on-surface-variant">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-container flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeStructuredContent(value: unknown) {
  const source = isObject(value) ? value : {};
  return {
    summary: readString(source.summary),
    tags: readStringArray(source.tags),
    focusAreas: readStringArray(source.focusAreas),
    weakPoints: readStringArray(source.weakPoints),
    followUpSuggestions: readStringArray(source.followUpSuggestions),
    questions: Array.isArray(source.questions)
      ? source.questions.map((item) => {
          const question = isObject(item) ? item : {};
          return {
            question: readString(question.question),
            answer: readString(question.answer),
            dimension: readString(question.dimension),
            difficulty: readString(question.difficulty),
            keywords: readStringArray(question.keywords),
          };
        }).filter((item) => item.question)
      : [],
  };
}

function normalizeChunks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const chunk = isObject(item) ? item : {};
    return {
      id: readString(chunk.id) || `chunk-${index + 1}`,
      title: readString(chunk.title),
      content: readString(chunk.content),
      sourceType: readString(chunk.sourceType),
      keywords: readStringArray(chunk.keywords),
    };
  }).filter((chunk) => chunk.content);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    built: "已构建",
    building: "构建中",
    not_built: "待构建",
    waiting_asr: "待转写",
    empty: "空记录",
    failed: "失败",
  };
  return labels[status] ?? status;
}
