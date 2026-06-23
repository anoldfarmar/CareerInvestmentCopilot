import React, { useState } from 'react';
import { JobApplication, JobStatus } from '../types';
import { X, Briefcase, Plus, ShieldCheck } from 'lucide-react';

interface AddJobModalProps {
  onClose: () => void;
  onAdd: (job: Omit<JobApplication, 'id' | 'appliedDate'>) => void;
}

export default function AddJobModal({ onClose, onAdd }: AddJobModalProps) {
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<JobStatus>('delivered');
  const [logoType, setLogoType] = useState<'bytedance' | 'ant' | 'xiaomi' | 'amazon' | 'custom'>('custom');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [errorCursor, setErrorCursor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) {
      setErrorCursor('请输入公司全称');
      return;
    }
    if (!position.trim()) {
      setErrorCursor('请输入岗位名称');
      return;
    }

    onAdd({
      company: company.trim(),
      position: position.trim(),
      status,
      logoType,
      priority,
      description: description.trim() || '主要负责后端微服务等相关业务开发，保障高可用吞吐。',
      salary: salary.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      customLogoColor: logoType === 'custom' ? getRandomTealColor() : undefined,
    });
    onClose();
  };

  const getRandomTealColor = () => {
    const tealColors = ['#006a65', '#25A59A', '#0f766e', '#0d9488', '#14b8a6', '#0284c7'];
    return tealColors[Math.floor(Math.random() * tealColors.length)];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#e0faee] text-[#006a65] rounded-lg">
              <Briefcase className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-gray-800 font-sans">录入全新投递契机</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorCursor && (
            <div className="bg-rose-50 text-rose-700 text-xs px-3 py-2 rounded-lg font-medium border border-rose-100 flex items-center gap-1.5">
              <span>⚠️ {errorCursor}</span>
            </div>
          )}

          {/* Company & Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">公司全称 *</label>
              <input
                type="text"
                placeholder="例如: 腾讯科技"
                value={company}
                onChange={e => {
                  setCompany(e.target.value);
                  setErrorCursor('');
                  // Auto-detect logoType for common keywords
                  const text = e.target.value.toLowerCase();
                  if (text.includes('字节') || text.includes('bytedance')) setLogoType('bytedance');
                  else if (text.includes('蚂蚁') || text.includes('ant')) setLogoType('ant');
                  else if (text.includes('小米') || text.includes('xiaomi')) setLogoType('xiaomi');
                  else if (text.includes('亚马逊') || text.includes('amazon')) setLogoType('amazon');
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4ECDC4] transition-all"
                maxLength={40}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">岗名/职级 *</label>
              <input
                type="text"
                placeholder="例如: 算法研发工程师"
                value={position}
                onChange={e => { setPosition(e.target.value); setErrorCursor(''); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4ECDC4] transition-all"
                maxLength={40}
              />
            </div>
          </div>

          {/* Logo Select & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">品牌标识样式</label>
              <select
                value={logoType}
                onChange={e => setLogoType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4ECDC4] transition-all"
              >
                <option value="custom">默认首字底色</option>
                <option value="bytedance">字节跳动 3D风格</option>
                <option value="ant">蚂蚁集团 深绿球体</option>
                <option value="xiaomi">小米集团 曜石赤点</option>
                <option value="amazon">亚马逊 橙色微笑</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">应聘紧迫等级</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    priority === 'normal'
                      ? 'border-[#4ECDC4] bg-[#e0faee]/45 text-[#006a65]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  常规推进
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    priority === 'urgent'
                      ? 'border-amber-400 bg-amber-50 text-amber-700 font-bold'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  URGENT 紧急
                </button>
              </div>
            </div>
          </div>

          {/* Status Stage SELECT */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">当前所处求职节点</label>
            <div className="grid grid-cols-4 gap-2">
              {(['delivered', 'interview1', 'interview2', 'offer'] as JobStatus[]).map(st => {
                const names = {
                  delivered: '已投递',
                  interview1: '一面环节',
                  interview2: '二面环节',
                  offer: 'Offer发放',
                };
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border transition-all ${
                      status === st
                        ? 'border-[#006a65] bg-[#006a65] text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {names[st]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Salary & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">预估薪资待遇</label>
              <input
                type="text"
                placeholder="例如: 25k - 35k * 15薪"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4ECDC4] transition-all"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">物理办公区域/城市</label>
              <input
                type="text"
                placeholder="例如: 上海 · 浦东张江"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4ECDC4] transition-all"
                maxLength={30}
              />
            </div>
          </div>

          {/* Description & Requirements */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">岗位职责与JD描述摘要</label>
            <textarea
              placeholder="主要职责包括：海量高并发高可用分布式、系统级重构、熟练掌握中间件、熟悉高性能数据库优化等..."
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4ECDC4] transition-all"
            />
          </div>

          {/* Custom Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">自备备忘/特殊内堆备注</label>
            <input
              type="text"
              placeholder="例如: 学长内推，投递时标注了前司优秀项目贡献"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4ECDC4] transition-all"
              maxLength={120}
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#006a65]" />
            <span>数据本地持久安全隔离加密</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#006a65] text-white hover:bg-[#00524e] rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>保存卡片</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
