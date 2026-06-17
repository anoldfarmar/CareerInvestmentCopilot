import React, { useState } from "react";
import { ActivityDay, Todo } from "../types";

interface WorkbenchViewProps {
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  deliveryCount: number;
  interviewCount: number;
  offerCount: number;
  todayActivityCount: number;
  todayActivityLevel: number;
  activityDays: ActivityDay[];
  onNavigate: (viewName: "workbench" | "matching" | "knowledge" | "profile" | "resume-optimize" | "audio-review" | "interview-setup" | "mock-interview") => void;
  onSelectActionJob?: (company: string, position: string) => void;
}

export default function WorkbenchView({
  todos,
  onToggleTodo,
  deliveryCount,
  interviewCount,
  offerCount,
  todayActivityCount,
  todayActivityLevel,
  activityDays,
  onNavigate,
  onSelectActionJob,
}: WorkbenchViewProps) {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  const heatmapData =
    activityDays.length > 0
      ? activityDays
      : Array.from({ length: 28 }, (_, index) => {
          const day = index + 1;
          const isToday = day === 24;

          return {
            date: `2026-06-${String(day).padStart(2, "0")}`,
            day,
            applicationCount: 0,
            audioUploadCount: 0,
            mockInterviewCount: 0,
            totalCount: isToday ? todayActivityCount : 0,
            level: isToday ? todayActivityLevel : 0,
          };
        });

  const getHeatmapColorClass = (level: number) => {
    switch (level) {
      case 1:
        return "bg-heatmap-1 hover:ring-2 hover:ring-primary/40 text-on-primary-container";
      case 2:
        return "bg-heatmap-2 hover:ring-2 hover:ring-primary/60 text-on-primary-container font-semibold";
      case 3:
        return "bg-heatmap-3 hover:ring-2 hover:ring-primary text-on-primary-container font-bold";
      case 4:
        return "bg-heatmap-4 hover:ring-2 hover:ring-primary-container text-white font-bold";
      default:
        return "bg-heatmap-0 hover:bg-zinc-200 text-outline-variant";
    }
  };

  return (
    <div id="workbench-root" className="animate-fade-in-up">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-white border-b border-border-subtle flex justify-between items-center px-5 h-16 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#4ECDC4] flex items-center justify-center overflow-hidden border border-outline-variant/30">
            <img
              alt="User Profile"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6p8xozkdZeIGTn0vYNihRgUhZctE6t5moy0cU-T_FuNDissy5L-05Q7ndzpSKjd199FJsv2WSPWWtj-JzRCaSr-fBL7QqSlzAtKX6fRdUpPSyuyxztZKrY24WmgMGQiAfXmXk6YOMP3N1JyBtHwYkn9h5tH1BmHP2wF0tUm07xFAMOsacJp213Uj_9YgMiYeQe7peRGB2qEomYVepwrnMT590BUF-nxPaWAxnUZsReOAQ9nnW5sqkYQ"
            />
          </div>
          <h1 className="font-sans text-lg font-bold text-primary">职投 Copilot</h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant relative">
          <span className="material-symbols-outlined light-icon">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary-container rounded-full"></span>
        </button>
      </header>

      {/* Main Content Layout */}
      <main className="px-5 pt-4 pb-28 max-w-md mx-auto space-y-6">
        {/* Heatmap Area */}
        <section id="activity-heatmap-section">
          <div className="flex justify-between items-end mb-2">
            <h2 className="font-mono text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              投递热力图 / ACTIVITY
            </h2>
            <span className="text-[10px] font-mono text-outline font-medium">Lvl. {todayActivityLevel} Active</span>
          </div>
          <div className="bg-white border border-border-subtle p-4 rounded-xl shadow-sm relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-sans text-base font-bold text-primary">六月 / JUNE</h3>
              <div className="flex gap-1">
                <span className="material-symbols-outlined text-outline-variant cursor-pointer text-lg hover:text-primary">
                  keyboard_arrow_up
                </span>
                <span className="material-symbols-outlined text-outline-variant cursor-pointer text-lg hover:text-primary">
                  keyboard_arrow_down
                </span>
              </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-7 gap-1">
              {["日", "一", "二", "三", "四", "五", "六"].map((w, idx) => (
                <div key={idx} className="text-center text-[10px] font-mono text-outline py-1 font-medium">
                  {w}
                </div>
              ))}
              {heatmapData.map((item) => (
                <div
                  key={item.day}
                  onMouseEnter={() => setActiveTooltip(item.day)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  onClick={() => setActiveTooltip(item.day)}
                  className={`w-full aspect-square rounded-[3px] flex items-center justify-center text-[10px] transition-all cursor-pointer relative ${getHeatmapColorClass(
                    item.level
                  )}`}
                >
                  {item.day}
                  {/* Custom Tonal Tooltip */}
                  {activeTooltip === item.day && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-28 bg-inverse-surface text-inverse-on-surface text-[10px] rounded p-2 z-50 shadow-lg pointer-events-none text-center">
                      <p className="font-mono font-bold text-primary-container">6月{item.day}日</p>
                      <p className="font-sans">投递 <b>{item.applicationCount}</b> 次</p>
                      <p className="font-sans">上传录音 <b>{item.audioUploadCount}</b> 次</p>
                      <p className="font-sans">模拟面试 <b>{item.mockInterviewCount}</b> 次</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-inverse-surface rotate-45 -mt-1"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Funnel Pipeline Section */}
        <section id="funnel-pipeline-section">
          <h2 className="font-mono text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">
            求职漏斗 / PIPELINE
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {/* Delivery Box */}
            <div className="bg-white border border-border-subtle p-3 rounded-xl text-center flex flex-col justify-center items-center h-24 hover:border-primary-container/40 transition-colors">
              <div className="font-sans text-2xl font-extrabold text-primary mb-1">
                {deliveryCount}
              </div>
              <div className="font-mono text-[11px] font-bold text-on-surface-variant">投递</div>
            </div>
            {/* Interview Box */}
            <div className="relative bg-white border border-border-subtle p-3 rounded-xl text-center overflow-hidden flex flex-col justify-center items-center h-24 hover:border-primary-container/40 transition-colors">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1">
                <span className="material-symbols-outlined text-outline-variant/30 scale-125">chevron_right</span>
              </div>
              <div className="font-sans text-2xl font-extrabold text-primary mb-1">{interviewCount}</div>
              <div className="font-mono text-[11px] font-bold text-on-surface-variant">面试</div>
            </div>
            {/* Offer Box */}
            <div className="bg-primary-container border border-primary/10 p-3 rounded-xl text-center flex flex-col justify-center items-center h-24 shadow-sm hover:scale-[1.02] transition-transform">
              <div className="font-sans text-2xl font-extrabold text-on-primary-container mb-1">{offerCount}</div>
              <div className="font-mono text-[11px] font-bold text-on-primary-container">Offer</div>
            </div>
          </div>
        </section>

        {/* AI Insight To-dos */}
        <section id="ai-insights-todo-section">
          <h2 className="font-mono text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">
            智能待办 / AI Insights
          </h2>
          <div className="flex flex-col gap-2">
            {todos.filter(t => !t.isCompleted).length === 0 ? (
              <div className="py-6 text-center border-2 border-dashed border-border-subtle rounded-xl text-outline text-xs bg-white">
                所有待办事项已完成
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center bg-white border border-border-subtle p-3 rounded-xl relative overflow-hidden transition-all duration-300 hover:border-primary-container ${
                    todo.isCompleted ? "opacity-30 scale-95 pointer-events-none" : ""
                  }`}
                >
                  {todo.isHighPriority && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary-container"></div>
                  )}
                  <input
                    id={`todo-checkbox-${todo.id}`}
                    name={`todo-checkbox-${todo.id}`}
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => onToggleTodo(todo.id)}
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary ml-1"
                  />
                  <span
                    className={`ml-3 font-sans text-sm text-on-surface flex-1 ${
                      todo.isCompleted ? "line-through text-outline" : ""
                    }`}
                  >
                    {todo.text}
                  </span>
                  <span className="material-symbols-outlined text-outline-variant text-lg">
                    {todo.icon}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Core Actions Engine */}
        <section id="core-actions-section" className="flex flex-col gap-3 pt-2">
          {/* Mock Interview */}
          <button
            id="action-mock-interview"
            onClick={() => {
              if (onSelectActionJob) {
                // Pre-populate with typical setup
                onSelectActionJob("字节跳动", "高级产品经理 / Senior PM");
              }
              onNavigate("interview-setup");
            }}
            className="w-full h-16 bg-primary-container text-on-primary-container font-sans text-base font-bold rounded-2xl flex items-center justify-center gap-3 shadow-md shadow-primary/5 active:scale-98 hover:scale-[1.01] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined filled-icon animate-pulse">psychology</span>
            开始模拟面试
          </button>

          {/* Record and Setup Analysis */}
          <button
            id="action-audio-record"
            onClick={() => {
              if (onSelectActionJob) {
                onSelectActionJob("腾讯", "产品经理");
              }
              onNavigate("audio-review");
            }}
            className="w-full h-16 bg-white border-2 border-primary-container/50 text-primary font-sans text-base font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-98 hover:bg-surface-container-low transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">analytics</span>
            录音与复盘
          </button>

          {/* Resume optimization */}
          <button
            id="action-resume-optim"
            onClick={() => onNavigate("resume-optimize")}
            className="w-full h-16 bg-white border-2 border-primary-container/50 text-primary font-sans text-base font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-98 hover:bg-surface-container-low transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">edit_document</span>
            简历优化
          </button>
        </section>
      </main>
    </div>
  );
}
