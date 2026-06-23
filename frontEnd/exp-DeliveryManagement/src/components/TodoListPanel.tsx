import React, { useState } from 'react';
import { TodoItem, JobApplication } from '../types';
import { Plus, Check, Trash2, Calendar, ClipboardCheck } from 'lucide-react';

interface TodoListPanelProps {
  todos: TodoItem[];
  jobs: JobApplication[];
  selectedJobId?: string;
  onAddTodo: (text: string, priority: 'normal' | 'high', jobId: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export default function TodoListPanel({
  todos,
  jobs,
  selectedJobId,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoListPanelProps) {
  const [newTodoText, setNewTodoText] = useState('');
  const [todoPriority, setTodoPriority] = useState<'normal' | 'high'>('normal');
  const [targetJobId, setTargetJobId] = useState(selectedJobId || (jobs[0]?.id || ''));

  // Sync state with selected Job changes
  React.useEffect(() => {
    if (selectedJobId) {
      setTargetJobId(selectedJobId);
    }
  }, [selectedJobId]);

  // Filter based on active selection
  const filteredTodos = todos.filter(t => !selectedJobId || t.jobId === selectedJobId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    onAddTodo(newTodoText.trim(), todoPriority, targetJobId);
    setNewTodoText('');
    setTodoPriority('normal');
  };

  const currentJobName = jobs.find(j => j.id === targetJobId)?.company || '全局求职备忘';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 font-sans">
          <ClipboardCheck className="w-4.5 h-4.5 text-[#006a65]" />
          <span>AI 规划智能备背录 ({currentJobName})</span>
        </h3>
        <span className="text-[10px] font-mono font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          {filteredTodos.filter(t => !t.completed).length} 项待攻克
        </span>
      </div>

      {/* Embedded form to append quickly */}
      <form onSubmit={handleAdd} className="space-y-2.5 bg-gray-50/50 p-3 rounded-xl border border-gray-150/40">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`为【${currentJobName}】添加自定义核心考点备忘...`}
            value={newTodoText}
            onChange={e => setNewTodoText(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-white text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#4ECDC4] transition-all"
            maxLength={80}
          />
          <button
            type="submit"
            className="p-2 bg-[#006a65] hover:bg-[#00514e] text-white rounded-lg transition-colors shrink-0"
            title="添加备忘"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400">紧迫等级:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setTodoPriority('normal')}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold border transition-all ${
                  todoPriority === 'normal'
                    ? 'border-gray-300 bg-stone-100 text-gray-600'
                    : 'border-transparent text-gray-400 hover:text-gray-500'
                }`}
              >
                常规考点
              </button>
              <button
                type="button"
                onClick={() => setTodoPriority('high')}
                className={`px-2 py-0.5 rounded text-[9px] font-extrabold border transition-all ${
                  todoPriority === 'high'
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-transparent text-gray-400 hover:text-gray-500'
                }`}
              >
                URGENT 高频重难点
              </button>
            </div>
          </div>

          {/* Quick job filter switcher inside form if global */}
          {!selectedJobId && jobs.length > 0 && (
            <select
              value={targetJobId}
              onChange={e => setTargetJobId(e.target.value)}
              className="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 focus:outline-none focus:border-[#4ECDC4] font-medium"
            >
              {jobs.map(jb => (
                <option key={jb.id} value={jb.id}>{jb.company}</option>
              ))}
            </select>
          )}
        </div>
      </form>

      {/* Todos list */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs font-sans">
            🌴 规划完美！当前岗位所需攻坚指标全数清除。
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const relatedJob = jobs.find(j => j.id === todo.jobId);
            
            return (
              <div
                key={todo.id}
                className={`relative flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-xs transition-all ${
                  todo.completed ? 'opacity-40 line-through scale-[0.98]' : 'opacity-100'
                } duration-300`}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: todo.priority === 'high' ? '#ffa654' : '#e5e7eb' // left 4px vertical bar as required
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Square Checkbox with 8px base border radius matching guidelines */}
                  <button
                    type="button"
                    onClick={() => onToggleTodo(todo.id)}
                    className={`w-5 h-5 rounded-[8px] border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      todo.completed 
                        ? 'bg-[#4ECDC4] border-[#4ECDC4] text-slate-800' 
                        : 'border-gray-300 bg-white hover:border-[#4ECDC4]'
                    }`}
                  >
                    {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="truncate flex-1">
                    <p className={`text-xs font-medium text-gray-700 font-sans truncate ${todo.completed ? 'text-gray-400' : ''}`}>
                      {todo.text}
                    </p>
                    {/* Associated corporate subtitle context */}
                    {!selectedJobId && relatedJob && (
                      <span className="text-[9px] font-mono text-gray-400 mt-0.5 block">
                        {relatedJob.company} · {relatedJob.position}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {todo.priority === 'high' && !todo.completed && (
                    <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-800 font-extrabold rounded-sm uppercase font-mono">
                      URGENT
                    </span>
                  )}
                  <button
                    onClick={() => onDeleteTodo(todo.id)}
                    className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="移除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
