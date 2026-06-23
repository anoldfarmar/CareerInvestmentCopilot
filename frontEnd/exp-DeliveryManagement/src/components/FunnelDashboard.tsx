import React, { useState, useMemo } from 'react';
import { JobApplication, HeatmapDay } from '../types';
import { Layers, Activity, Award, Flame, Info, CheckCircle } from 'lucide-react';

interface FunnelDashboardProps {
  applications: JobApplication[];
  onSelectDayCount?: (date: string, count: number, label: string) => void;
}

export default function FunnelDashboard({ applications }: FunnelDashboardProps) {
  // Compute real statistics from applications
  const stats = useMemo(() => {
    const total = applications.length;
    const delivered = applications.filter(a => a.status === 'delivered').length;
    const interview1 = applications.filter(a => a.status === 'interview1').length;
    const interview2 = applications.filter(a => a.status === 'interview2').length;
    const offer = applications.filter(a => a.status === 'offer').length;

    const interviewTotal = interview1 + interview2;

    return {
      total,
      delivered,
      interview1,
      interview2,
      interviewTotal,
      offer,
      successRate: total > 0 ? Math.round((offer / total) * 100) : 0,
    };
  }, [applications]);

  // Seeding precise data for the 7 rows (days Sunday-Saturday) x 18 weeks heatmap
  const heatmapData = useMemo(() => {
    const data: HeatmapDay[] = [];
    const dateCursor = new Date();
    // Go back 126 days (~18 weeks) to start from Sunday
    dateCursor.setDate(dateCursor.getDate() - 125);
    const dayOfWeek = dateCursor.getDay();
    dateCursor.setDate(dateCursor.getDate() - dayOfWeek); // align to Sunday

    const seedPatterns = [0, 1, 0, 2, 0, 3, 0, 0, 1, 4, 0, 2, 1, 0, 0, 2, 3, 1, 0, 4, 0, 1, 2, 0, 0, 3, 1, 0, 2, 0, 1, 4, 3, 0, 0, 1];

    for (let i = 0; i < 126; i++) {
      const dateString = dateCursor.toISOString().split('T')[0];
      const seedVal = seedPatterns[i % seedPatterns.length];
      
      // Calculate active actions on this day
      let count = seedVal;
      let label = '暂无求职动作';
      
      if (count === 1) {
        label = '1次简历投递/测评';
      } else if (count === 2) {
        label = '2次微型面试演练/投递';
      } else if (count === 3) {
        label = '3次AI模拟面试/简历改版';
      } else if (count === 4) {
        label = '4次核心技术突破，演练满分!';
      }

      data.push({
        date: dateString,
        count,
        label,
      });
      dateCursor.setDate(dateCursor.getDate() + 1);
    }
    return data;
  }, []);

  // Selected cell state for popup tooltip
  const [selectedCell, setSelectedCell] = useState<HeatmapDay | null>({
    date: '今日',
    count: 3,
    label: '完成 3 组 AI 模拟面试，状态神勇!',
  });

  // Level selector for Mint Green theme matching the guidelines
  const getIntensityClass = (count: number) => {
    switch (count) {
      case 0: return 'bg-[#edeeef] hover:bg-neutral-300'; // level 0 (gray background)
      case 1: return 'bg-[#e0faee] hover:bg-[#bbf7df] border border-[#a7f3d0]'; // level 1
      case 2: return 'bg-[#a3f0d2] hover:bg-[#72e8bc] border border-[#6ee7b7]'; // level 2
      case 3: return 'bg-[#4ECDC4] hover:bg-[#34beb5]'; // level 3 (primary mint green)
      case 4: return 'bg-[#006a65] hover:bg-[#00524e] text-white'; // level 4
      default: return 'bg-[#edeeef]';
    }
  };

  // Group columns for the grid (7 rows per column)
  const columns = useMemo(() => {
    const cols: HeatmapDay[][] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      cols.push(heatmapData.slice(i, i + 7));
    }
    return cols;
  }, [heatmapData]);

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div id="dashboard-insight" className="w-full bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm space-y-6">
      
      {/* 2. Pipeline Progress Funnel */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 font-sans">
            <Layers className="w-4 h-4 text-[#006a65]" />
            求职数据漏斗 (Pipeline Funnel)
          </h3>
          <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
            胜率: {stats.successRate}%
          </span>
        </div>

        {/* Dynamic Chevron-stepping layout from guidelines */}
        <div className="grid grid-cols-3 gap-1 relative [&>div:not(:last-child)]:after:content-['']">
          
          {/* Delivered Stage */}
          <div className="bg-[#f0fbf8] border border-emerald-100/60 p-3 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#4ECDC4]/50 transition-all">
            <span className="text-[11px] text-emerald-800 font-medium tracking-tight mb-1">投递状态</span>
            <span className="text-3xl font-extrabold font-sans text-[#006a65]">{stats.delivered + stats.interviewTotal + stats.offer}</span>
            <span className="text-[10px] font-mono text-emerald-500 mt-1 uppercase">DELIVERED</span>
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#4ECDC4]/30 transform translate-x-1 rotate-12 group-hover:bg-[#4ECDC4]/50 transition-all"></div>
          </div>

          {/* Interview Stage */}
          <div className="bg-[#f4f7fe] border border-blue-100/60 p-3 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-300/50 transition-all">
            <span className="text-[11px] text-blue-800 font-medium tracking-tight mb-1">面试约谈</span>
            <span className="text-3xl font-extrabold font-sans text-[#0060ac]">{stats.interviewTotal}</span>
            <span className="text-[10px] font-mono text-blue-400 mt-1 uppercase">INTERVIEW</span>
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-blue-200/50 transform translate-x-1 rotate-12 group-hover:bg-blue-300/60 transition-all"></div>
          </div>

          {/* Offer Stage */}
          <div className="bg-[#fbfcfa] border border-[#006a65]/20 p-3 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#006a65]/50 transition-all">
            <span className="text-[11px] text-gray-700 font-medium tracking-tight mb-1">最终斩获</span>
            <span className="text-3xl font-extrabold font-sans text-emerald-600">{stats.offer}</span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold mt-1 uppercase">OFFERS</span>
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-500/10 transform translate-x-1 rotate-12 group-hover:bg-emerald-500/20 transition-all"></div>
          </div>

        </div>
      </div>

      {/* 2. GitHub-Style Interactive Activity Heatmap */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 font-sans">
            <Activity className="w-4 h-4 text-[#4ECDC4]" />
            求职活跃度热力图 (Activity Tracker)
          </h3>
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-[11px] font-mono text-amber-700 font-semibold">12日连击</span>
          </div>
        </div>

        {/* Grid and Axis Labels wrapper */}
        <div className="bg-gray-50/50 border border-gray-150/40 rounded-xl p-3">
          <div className="flex gap-2 justify-between">
            {/* Days list (Sunday - Saturday) Column */}
            <div className="flex flex-col justify-between text-[9px] font-mono text-gray-400 select-none pb-0.5 pt-4 h-[94px]">
              {weekdays.map((day, idx) => (
                <span key={idx} className="leading-none text-center h-2.5 w-3.5">
                  {idx % 2 === 1 ? day : ''}
                </span>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="flex-1 overflow-x-auto scrollbar-thin">
              <div className="flex gap-1 w-max">
                {columns.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-1">
                    {col.map((day, dayIdx) => (
                      <button
                        key={day.date}
                        onClick={() => setSelectedCell(day)}
                        className={`w-[10px] h-[10px] rounded-[2px] transition-colors duration-150 relative shrink-0 ${getIntensityClass(day.count)}`}
                        title={`${day.date}: ${day.label}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Months Timeline placeholder */}
              <div className="flex justify-between text-[8px] font-mono text-gray-400 mt-2 px-1 select-none">
                <span>3月</span>
                <span>4月</span>
                <span>5月</span>
                <span>今日</span>
              </div>
            </div>
          </div>

          {/* Interactive Tooltip Card at Elevation Lvl 2 */}
          {selectedCell && (
            <div className="mt-4 bg-white border border-emerald-100 rounded-lg p-2.5 flex items-start gap-2.5 shadow-sm transition-all duration-300">
              <span className="mt-0.5 p-1 bg-emerald-50 rounded-md text-emerald-600 shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-medium text-[#006a65]">{selectedCell.date}</span>
                  <span className="text-[10px] font-mono text-gray-400 scale-[0.9] origin-right">强度指数: {selectedCell.count}</span>
                </div>
                <p className="text-xs text-gray-700 font-sans mt-0.5 font-medium leading-relaxed">
                  {selectedCell.label}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend Indicator */}
        <div className="flex items-center justify-end gap-1 mt-2.5 text-[9px] font-mono text-gray-400 select-none">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#edeeef]" />
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#e0faee]" />
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#a3f0d2]" />
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#4ECDC4]" />
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#006a65]" />
          <span>More</span>
        </div>
      </div>

    </div>
  );
}
