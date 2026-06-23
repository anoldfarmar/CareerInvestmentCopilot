import React, { useEffect, useRef, useState } from "react";
import { Resume } from "../types";

interface ResumeOptimizeViewProps {
  resumes: Resume[];
  onUploadResume: (file: File) => Promise<void>;
  onOptimizeResume: (
    id: string,
    input: { jobDescription?: string; additionalInstruction?: string },
  ) => Promise<unknown>;
  onFinalizeResume: (id: string, label?: string) => Promise<unknown>;
  onExportResumePdf: (id: string) => Promise<void>;
  onNavigate: (viewName: "workbench") => void;
}

export default function ResumeOptimizeView({
  resumes,
  onUploadResume,
  onOptimizeResume,
  onFinalizeResume,
  onExportResumePdf,
  onNavigate,
}: ResumeOptimizeViewProps) {
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalInstruction, setAdditionalInstruction] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [optimizeMessage, setOptimizeMessage] = useState("");
  const [optimizeError, setOptimizeError] = useState("");
  const [optimizationNotes, setOptimizationNotes] = useState<string[]>([]);
  const [workflowError, setWorkflowError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedResumeId && resumes[0]) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const selectedResume = resumes.find((resume) => resume.id === selectedResumeId);
  const canOptimize = Boolean(
    selectedResume &&
      selectedResume.isInterviewReady &&
      targetRole.trim() &&
      jobDescription.trim() &&
      !isOptimizing,
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setUploadError("");
    setIsUploading(true);
    try {
      await onUploadResume(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "简历上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOptimize = async () => {
    if (!selectedResume || isOptimizing) return;

    if (!selectedResume.isInterviewReady) {
      setOptimizeError("该简历尚未完成结构化，暂不能优化。请等待解析和结构化完成。");
      return;
    }

    setOptimizeError("");
    setOptimizeMessage("");
    setWorkflowError("");
    setOptimizationNotes([]);
    setIsOptimizing(true);

    try {
      const optimized = await onOptimizeResume(selectedResume.id, {
        jobDescription: [
          targetRole.trim() ? `目标岗位：${targetRole.trim()}` : "",
          jobDescription.trim() ? `职位详情：${jobDescription.trim()}` : "",
        ].filter(Boolean).join("\n\n"),
        additionalInstruction: additionalInstruction.trim() || undefined,
      });
      setOptimizationNotes(readOptimizationNotes(optimized));
      setOptimizeMessage("简历优化已完成，并写入数据库 Resume.optimizedContent / draftContent。");
    } catch (error) {
      setOptimizeError(error instanceof Error ? error.message : "简历优化失败，请稍后重试。");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedResume || isFinalizing) return;
    setWorkflowError("");
    setIsFinalizing(true);
    try {
      await onFinalizeResume(selectedResume.id, `${targetRole.trim() || "岗位定向"}最终版`);
      setOptimizeMessage("已定稿，并写入 Resume.finalizedContent / finalizedAt。");
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "定稿失败，请稍后重试。");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleExport = async () => {
    if (!selectedResume || isExporting) return;
    setWorkflowError("");
    setIsExporting(true);
    try {
      await onExportResumePdf(selectedResume.id);
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "PDF 导出失败，请稍后重试。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="resume-optimize-root" className="min-h-screen bg-background text-on-surface animate-fade-in-up">
      <header className="sticky top-0 z-40 h-14 bg-white border-b border-border-subtle flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => onNavigate("workbench")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
          aria-label="返回工作台"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
        <h1 className="font-sans text-base font-extrabold text-primary">简历优化</h1>
        <span className="font-mono text-[9px] font-bold text-outline bg-white border border-border-subtle px-2 py-1 rounded">
          MOCK_v2.4
        </span>
      </header>

      <main className="px-4 pt-5 pb-32 max-w-md mx-auto space-y-6">
        <section className="space-y-3">
          <div>
            <h2 className="font-sans text-sm font-extrabold text-on-surface">目标岗位</h2>
            <input
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              className="mt-2 w-full h-14 rounded-xl border border-border-subtle bg-white px-4 font-sans text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
              placeholder="例如：高级产品经理 / Senior PM"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-sm font-extrabold text-on-surface">职位详情 (JD)</h2>
              <button
                type="button"
                onClick={async () => {
                  const text = await navigator.clipboard?.readText?.();
                  if (text) setJobDescription(text);
                }}
                className="flex items-center gap-1 text-primary text-[10px] font-bold"
              >
                <span className="material-symbols-outlined text-[15px]">content_paste</span>
                从剪贴板粘贴
              </button>
            </div>
            <div className="relative mt-2">
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                className="w-full h-32 resize-none rounded-xl border border-border-subtle bg-white px-4 py-3 font-sans text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
                placeholder="粘贴职位描述或关键要求以获得最佳优化建议..."
              />
              <span className="absolute right-3 bottom-3 text-[9px] text-outline">
                字数建议：200+
              </span>
            </div>
          </div>

          <div>
            <h2 className="font-sans text-sm font-extrabold text-on-surface">优化要求</h2>
            <input
              value={additionalInstruction}
              onChange={(event) => setAdditionalInstruction(event.target.value)}
              className="mt-2 w-full h-12 rounded-xl border border-border-subtle bg-white px-4 font-sans text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
              placeholder="例如：更突出项目成果、压缩表达、强化技术关键词"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-sm font-extrabold text-on-surface">已导入简历预览</h2>
            <span className="font-mono text-[10px] text-primary font-bold">
              已同步 {resumes.length} 份
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {resumes.map((resume) => {
              const isSelected = selectedResumeId === resume.id;

              return (
                <button
                  key={resume.id}
                  type="button"
                  onClick={() => setSelectedResumeId(resume.id)}
                  className={`h-24 rounded-xl bg-white border p-3 text-left transition-colors ${
                    isSelected ? "border-primary shadow-sm" : "border-border-subtle"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    )}
                  </div>
                  <p className="font-sans text-xs font-extrabold text-on-surface mt-3 truncate">
                    {resume.name}
                  </p>
                  <p className="font-mono text-[9px] text-on-surface-variant mt-1">
                    更新于 {resume.lastUpdated}
                  </p>
                  {resume.tag && (
                    <span className="inline-block mt-1 bg-tertiary-container/25 text-on-tertiary-container px-1.5 py-0.5 rounded text-[8px] font-bold">
                      {resume.tag}
                    </span>
                  )}
                  {!resume.isInterviewReady && (
                    <span className="inline-block mt-1 bg-zinc-100 text-outline px-1.5 py-0.5 rounded text-[8px] font-bold">
                      需先结构化
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={openFilePicker}
              disabled={isUploading}
              className="h-24 rounded-xl border border-dashed border-border-subtle bg-white/50 text-on-surface-variant flex flex-col items-center justify-center gap-1 hover:border-primary hover:text-primary disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[26px]">
                {isUploading ? "progress_activity" : "add"}
              </span>
              <span className="font-sans text-xs font-bold">
                {isUploading ? "上传中" : "上传新简历"}
              </span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.md,.markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain"
            onChange={handleFileChange}
          />
          {uploadError && (
            <p className="text-xs text-on-tertiary-container bg-amber-50 border border-tertiary-container/25 rounded-lg px-3 py-2">
              {uploadError}
            </p>
          )}
          {optimizeMessage && (
            <p className="text-xs text-primary bg-primary-container/10 border border-primary-container/30 rounded-lg px-3 py-2">
              {optimizeMessage}
            </p>
          )}
          {optimizationNotes.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-white px-4 py-3">
              <h3 className="font-sans text-xs font-extrabold text-on-surface mb-2">优化摘要</h3>
              <ul className="space-y-1.5">
                {optimizationNotes.slice(0, 4).map((note, index) => (
                  <li key={`${note}-${index}`} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                    <span className="material-symbols-outlined text-primary text-[15px] mt-0.5">check_circle</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {optimizeError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {optimizeError}
            </p>
          )}
          {workflowError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {workflowError}
            </p>
          )}
          {selectedResume?.tag && ["已优化", "已定稿"].includes(selectedResume.tag) && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="h-11 rounded-xl border border-primary-container/50 bg-white text-primary font-sans text-xs font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[17px] ${isFinalizing ? "animate-spin" : ""}`}>
                  {isFinalizing ? "progress_activity" : "verified"}
                </span>
                {isFinalizing ? "定稿中" : "确认定稿"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="h-11 rounded-xl border border-primary-container/50 bg-white text-primary font-sans text-xs font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[17px] ${isExporting ? "animate-spin" : ""}`}>
                  {isExporting ? "progress_activity" : "picture_as_pdf"}
                </span>
                {isExporting ? "导出中" : "导出 PDF"}
              </button>
            </div>
          )}
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/95 backdrop-blur border-t border-border-subtle px-4 pt-3 pb-safe z-50">
        <button
          type="button"
          onClick={handleOptimize}
          disabled={!canOptimize}
          className="w-full h-14 rounded-xl bg-primary-container text-on-primary-container font-sans font-extrabold flex items-center justify-center gap-2 shadow-md shadow-primary/10 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
        >
          <span className={`material-symbols-outlined text-[20px] ${isOptimizing ? "animate-spin" : ""}`}>
            {isOptimizing ? "progress_activity" : "auto_fix_high"}
          </span>
          {isOptimizing ? "正在优化简历" : "开始简历优化"}
        </button>
        <p className="text-center font-mono text-[9px] text-outline mt-2">
          AI 驱动 · 即时生成优化建议
        </p>
      </div>
    </div>
  );
}

function readOptimizationNotes(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const optimizedContent = "optimizedContent" in value
    ? (value as { optimizedContent?: unknown }).optimizedContent
    : undefined;
  if (!optimizedContent || typeof optimizedContent !== "object") return [];
  const notes = (optimizedContent as { optimizationNotes?: unknown }).optimizationNotes;
  return Array.isArray(notes) ? notes.map(String) : [];
}
