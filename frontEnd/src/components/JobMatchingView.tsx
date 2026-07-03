import React, { useEffect, useState } from "react";
import { BackendJobRecommendation, backendApi, mapBackendJob } from "../api/backend";
import { Job } from "../types";

interface JobMatchingViewProps {
  jobs: Job[];
  onDeleteJob: (id: string) => Promise<void>;
  onUpdateJob: (id: string, input: Partial<Pick<Job, "notes">>) => Promise<Job>;
  onJobsChanged: (jobs: Job[]) => void;
  onNavigate: (viewName: "workbench" | "matching" | "knowledge" | "profile" | "interview-setup" | "mock-interview") => void;
  onSelectJobForSetup: (company: string, position: string) => void;
}

const defaultRoles = "数据分析实习, AI应用开发实习, Agent评测实习";
const defaultCities = "深圳, 广州, 上海, 北京, 远程";
const defaultSkills = "Python, SQL, LLM, Agent, RAG, 数据分析";

function splitInput(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function companyFromRecommendation(item: BackendJobRecommendation) {
  if (item.source === "企业官网") return "企业官网";
  return item.source || "公开招聘";
}

export default function JobMatchingView({
  jobs,
  onDeleteJob,
  onUpdateJob,
  onJobsChanged,
  onNavigate,
  onSelectJobForSetup,
}: JobMatchingViewProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [roles, setRoles] = useState(defaultRoles);
  const [cities, setCities] = useState(defaultCities);
  const [skills, setSkills] = useState(defaultSkills);
  const [availability, setAvailability] = useState("实习 可尽快到岗");
  const [mode, setMode] = useState<"fast" | "standard" | "broad">("standard");
  const [recommendations, setRecommendations] = useState<BackendJobRecommendation[]>([]);
  const [intentSummary, setIntentSummary] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [editingNoteJobId, setEditingNoteJobId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNoteJobId, setSavingNoteJobId] = useState<string | null>(null);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualCompany, setManualCompany] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [isSavingManualJob, setIsSavingManualJob] = useState(false);

  useEffect(() => {
    setSavedUrls(new Set(jobs.map((job) => job.sourceUrl).filter(Boolean) as string[]));
  }, [jobs]);

  const handleRecommend = async () => {
    setIsSearching(true);
    setError("");

    try {
      const result = await backendApi.recommendJobs({
        targetRoles: splitInput(roles),
        cities: splitInput(cities),
        skills: splitInput(skills),
        availability,
        mode,
        maxResults: mode === "broad" ? 28 : mode === "fast" ? 12 : 18,
      });
      setRecommendations(result.recommendations);
      setIntentSummary([
        result.intent.targetRoles.slice(0, 3).join(" / "),
        result.intent.cities.slice(0, 3).join(" / "),
        result.intent.skills.slice(0, 5).join(" / "),
      ].filter(Boolean).join(" · "));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "岗位推荐搜索失败");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveRecommendation = async (item: BackendJobRecommendation) => {
    setError("");
    try {
      const created = await backendApi.createJob({
        title: item.title,
        company: companyFromRecommendation(item),
        description: `${item.summary}\n\n推荐层级：${item.tier}\n推荐原因：${item.tierReason}`,
        sourceUrl: item.url,
        status: "interested",
      });
      const nextJob = mapBackendJob(created);
      onJobsChanged([
        nextJob,
        ...jobs.filter((job) => job.id !== nextJob.id),
      ]);
      setSavedUrls((current) => new Set(current).add(item.url));
      setSelectedJobId(nextJob.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存岗位失败");
    }
  };

  const handleSaveManualJob = async () => {
    if (isSavingManualJob) return;

    const company = manualCompany.trim();
    const title = manualTitle.trim();
    const description = manualDescription.trim();
    const sourceUrl = manualUrl.trim();

    if (!company || !title || !description || !sourceUrl) {
      setError("请填写公司、岗位、JD 和岗位链接");
      return;
    }

    if (!/^https?:\/\//i.test(sourceUrl)) {
      setError("岗位链接需要以 http:// 或 https:// 开头");
      return;
    }

    setError("");
    setIsSavingManualJob(true);
    try {
      const created = await backendApi.createJob({
        title,
        company,
        description,
        sourceUrl,
        status: "interested",
      });
      const nextJob = mapBackendJob(created);
      onJobsChanged([
        nextJob,
        ...jobs.filter((job) => job.id !== nextJob.id),
      ]);
      setSelectedJobId(nextJob.id);
      setSavedUrls((current) => new Set(current).add(sourceUrl));
      setManualCompany("");
      setManualTitle("");
      setManualDescription("");
      setManualUrl("");
      setIsManualFormOpen(false);
    } catch (manualError) {
      setError(manualError instanceof Error ? manualError.message : "手动保存岗位失败");
    } finally {
      setIsSavingManualJob(false);
    }
  };

  const handleDeleteJob = async (job: Job) => {
    if (!window.confirm(`确定删除「${job.company} - ${job.title}」吗？`)) return;

    setError("");
    setDeletingJobId(job.id);
    try {
      await onDeleteJob(job.id);
      setSelectedJobId((current) => (current === job.id ? null : current));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "岗位删除失败，请稍后重试");
    } finally {
      setDeletingJobId(null);
    }
  };

  const startEditNote = (job: Job) => {
    setEditingNoteJobId(job.id);
    setNoteDraft(job.notes || "");
  };

  const handleSaveNote = async (job: Job) => {
    if (savingNoteJobId) return;
    setSavingNoteJobId(job.id);
    setError("");
    try {
      const updated = await onUpdateJob(job.id, { notes: noteDraft.trim() });
      onJobsChanged(jobs.map((item) => (item.id === updated.id ? updated : item)));
      setEditingNoteJobId(null);
      setNoteDraft("");
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "保存备注失败");
    } finally {
      setSavingNoteJobId(null);
    }
  };

  return (
    <div id="job-matching-root" className="animate-fade-in-up">
      <header className="w-full top-0 sticky bg-white border-b border-border-subtle flex items-center justify-between px-5 h-16 z-50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">work</span>
          <h1 className="font-sans text-lg font-bold text-primary">岗位匹配</h1>
        </div>
        <button
          onClick={handleRecommend}
          disabled={isSearching}
          className="material-symbols-outlined text-on-surface-variant hover:text-primary disabled:opacity-40 active:scale-95 transition-all"
        >
          refresh
        </button>
      </header>

      <main className="w-full max-w-md mx-auto px-5 pt-4 pb-28 space-y-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-bold text-on-surface">推荐条件</h2>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as "fast" | "standard" | "broad")}
              className="h-8 rounded-lg border border-border-subtle bg-white px-2 text-xs font-bold text-primary outline-none"
            >
              <option value="fast">快速</option>
              <option value="standard">标准</option>
              <option value="broad">广泛</option>
            </select>
          </div>

          <div className="bg-white border border-border-subtle rounded-xl p-4 space-y-3">
            <label className="block">
              <span className="text-[11px] font-bold text-on-surface-variant">目标岗位</span>
              <textarea
                value={roles}
                onChange={(event) => setRoles(event.target.value)}
                className="mt-1 min-h-16 w-full resize-none rounded-lg border border-border-subtle px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-on-surface-variant">城市</span>
              <input
                value={cities}
                onChange={(event) => setCities(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border-subtle px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-on-surface-variant">技能关键词</span>
              <input
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border-subtle px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-on-surface-variant">求职状态</span>
              <input
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border-subtle px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              onClick={handleRecommend}
              disabled={isSearching}
              className="w-full h-11 bg-primary text-white rounded-lg font-sans text-sm font-bold flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 transition-transform"
            >
              <span className={`material-symbols-outlined text-[18px] ${isSearching ? "animate-spin" : ""}`}>
                {isSearching ? "sync" : "travel_explore"}
              </span>
              {isSearching ? "正在搜索公开岗位" : "生成岗位推荐"}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-bold text-on-surface">公开岗位推荐</h2>
            <span className="font-mono text-[10px] font-bold text-primary bg-primary-container/20 px-2 py-0.5 rounded">
              {recommendations.length} JOBS
            </span>
          </div>
          {intentSummary && (
            <p className="text-xs text-on-surface-variant leading-relaxed">{intentSummary}</p>
          )}

          <div className="flex flex-col gap-3">
            {recommendations.map((item) => {
              const saved = savedUrls.has(item.url);
              return (
                <div key={item.url} className="bg-white border border-border-subtle rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="rounded bg-primary-container/25 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {item.tier}
                        </span>
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                          {item.source}
                        </span>
                      </div>
                      <h3 className="font-sans text-sm font-bold text-on-surface leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-outline">#{item.index}</span>
                  </div>
                  <p className="font-sans text-xs text-on-surface-variant leading-relaxed line-clamp-3">
                    {item.summary || item.tierReason}
                  </p>
                  <p className="text-[11px] text-primary leading-relaxed">{item.tierReason}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                      className="flex-1 h-9 bg-surface-container-low text-primary text-xs font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      查看岗位
                    </button>
                    <button
                      onClick={() => handleSaveRecommendation(item)}
                      disabled={saved}
                      className="flex-1 h-9 bg-primary text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 disabled:bg-zinc-300 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">{saved ? "check" : "bookmark_add"}</span>
                      {saved ? "已保存" : "保存"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-bold text-on-surface">已保存岗位</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsManualFormOpen((open) => !open)}
                className="h-8 rounded-lg bg-primary-container/20 px-3 font-sans text-[11px] font-extrabold text-primary flex items-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                手动添加
              </button>
              <span className="font-mono text-[10px] font-bold text-on-surface-variant">{jobs.length} SAVED</span>
            </div>
          </div>

          {isManualFormOpen && (
            <div className="rounded-xl border border-primary/30 bg-white p-4 space-y-3 animate-fade-in-up">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="font-sans text-[11px] font-bold text-on-surface-variant">公司</span>
                  <input
                    value={manualCompany}
                    onChange={(event) => setManualCompany(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-border-subtle px-3 text-sm outline-none focus:border-primary"
                    placeholder="例如：字节跳动"
                  />
                </label>
                <label className="block">
                  <span className="font-sans text-[11px] font-bold text-on-surface-variant">岗位</span>
                  <input
                    value={manualTitle}
                    onChange={(event) => setManualTitle(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-border-subtle px-3 text-sm outline-none focus:border-primary"
                    placeholder="例如：数据分析实习生"
                  />
                </label>
              </div>
              <label className="block">
                <span className="font-sans text-[11px] font-bold text-on-surface-variant">岗位链接</span>
                <input
                  value={manualUrl}
                  onChange={(event) => setManualUrl(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border-subtle px-3 text-sm outline-none focus:border-primary"
                  placeholder="https://..."
                />
              </label>
              <label className="block">
                <span className="font-sans text-[11px] font-bold text-on-surface-variant">JD</span>
                <textarea
                  value={manualDescription}
                  onChange={(event) => setManualDescription(event.target.value)}
                  className="mt-1 min-h-28 w-full resize-none rounded-lg border border-border-subtle px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary"
                  placeholder="粘贴职位描述、职责和要求..."
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveManualJob()}
                  disabled={isSavingManualJob}
                  className="flex-1 h-10 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isSavingManualJob ? "animate-spin" : ""}`}>
                    {isSavingManualJob ? "progress_activity" : "bookmark_add"}
                  </span>
                  {isSavingManualJob ? "保存中" : "保存岗位"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualFormOpen(false)}
                  className="px-4 h-10 rounded-lg bg-zinc-100 text-on-surface-variant text-xs font-bold"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {jobs.map((job) => {
              const isSelected = selectedJobId === job.id;

              return (
                <div
                  key={job.id}
                  className={`bg-white border rounded-xl p-4 transition-all ${
                    isSelected ? "border-primary ring-2 ring-primary/10 bg-surface-container-low" : "border-border-subtle"
                  }`}
                >
                  <div
                    onClick={() => setSelectedJobId(isSelected ? null : job.id)}
                    className="flex justify-between items-start gap-3 cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-border-subtle bg-white flex items-center justify-center">
                        {job.logoUrl ? (
                          <img
                            alt={job.logoAlt || job.company}
                            className="w-10 h-10 object-contain"
                            referrerPolicy="no-referrer"
                            src={job.logoUrl}
                          />
                        ) : (
                          <span className="material-symbols-outlined text-outline">domain</span>
                        )}
                      </div>
                      <span className="font-mono text-[9px] text-on-surface-variant max-w-[50px] truncate text-center">
                        {job.company}
                      </span>
                    </div>

                    <div className="flex-grow min-w-0">
                      <h3 className="font-sans text-sm font-bold text-on-surface truncate">
                        {job.title}
                      </h3>
                      <p className="font-sans text-xs text-on-surface-variant line-clamp-2 mt-1">
                        {job.description}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteJob(job);
                        }}
                        disabled={deletingJobId === job.id}
                        className="w-8 h-8 rounded-full text-outline hover:bg-red-50 hover:text-red-600 flex items-center justify-center disabled:opacity-50 transition-colors"
                        title="删除岗位"
                        aria-label={`删除 ${job.company} ${job.title}`}
                      >
                        <span className={`material-symbols-outlined text-[18px] ${deletingJobId === job.id ? "animate-spin" : ""}`}>
                          {deletingJobId === job.id ? "progress_activity" : "delete"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-dashed border-border-subtle animate-fade-in-up space-y-3">
                      <div className="rounded-lg border border-border-subtle bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-primary font-mono">备注信息</p>
                          {editingNoteJobId !== job.id && (
                            <button
                              type="button"
                              onClick={() => startEditNote(job)}
                              className="w-8 h-8 rounded-full bg-surface-container-low text-primary flex items-center justify-center active:scale-95"
                              aria-label="编辑岗位备注"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                          )}
                        </div>
                        {editingNoteJobId === job.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={noteDraft}
                              onChange={(event) => setNoteDraft(event.target.value)}
                              className="min-h-20 w-full resize-none rounded-lg border border-border-subtle px-3 py-2 text-xs leading-relaxed outline-none focus:border-primary"
                              placeholder="记录投递偏好、亮点、风险或跟进事项..."
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleSaveNote(job)}
                                disabled={savingNoteJobId === job.id}
                                className="flex-1 h-9 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60"
                              >
                                <span className={`material-symbols-outlined text-[15px] ${savingNoteJobId === job.id ? "animate-spin" : ""}`}>
                                  {savingNoteJobId === job.id ? "progress_activity" : "check"}
                                </span>
                                保存备注
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteJobId(null);
                                  setNoteDraft("");
                                }}
                                className="px-3 h-9 rounded-lg bg-zinc-100 text-on-surface-variant text-xs"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-on-surface-variant">
                            {job.notes || "暂无备注，点击右侧编辑按钮添加。"}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {job.sourceUrl && (
                          <button
                            onClick={() => window.open(job.sourceUrl, "_blank", "noopener,noreferrer")}
                            className="flex-1 h-10 bg-surface-container-low text-primary text-xs font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            查看岗位
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onSelectJobForSetup(job.company, job.title);
                            onNavigate("interview-setup");
                          }}
                          className="flex-1 h-10 bg-primary text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                          一键开始备战面试
                        </button>
                        <button
                          onClick={() => setSelectedJobId(null)}
                          className="px-3 h-10 bg-zinc-100 hover:bg-zinc-200 text-on-surface-variant text-xs rounded-lg active:scale-95 transition-transform"
                        >
                          收起
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
