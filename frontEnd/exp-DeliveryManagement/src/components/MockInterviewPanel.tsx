import React, { useState, useEffect, useRef } from 'react';
import { JobApplication, ChatMessage } from '../types';
import { X, Send, Play, Bot, AlertCircle, Award, Compass, RefreshCw, Volume2, Sparkles } from 'lucide-react';

interface MockInterviewPanelProps {
  job: JobApplication;
  onClose: () => void;
}

export default function MockInterviewPanel({ job, onClose }: MockInterviewPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Focus and scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Seed initial questions based on the job type
  const getInterviewQuestions = () => {
    switch (job.logoType) {
      case 'bytedance':
        return [
          {
            q: `您好，我是字节跳动的AI面试官。今天我们考察您投递的【${job.position}】岗位。首先，请您针对如何在大规模分布式存储中，对亿级日活数据执行秒级实时 Flink state 清理与 checkpoint 调优聊聊您的经验？`,
            k: ['checkpoint', 'flink', 'state', '分配', '增量']
          },
          {
            q: "很好。如果遇到双流 Join 时的延迟与数据积压，在字节这样的大流量场景下，您会采取哪些反压管控与背压策略？",
            k: ['join', '反压', '背压', '双流', 'kafka']
          },
          {
            q: "最后一个问题：请简单设计一个支持高并发读写的抖音视频曝光去重过滤模块。您会选用什么存储和去重缓存架构？",
            k: ['redis', '布隆过滤器', 'bloom', '缓存', '去重的']
          }
        ];
      case 'ant':
        return [
          {
            q: `您好！欢迎参加蚂蚁金服技术面。针对您应聘的【${job.position}】一职，风控模型和图计算是重点。请问在处理数十亿核心用户的交易反欺诈模型时，如何保障图神经网络(GNN)在百万QPS下的实时查询吞吐？`,
            k: ['gnn', '风控', 'qps', '实时', '图模型']
          },
          {
            q: "在金融联邦学习中，由于各分行/商户节点数据互相隔离，您如何设计一套安全的加密参数梯度交换算法，防止在训练过程中泄漏个人交易隐私？",
            k: ['联邦学习', '加密', '差分隐私', '梯度', '安全']
          },
          {
            q: "感谢。请结合您的项目，谈谈当风控特征数据出现严重的标签偏移（Label Shift）时，您通常运用什么样本重采样或自适应技术进行修正？",
            k: ['重采样', '漂移', '纠偏', '权重', '样本']
          }
        ];
      case 'xiaomi':
        return [
          {
            q: `欢迎参加小米IoT物联网技术面试。您投递的是【${job.position}】。首先请聊聊，当千万级米家智能设备同时上报温湿度状态时，网关服务如何构建内存通道与连接队列以抵御瞬时流量洪峰？`,
            k: ['网关', '流量', 'mqtt', '消息队列', '队列']
          },
          {
            q: "在网关过滤链（Filter Chain）中，如果某个下游认证微服务突发 504 错误连接超市，作为后端研发负责人，你会如何配合 Sentinel 进行滑动窗口降级与弹性熔断治理？",
            k: ['熔断', '降级', '504', '网关', '限流']
          },
          {
            q: "在硬件上报的非结构化状态日志中，如果产生海量半结构化数据，应该选用什么样的持久化存储架构支持高性读写与多维聚合统计？",
            k: ['elasticsearch', 'clickhouse', '持久化', '多维']
          }
        ];
      case 'amazon':
        return [
          {
            q: `Hello! Welcome to Amazon Technical Interview. We're talking about 【${job.position}】. First question: When designing a globally distributed S3 storage backend, how do you handle and resolve consistency, partition tolerance and write conflicts across APAC and US regions?`,
            k: ['s3', 'cap', 'consistency', 'writes', 'region']
          },
          {
            q: "To meet high availability, how do you model DynamoDB secondary indexes and select custom composite partitions keys to avoid hot partitions when querying high throughput traffic?",
            k: ['dynamodb', 'index', 'partition', 'hot', 'key']
          },
          {
            q: "Describe an experience where you had to push down metrics under high ambiguity to achieve the Amazon Leadership Principle: 'Dive Deep'. How did you debug the root cause?",
            k: ['dive deep', 'leadership', 'ambiguity', 'metrics', 'debug']
          }
        ];
      default:
        return [
          {
            q: `您好，我是您的AI面试官。针对【${job.company} - ${job.position}】一职，我想请问您在以往工作中，最成功的技术架构优化案例是什么？它为业务线带来了哪些量化收益？`,
            k: ['架构', '优化', '指标', '吞吐', '性能']
          },
          {
            q: "在您负责的核心模块中，如何避免多节点微服务并发执行任务时的分布式锁死锁与超时冲突？您推荐使用什么样的原子化指令释放锁？",
            k: ['分布式锁', 'redis', 'setnx', 'lua', '原子']
          },
          {
            q: "当项目需要快速迭代，AI 助力如何能够提高你的研发效能？谈谈你在日常开发中与大模型协作的核心方法论。",
            k: ['ai', '协作', '大模型', '效能', '提示词']
          }
        ];
    }
  };

  const QAs = getInterviewQuestions();

  // Reset and load first question on mount
  useEffect(() => {
    setMessages([
      {
        id: 'init-bot',
        sender: 'ai',
        text: QAs[0].q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
    setStepIndex(0);
    setScore(null);
    setEvaluationFeedback('');
  }, [job]);

  // Handle typing simulation
  const handleBotReply = (nextIndex: number, userResponse: string) => {
    setIsTyping(true);
    
    // Evaluate answer matching score keywords to show real integration
    setTimeout(() => {
      setIsTyping(false);
      
      if (nextIndex < QAs.length) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-q-${nextIndex}`,
            sender: 'ai',
            text: QAs[nextIndex].q,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
        setStepIndex(nextIndex);
      } else {
        // Complete the mock interview and calculate the final score!
        const totalUserText = userResponse + ' ' + messages.filter(m => m.sender === 'user').map(m => m.text).join(' ');
        
        // Count matched technical keywords to grade accurately
        let matches = 0;
        const allKeywords = QAs.flatMap(qa => qa.k);
        allKeywords.forEach(kw => {
          if (totalUserText.toLowerCase().includes(kw.toLowerCase())) {
            matches++;
          }
        });

        // Compute a mock score based on actual user effort and keywords
        let baseScore = 65;
        if (totalUserText.length > 200) baseScore += 10;
        if (totalUserText.length > 500) baseScore += 15;
        baseScore += matches * 3;
        const finalScore = Math.min(98, baseScore);

        setScore(finalScore);
        
        let feedback = '';
        if (finalScore >= 90) {
          feedback = '优异！技术功底极其扎实，在分布式演研、性能优化、以及核心边界指标控制方面表现极佳，完美击中字节级全链路架构考要。核心竞争力拉满';
        } else if (finalScore >= 80) {
          feedback = '良好。具备优秀的项目整合架构思维，但在底层的特定实现细节（如 checkpoint 保障层或特定算法加密路径）上叙述可进一步充实。推荐重点补充核心底层指令知识点。';
        } else {
          feedback = '中等。具备主流微服务业务逻辑实施经验，但缺乏应对极高吞吐量与极限并发场景的系统设计细节。建议多加练习高并发、海量QPS限流治理模块。';
        }
        
        setEvaluationFeedback(feedback);

        setMessages(prev => [
          ...prev,
          {
            id: `bot-review`,
            sender: 'ai',
            text: `🎉 模拟面试结束！针对【${job.company} - ${job.position}】技术评估已完成。您的回答表现得分: ${finalScore}分。已为您生成深度反馈评估报告，请滑至下方查看！`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
        setStepIndex(QAs.length);
      }
    }, 1800);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    const userMsg: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    
    // Proceed to next question or evaluation
    handleBotReply(stepIndex + 1, userMsgText);
  };

  // Play audio sound simulation
  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex justify-end items-end md:items-center md:justify-center p-0 md:p-4">
      {/* Container as standard Premium bottom sheet (top rounded-t-3xl) or desktop middle modal */}
      <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-xl border border-gray-100 flex flex-col h-[85vh] md:h-[75vh] animate-slide-up overflow-hidden">
        
        {/* Header bar */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-[#4ECDC4] text-white rounded-xl">
              <Bot className="w-5 h-5 animate-bounce" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-gray-800 font-sans">
                  {job.company} · 模拟技术初筛
                </h2>
                <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-sm font-semibold flex items-center gap-0.5 font-mono">
                  <Sparkles className="w-2.5 h-2.5 fill-teal-600" />
                  COPILOT AI
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono tracking-tight uppercase">
                {job.position} Interview Preparation
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-sky-50/50 border-b border-sky-100/50 px-4 py-2.5 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-sky-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-sky-800 font-medium font-sans leading-relaxed">
            AI 面试官将连续抛出 3 道最契合该司高频真题的底层考核。请根据自身经验深入剖析解答，助您一战拿下 Offer。
          </p>
        </div>

        {/* Chat message space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F9FA]">
          {messages.map((message) => {
            const isAI = message.sender === 'ai';
            return (
              <div 
                key={message.id} 
                className={`flex items-start gap-2.5 ${!isAI ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar indicator */}
                {isAI ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-[#154E4A] text-white flex items-center justify-center p-1 shadow-xs shrink-0 select-none">
                    <Bot className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs shrink-0 select-none uppercase">
                    Me
                  </div>
                )}

                {/* Bubble card */}
                <div className={`max-w-[78%] flex flex-col`}>
                  <div 
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed border ${
                      isAI 
                        ? 'bg-[#edeeef] text-gray-800 border-gray-200/60 rounded-tl-sm' 
                        : 'bg-[#4e7dcdc4] bg-[#4ECDC4] text-gray-905 border-[#3fb5ad] text-slate-900 font-medium rounded-tr-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line font-sans font-medium text-[13px]">{message.text}</p>
                    
                    {/* TTS reader tool */}
                    {isAI && message.id !== 'bot-review' && (
                      <button 
                        onClick={handlePlayAudio}
                        className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-[#006a65] font-mono border-t border-gray-200/50 pt-1.5 transition-colors"
                      >
                        <Volume2 className={`w-3 h-3 ${isPlayingAudio ? 'text-teal-600 animate-bounce' : ''}`} />
                        <span>{isPlayingAudio ? '阅读中...' : '朗读题目 (语音助手)'}</span>
                      </button>
                    )}
                  </div>
                  <span className={`text-[10px] text-gray-400 mt-1 font-mono ${!isAI ? 'text-right' : 'text-left'}`}>
                    {message.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing state */}
          {isTyping && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-white flex items-center justify-center p-1 shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#edeeef] border border-gray-200/50 px-4 py-3 rounded-2xl rounded-tl-sm text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce duration-300 transition-all"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s] duration-300"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s] duration-300"></span>
                </div>
                <span className="text-[9px] text-gray-400 font-mono mt-1 block">AI 正在深度阅卷并出题中...</span>
              </div>
            </div>
          )}

          {/* Report Card summary after score triggers */}
          {score !== null && (
            <div className="bg-white border border-dashed border-teal-200 rounded-xl p-4 shadow-sm space-y-3.5 animate-in fade-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg">
                    <Award className="w-4.5 h-4.5" />
                  </span>
                  <h3 className="text-xs font-bold text-gray-800">技术选型综合评估报告</h3>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-black font-sans text-teal-600 font-mono">{score}</span>
                  <span className="text-[10px] text-gray-400 font-mono">/100 PTS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-gray-50/60 p-2 rounded-lg">
                  <span className="text-gray-400 block mb-0.5">高频知识命中率</span>
                  <span className="font-bold text-gray-700">86.2% 合格</span>
                </div>
                <div className="bg-gray-50/60 p-2 rounded-lg">
                  <span className="text-gray-400 block mb-0.5">全链路容灾选型</span>
                  <span className="font-bold text-emerald-600">卓越 Excellent</span>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <span className="font-semibold text-gray-600 font-sans block">💡 架构专家点评:</span>
                <p className="text-gray-600 leading-relaxed font-sans">{evaluationFeedback}</p>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([
                      {
                        id: 'init-bot-reset',
                        sender: 'ai',
                        text: QAs[0].q,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      }
                    ]);
                    setStepIndex(0);
                    setScore(null);
                    setEvaluationFeedback('');
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-[#006a65] flex items-center gap-1 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>重新开始测评</span>
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        {score === null ? (
          <form 
            onSubmit={handleSendMessage}
            className="p-3 border-t border-gray-150/60 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={isTyping ? "AI 面试官出题中，请稍后..." : "键入您的见解并按回车发送..."}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={isTyping}
              className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100/55 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-[#4ECDC4] focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isTyping || !inputText.trim()}
              className="p-2.5 bg-[#4ECDC4] hover:bg-[#3ebeb5] text-slate-800 rounded-full disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="p-3.5 bg-gray-50 border-t border-gray-150/60 flex gap-2">
            <button
              onClick={onClose}
              className="w-full bg-[#006a65] hover:bg-[#00514e] text-white py-3 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>保存结果并返回 Workbench 看板</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
