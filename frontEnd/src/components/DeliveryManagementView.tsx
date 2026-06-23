import React, { useMemo, useState } from "react";
import { backendApi, mapBackendJob } from "../api/backend";
import { Job } from "../types";

type JobStage = "applied" | "interviewing" | "offer";

interface DeliveryManagementViewProps {
  jobs: Job[];
  onNavigate: (viewName: "workbench" | "matching" | "knowledge" | "profile" | "interview-setup") => void;
  onJobsChanged: (jobs: Job[]) => void;
  onSelectJobForSetup: (company: string, position: string) => void;
}

const STAGES: Array<{ key: JobStage; label: string; icon: string; accent: string }> = [
  { key: "applied", label: "已投递", icon: "outbox", accent: "text-primary" },
  { key: "interviewing", label: "面试中", icon: "forum", accent: "text-secondary" },
  { key: "offer", label: "Offer", icon: "workspace_premium", accent: "text-on-primary-container" },
];

const STATUS_ORDER: JobStage[] = ["applied", "interviewing", "offer"];

const emptyForm = {
  company: "",
  title: "",
  status: "applied" as JobStage,
  priority: "normal" as "normal" | "urgent",
  salary: "",
  location: "",
  description: "",
  notes: "",
  sourceUrl: "",
};

function normalizeStage(status?: string): JobStage {
  if (status === "offer") return "offer";
  if (status === "interviewing") return "interviewing";
  return "applied";
}

function visibleDeliveryJobs(jobs: Job[]) {
  return jobs.filter((job) => !["draft", "interested", "rejected", "archived"].includes(job.status ?? ""));
}

function companyInitial(company: string) {
  return company.trim().slice(0, 1).toUpperCase() || "企";
}

