import React, { useEffect, useRef, useState } from "react";
import { Resume } from "../types";

interface ResumeOptimizeViewProps {
  resumes: Resume[];
  onUploadResume: (file: File) => Promise<void>;
  onOptimizeResume: (
    id: string,
    input: { jobDescription?: string; additionalInstruction?: string },
  ) => Promise<unknown>;
  onLoadOptimizeHistory: (id: string) => Promise<ResumeOptimizeHistoryItem[]>;
  onSaveOptimizeResult: (id: string, content: unknown) => Promise<unknown>;
  onRenameOptimizeHistory: (resumeId: string, versionId: number, label: string) => Promise<ResumeOptimizeHistoryItem>;
  onFinalizeResume: (id: string, label?: string) => Promise<unknown>;
  onExportResumePdf: (id: string) => Promise<void>;
  onDeleteResume: (id: string) => Promise<void>;
  onNavigate: (viewName: "workbench") => void;
}

export default function ResumeOptimizeView({
  resumes,
  onUploadResume,
  onOptimizeResume,
  onLoadOptimizeHistory,
  onSaveOptimizeResult,
  onRenameOptimizeHistory,
  onFinalizeResume,
  onExportResumePdf,
  onDeleteResume,
  onNavigate,
}: ResumeOptimizeViewProps) {
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [followUpInstruction, setFollowUpInstruction] = useState("");
  const [historyItems, setHistoryItems] = useState<ResumeOptimizeHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | "current" | "new">("new");
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isContinuingOptimize, setIsContinuingOptimize] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isSavingOptimizeResult, setIsSavingOptimizeResult] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [optimizeMessage, setOptimizeMessage] = useState("");
  const [optimizeError, setOptimizeError] = useState("");
  const [optimizationNotes, setOptimizationNotes] = useState<string[]>([]);
  const [workflowError, setWorkflowError] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<OptimizationSuggestionWithSection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedResumeId && resumes[0]) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  useEffect(() => {
    if (selectedResumeId && !resumes.some((resume) => resume.id === selectedResumeId)) {
      setSelectedResumeId(resumes[0]?.id ?? "");
    }
  }, [resumes, selectedResumeId]);

  const previousResumeCountRef = useRef(resumes.length);

  useEffect(() => {
    if (resumes.length > previousResumeCountRef.current && resumes[0]) {
      setSelectedResumeId(resumes[0].id);
    }
    previousResumeCountRef.current = resumes.length;
  }, [resumes]);

  useEffect(() => {
    if (!selectedResumeId) {
      setHistoryItems([]);
      setSelectedHistoryId("new");
      return;
    }

    let ignore = false;
    setIsHistoryLoading(true);
    onLoadOptimizeHistory(selectedResumeId)
      .then((items) => {
        if (ignore) return;
        setHistoryItems(items);
        setSelectedHistoryId("new");
        setTargetRole("");
        setJobDescription("");
        setOptimizeMessage("");
        setOptimizeError("");
        setOptimizationNotes([]);
      })
      .catch(() => {
        if (ignore) return;
        setHistoryItems([]);
      })
      .finally(() => {
        if (!ignore) setIsHistoryLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [onLoadOptimizeHistory, selectedResumeId]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const selectedResume = resumes.find((resume) => resume.id === selectedResumeId);
  const selectedHistory = typeof selectedHistoryId === "number"
    ? historyItems.find((item) => item.id === selectedHistoryId)
    : null;
  const activeOptimizedContent = selectedHistory
    ? selectedHistory.content
    : selectedHistoryId === "new"
      ? null
      : selectedResume?.optimizedContent ?? null;
  const structuredPreview = selectedResume ? buildStructuredPreview(selectedResume.structuredContent) : null;
  const optimizationInsight = activeOptimizedContent
    ? readOptimizationInsight(activeOptimizedContent)
    : null;
  const jdMatchReport = activeOptimizedContent
    ? readJdMatchReport(readOptimizedJdMatchResult(activeOptimizedContent))
    : null;
  const canSaveOptimizeResult = Boolean(
    selectedResume &&
      selectedResume.optimizedContent &&
      selectedHistoryId === "current" &&
      !isSavingOptimizeResult,
  );
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

  const buildTargetJobDescription = () =>
    [
      targetRole.trim() ? `目标岗位：${targetRole.trim()}` : "",
      jobDescription.trim() ? `职位详情：${jobDescription.trim()}` : "",
    ].filter(Boolean).join("\n\n");

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
        jobDescription: buildTargetJobDescription(),
      });
      setOptimizationNotes(readOptimizationNotes(optimized));
      setOptimizeMessage("简历优化已完成。");
      setSelectedHistoryId("current");
      onLoadOptimizeHistory(selectedResume.id)
        .then(setHistoryItems)
        .catch(() => undefined);
    } catch (error) {
      setOptimizeError(error instanceof Error ? error.message : "简历优化失败，请稍后重试。");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveOptimizeResult = async () => {
    if (!selectedResume || !selectedResume.optimizedContent || isSavingOptimizeResult) return;

    setWorkflowError("");
    setOptimizeMessage("");
    setIsSavingOptimizeResult(true);
    try {
      const content = attachJobSnapshot(selectedResume.optimizedContent, targetRole, buildTargetJobDescription());
      await onSaveOptimizeResult(selectedResume.id, content);
      const nextHistory = await onLoadOptimizeHistory(selectedResume.id);
      setHistoryItems(nextHistory);
      setSelectedHistoryId(nextHistory[0]?.id ?? "current");
      setOptimizeMessage("优化结果已保存。");
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "保存优化结果失败，请稍后重试。");
    } finally {
      setIsSavingOptimizeResult(false);
    }
  };

  const handleSelectHistory = (item: ResumeOptimizeHistoryItem) => {
    setSelectedHistoryId(item.id);
    const snapshot = readJobSnapshot(item.content);
    if (snapshot.targetRole) setTargetRole(snapshot.targetRole);
    if (snapshot.jobDescription) setJobDescription(stripJobDescriptionPrefix(snapshot.jobDescription));
    setOptimizationNotes(toStringArray(item.notes));
    setOptimizeMessage("");
    setOptimizeError("");
  };

  const handleNewOptimization = () => {
    setSelectedHistoryId("new");
    setTargetRole("");
    setJobDescription("");
    setOptimizeMessage("");
    setOptimizeError("");
    setOptimizationNotes([]);
  };

  const handleRenameHistory = async (item: ResumeOptimizeHistoryItem, label: string) => {
    if (!selectedResume) throw new Error("请先选择简历");
    const updated = await onRenameOptimizeHistory(selectedResume.id, item.id, label);
    setHistoryItems((prev) =>
      prev.map((historyItem) => (historyItem.id === updated.id ? updated : historyItem)),
    );
    return updated;
  };

  const handleContinueOptimize = async () => {
    if (!selectedResume || isContinuingOptimize) return;

    if (!followUpInstruction.trim()) {
      setOptimizeError("请输入希望继续优化的方向。");
      return;
    }

    setOptimizeError("");
    setOptimizeMessage("");
    setWorkflowError("");
    setIsContinuingOptimize(true);

    try {
      const optimized = await onOptimizeResume(selectedResume.id, {
        jobDescription: buildTargetJobDescription() || undefined,
        additionalInstruction: followUpInstruction.trim(),
      });
      setOptimizationNotes(readOptimizationNotes(optimized));
      setOptimizeMessage("已按你的要求继续优化。");
      setFollowUpInstruction("");
    } catch (error) {
      setOptimizeError(error instanceof Error ? error.message : "继续优化失败，请稍后重试。");
    } finally {
      setIsContinuingOptimize(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedResume || isFinalizing) return;
    setWorkflowError("");
    setIsFinalizing(true);
    try {
      await onFinalizeResume(selectedResume.id, `${targetRole.trim() || "岗位定向"}最终版`);
      setOptimizeMessage("已确认定稿。");
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

  const handleDeleteResume = async (resume: Resume) => {
    if (deletingResumeId) return;

    const confirmed = window.confirm(`确定删除「${resume.name}」吗？删除后会同步移除数据库记录。`);
    if (!confirmed) return;

    setWorkflowError("");
    setOptimizeMessage("");
    setDeletingResumeId(resume.id);
    try {
      await onDeleteResume(resume.id);
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "简历删除失败，请稍后重试。");
    } finally {
      setDeletingResumeId("");
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
                <div
                  key={resume.id}
                  className={`relative h-24 rounded-xl bg-white border p-3 text-left transition-colors ${
                    isSelected ? "border-primary shadow-sm" : "border-border-subtle"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedResumeId(resume.id)}
                    className="absolute inset-0 rounded-xl"
                    aria-label={`选择 ${resume.name}`}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteResume(resume);
                    }}
                    disabled={deletingResumeId === resume.id}
                    className="absolute right-2 top-2 z-10 w-7 h-7 rounded-full bg-white/95 border border-border-subtle text-outline flex items-center justify-center shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 active:scale-95 disabled:opacity-60 transition-all"
                    title="删除简历"
                    aria-label={`删除 ${resume.name}`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${deletingResumeId === resume.id ? "animate-spin" : ""}`}>
                      {deletingResumeId === resume.id ? "progress_activity" : "delete"}
                    </span>
                  </button>
                  <div className="flex items-start justify-between">
                    <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-[16px] mr-7">check_circle</span>
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
                </div>
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
          <ResumeOptimizeHistoryPanel
            items={historyItems}
            selectedId={selectedHistoryId}
            isLoading={isHistoryLoading}
            canSave={canSaveOptimizeResult}
            isSaving={isSavingOptimizeResult}
            onSelect={handleSelectHistory}
            onRename={handleRenameHistory}
            onNew={handleNewOptimization}
            onSave={handleSaveOptimizeResult}
          />
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
          {jdMatchReport ? (
            <JdMatchReportCard report={jdMatchReport} />
          ) : optimizationInsight ? (
            <JdMatchPendingCard hasJobDescription={Boolean(buildTargetJobDescription())} />
          ) : null}
          {optimizationInsight && (
            <ResumeOptimizationInsight
              insight={optimizationInsight}
              onSelectSuggestion={setSelectedSuggestion}
            />
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
          {selectedResume && (
            <ResumeStructuredPreview
              resumeName={selectedResume.name}
              tag={selectedResume.tag}
              preview={structuredPreview}
            />
          )}
        </section>
      </main>

      {selectedSuggestion && selectedResume && (
        <SuggestionSourceDialog
          suggestion={selectedSuggestion}
          structuredContent={selectedResume.structuredContent}
          onClose={() => setSelectedSuggestion(null)}
        />
      )}

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

function readOptimizedResumeContent(value: unknown) {
  if (!isRecord(value)) return null;
  return value.optimizedResume ?? value;
}

function readOptimizedJdMatchResult(value: unknown) {
  if (!isRecord(value)) return null;
  return value.jdMatchResult ?? null;
}

function readJobSnapshot(value: unknown): ResumeJobSnapshot {
  const snapshot = isRecord(value) && isRecord(value.jobSnapshot) ? value.jobSnapshot : {};
  return {
    targetRole: readString(snapshot.targetRole),
    jobDescription: readString(snapshot.jobDescription),
  };
}

function attachJobSnapshot(value: unknown, targetRole: string, jobDescription: string) {
  if (!isRecord(value)) return value;
  return {
    ...value,
    jobSnapshot: {
      targetRole: targetRole.trim(),
      jobDescription: jobDescription.trim(),
    },
  };
}

function stripJobDescriptionPrefix(value: string) {
  const parts = value.split(/\n{2,}/);
  const detail = parts.find((part) => part.trim().startsWith("职位详情："));
  return detail ? detail.replace(/^职位详情：/, "").trim() : value.trim();
}

function readJdMatchReport(value: unknown): JdMatchReport | null {
  if (!isRecord(value)) return null;

  const summary = isRecord(value.summary) ? value.summary : {};
  const byCategoryValue = isRecord(summary.byCategory) ? summary.byCategory : {};
  const matches = toRecordArray(value.matches)
    .map((match, index) => ({
      requirementId: readString(match.requirementId) || `req-${index + 1}`,
      requirementText: readString(match.requirementText),
      category: readString(match.category) || "mustHave",
      score: clampUnit(readOptionalNumber(match.score) ?? 0),
      evidence: toStringArray(match.evidence),
      rationale: readString(match.rationale),
    }))
    .filter((match) => match.requirementText || match.rationale);
  const gaps = toRecordArray(value.gaps)
    .map((gap, index) => ({
      id: readString(gap.id) || `gap-${index + 1}`,
      category: readString(gap.category) || "mustHave",
      text: readString(gap.text),
    }))
    .filter((gap) => gap.text);
  const byCategory = jdCategoryKeys().map((item) => ({
    ...item,
    score: clampUnit(readOptionalNumber(byCategoryValue[item.key]) ?? 0),
  }));
  const percent = clampUnit(
    readOptionalNumber(summary.percent) ??
      readOptionalNumber(value.totalScore) ??
      0,
  );

  if (!matches.length && !gaps.length && percent === 0) return null;

  return {
    percent,
    headline: readString(value.headline) || readString(value.legacySummary),
    byCategory,
    matches,
    gaps,
  };
}

function formatDateTime(value?: string) {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function readOptimizationInsight(value: unknown): OptimizationInsight | null {
  if (!isRecord(value)) return null;

  const overviewValue = isRecord(value.overview) ? value.overview : null;
  const resumeSummary = overviewValue && isRecord(overviewValue.resumeSummary)
    ? overviewValue.resumeSummary
    : null;
  const rolePersonas = overviewValue
    ? toRecordArray(overviewValue.rolePersonas).map((item) => ({
        role: readString(item.role),
        fitReason: readString(item.fitReason),
        bestScene: readString(item.bestScene),
        gapTip: readString(item.gapTip),
      })).filter((item) => item.role || item.fitReason || item.bestScene || item.gapTip)
    : [];

  const overview = resumeSummary
    ? {
        headline: readString(resumeSummary.headline),
        highlights: toStringArray(resumeSummary.highlights),
        risks: toStringArray(resumeSummary.risks),
        rolePersonas,
      }
    : undefined;

  const sections = toRecordArray(value.suggestionSections)
    .map((section) => {
      const sectionName = readString(section.section);
      return {
        section: sectionName,
        title: sectionTitle(sectionName),
        suggestions: toRecordArray(section.suggestions)
          .map((item, index) => ({
            id: readString(item.id) || `${sectionName}-${index}`,
            priority: readNumber(item.priority, index + 1),
            issueType: readString(item.issueType) || "other",
            location: readSuggestionLocation(item.location, sectionName),
            problem: readString(item.problem),
            original: readString(item.original),
            suggestion: readString(item.suggestion),
            jdRelevanceScore: readOptionalNumber(item.jdRelevanceScore),
          }))
          .filter((item) => item.problem || item.suggestion),
      };
    })
    .filter((section) => section.suggestions.length > 0);

  if (!overview && sections.length === 0) return null;
  return { overview, sections };
}

type StructuredPreview = {
  basicInfo: Array<{ label: string; value: string }>;
  summary: string;
  skills: string[];
  workExperiences: Array<{ title: string; subtitle: string; description: string }>;
  projects: Array<{ title: string; description: string }>;
  educations: Array<{ title: string; subtitle: string }>;
};

type OptimizationInsight = {
  overview?: {
    headline: string;
    highlights: string[];
    risks: string[];
    rolePersonas: Array<{
      role: string;
      fitReason: string;
      bestScene: string;
      gapTip: string;
    }>;
  };
  sections: Array<{
    section: string;
    title: string;
    suggestions: Array<{
      id: string;
      priority: number;
      issueType: string;
      location: {
        section: string;
        itemIndex?: number;
      };
      problem: string;
      original: string;
      suggestion: string;
      jdRelevanceScore?: number;
    }>;
  }>;
};

type OptimizationSuggestionWithSection = OptimizationInsight["sections"][number]["suggestions"][number] & {
  sectionTitle: string;
};

type SuggestionSourceView = {
  sectionLabel: string;
  itemLabel: string;
  icon: string;
  title: string;
  meta: string;
  contentLabel: string;
  content: string;
  fields: Array<{ label: string; value: string }>;
  chips: string[];
};

type JdMatchReport = {
  percent: number;
  headline: string;
  byCategory: Array<{ key: string; label: string; score: number }>;
  matches: Array<{
    requirementId: string;
    requirementText: string;
    category: string;
    score: number;
    evidence: string[];
    rationale: string;
  }>;
  gaps: Array<{ id: string; category: string; text: string }>;
};

export type ResumeOptimizeHistoryItem = {
  id: number;
  resumeId: number;
  version: number;
  label: string;
  source: string;
  content: unknown;
  notes?: unknown;
  isFinal: boolean;
  createdAt?: string;
};

type ResumeJobSnapshot = {
  targetRole: string;
  jobDescription: string;
};

type CompareRow = {
  label: string;
  before: string;
  after: string;
};

type CompareSection = {
  id: string;
  title: string;
  icon: string;
  rows: CompareRow[];
};

function ResumeStructuredPreview({
  resumeName,
  tag,
  preview,
}: {
  resumeName: string;
  tag?: string;
  preview: StructuredPreview | null;
}) {
  const hasPreview = Boolean(
    preview &&
      (preview.basicInfo.length ||
        preview.summary ||
        preview.skills.length ||
        preview.workExperiences.length ||
        preview.projects.length ||
        preview.educations.length),
  );

  return (
    <div className="rounded-xl border border-border-subtle bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-xs font-extrabold text-on-surface">结构化预览</h3>
          <p className="mt-1 font-sans text-[11px] text-on-surface-variant truncate">{resumeName}</p>
        </div>
        <span className="shrink-0 rounded bg-primary-container/20 px-2 py-1 font-mono text-[9px] font-bold text-primary">
          {tag ?? "待解析"}
        </span>
      </div>

      {!hasPreview ? (
        <div className="px-4 py-5 flex gap-3">
          <span className="material-symbols-outlined text-outline text-[22px]">article</span>
          <div>
            <p className="font-sans text-xs font-bold text-on-surface">暂无可预览的结构化内容</p>
            <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
              上传后系统会自动解析并结构化，完成后这里会展示提取出的关键信息。
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {preview.basicInfo.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {preview.basicInfo.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-lg bg-surface-container-low px-3 py-2">
                  <p className="font-mono text-[9px] text-outline">{item.label}</p>
                  <p className="mt-1 truncate font-sans text-xs font-bold text-on-surface">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {preview.summary && (
            <PreviewBlock icon="summarize" title="个人摘要">
              <p className="text-xs leading-relaxed text-on-surface-variant">{preview.summary}</p>
            </PreviewBlock>
          )}

          {preview.skills.length > 0 && (
            <PreviewBlock icon="psychology" title="技能关键词">
              <div className="flex flex-wrap gap-1.5">
                {preview.skills.slice(0, 16).map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-tertiary-container/25 px-2 py-1 font-sans text-[10px] font-bold text-on-tertiary-container"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </PreviewBlock>
          )}

          {preview.workExperiences.length > 0 && (
            <PreviewBlock icon="work" title="工作经历">
              <div className="space-y-3">
                {preview.workExperiences.slice(0, 3).map((item) => (
                  <ExperienceItem key={`${item.title}-${item.subtitle}`} {...item} />
                ))}
              </div>
            </PreviewBlock>
          )}

          {preview.projects.length > 0 && (
            <PreviewBlock icon="inventory_2" title="项目经历">
              <div className="space-y-3">
                {preview.projects.slice(0, 3).map((item) => (
                  <ExperienceItem key={`${item.title}-${item.description}`} title={item.title} description={item.description} />
                ))}
              </div>
            </PreviewBlock>
          )}

          {preview.educations.length > 0 && (
            <PreviewBlock icon="school" title="教育经历">
              <div className="space-y-2">
                {preview.educations.slice(0, 3).map((item) => (
                  <div key={`${item.title}-${item.subtitle}`} className="rounded-lg border border-border-subtle px-3 py-2">
                    <p className="font-sans text-xs font-extrabold text-on-surface">{item.title}</p>
                    {item.subtitle && (
                      <p className="mt-1 font-sans text-[11px] text-on-surface-variant">{item.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>
            </PreviewBlock>
          )}
        </div>
      )}
    </div>
  );
}

function ResumeOptimizationInsight({
  insight,
  onSelectSuggestion,
}: {
  insight: OptimizationInsight;
  onSelectSuggestion: (suggestion: OptimizationSuggestionWithSection) => void;
}) {
  const overview = insight.overview;
  const topSuggestions = insight.sections
    .flatMap((section) =>
      section.suggestions.map((suggestion) => ({
        ...suggestion,
        sectionTitle: section.title,
      })),
    )
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 8);

  return (
    <section className="rounded-xl border border-border-subtle bg-white overflow-hidden">
      <div className="border-b border-border-subtle px-4 py-3">
        <h3 className="font-sans text-xs font-extrabold text-on-surface">优化诊断</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
          基于简历内容和目标 JD 生成定位、风险和逐项修改建议。
        </p>
      </div>

      {overview && (
        <div className="px-4 py-4 space-y-3 border-b border-border-subtle">
          <div className="rounded-lg bg-primary-container/10 px-3 py-3">
            <p className="font-mono text-[9px] font-bold text-primary">候选人定位</p>
            <p className="mt-1 font-sans text-sm font-extrabold text-on-surface">{overview.headline}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InsightList title="核心亮点" icon="verified" items={overview.highlights} tone="primary" />
            <InsightList title="主要风险" icon="warning" items={overview.risks} tone="warning" />
          </div>

          {overview.rolePersonas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">target</span>
                <h4 className="font-sans text-xs font-extrabold text-on-surface">岗位画像</h4>
              </div>
              <div className="space-y-2">
                {overview.rolePersonas.slice(0, 3).map((persona) => (
                  <article key={`${persona.role}-${persona.fitReason}`} className="rounded-lg border border-border-subtle px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-sans text-xs font-extrabold text-primary">{persona.role}</p>
                      <span className="shrink-0 font-mono text-[8px] text-outline">FIT</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-on-surface">{persona.fitReason}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-on-surface-variant">
                      场景：{persona.bestScene || "待补充"} · 补强：{persona.gapTip || "待补充"}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {topSuggestions.length > 0 && (
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-sans text-xs font-extrabold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">fact_check</span>
              修改建议
            </h4>
            <span className="font-mono text-[9px] text-outline">{topSuggestions.length} ITEMS</span>
          </div>
          <div className="space-y-3">
            {topSuggestions.map((suggestion) => (
              <SuggestionInsightCard
                key={suggestion.id}
                suggestion={suggestion}
                onSelect={() => onSelectSuggestion(suggestion)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function InsightList({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: string;
  items: string[];
  tone: "primary" | "warning";
}) {
  const colorClass = tone === "primary" ? "text-primary" : "text-on-tertiary-container";
  const bgClass = tone === "primary" ? "bg-primary-container/10" : "bg-tertiary-container/15";

  return (
    <div className={`rounded-lg px-3 py-3 ${bgClass}`}>
      <div className="flex items-center gap-1.5">
        <span className={`material-symbols-outlined text-[15px] ${colorClass}`}>{icon}</span>
        <p className={`font-sans text-[11px] font-extrabold ${colorClass}`}>{title}</p>
      </div>
      <ul className="mt-2 space-y-1">
        {(items.length ? items : ["暂无"]).slice(0, 3).map((item, index) => (
          <li key={`${title}-${item}-${index}`} className="text-[10px] leading-relaxed text-on-surface-variant">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResumeOptimizeHistoryPanel({
  items,
  selectedId,
  isLoading,
  canSave,
  isSaving,
  onSelect,
  onRename,
  onNew,
  onSave,
}: {
  items: ResumeOptimizeHistoryItem[];
  selectedId: number | "current" | "new";
  isLoading: boolean;
  canSave: boolean;
  isSaving: boolean;
  onSelect: (item: ResumeOptimizeHistoryItem) => void;
  onRename: (item: ResumeOptimizeHistoryItem, label: string) => Promise<ResumeOptimizeHistoryItem>;
  onNew: () => void;
  onSave: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);

  const startRename = (event: React.MouseEvent, item: ResumeOptimizeHistoryItem) => {
    event.stopPropagation();
    setEditingId(item.id);
    setDraftLabel(item.label || `优化记录 v${item.version}`);
  };

  const submitRename = async (event: React.FormEvent, item: ResumeOptimizeHistoryItem) => {
    event.preventDefault();
    event.stopPropagation();
    const label = draftLabel.trim();
    if (!label || renamingId) return;
    setRenamingId(item.id);
    try {
      await onRename(item, label);
      setEditingId(null);
      setDraftLabel("");
    } finally {
      setRenamingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-border-subtle bg-white overflow-hidden">
      <div className="border-b border-border-subtle px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-sans text-xs font-extrabold text-on-surface">优化记录</h3>
          <p className="mt-1 text-[11px] text-on-surface-variant">一份简历 + 一个岗位 JD 对应一条记录</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="shrink-0 h-9 rounded-lg bg-surface-container-low px-3 font-sans text-[11px] font-extrabold text-primary flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          新增优化
        </button>
      </div>

      <div className="px-4 py-4 space-y-3">
        {canSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="w-full h-11 rounded-lg bg-primary-container text-on-primary-container font-sans text-xs font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[17px] ${isSaving ? "animate-spin" : ""}`}>
              {isSaving ? "progress_activity" : "save"}
            </span>
            {isSaving ? "保存中" : "保存当前优化结果"}
          </button>
        )}

        {isLoading ? (
          <div className="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center">
            <span className="material-symbols-outlined text-outline text-[20px] animate-spin">progress_activity</span>
            <p className="mt-1 text-[11px] text-on-surface-variant">正在读取历史记录</p>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.slice(0, 6).map((item) => {
              const snapshot = readJobSnapshot(item.content);
              const report = readJdMatchReport(readOptimizedJdMatchResult(item.content));
              const isSelected = selectedId === item.id;
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={item.id}
                  onClick={() => onSelect(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(item);
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                    isSelected ? "border-primary bg-primary-container/10" : "border-border-subtle bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {editingId === item.id ? (
                        <form onSubmit={(event) => void submitRename(event, item)} className="flex items-center gap-2">
                          <input
                            value={draftLabel}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setDraftLabel(event.target.value)}
                            className="min-w-0 h-8 rounded border border-primary/40 bg-white px-2 font-sans text-xs font-bold text-on-surface outline-none"
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={renamingId === item.id}
                            className="shrink-0 w-8 h-8 rounded bg-primary-container text-primary flex items-center justify-center disabled:opacity-60"
                            aria-label="保存优化稿名称"
                          >
                            <span className={`material-symbols-outlined text-[16px] ${renamingId === item.id ? "animate-spin" : ""}`}>
                              {renamingId === item.id ? "progress_activity" : "check"}
                            </span>
                          </button>
                        </form>
                      ) : (
                        <p className="font-sans text-xs font-extrabold text-on-surface truncate">
                          {item.label || snapshot.targetRole || `优化记录 v${item.version}`}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-[9px] text-outline">
                        {formatDateTime(item.createdAt)} · v{item.version}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[8px] font-bold text-primary">
                        {report ? `${Math.round(report.percent * 100)} MATCH` : "已保存"}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => startRename(event, item)}
                        className="w-7 h-7 rounded-full bg-white text-outline border border-border-subtle flex items-center justify-center"
                        aria-label="编辑优化稿名称"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center">
            <p className="font-sans text-xs font-bold text-on-surface">暂无历史优化记录</p>
            <p className="mt-1 text-[11px] text-on-surface-variant">生成结果后点击保存，下次进入可直接回看。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function JdMatchReportCard({ report }: { report: JdMatchReport }) {
  const topGaps = report.gaps.slice(0, 4);
  const keyMatches = report.matches
    .slice()
    .sort((left, right) => left.score - right.score)
    .slice(0, 5);

  return (
    <section className="rounded-xl border border-border-subtle bg-white overflow-hidden">
      <div className="border-b border-border-subtle px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-xs font-extrabold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[17px]">analytics</span>
            JD 匹配度
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
            {report.headline || "根据 JD 逐条要求、证据和缺口计算。"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-2xl font-extrabold text-primary">{Math.round(report.percent * 100)}</p>
          <p className="font-mono text-[9px] text-outline">MATCH</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {report.byCategory.map((item) => (
            <div key={item.key} className="rounded-lg bg-surface-container-low px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-sans text-[11px] font-bold text-on-surface">{item.label}</p>
                <p className="font-mono text-[10px] font-bold text-primary">{Math.round(item.score * 100)}</p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, Math.round(item.score * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {topGaps.length > 0 && (
          <div className="rounded-lg border border-tertiary-container/35 bg-tertiary-container/10 px-3 py-3">
            <p className="font-sans text-xs font-extrabold text-on-tertiary-container">优先补齐的 JD 缺口</p>
            <div className="mt-2 space-y-1.5">
              {topGaps.map((gap) => (
                <p key={`${gap.id}-${gap.text}`} className="text-[11px] leading-relaxed text-on-surface">
                  <span className="font-mono text-[9px] font-bold text-outline mr-1">{categoryLabel(gap.category)}</span>
                  {gap.text}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs font-extrabold text-on-surface">逐条要求证据</p>
            <span className="font-mono text-[9px] text-outline">{report.matches.length} REQS</span>
          </div>
          {keyMatches.map((match) => (
            <article key={`${match.requirementId}-${match.requirementText}`} className="rounded-lg border border-border-subtle px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 font-sans text-[11px] font-extrabold text-on-surface leading-relaxed">
                  {match.requirementText}
                </p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[8px] font-bold ${matchScoreTone(match.score)}`}>
                  {match.score === 1 ? "满足" : match.score >= 0.5 ? "泛提" : "缺失"}
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-on-surface-variant">{match.rationale}</p>
              {match.evidence.length > 0 && (
                <p className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-primary">
                  {match.evidence.slice(0, 2).join("\n")}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function JdMatchPendingCard({ hasJobDescription }: { hasJobDescription: boolean }) {
  return (
    <section className="rounded-xl border border-border-subtle bg-white overflow-hidden">
      <div className="border-b border-border-subtle px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-xs font-extrabold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[17px]">analytics</span>
            JD 匹配度
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
            当前优化结果还没有匹配度报告，重新点击底部按钮后会生成逐条 JD 要求评分。
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-2xl font-extrabold text-outline">--</p>
          <p className="font-mono text-[9px] text-outline">MATCH</p>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-lg bg-primary-container/10 px-3 py-3">
          <p className="font-sans text-xs font-extrabold text-primary">生成后会展示</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {["总匹配分", "分类得分", "JD 缺口", "证据定位"].map((item) => (
              <div key={item} className="rounded bg-white px-3 py-2 font-sans text-[11px] font-bold text-on-surface">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
            {hasJobDescription
              ? "已检测到目标 JD，可以直接重新开始简历优化生成报告。"
              : "请先填写目标岗位和 JD，再开始简历优化。"}
          </p>
        </div>
      </div>
    </section>
  );
}

function SuggestionInsightCard({
  suggestion,
  onSelect,
}: {
  key?: React.Key;
  suggestion: OptimizationSuggestionWithSection;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-lg border border-border-subtle overflow-hidden text-left bg-white active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-primary-container/50"
    >
      <div className="bg-surface-container-low px-3 py-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold text-primary">
            P{suggestion.priority} · {suggestion.sectionTitle} · {issueTypeLabel(suggestion.issueType)}
          </p>
          <h5 className="mt-1 font-sans text-xs font-extrabold text-on-surface">{suggestion.problem}</h5>
        </div>
        {typeof suggestion.jdRelevanceScore === "number" && (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-mono text-[8px] text-primary">
            JD {Math.round(suggestion.jdRelevanceScore * 100)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
        <div className="px-3 py-3 border-b border-border-subtle sm:border-b-0 sm:border-r">
          <p className="font-mono text-[9px] font-bold text-outline">原文</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-on-surface-variant">
            {suggestion.original || "原字段缺失或为空"}
          </p>
        </div>
        <div className="px-3 py-3 bg-primary-container/10">
          <p className="font-mono text-[9px] font-bold text-primary">建议</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-on-surface">
            {suggestion.suggestion}
          </p>
        </div>
      </div>
    </button>
  );
}

function SuggestionSourceDialog({
  suggestion,
  structuredContent,
  onClose,
}: {
  suggestion: OptimizationSuggestionWithSection;
  structuredContent: unknown;
  onClose: () => void;
}) {
  const source = resolveSuggestionSource(structuredContent, suggestion.location);

  return (
    <div className="fixed inset-0 z-[95] bg-black/45 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-border-subtle overflow-hidden flex flex-col">
        <div className="shrink-0 border-b border-border-subtle px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold text-primary">
              {suggestion.sectionTitle} · {issueTypeLabel(suggestion.issueType)}
            </p>
            <h3 className="mt-1 font-sans text-sm font-extrabold text-on-surface leading-snug">
              {suggestion.problem}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center active:scale-95"
            aria-label="关闭定位信息"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <section className="rounded-xl border border-primary-container/40 bg-primary-container/10 px-3 py-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]">{source.icon}</span>
              <div className="min-w-0">
                <h4 className="font-sans text-sm font-extrabold text-primary">定位到这段简历</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
                  {source.sectionLabel} · {source.itemLabel}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-sans text-sm font-extrabold text-on-surface">{source.title}</h4>
                {source.meta && (
                  <p className="mt-1 font-sans text-[11px] font-bold text-primary">{source.meta}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-surface-container-low px-2 py-1 font-mono text-[9px] text-outline">
                原简历
              </span>
            </div>

            {source.fields.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {source.fields.map((field) => (
                  <div key={`${field.label}-${field.value}`} className="rounded-lg bg-surface-container-low px-3 py-2">
                    <p className="font-mono text-[9px] font-bold text-outline">{field.label}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-on-surface">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {source.chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {source.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded bg-tertiary-container/25 px-2 py-1 font-sans text-[10px] font-bold text-on-tertiary-container"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3">
              <p className="font-mono text-[9px] font-bold text-outline">{source.contentLabel}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-6 text-on-surface">
                {source.content || "这段内容在原简历中为空，当前建议属于需要补充的信息。"}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-border-subtle px-3 py-3">
              <p className="font-mono text-[9px] font-bold text-outline">模型指出的问题</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-on-surface-variant">
                {suggestion.original || suggestion.problem || "原字段缺失或为空"}
              </p>
            </div>
            <div className="rounded-xl border border-primary-container/40 bg-primary-container/10 px-3 py-3">
              <p className="font-mono text-[9px] font-bold text-primary">建议怎么补</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-on-surface">
                {suggestion.suggestion}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ResumeOptimizationCompare({
  before,
  after,
  followUpInstruction,
  onFollowUpInstructionChange,
  onContinueOptimize,
  isContinuingOptimize,
  canContinue,
}: {
  before: StructuredPreview | null;
  after: StructuredPreview | null;
  followUpInstruction: string;
  onFollowUpInstructionChange: (value: string) => void;
  onContinueOptimize: () => void;
  isContinuingOptimize: boolean;
  canContinue: boolean;
}) {
  const hasAfter = Boolean(after && hasPreviewContent(after));
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border-subtle bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-xs font-extrabold text-on-surface">优化预览</h3>
          <p className="mt-1 text-[11px] text-on-surface-variant">对比优化前后的重点变化</p>
        </div>
        {hasAfter ? (
          <button
            type="button"
            onClick={() => setIsDetailOpen(true)}
            className="shrink-0 h-8 rounded-lg bg-primary-container/20 px-2.5 text-primary font-sans text-[10px] font-extrabold flex items-center gap-1 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_full</span>
            完整对比
          </button>
        ) : (
          <span className="material-symbols-outlined text-primary text-[20px]">compare_arrows</span>
        )}
      </div>

      {hasAfter ? (
        <div className="p-3 space-y-3">
          <button
            type="button"
            onClick={() => setIsDetailOpen(true)}
            className="w-full rounded-lg border border-primary-container/40 bg-primary-container/10 px-3 py-2.5 text-left flex items-center justify-between gap-3 active:scale-[0.99] transition-all"
          >
            <span>
              <span className="block font-sans text-xs font-extrabold text-primary">查看完整优化对比</span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-on-surface-variant">
                展开所有段落全文，逐项查看优化前后的表达变化。
              </span>
            </span>
            <span className="material-symbols-outlined text-primary text-[18px]">chevron_right</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <CompareColumn title="优化前" tone="muted" preview={before} />
            <CompareColumn title="优化后" tone="primary" preview={after} />
          </div>

          <div className="rounded-lg bg-surface-container-low px-3 py-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[17px]">tune</span>
              <h4 className="font-sans text-xs font-extrabold text-on-surface">继续优化</h4>
            </div>
            <textarea
              value={followUpInstruction}
              onChange={(event) => onFollowUpInstructionChange(event.target.value)}
              className="w-full h-20 resize-none rounded-lg border border-border-subtle bg-white px-3 py-2 font-sans text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
              placeholder="例如：更突出后端项目的高并发经验；把表达压缩得更像大厂简历；强化量化结果..."
            />
            <button
              type="button"
              onClick={onContinueOptimize}
              disabled={!canContinue || !followUpInstruction.trim() || isContinuingOptimize}
              className="w-full h-10 rounded-lg bg-primary-container text-on-primary-container font-sans text-xs font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all"
            >
              <span className={`material-symbols-outlined text-[17px] ${isContinuingOptimize ? "animate-spin" : ""}`}>
                {isContinuingOptimize ? "progress_activity" : "auto_fix_high"}
              </span>
              {isContinuingOptimize ? "继续优化中" : "按这个方向继续优化"}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-5 flex gap-3">
          <span className="material-symbols-outlined text-outline text-[22px]">auto_fix_off</span>
          <div>
            <p className="font-sans text-xs font-bold text-on-surface">暂无优化稿</p>
            <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
              完成首次优化后，这里会展示优化前和优化后的对比，并支持继续追改。
            </p>
          </div>
        </div>
      )}

      {isDetailOpen && hasAfter && (
        <FullCompareDialog
          before={before}
          after={after}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </div>
  );
}

function FullCompareDialog({
  before,
  after,
  onClose,
}: {
  before: StructuredPreview | null;
  after: StructuredPreview | null;
  onClose: () => void;
}) {
  const sections = buildDetailedCompareSections(before, after);

  return (
    <div className="fixed inset-0 z-[90] bg-black/45 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md max-h-[92vh] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-border-subtle overflow-hidden flex flex-col">
        <div className="shrink-0 border-b border-border-subtle px-4 py-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-sans text-sm font-extrabold text-on-surface">完整优化对比</h3>
            <p className="mt-1 text-[11px] text-on-surface-variant">全文展示，不截断；绿色区域为优化后表达。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center active:scale-95"
            aria-label="关闭完整对比"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="shrink-0 border-b border-border-subtle bg-white px-4 py-2 overflow-x-auto">
          <div className="flex gap-2">
            {sections.map((section) => (
              <a
                key={`nav-${section.id}`}
                href={`#${section.id}`}
                className="shrink-0 rounded-full bg-surface-container-low px-3 py-1.5 font-sans text-[10px] font-bold text-on-surface-variant"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {sections.length > 0 ? (
            sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-sans text-xs font-extrabold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px]">{section.icon}</span>
                    {section.title}
                  </h4>
                  <span className="font-mono text-[9px] text-outline">{section.rows.length} 项</span>
                </div>
                <div className="space-y-3">
                  {section.rows.map((row) => (
                    <CompareDetailRow key={`${section.id}-${row.label}`} row={row} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-outline-variant px-4 py-8 text-center">
              <p className="font-sans text-xs font-bold text-on-surface">暂无可对比内容</p>
              <p className="mt-1 text-[11px] text-on-surface-variant">完成优化后会在这里展示完整文本。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareDetailRow({ row }: { key?: React.Key; row: CompareRow }) {
  const changed = hasMeaningfulChange(row.before, row.after);

  return (
    <article className="rounded-xl border border-border-subtle overflow-hidden">
      <div className="border-b border-border-subtle bg-surface-container-low px-3 py-2 flex items-center justify-between gap-2">
        <h5 className="font-sans text-[11px] font-extrabold text-on-surface">{row.label}</h5>
        {changed && (
          <span className="shrink-0 rounded-full bg-primary-container/25 px-2 py-0.5 font-sans text-[9px] font-bold text-primary">
            已优化
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-0 border-border-subtle sm:grid-cols-2">
        <CompareTextPanel title="优化前" value={row.before} tone="muted" />
        <CompareTextPanel title="优化后" value={row.after} tone={changed ? "primary" : "muted"} />
      </div>
    </article>
  );
}

function CompareTextPanel({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "muted" | "primary";
}) {
  return (
    <div className={`min-w-0 px-3 py-3 ${tone === "primary" ? "bg-primary-container/10" : "bg-white"}`}>
      <p className={`font-mono text-[9px] font-bold ${tone === "primary" ? "text-primary" : "text-outline"}`}>
        {title}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-on-surface">
        {value || "暂无内容"}
      </p>
    </div>
  );
}

function CompareColumn({
  title,
  tone,
  preview,
}: {
  title: string;
  tone: "muted" | "primary";
  preview: StructuredPreview | null;
}) {
  const summary = preview ? buildPreviewSummary(preview) : [];
  const titleClass = tone === "primary" ? "text-primary" : "text-on-surface-variant";

  return (
    <div className="min-w-0 rounded-lg border border-border-subtle px-3 py-3">
      <h4 className={`font-sans text-xs font-extrabold ${titleClass}`}>{title}</h4>
      {summary.length > 0 ? (
        <div className="mt-2 space-y-2">
          {summary.map((item) => (
            <div key={`${title}-${item.label}`} className="min-w-0">
              <p className="font-mono text-[8px] text-outline">{item.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-on-surface line-clamp-3">{item.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">暂无内容</p>
      )}
    </div>
  );
}

function PreviewBlock({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-primary text-[17px]">{icon}</span>
        <h4 className="font-sans text-xs font-extrabold text-on-surface">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function ExperienceItem({
  title,
  subtitle,
  description,
}: {
  key?: React.Key;
  title: string;
  subtitle?: string;
  description?: string;
}) {
  return (
    <article className="rounded-lg border border-border-subtle px-3 py-2">
      <p className="font-sans text-xs font-extrabold text-on-surface">{title}</p>
      {subtitle && <p className="mt-1 font-sans text-[11px] text-primary font-bold">{subtitle}</p>}
      {description && (
        <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant line-clamp-3">{description}</p>
      )}
    </article>
  );
}

function buildStructuredPreview(value: unknown): StructuredPreview | null {
  if (!isRecord(value)) return null;

  const basicInfo = isRecord(value.basicInfo) ? value.basicInfo : {};
  const workExperiences = toRecordArray(value.workExperiences).map((item) => ({
    title: [readString(item.company), readString(item.position)].filter(Boolean).join(" · ") || "未命名经历",
    subtitle: [readString(item.startDate), readString(item.endDate)].filter(Boolean).join(" - "),
    description: readString(item.description),
  }));
  const projects = toRecordArray(value.projects).map((item) => ({
    title: readString(item.name) || "未命名项目",
    description: readString(item.description),
  }));
  const educations = toRecordArray(value.educations).map((item) => ({
    title: readString(item.school) || "未命名学校",
    subtitle: [readString(item.major), readString(item.degree)].filter(Boolean).join(" · "),
  }));

  return {
    basicInfo: [
      { label: "姓名", value: readString(basicInfo.name) },
      { label: "电话", value: readString(basicInfo.phone) },
      { label: "邮箱", value: readString(basicInfo.email) },
    ].filter((item) => item.value),
    summary: readString(value.summary),
    skills: toStringArray(value.skills),
    workExperiences,
    projects,
    educations,
  };
}

function buildDetailedCompareSections(
  before: StructuredPreview | null,
  after: StructuredPreview | null,
): CompareSection[] {
  const basicInfoRows = uniqueLabels([
    ...(before?.basicInfo.map((item) => item.label) ?? []),
    ...(after?.basicInfo.map((item) => item.label) ?? []),
  ]).map((label) => ({
    label,
    before: before?.basicInfo.find((item) => item.label === label)?.value ?? "",
    after: after?.basicInfo.find((item) => item.label === label)?.value ?? "",
  }));

  const sections: CompareSection[] = [
    {
      id: "compare-basic",
      title: "基础信息",
      icon: "badge",
      rows: basicInfoRows,
    },
    {
      id: "compare-summary",
      title: "个人摘要",
      icon: "summarize",
      rows: compactRows([{ label: "摘要", before: before?.summary ?? "", after: after?.summary ?? "" }]),
    },
    {
      id: "compare-skills",
      title: "技能关键词",
      icon: "psychology",
      rows: compactRows([
        {
          label: "技能",
          before: before?.skills.join(" / ") ?? "",
          after: after?.skills.join(" / ") ?? "",
        },
      ]),
    },
    {
      id: "compare-work",
      title: "工作经历",
      icon: "work",
      rows: buildIndexedRows(before?.workExperiences ?? [], after?.workExperiences ?? [], "工作经历"),
    },
    {
      id: "compare-projects",
      title: "项目经历",
      icon: "inventory_2",
      rows: buildIndexedRows(before?.projects ?? [], after?.projects ?? [], "项目"),
    },
    {
      id: "compare-education",
      title: "教育经历",
      icon: "school",
      rows: buildIndexedRows(before?.educations ?? [], after?.educations ?? [], "教育"),
    },
  ];

  return sections
    .map((section) => ({ ...section, rows: compactRows(section.rows) }))
    .filter((section) => section.rows.length > 0);
}

function buildIndexedRows(
  beforeItems: Array<{ title: string; subtitle?: string; description?: string }>,
  afterItems: Array<{ title: string; subtitle?: string; description?: string }>,
  fallbackLabel: string,
) {
  const length = Math.max(beforeItems.length, afterItems.length);
  return Array.from({ length }, (_, index) => {
    const before = beforeItems[index];
    const after = afterItems[index];
    const label = after?.title || before?.title || `${fallbackLabel} ${index + 1}`;

    return {
      label,
      before: formatPreviewItem(before),
      after: formatPreviewItem(after),
    };
  });
}

function formatPreviewItem(item?: { title: string; subtitle?: string; description?: string }) {
  if (!item) return "";
  return [item.title, item.subtitle, item.description].filter(Boolean).join("\n");
}

function compactRows(rows: CompareRow[]) {
  return rows.filter((row) => row.before.trim() || row.after.trim());
}

function uniqueLabels(labels: string[]) {
  return Array.from(new Set(labels.filter(Boolean)));
}

function hasMeaningfulChange(before: string, after: string) {
  return normalizeCompareText(before) !== normalizeCompareText(after);
}

function normalizeCompareText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function hasPreviewContent(preview: StructuredPreview) {
  return Boolean(
    preview.basicInfo.length ||
      preview.summary ||
      preview.skills.length ||
      preview.workExperiences.length ||
      preview.projects.length ||
      preview.educations.length,
  );
}

function buildPreviewSummary(preview: StructuredPreview) {
  const items: Array<{ label: string; value: string }> = [];
  const name = preview.basicInfo.find((item) => item.label === "姓名")?.value;
  const contact = preview.basicInfo
    .filter((item) => item.label !== "姓名")
    .map((item) => item.value)
    .join(" · ");

  if (name || contact) {
    items.push({ label: "基础信息", value: [name, contact].filter(Boolean).join(" · ") });
  }
  if (preview.summary) {
    items.push({ label: "摘要", value: preview.summary });
  }
  if (preview.skills.length > 0) {
    items.push({ label: "技能", value: preview.skills.slice(0, 8).join(" / ") });
  }
  if (preview.workExperiences.length > 0) {
    items.push({
      label: "经历",
      value: preview.workExperiences
        .slice(0, 2)
        .map((item) => [item.title, item.description].filter(Boolean).join("："))
        .join("\n"),
    });
  }
  if (preview.projects.length > 0) {
    items.push({
      label: "项目",
      value: preview.projects
        .slice(0, 2)
        .map((item) => [item.title, item.description].filter(Boolean).join("："))
        .join("\n"),
    });
  }
  if (preview.educations.length > 0) {
    items.push({
      label: "教育",
      value: preview.educations
        .slice(0, 2)
        .map((item) => [item.title, item.subtitle].filter(Boolean).join(" · "))
        .join("\n"),
    });
  }

  return items.slice(0, 5);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(readString).filter(Boolean);
}

function toRecordArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function readNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function readOptionalNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value > 1 && value <= 100) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

function readSuggestionLocation(value: unknown, fallbackSection: string) {
  if (!isRecord(value)) {
    return { section: fallbackSection };
  }
  return {
    section: readString(value.section) || fallbackSection,
    itemIndex: readOptionalNumber(value.itemIndex),
  };
}

function resolveSuggestionSource(
  structuredContent: unknown,
  location: { section: string; itemIndex?: number },
): SuggestionSourceView {
  const root = isRecord(structuredContent) ? structuredContent : {};
  const section = normalizeLocationSection(location.section);
  const itemIndex = Number.isInteger(location.itemIndex) ? location.itemIndex : undefined;
  const sectionValue = root[section];
  const sectionLabelValue = sectionTitle(section);
  const fallback: SuggestionSourceView = {
    sectionLabel: sectionLabelValue,
    itemLabel: typeof itemIndex === "number" ? `第 ${itemIndex + 1} 条` : "整体模块",
    icon: sectionIcon(section),
    title: sectionLabelValue,
    meta: "",
    contentLabel: "原文内容",
    content: "",
    fields: [],
    chips: [],
  };

  if (section === "skills") {
    return {
      ...fallback,
      title: "技能关键词",
      contentLabel: "技能列表",
      chips: toStringArray(sectionValue),
    };
  }

  if (Array.isArray(sectionValue)) {
    const resolvedIndex = typeof itemIndex === "number" ? itemIndex : 0;
    const item = sectionValue[resolvedIndex];
    if (!isRecord(item)) {
      return fallback;
    }
    return buildArrayItemSource(section, item, resolvedIndex, fallback);
  }

  if (isRecord(sectionValue)) {
    const fields = objectFields(sectionValue);
    const title = readString(sectionValue.name) || readString(sectionValue.title) || sectionLabelValue;
    return { ...fallback, title, fields };
  }

  if (typeof sectionValue === "string") {
    return {
      ...fallback,
      title: sectionLabelValue,
      contentLabel: sectionLabelValue,
      content: sectionValue,
    };
  }

  return fallback;
}

function buildArrayItemSource(
  section: string,
  item: Record<string, unknown>,
  index: number,
  fallback: SuggestionSourceView,
): SuggestionSourceView {
  if (section === "workExperiences") {
    const title = [readString(item.company), readString(item.position)].filter(Boolean).join(" · ") || "未命名工作经历";
    const meta = [readString(item.startDate), readString(item.endDate)].filter(Boolean).join(" - ");
    return {
      ...fallback,
      itemLabel: `第 ${index + 1} 条工作经历`,
      title,
      meta,
      contentLabel: "工作内容",
      content: readString(item.description),
    };
  }

  if (section === "projects") {
    return {
      ...fallback,
      itemLabel: `第 ${index + 1} 条项目经历`,
      title: readString(item.name) || readString(item.title) || "未命名项目",
      meta: [readString(item.role), readString(item.startDate), readString(item.endDate)].filter(Boolean).join(" · "),
      contentLabel: "项目简介",
      content: readString(item.description),
    };
  }

  if (section === "educations") {
    const title = readString(item.school) || "未命名学校";
    const meta = [readString(item.major), readString(item.degree)].filter(Boolean).join(" · ");
    const fields = [
      { label: "学校", value: readString(item.school) },
      { label: "专业", value: readString(item.major) },
      { label: "学历", value: readString(item.degree) },
      { label: "时间", value: [readString(item.startDate), readString(item.endDate)].filter(Boolean).join(" - ") },
    ].filter((field) => field.value);
    return {
      ...fallback,
      itemLabel: `第 ${index + 1} 条教育经历`,
      title,
      meta,
      contentLabel: "教育信息",
      content: readString(item.description),
      fields,
    };
  }

  return {
    ...fallback,
    itemLabel: `第 ${index + 1} 条${fallback.sectionLabel}`,
    title: readString(item.name) || readString(item.title) || fallback.sectionLabel,
    content: readString(item.description) || formatFieldValue(item),
  };
}

function normalizeLocationSection(section: string) {
  const aliases: Record<string, string> = {
    workExperience: "workExperiences",
    project: "projects",
    education: "educations",
    skill: "skills",
    basic: "basicInfo",
  };
  return aliases[section] ?? section;
}

function objectFields(value: Record<string, unknown>) {
  return Object.entries(value).map(([key, fieldValue]) => ({
    label: fieldLabel(key),
    value: formatFieldValue(fieldValue),
  }));
}

function formatFieldValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatFieldValue).filter(Boolean).join("、");
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, fieldValue]) => [fieldLabel(key), formatFieldValue(fieldValue)].filter(Boolean).join("："))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function fieldLabel(key: string) {
  const labels: Record<string, string> = {
    name: "姓名",
    phone: "电话",
    email: "邮箱",
    summary: "个人摘要",
    skills: "技能",
    company: "公司",
    position: "职位",
    startDate: "开始时间",
    endDate: "结束时间",
    description: "描述",
    school: "学校",
    major: "专业",
    degree: "学历",
  };
  return labels[key] ?? key;
}

function sectionTitle(section: string) {
  const titles: Record<string, string> = {
    basicInfo: "基础信息",
    summary: "个人摘要",
    skills: "技能关键词",
    workExperiences: "工作经历",
    projects: "项目经历",
    educations: "教育经历",
  };
  return titles[section] ?? "综合建议";
}

function sectionIcon(section: string) {
  const icons: Record<string, string> = {
    basicInfo: "badge",
    summary: "summarize",
    skills: "psychology",
    workExperiences: "work",
    projects: "inventory_2",
    educations: "school",
  };
  return icons[section] ?? "fact_check";
}

function jdCategoryKeys() {
  return [
    { key: "mustHave", label: "必备条件" },
    { key: "degree", label: "学历要求" },
    { key: "experience", label: "经验要求" },
    { key: "niceToHave", label: "加分项" },
    { key: "techStack", label: "技术栈" },
    { key: "jobDuties", label: "岗位职责" },
  ];
}

function categoryLabel(category: string) {
  return jdCategoryKeys().find((item) => item.key === category)?.label ?? "要求";
}

function matchScoreTone(score: number) {
  if (score >= 1) return "bg-primary-container/20 text-primary";
  if (score >= 0.5) return "bg-tertiary-container/25 text-on-tertiary-container";
  return "bg-red-50 text-red-600";
}

function issueTypeLabel(issueType: string) {
  const labels: Record<string, string> = {
    missing_info: "信息缺失",
    structure_issue: "结构问题",
    wording_issue: "表达优化",
    redundancy: "内容冗余",
    inconsistent_format: "格式不一致",
    timeline_issue: "时间线",
    low_signal_content: "信息密度",
    privacy_risk: "隐私风险",
    jd_alignment: "JD贴合",
    keyword_optimization: "关键词",
    cross_section_issue: "跨模块",
    other: "综合",
  };
  return labels[issueType] ?? "综合";
}
