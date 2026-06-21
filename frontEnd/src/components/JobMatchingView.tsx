import React, { useState } from "react";
import { BackendJobRecommendation, backendApi, mapBackendJob } from "../api/backend";
import { Job } from "../types";

interface JobMatchingViewProps {
  jobs: Job[];
  onJobSaved: (job: Job) => void;
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
  const companyMatch = item.title.match(/^(.{2,12}?)(?:招聘|校招|校园招聘|\s|-|｜|丨|:|：)/);
  if (companyMatch?.[1] && !["数据分析", "商业分析", "AI", "大模型"].includes(companyMatch[1])) {
    return companyMatch[1];
  }
  return item.source || "公开招聘";
}

function tierClassName(tier: string) {
  if (tier === "冲刺岗") return "bg-secondary-container/30 text-secondary";
  if (tier === "主投岗") return "bg-primary-container/30 text-primary";
  if (tier === "不建议") return "bg-red-50 text-red-700";
  return "bg-tertiary-container/25 text-tertiary";
}

function modeMeta(mode: "fast" | "standard" | "broad") {
  if (mode === "fast") return { label: "快速", count: 12 };
  if (mode === "broad") return { label: "广泛", count: 28 };
  return { label: "标准", count: 18 };
}

export default function JobMatchingView({
  jobs,
  onJobSaved,
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
  const [sourceStats, setSourceStats] = useState<Record<string, number>>({});
  const [generatedAt, setGeneratedAt] = useState("");
  const [intentSummary, setIntentSummary] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());

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
        maxResults: modeMeta(mode).count,
      });
      setRecommendations(result.recommendations);
      setSourceStats(result.sourceStats ?? {});
      setGeneratedAt(result.generatedAt);
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
      const savedJob = await backendApi.createJob({
        title: item.title,
        company: companyFromRecommendation(item),
        description: `${item.summary}\n\n推荐层级：${item.tier}\n推荐原因：${item.tierReason}`,
        sourceUrl: item.url,
        status: "interested",
      });
      setSavedUrls((current) => new Set(current).add(item.url));
      onJobSaved(mapBackendJob(savedJob));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存岗位失败");
    }
  };

  const handlePrepareRecommendation = (item: BackendJobRecommendation) => {
    onSelectJobForSetup(companyFromRecommendation(item), item.title);
    onNavigate("interview-setup");
  };

  const useResumeProfileOnly = () => {
    setRoles("");
    setCities("");
    setSkills("");
    setAvailability("");
  };

  const topSources = Object.entries(sourceStats).slice(0, 5);

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
            <button
              onClick={useResumeProfileOnly}
              className="h-8 rounded-lg border border-border-subtle bg-white px-2 text-xs font-bold text-primary active:scale-95 transition-transform"
            >
              使用简历画像
            </button>
          </div>

          <div className="bg-white border border-border-subtle rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-container-low p-1">
              {(["fast", "standard", "broad"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`h-8 rounded-md text-xs font-bold transition-all ${
                    mode === item ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"
                  }`}
                >
                  {modeMeta(item).label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="text-[11px] font-bold text-on-surface-variant">目标岗位</span>
              <textarea
                value={roles}
                onChange={(event) => setRoles(event.target.value)}
                placeholder="留空时从个人资料和最近简历推断"
                className="mt-1 min-h-16 w-full resize-none rounded-lg border border-border-subtle px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-on-surface-variant">城市</span>
              <input
                value={cities}
                onChange={(event) => setCities(event.target.value)}
                placeholder="留空时默认深圳、广州、上海、北京、远程"
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
          {(intentSummary || topSources.length > 0) && (
            <div className="rounded-xl border border-border-subtle bg-white px-3 py-3 space-y-2">
              {intentSummary && (
                <p className="text-xs text-on-surface-variant leading-relaxed">{intentSummary}</p>
              )}
              {topSources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {topSources.map(([source, count]) => (
                    <span
                      key={source}
                      className="rounded bg-surface-container-low px-2 py-1 text-[10px] font-bold text-on-surface-variant"
                    >
                      {source} {count}
                    </span>
                  ))}
                </div>
              )}
              {generatedAt && (
                <p className="font-mono text-[10px] text-outline">
                  {new Date(generatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {isSearching && recommendations.length === 0 && (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white border border-border-subtle rounded-xl p-4 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-surface-container-low animate-pulse" />
                  <div className="h-3 w-full rounded bg-surface-container-low animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-surface-container-low animate-pulse" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-9 rounded-lg bg-surface-container-low animate-pulse" />
                    <div className="h-9 rounded-lg bg-surface-container-low animate-pulse" />
                    <div className="h-9 rounded-lg bg-surface-container-low animate-pulse" />
                  </div>
                </div>
              ))
            )}

            {!isSearching && recommendations.length === 0 && (
              <div className="bg-white border border-dashed border-outline-variant rounded-xl p-5 text-center space-y-2">
                <span className="material-symbols-outlined text-primary text-3xl">travel_explore</span>
                <h3 className="text-sm font-bold text-on-surface">还没有生成推荐</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  可以直接点击生成，系统会结合简历画像和公开招聘页返回可保存的岗位。
                </p>
              </div>
            )}

            {recommendations.map((item) => {
              const saved = savedUrls.has(item.url);
              return (
                <div key={item.url} className="bg-white border border-border-subtle rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${tierClassName(item.tier)}`}>
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
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                      className="h-9 bg-surface-container-low text-primary text-xs font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      查看岗位
                    </button>
                    <button
                      onClick={() => handleSaveRecommendation(item)}
                      disabled={saved}
                      className="h-9 bg-white border border-border-subtle text-primary text-xs font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 disabled:bg-zinc-100 disabled:text-outline transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">{saved ? "check" : "bookmark_add"}</span>
                      {saved ? "已保存" : "保存"}
                    </button>
                    <button
                      onClick={() => handlePrepareRecommendation(item)}
                      className="h-9 bg-primary text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                      备战
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
            <span className="font-mono text-[10px] font-bold text-on-surface-variant">{jobs.length} SAVED</span>
          </div>

          <div className="flex flex-col gap-3">
            {jobs.length === 0 && (
              <div className="bg-white border border-dashed border-outline-variant rounded-xl p-5 text-center space-y-2">
                <span className="material-symbols-outlined text-outline text-3xl">bookmark_add</span>
                <h3 className="text-sm font-bold text-on-surface">还没有保存岗位</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  保存公开推荐后，可以在这里继续进入专项面试准备。
                </p>
              </div>
            )}
            {jobs.map((job) => {
              const isSelected = selectedJobId === job.id;
              const radius = 16;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference - (job.matchScore / 100) * circumference;

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

                    <div className="flex-shrink-0 relative w-11 h-11 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          className="text-zinc-100 stroke-current"
                          cx="22"
                          cy="22"
                          fill="transparent"
                          r={radius}
                          strokeWidth="3.5"
                        />
                        <circle
                          className="text-primary stroke-current"
                          cx="22"
                          cy="22"
                          fill="transparent"
                          r={radius}
                          strokeWidth="3.5"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-mono text-[9px] font-bold text-primary">
                        {job.matchScore}%
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-dashed border-border-subtle animate-fade-in-up space-y-3">
                      <p className="text-xs font-bold text-primary font-mono">岗位类型: {job.tag}</p>
                      <div className="flex gap-2">
                        {job.sourceUrl && (
                          <button
                            onClick={() => window.open(job.sourceUrl, "_blank", "noopener,noreferrer")}
                            className="px-3 h-10 bg-surface-container-low text-primary text-xs font-bold rounded-lg flex items-center justify-center active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
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
