import React, { useState, useEffect } from 'react';
import { JobApplication, JobStatus, TodoItem } from './types';
import CompanyLogo from './components/CompanyLogo';
import FunnelDashboard from './components/FunnelDashboard';
import AddJobModal from './components/AddJobModal';
import MockInterviewPanel from './components/MockInterviewPanel';
import TodoListPanel from './components/TodoListPanel';
import { 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  SlidersHorizontal, 
  ArrowLeft, 
  Calendar, 
  Bot, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  Building2, 
  MapPin, 
  Coins, 
  FileText,
  Search,
  Filter,
  CheckCircle2
} from 'lucide-react';

const STORAGE_JOBS_KEY = 'jic_job_applications_v1';
const STORAGE_TODOS_KEY = 'jic_job_todos_v1';

// Initial preloaded jobs matching user screenshot perfectly
const DEFAULT_JOBS: JobApplication[] = [
  {
    id: 'job-1',
    company: '字节跳动',
    position: '数据开发岗',
    logoType: 'bytedance',
    description: '负责核心数仓架构演进、针对秒级延迟大流量执行实时 Spark/Flink 链路调优，解决亿级日活数据链路稳定限流控制瓶颈。',
    status: 'delivered',
    appliedDate: '2026-06-20',
    priority: 'normal',
    salary: '28k - 38k * 15薪',
    location: '上海 · 静安区',
    notes: '前司总监内推，组长已捞。核心大流量数据链路核心方向。'
  },
  {
    id: 'job-2',
    company: '蚂蚁集团',
    position: '算法工程师',
    logoType: 'ant',
    description: '负责数亿用户智能风控、欺诈多维评估模型构建。融合图神经网络(GNN)与金融联邦学习，保障安全多方隐私梯度交换。',
    status: 'delivered',
    appliedDate: '2026-06-19',
    priority: 'normal',
    salary: '32k - 48k * 16薪',
    location: '杭州 · 蚂蚁Z空间',
    notes: '技术测评已经100%全通，正在调配技术一面组长排期。'
  },
  {
    id: 'job-3',
    company: '小米集团',
    position: '后端研发工程师',
    logoType: 'xiaomi',
    description: '研发高并发物联网米家网关，应对千万级硬件上报高QPS流量。结合熔断降级中间件，负责全链路容灾体系构建。',
    status: 'interview1',
    appliedDate: '2026-06-18',
    priority: 'urgent',
    salary: '22k - 30k * 14薪',
    location: '北京 · 小米科技园',
    notes: '一面敲定在明日下午，小米IoT组，重点关注大流量高可用演练核心。'
  },
  {
    id: 'job-4',
    company: '亚马逊',
    position: 'SDE II - Cloud',
    logoType: 'amazon',
    description: '负责亚马逊云计算 AWS 底层虚拟化可弹性计算、S3高性能吞吐一致性等全球分布式系统架构研究，保障极致可用性。',
    status: 'offer',
    appliedDate: '2026-06-15',
    priority: 'normal',
    salary: '40k - 55k * 13薪 + RSU分期',
    location: '北京 / 上海 (远程配合)',
    notes: '完美斩获录取通知书！总包级别极其理想。HRSU认购讨论中，WIN！',
    tag: 'WIN'
  }
];