export default function DeliveryManagementView({
  jobs,
  onNavigate,
  onJobsChanged,
  onSelectJobForSetup,
}: DeliveryManagementViewProps) {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const deliveryJobs = useMemo(() => visibleDeliveryJobs(jobs), [jobs]);
  const filteredJobs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return deliveryJobs.filter((job) => {
      const matchesKeyword =
        !keyword ||
        job.company.toLowerCase().includes(keyword) ||
        job.title.toLowerCase().includes(keyword) ||
        job.description.toLowerCase().includes(keyword);
      const matchesPriority = !urgentOnly || job.priority === "urgent";
      return matchesKeyword && matchesPriority;
    });
  }, [deliveryJobs, searchTerm, urgentOnly]);

  const stats = useMemo(() => {
    const applied = deliveryJobs.filter((job) => normalizeStage(job.status) === "applied").length;
    const interviewing = deliveryJobs.filter((job) => normalizeStage(job.status) === "interviewing").length;
    const offer = deliveryJobs.filter((job) => normalizeStage(job.status) === "offer").length;
    return { applied, interviewing, offer };
  }, [deliveryJobs]);

  const refreshJobs = async () => {
    const response = await backendApi.jobs();
    onJobsChanged(response.items.map(mapBackendJob));
  };

  const updateJobLocally = (updatedJob: Job) => {
    onJobsChanged(jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
  };

  const handleShiftStage = async (job: Job, direction: "prev" | "next") => {
    const currentIndex = STATUS_ORDER.indexOf(normalizeStage(job.status));
    const nextIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    const nextStatus = STATUS_ORDER[Math.max(0, Math.min(STATUS_ORDER.length - 1, nextIndex))];
    if (!nextStatus || nextStatus === job.status) return;

    const updated = await backendApi.updateJob(job.id, { status: nextStatus });
    updateJobLocally(mapBackendJob(updated));
  };

  const handleToggleUrgent = async (job: Job) => {
    const updated = await backendApi.updateJob(job.id, {
      priority: job.priority === "urgent" ? "normal" : "urgent",
    });
    updateJobLocally(mapBackendJob(updated));
  };

  const handleDeleteJob = async (job: Job) => {
    if (!window.confirm(`确认删除「${job.company} - ${job.title}」吗？`)) return;
    await backendApi.deleteJob(job.id);
    onJobsChanged(jobs.filter((item) => item.id !== job.id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.company.trim() || !form.title.trim()) {
      setError("请填写公司和岗位名称");
      return;
    }

    setIsSaving(true);
    try {
      const created = await backendApi.createJob({
        company: form.company.trim(),
        title: form.title.trim(),
        status: form.status,
        priority: form.priority,
        salary: form.salary.trim() || undefined,
        location: form.location.trim() || undefined,
        description: form.description.trim() || "暂无岗位描述",
        notes: form.notes.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
      });
      onJobsChanged([mapBackendJob(created), ...jobs]);
      setForm(emptyForm);
      setIsModalOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存投递失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="delivery-management-root" className="animate-fade-in-up">
      <header className="w-full top-0 sticky bg-white border-b border-border-subtle flex items-center justify-between px-5 h-16 z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("workbench")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-sans text-lg font-bold text-primary">投递管理</h1>
            <p className="font-mono text-[10px] text-outline">DELIVERY PIPELINE</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
      </header>

      <main className="w-full max-w-md mx-auto px-5 pt-4 pb-28 space-y-5">
        <section className="grid grid-cols-3 gap-3">
          <PipelineStat label="投递" value={stats.applied + stats.interviewing + stats.offer} icon="outbox" />
          <PipelineStat label="面试" value={stats.interviewing} icon="forum" />
          <PipelineStat label="Offer" value={stats.offer} icon="workspace_premium" active />
        </section>

        <section className="bg-white border border-border-subtle rounded-xl p-3 space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索公司、岗位或 JD 关键词"
              className="h-10 w-full rounded-lg border border-border-subtle bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setUrgentOnly((value) => !value)}
              className={`h-8 rounded-lg px-3 text-xs font-bold flex items-center gap-1 transition-all ${
                urgentOnly ? "bg-tertiary-container/30 text-tertiary" : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">priority_high</span>
              {urgentOnly ? "仅看加急" : "全部优先级"}
            </button>
            <button
              onClick={() => void refreshJobs()}
              className="h-8 rounded-lg px-3 text-xs font-bold bg-surface-container-low text-primary flex items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              同步
            </button>
          </div>
        </section>

        <section className="space-y-5">
          {STAGES.map((stage) => {
            const stageJobs = filteredJobs.filter((job) => normalizeStage(job.status) === stage.key);
            return (
              <div key={stage.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-mono text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[16px] ${stage.accent}`}>{stage.icon}</span>
                    {stage.label}
                  </h2>
                  <span className="font-mono text-[10px] text-outline">{stageJobs.length}</span>
                </div>
                {stageJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outline-variant bg-white px-4 py-5 text-center text-xs text-outline">
                    暂无{stage.label}岗位
                  </div>
                ) : (
                  stageJobs.map((job) => (
                    <article key={job.id} className="rounded-xl border border-border-subtle bg-white p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-xl bg-primary-container/25 text-primary flex items-center justify-center font-bold">
                          {companyInitial(job.company)}
                        </div>
                        <button
                          onClick={() => setExpandedJobId((current) => (current === job.id ? null : job.id))}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-sm font-bold text-on-surface">{job.company}</h3>
                            {job.priority === "urgent" && (
                              <span className="rounded bg-tertiary-container/30 px-1.5 py-0.5 text-[9px] font-bold text-tertiary">
                                URGENT
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs font-semibold text-primary">{job.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">{job.description}</p>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-on-surface-variant">
                        {job.salary && <span className="rounded bg-surface-container-low px-2 py-1">{job.salary}</span>}
                        {job.location && <span className="rounded bg-surface-container-low px-2 py-1">{job.location}</span>}
                        {job.updatedAt && <span className="rounded bg-surface-container-low px-2 py-1">{job.updatedAt}</span>}
                      </div>

                      {expandedJobId === job.id && (
                        <div className="space-y-3 border-t border-dashed border-border-subtle pt-3 animate-fade-in-up">
                          {job.notes && <p className="text-xs leading-relaxed text-on-surface-variant">{job.notes}</p>}
                          {job.sourceUrl && (
                            <button
                              onClick={() => window.open(job.sourceUrl, "_blank", "noopener,noreferrer")}
                              className="flex w-full items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1.5 text-left text-[11px] font-semibold text-primary"
                            >
                              <span className="material-symbols-outlined text-[14px]">link</span>
                              <span className="min-w-0 flex-1 truncate">{job.sourceUrl}</span>
                            </button>
                          )}
                          <div className="grid grid-cols-5 gap-2">
                            <IconButton icon="keyboard_arrow_up" label="前移" onClick={() => void handleShiftStage(job, "prev")} />
                            <IconButton icon="keyboard_arrow_down" label="后移" onClick={() => void handleShiftStage(job, "next")} />
                            <IconButton icon="priority_high" label="加急" onClick={() => void handleToggleUrgent(job)} />
                            <IconButton
                              icon="psychology"
                              label="备战"
                              onClick={() => {
                                onSelectJobForSetup(job.company, job.title);
                                onNavigate("interview-setup");
                              }}
                            />
                            <IconButton icon="delete" label="删除" danger onClick={() => void handleDeleteJob(job)} />
                          </div>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            );
          })}
        </section>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 px-5 py-8 flex items-center justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-border-subtle">
            <div className="sticky top-0 bg-white border-b border-border-subtle px-4 py-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-primary">新增投递</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-surface-container-low">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <TextField label="公司" value={form.company} onChange={(value) => setForm((current) => ({ ...current, company: value }))} />
                <TextField label="岗位" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STAGES.map((stage) => (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, status: stage.key }))}
                    className={`h-9 rounded-lg border text-xs font-bold ${
                      form.status === stage.key ? "border-primary bg-primary text-white" : "border-border-subtle text-on-surface-variant"
                    }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="薪资" value={form.salary} onChange={(value) => setForm((current) => ({ ...current, salary: value }))} />
                <TextField label="地点" value={form.location} onChange={(value) => setForm((current) => ({ ...current, location: value }))} />
              </div>
              <TextField label="岗位链接" value={form.sourceUrl} onChange={(value) => setForm((current) => ({ ...current, sourceUrl: value }))} />
              <TextareaField label="JD 摘要" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
              <TextareaField label="备注" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, priority: current.priority === "urgent" ? "normal" : "urgent" }))}
                className={`h-10 w-full rounded-lg text-xs font-bold ${
                  form.priority === "urgent" ? "bg-tertiary-container/30 text-tertiary" : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                {form.priority === "urgent" ? "URGENT 加急推进" : "常规推进"}
              </button>
            </div>
            <div className="border-t border-border-subtle p-4 flex gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="h-11 flex-1 rounded-lg bg-surface-container-low text-xs font-bold text-on-surface-variant">
                取消
              </button>
              <button disabled={isSaving} className="h-11 flex-1 rounded-lg bg-primary text-xs font-bold text-white disabled:opacity-60">
                {isSaving ? "保存中" : "保存投递"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PipelineStat({ label, value, icon, active }: { label: string; value: number; icon: string; active?: boolean }) {
  return (
    <div className={`h-24 rounded-xl border p-3 flex flex-col items-center justify-center ${active ? "bg-primary-container border-primary/10" : "bg-white border-border-subtle"}`}>
      <span className={`material-symbols-outlined text-[18px] ${active ? "text-on-primary-container" : "text-primary"}`}>{icon}</span>
      <div className={`font-sans text-2xl font-extrabold ${active ? "text-on-primary-container" : "text-primary"}`}>{value}</div>
      <div className={`font-mono text-[11px] font-bold ${active ? "text-on-primary-container" : "text-on-surface-variant"}`}>{label}</div>
    </div>
  );
}

function IconButton({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold ${
        danger ? "bg-red-50 text-red-700" : "bg-surface-container-low text-primary"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-on-surface-variant">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border-subtle px-3 text-sm outline-none focus:border-primary" />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-on-surface-variant">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-20 w-full resize-none rounded-lg border border-border-subtle px-3 py-2 text-sm outline-none focus:border-primary" />
    </label>
  );
}
