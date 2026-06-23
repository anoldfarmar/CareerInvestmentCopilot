import React, { useEffect, useMemo, useState } from "react";
import { BackendKnowledgeBase, BackendKnowledgeRecord, backendApi } from "../api/backend";
import { InterviewReport } from "../types";
import { AudioReviewResult } from "./AudioReviewView";

interface KnowledgeBaseViewProps {
  reports: InterviewReport[];
  onSelectReport: (report: InterviewReport) => void;
  onNavigate: (viewName: "workbench" | "matching" | "knowledge" | "profile" | "interview-setup" | "mock-interview" | "report-detail") => void;
  onAddSimulatedLog: () => void;
}

export default function KnowledgeBaseView(_: KnowledgeBaseViewProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<BackendKnowledgeBase[]>([]);
  const [activeId, setActiveId] = useState("");
  const [activeBase, setActiveBase] = useState<BackendKnowledgeBase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showBaseForm, setShowBaseForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [baseName, setBaseName] = useState("面试复盘知识库");
  const [baseDescription, setBaseDescription] = useState("");
  const [recordTitle, setRecordTitle] = useState("");
  const [recordTranscript, setRecordTranscript] = useState("");
  const [expandedRecordId, setExpandedRecordId] = useState("");

  const records = activeBase?.records ?? [];
  const builtCount = useMemo(
    () => records.filter((record) => record.buildStatus === "built").length,
    [records],
  );
  const chunkCount = useMemo(
    () => records.reduce((sum, record) => sum + (Array.isArray(record.chunks) ? record.chunks.length : 0), 0),
    [records],
  );

  useEffect(() => {
    void loadKnowledgeBases();
  }, []);

  useEffect(() => {
    if (activeId) {
      void loadKnowledgeBase(activeId);
    }
  }, [activeId]);

  const loadKnowledgeBases = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await backendApi.knowledgeBases();
      setKnowledgeBases(response.items);
      setActiveId((current) => current || response.items[0]?.id || "");
      if (!response.items[0]) {
        setActiveBase(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "知识库加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const loadKnowledgeBase = async (id: string) => {
    setError("");
    try {
      const detail = await backendApi.knowledgeBase(id);
      setActiveBase(detail);
      setExpandedRecordId((current) =>
        current && detail.records?.some((record) => record.id === current) ? current : "",
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "知识库详情加载失败");
    }
  };

  const handleCreateBase = async () => {
    if (!baseName.trim() || isSaving) return;

    setIsSaving(true);
    setError("");
    try {
      const created = await backendApi.createKnowledgeBase({
        name: baseName.trim(),
        description: baseDescription.trim() || undefined,
        focusAreas: ["真实面试复盘", "模拟面试出题", "简历优化素材"],
      });
      setShowBaseForm(false);
      setBaseDescription("");
      await loadKnowledgeBases();
      setActiveId(created.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "知识库创建失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRecord = async () => {
    if (!activeId || !recordTitle.trim() || !recordTranscript.trim() || isSaving) return;

    setIsSaving(true);
    setError("");
    try {
      await backendApi.createManualKnowledgeRecord(activeId, {
        title: recordTitle.trim(),
        interviewDate: new Date().toISOString().slice(0, 10),
        transcript: recordTranscript.trim(),
      });
      setShowRecordForm(false);
      setRecordTitle("");
      setRecordTranscript("");
      await loadKnowledgeBase(activeId);
      await loadKnowledgeBases();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "记录创建失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuildRecord = async (record: BackendKnowledgeRecord) => {
    if (!activeId || isSaving) return;

    setIsSaving(true);
    setError("");
    try {
      await backendApi.buildKnowledgeRecord(activeId, record.id);
      await loadKnowledgeBase(activeId);
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "知识记录构建失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (record: BackendKnowledgeRecord) => {
    if (!activeId || !window.confirm(`确定删除「${record.title}」吗？`)) return;

    setIsSaving(true);
    setError("");
    try {
      await backendApi.deleteKnowledgeRecord(activeId, record.id);
      await loadKnowledgeBase(activeId);
      await loadKnowledgeBases();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "记录删除失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="knowledge-base-root" className="animate-fade-in-up">
      <header className="bg-white sticky top-0 z-50 border-b border-border-subtle">
        <div className="flex items-center justify-between px-5 h-16 w-full max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">library_books</span>
            <h1 className="text-base font-bold text-primary font-sans">知识库</h1>
          </div>
          <button
            onClick={() => setShowBaseForm((value) => !value)}
            className="p-2 rounded-full hover:bg-primary-container/10 text-on-surface-variant transition-all"
            title="新建知识库"
          >
            <span className="material-symbols-outlined">add_box</span>
          </button>
        </div>
      </header>

      <main className="pb-32 px-5 max-w-md mx-auto space-y-6">
        <section className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-on-surface-variant flex items-center gap-2 uppercase tracking-wider">
              <span className="w-1 h-3 bg-primary rounded-full"></span>
              知识库空间
            </h2>
            {isLoading && <span className="text-[10px] font-mono text-outline">加载中</span>}
          </div>

          {showBaseForm && (
            <div className="bg-white border border-border-subtle rounded-xl p-4 space-y-3">
              <input
                value={baseName}
                onChange={(event) => setBaseName(event.target.value)}
                className="w-full h-11 rounded-xl border border-border-subtle bg-white px-3 text-sm outline-none focus:border-primary"
                placeholder="知识库名称"
              />
              <textarea
                value={baseDescription}
                onChange={(event) => setBaseDescription(event.target.value)}
                className="w-full h-20 resize-none rounded-xl border border-border-subtle bg-white px-3 py-2 text-xs outline-none focus:border-primary"
                placeholder="描述这个知识库沉淀哪些面试经验"
              />
              <button
                onClick={handleCreateBase}
                disabled={isSaving || !baseName.trim()}
                className="w-full h-10 rounded-xl bg-primary-container text-on-primary-container text-xs font-extrabold disabled:opacity-50"
              >
                {isSaving ? "创建中" : "创建知识库"}
              </button>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5">
            {knowledgeBases.map((base) => (
              <button
                key={base.id}
                onClick={() => setActiveId(base.id)}
                className={`flex-shrink-0 w-40 rounded-xl border bg-white p-3 text-left ${
                  activeId === base.id ? "border-primary shadow-sm" : "border-border-subtle"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="material-symbols-outlined text-primary text-[20px]">dataset</span>
                  <span className="font-mono text-[9px] text-outline">{base.recordCount ?? 0} 条</span>
                </div>
                <p className="font-sans text-xs font-extrabold text-on-surface mt-2 truncate">{base.name}</p>
                <p className="font-sans text-[10px] text-on-surface-variant mt-1 truncate">
                  {base.description || "面试知识沉淀"}
                </p>
              </button>
            ))}
            {!isLoading && knowledgeBases.length === 0 && (
              <div className="w-full rounded-xl border border-dashed border-border-subtle bg-white/60 px-4 py-6 text-center">
                <p className="text-xs font-extrabold text-on-surface">还没有知识库</p>
                <p className="text-[11px] text-outline mt-1">新建一个空间后，可以保存面试复盘文本。</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-mono font-bold text-on-surface-variant mb-3 flex items-center gap-2 uppercase tracking-wider">
            <span className="w-1 h-3 bg-primary rounded-full"></span>
            数据概览
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Metric value={records.length} label="记录" />
            <Metric value={builtCount} label="已构建" />
            <Metric value={chunkCount} label="Chunks" />
          </div>
        </section>

        {activeBase && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-on-surface-variant flex items-center gap-2 uppercase tracking-wider">
                <span className="w-1 h-3 bg-primary rounded-full"></span>
                知识记录
              </h2>
              <button
                onClick={() => setShowRecordForm((value) => !value)}
                className="text-[10px] font-mono font-bold text-primary flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">post_add</span>
                手动新增
              </button>
            </div>

            {showRecordForm && (
              <div className="bg-white border border-border-subtle rounded-xl p-4 space-y-3">
                <input
                  value={recordTitle}
                  onChange={(event) => setRecordTitle(event.target.value)}
                  className="w-full h-11 rounded-xl border border-border-subtle bg-white px-3 text-sm outline-none focus:border-primary"
                  placeholder="记录标题，例如：腾讯产品一面"
                />
                <textarea
                  value={recordTranscript}
                  onChange={(event) => setRecordTranscript(event.target.value)}
                  className="w-full h-28 resize-none rounded-xl border border-border-subtle bg-white px-3 py-2 text-xs outline-none focus:border-primary"
                  placeholder="粘贴面试问题、回答、复盘结论..."
                />
                <button
                  onClick={handleCreateRecord}
                  disabled={isSaving || !recordTitle.trim() || !recordTranscript.trim()}
                  className="w-full h-10 rounded-xl bg-primary-container text-on-primary-container text-xs font-extrabold disabled:opacity-50"
                >
                  {isSaving ? "保存中" : "保存记录"}
                </button>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="space-y-3">
              {records.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  disabled={isSaving}
                  onBuild={() => handleBuildRecord(record)}
                  onDelete={() => handleDeleteRecord(record)}
                  isExpanded={expandedRecordId === record.id}
                  onToggleExpand={() =>
                    setExpandedRecordId((current) => (current === record.id ? "" : record.id))
                  }
                />
              ))}
              {records.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-border-subtle rounded-xl text-outline text-xs bg-white">
                  暂无知识记录
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-border-subtle flex flex-col items-center justify-center text-center">
      <span className="text-2xl font-bold text-primary font-sans">{value}</span>
      <span className="text-[10px] font-mono text-on-surface-variant mt-1 leading-snug">{label}</span>
    </div>
  );
}

function RecordCard({
  record,
  disabled,
  onBuild,
  onDelete,
  isExpanded,
  onToggleExpand,
}: {
  key?: React.Key;
  record: BackendKnowledgeRecord;
  disabled: boolean;
  onBuild: () => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const isBuilt = record.buildStatus === "built";

  return (
    <div className="bg-white border border-border-subtle rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">
              {record.sourceType === "audio" ? "settings_voice" : "article"}
            </span>
            <h3 className="font-sans text-xs font-bold truncate text-on-surface">{record.title}</h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="bg-zinc-100 text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-mono font-bold">
              {record.interviewDate}
            </span>
            <span className="bg-primary-container/15 text-primary px-2 py-0.5 rounded text-[10px] font-mono font-bold">
              {statusLabel(record.buildStatus)}
            </span>
            {Array.isArray(record.chunks) && record.chunks.length > 0 && (
              <span className="bg-zinc-100 text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                {record.chunks.length} chunks
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-on-surface-variant mt-3 line-clamp-3">
            {record.transcript || record.buildError || "暂无文本内容"}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleExpand}
            className="w-8 h-8 rounded-full text-outline hover:bg-primary-container/10 hover:text-primary flex items-center justify-center"
            title="查看复盘详情"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isExpanded ? "expand_less" : "visibility"}
            </span>
          </button>
          <button
            onClick={onDelete}
            disabled={disabled}
            className="w-8 h-8 rounded-full text-outline hover:bg-red-50 hover:text-red-600 flex items-center justify-center disabled:opacity-50"
            title="删除记录"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
      {!isBuilt && record.transcript?.trim() && (
        <button
          onClick={onBuild}
          disabled={disabled}
          className="mt-3 w-full h-10 rounded-xl border border-primary-container/50 bg-white text-primary font-sans text-xs font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
          构建知识片段
        </button>
      )}
      {isExpanded && (
        <div className="mt-4 border-t border-border-subtle pt-4">
          <AudioReviewResult record={record} />
        </div>
      )}
    </div>
  );
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