const DEFAULT_TODOS: TodoItem[] = [
  // ByteDance
  { id: 'todo-1', jobId: 'job-1', text: '研读 Flink 增量快照 Checkpoint 减免背压核心机制', completed: true, priority: 'high', createdAt: '2026-06-20' },
  { id: 'todo-2', jobId: 'job-1', text: '背熟 Spark Shuffle Write 数据倾斜自适应调优逻辑', completed: false, priority: 'normal', createdAt: '2026-06-20' },
  // Ant Group
  { id: 'todo-3', jobId: 'job-2', text: '推演 GNN 的 GraphSAGE 在超高 QPS 查询下的剪枝策略', completed: false, priority: 'high', createdAt: '2026-06-19' },
  { id: 'todo-4', jobId: 'job-2', text: '熟悉联邦学习中的同态加密与安全多方计算细节问题', completed: false, priority: 'normal', createdAt: '2026-06-19' },
  // Xiaomi
  { id: 'todo-5', jobId: 'job-3', text: '熟知高并发 API Gateway 的滑动窗口防重限流过滤链设计', completed: false, priority: 'high', createdAt: '2026-06-18' },
  { id: 'todo-6', jobId: 'job-3', text: '精刷 3 道经典的分布式死锁恢复指令及释放方案 (Lua 释放锁)', completed: true, priority: 'high', createdAt: '2026-06-18' },
  // Amazon
  { id: 'todo-7', jobId: 'job-4', text: '总结 3 套卓越的 Amazon 领导力原则 Dive Deep 面试案例故事', completed: true, priority: 'high', createdAt: '2026-06-15' },
  { id: 'todo-8', jobId: 'job-4', text: '复盘 AWS 跨可用区主备数据一致性 CAP 理论落地方案', completed: false, priority: 'normal', createdAt: '2026-06-15' }
];

export default function App() {
  // Syncing state securely with localStorage
  const [jobs, setJobs] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_JOBS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_JOBS;
    } catch {
      return DEFAULT_JOBS;
    }
  });

  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TODOS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_TODOS;
    } catch {
      return DEFAULT_TODOS;
    }
  });

  // Saving updates to local cache
  useEffect(() => {
    localStorage.setItem(STORAGE_JOBS_KEY, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_TODOS_KEY, JSON.stringify(todos));
  }, [todos]);

  // Operational states
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeInterviewJob, setActiveInterviewJob] = useState<JobApplication | null>(null);

  // Stats drawer toggle helper
  const [isStatsExpanded, setIsStatsExpanded] = useState(true);

  // Todo operational callbacks
  const handleAddTodo = (text: string, priority: 'normal' | 'high', jobId: string) => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      jobId,
      text,
      completed: false,
      priority,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTodos(prev => [newTodo, ...prev]);
  };

  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  // Job cards callbacks
  const handleAddJob = (jobData: Omit<JobApplication, 'id' | 'appliedDate'>) => {
    const newJob: JobApplication = {
      ...jobData,
      id: `job-${Date.now()}`,
      appliedDate: new Date().toISOString().split('T')[0],
    };
    setJobs(prev => [newJob, ...prev]);
    // Pre-create initial checklists for the newly added customized jobs
    const initialTaskText = `准备【${jobData.company} - ${jobData.position}】的首轮技术高频基本功复习`;
    handleAddTodo(initialTaskText, 'high', newJob.id);
  };

  const handleDeleteJob = (id: string) => {
    if (confirm('确认要移除此岗位投递卡片吗？该卡片对应的模拟面试进度也将被擦除。')) {
      setJobs(prev => prev.filter(j => j.id !== id));
      setTodos(prev => prev.filter(t => t.jobId !== id));
      if (expandedJobId === id) setExpandedJobId(null);
    }
  };

  const handleToggleUrgent = (id: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id === id) {
        return { ...j, priority: j.priority === 'urgent' ? 'normal' : 'urgent' };
      }
      return j;
    }));
  };

  // Up and down Chevron stage-shifting logic as required for outstanding interactivity!
  const handleShiftStage = (id: string, direction: 'up' | 'down') => {
    const statusOrder: JobStatus[] = ['delivered', 'interview1', 'interview2', 'offer'];
    setJobs(prev => prev.map(j => {
      if (j.id === id) {
        const currentIndex = statusOrder.indexOf(j.status);
        let nextIndex = currentIndex;
        if (direction === 'up' && currentIndex > 0) {
          nextIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < statusOrder.length - 1) {
          nextIndex = currentIndex + 1;
        }
        return { ...j, status: statusOrder[nextIndex], tag: statusOrder[nextIndex] === 'offer' ? 'WIN' : undefined };
      }
      return j;
    }));
  };

  // Stage change dropdown selection
  const handleSetStatus = (id: string, newStatus: JobStatus) => {
    setJobs(prev => prev.map(j => {
      if (j.id === id) {
        return { ...j, status: newStatus, tag: newStatus === 'offer' ? 'WIN' : undefined };
      }
      return j;
    }));
  };

  // Filtering processed applications list
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
      job.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || job.priority === 'urgent';
    
    return matchesSearch && matchesPriority;
  });

  // Stages dictionary matching the design guidelines
  const STAGES: { key: JobStatus; title: string; color: string; badgeBg: string; textCol: string }[] = [
    { key: 'delivered', title: '已投递', color: 'bg-[#4ECDC4]', badgeBg: 'bg-emerald-50', textCol: 'text-emerald-700' },
    { key: 'interview1', title: '一面', color: 'bg-[#0060ac]', badgeBg: 'bg-blue-50', textCol: 'text-blue-700' },
    { key: 'interview2', title: '二面', color: 'bg-indigo-600', badgeBg: 'bg-indigo-50', textCol: 'text-indigo-700' },
    { key: 'offer', title: 'Offer发放', color: 'bg-teal-700', badgeBg: 'bg-teal-50', textCol: 'text-teal-700' }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#191c1d] flex flex-col items-center">
      
      {/* Viewport Frame - Designed with Mobile first grid spacing constraints & Desktop reflow width */}
      <div className="w-full max-w-lg md:max-w-2xl bg-[#F8F9FA] min-h-screen flex flex-col pb-28 relative shadow-xs border-x border-gray-100">
        
        {/* Real Header matching image 1:1 format */}
        <header className="sticky top-0 z-30 bg-[#F8F9FA] border-b border-gray-150/60 px-5 py-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              className="p-1 text-teal-800 hover:bg-gray-150/50 rounded-lg transition-colors cursor-pointer"
              onClick={() => {
                alert('Job Investment Copilot: 一体化求职看板，当前已是主控制区。');
              }}
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-base font-bold text-gray-800 font-sans tracking-tight">
              投递进度
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
              className="p-1.5 text-gray-500 hover:text-[#006a65] hover:bg-white rounded-lg border border-transparent hover:border-gray-150/50 transition-all font-mono text-[10px] flex items-center gap-1 font-semibold"
              title="切换漏斗状态"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{isStatsExpanded ? '简阅看板' : '精算漏斗'}</span>
            </button>

            <button 
              onClick={() => setPriorityFilter(p => p === 'all' ? 'urgent' : 'all')}
              className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                priorityFilter === 'urgent'
                  ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
              title="仅看加急"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold">{priorityFilter === 'all' ? '过滤' : '加急'}</span>
            </button>
          </div>
        </header>

        {/* Top Search Filter area */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="智能检索企业全称、岗位职能描述..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-gray-150/70 rounded-xl focus:outline-none focus:border-[#4ECDC4] focus:bg-white shadow-xs transition-all"
            />
          </div>
        </div>

        {/* Core Main Panel Area */}
        <main className="px-5 py-4 space-y-6">

          {/* Collapsible Funnel and Heatmap Dashboard */}
          {isStatsExpanded && (
            <div className="animate-in fade-in duration-250">
              <FunnelDashboard applications={jobs} />
            </div>
          )}

          {/* Kanban / Stage group listings matching the exact screenshot visual layout */}
          <div className="space-y-6">
            {STAGES.map((stage) => {
              const stageJobs = filteredJobs.filter(j => j.status === stage.key);
              const itemCount = stageJobs.length;

              return (
                <div key={stage.key} className="space-y-3.5">
                  
                  {/* Stage section header */}
                  <div className="flex items-center justify-between select-none">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-6 rounded-full ${stage.color}`} />
                      <h2 className="text-sm font-bold text-gray-800 font-sans tracking-tight">
                        {stage.title}
                      </h2>
                    </div>
                    {/* Item count chip using JetBrains Mono label */}
                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-[#E8EAEB] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
                    </span>
                  </div>

                  {/* Stage elements cards list */}
                  <div className="space-y-3">
                    {itemCount === 0 ? (
                      /* Rendering empty dotted card exactly conforming to screenshot's "二面" column */
                      <div className="w-full bg-transparent border-2 border-dashed border-gray-200 rounded-xl py-8 px-4 flex flex-col items-center justify-center space-y-2 select-none">
                        {/* 6 drag dots grid icon mimicking image */}
                        <div className="grid grid-cols-3 gap-1">
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                        </div>
                        <p className="text-xs text-gray-400 font-sans">
                          暂无进行中的{stage.title}
                        </p>
                      </div>
                    ) : (
                      stageJobs.map((job) => {
                        const isExpanded = expandedJobId === job.id;
                        const hasUrgent = job.priority === 'urgent';
                        const isOffer = job.status === 'offer';

                        return (
                          <div 
                            key={job.id}
                            className={`group relative border transition-all duration-300 overflow-hidden ${
                              isOffer 
                                ? 'bg-emerald-50/45 border-emerald-100/80 rounded-2xl' 
                                : 'bg-white border-gray-150/50 rounded-2xl'
                            } ${isExpanded ? 'shadow-md ring-1 ring-[#4ECDC4]/15' : 'hover:border-gray-200 shadow-xs'}`}
                            // Vertical orange border indicator for high priority urgent card
                            style={{
                              borderLeftWidth: hasUrgent ? '4px' : '1px',
                              borderLeftColor: hasUrgent ? '#ffa654' : undefined
                            }}
                          >
                            <div className="p-4 flex items-center justify-between gap-3">
                              
                              {/* Left Company Logo & Position info */}
                              <div 
                                className="flex-1 flex items-center gap-3.5 cursor-pointer"
                                onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                              >
                                <CompanyLogo 
                                  type={job.logoType} 
                                  name={job.company} 
                                  customColor={job.customLogoColor}
                                />
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h3 className="text-xs font-bold text-gray-800 font-sans tracking-tight">
                                      {job.company}
                                    </h3>
                                    
                                    {/* Urgent Badge */}
                                    {hasUrgent && (
                                      <span className="bg-[#ffa654] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                                        URGENT
                                      </span>
                                    )}

                                    {/* WIN status label */}
                                    {job.tag === 'WIN' && (
                                      <span className="bg-[#006a65] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                                        WIN
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 font-medium font-sans">
                                    {job.position}
                                  </p>
                                </div>
                              </div>

                              {/* Right Chevron Shift Stage layout as requested */}
                              <div className="flex flex-col items-center justify-center bg-gray-50/60 p-1 rounded-lg border border-gray-100 shrink-0 select-none">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleShiftStage(job.id, 'up'); }}
                                  disabled={job.status === 'delivered'}
                                  className="p-1 text-gray-400 hover:text-[#006a65] disabled:opacity-30 disabled:hover:text-gray-400 cursor-pointer transition-colors"
                                  title="移至上一级进度"
                                >
                                  <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                                <hr className="w-3 border-gray-200 my-0.5" />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleShiftStage(job.id, 'down'); }}
                                  disabled={job.status === 'offer'}
                                  className="p-1 text-gray-400 hover:text-[#006a65] disabled:opacity-30 disabled:hover:text-gray-400 cursor-pointer transition-colors"
                                  title="送至下一级进度"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              </div>

                            </div>

                            {/* Expanded Detail Workspace */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4 bg-gray-50/30 animate-in fade-in slide-in-from-top-1 duration-200">
                                
                                {/* Info details meta */}
                                <div className="grid grid-cols-2 gap-2 text-[11px] font-sans text-gray-600">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    <span>地点: {job.location || '远程协同'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Coins className="w-3.5 h-3.5 text-gray-400" />
                                    <span>薪资: {job.salary || '待测定'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    <span>立项: {job.appliedDate}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 col-span-2">
                                    <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span className="truncate">备注: {job.notes || '无自备备忘'}</span>
                                  </div>
                                </div>

                                {/* JD job description */}
                                <div className="bg-white rounded-xl p-3 border border-gray-150/40 text-xs text-gray-600 space-y-1">
                                  <span className="font-semibold text-gray-700 font-sans block">岗位核心诉求 (JD):</span>
                                  <p className="leading-relaxed font-sans text-[11px]">{job.description}</p>
                                </div>

                                {/* Checklist of todos specific to this job card */}
                                <TodoListPanel 
                                  todos={todos}
                                  jobs={jobs}
                                  selectedJobId={job.id}
                                  onAddTodo={handleAddTodo}
                                  onToggleTodo={handleToggleTodo}
                                  onDeleteTodo={handleDeleteTodo}
                                />

                                {/* Control Actions buttons */}
                                <div className="flex gap-2 justify-between items-center border-t border-gray-100 pt-3 flex-wrap">
                                  
                                  {/* Fast stage override dropdown switcher */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 font-mono">调遣至:</span>
                                    <select
                                      value={job.status}
                                      onChange={e => handleSetStatus(job.id, e.target.value as JobStatus)}
                                      className="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-1 text-gray-500 focus:outline-none focus:border-[#4ECDC4] font-medium"
                                    >
                                      <option value="delivered">已投递</option>
                                      <option value="interview1">一面</option>
                                      <option value="interview2">二面</option>
                                      <option value="offer">Offer发放</option>
                                    </select>
                                  </div>

                                  {/* Active core control triggers */}
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUrgent(job.id)}
                                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                                        hasUrgent
                                          ? 'border-[#ffa654] bg-[#ffa654]/10 text-[#7c4d00]'
                                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                      }`}
                                    >
                                      {hasUrgent ? '取消重点' : '标为重点'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteJob(job.id)}
                                      className="px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-colors"
                                    >
                                      擦除卡片
                                    </button>

                                    <button 
                                      type="button"
                                      onClick={() => setActiveInterviewJob(job)}
                                      className="px-3 py-1 bg-[#4ECDC4] hover:bg-[#34beb5] text-[#154E4A] text-[10px] font-extrabold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                                    >
                                      <Bot className="w-3.5 h-3.5 animate-bounce" />
                                      <span>启动 AI 模拟面试</span>
                                    </button>
                                  </div>

                                </div>

                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </main>

        {/* Global sticky/fixed footer Core Action Engines - Height 64px matching guidelines */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/85 backdrop-blur-md border-t border-gray-200/80 p-4 shadow-lg flex items-center justify-center max-w-lg md:max-w-2xl mx-auto h-[74px]">
          <div className="grid grid-cols-2 gap-3 w-full">
            
            {/* Secondary: Mock Interview Quick Start */}
            <button
              onClick={() => {
                // Open first active interview candidate job or first job card
                const candidate = jobs.find(j => j.status === 'interview1' || j.status === 'interview2') || jobs[0];
                if (candidate) {
                  setActiveInterviewJob(candidate);
                } else {
                  alert('请先在本系统录入至少一个职位进行模拟面试！');
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 border border-[#4ECDC4] bg-[#FDFDFD] hover:bg-[#E0FAEE]/30 text-[#006a65] h-12 rounded-xl text-xs font-bold transition-all select-none shadow-xs cursor-pointer"
            >
              <Bot className="w-4.5 h-4.5 text-[#006a65]" />
              <span>全真 AI 随练大师</span>
            </button>

            {/* Primary Action Button: Add Job */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#006a65] hover:bg-[#00514e] text-white h-12 rounded-xl text-xs font-bold transition-all select-none shadow-sm shadow-emerald-700/10 cursor-pointer"
            >
              <Plus className="w-5 h-5 text-white" />
              <span>新增契机卡片</span>
            </button>

          </div>
        </div>

        {/* Floating Add Card Dialog Modal */}
        {isAddModalOpen && (
          <AddJobModal 
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddJob}
          />
        )}

        {/* Floating Mock Interview Drawer Panel Bottom Sheet */}
        {activeInterviewJob && (
          <MockInterviewPanel 
            job={activeInterviewJob}
            onClose={() => setActiveInterviewJob(null)}
          />
        )}

      </div>
    </div>
  );
}
