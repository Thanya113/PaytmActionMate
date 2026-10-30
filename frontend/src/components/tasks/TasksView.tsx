import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  Terminal, 
  ShieldCheck, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { Task } from '../../types';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks();
      setTasks(res.tasks);
      if (res.tasks.length > 0 && !selectedTask) {
        setSelectedTask(res.tasks[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.request_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Tasks & Operations Log</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit trail of all autonomous investigations, multi-step tool calls, and verified outcomes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E8EDF4] rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-paytm-blue w-48 sm:w-64"
            />
          </div>
          <button
            onClick={fetchTasks}
            className="p-2 bg-[#F8FAFC] hover:bg-slate-100 text-slate-600 rounded-xl border border-[#E8EDF4] transition-colors"
            title="Refresh Task List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Task List, Right Selected Task Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tasks List (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E8EDF4] rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E8EDF4] text-xs font-bold text-slate-500 uppercase tracking-wider">
            All Executed Tasks ({filteredTasks.length})
          </div>

          <div className="divide-y divide-slate-100 max-h-[720px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No matching tasks found.</div>
            ) : (
              filteredTasks.map((t) => {
                const isSelected = selectedTask?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className={`w-full text-left p-4 transition-all flex items-start justify-between gap-3 ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-paytm-blue' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {t.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                          t.status === 'WAITING_APPROVAL' ? 'bg-amber-50 text-amber-800' :
                          'bg-blue-50 text-paytm-blue'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#0F172A] line-clamp-1">{t.request_text}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{t.result_summary || 'Task executing...'}</p>
                      <span className="text-[10px] text-slate-400 block pt-1">
                        {new Date(t.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 mt-2 ${isSelected ? 'text-paytm-blue' : 'text-slate-300'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Task Inspector (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedTask ? (
            <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-6">
              {/* Task Header */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-extrabold text-paytm-blue bg-blue-50 px-2.5 py-1 rounded-lg">
                    {selectedTask.id}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    selectedTask.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    selectedTask.status === 'WAITING_APPROVAL' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-blue-50 text-paytm-blue border border-blue-200'
                  }`}>
                    {selectedTask.status}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#0F172A]">{selectedTask.request_text}</h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Recorded at {new Date(selectedTask.created_at).toLocaleString('en-IN')}
                </p>
              </div>

              {/* 6-Stage Timeline Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Autonomous 6-Stage Execution Trace
                </h3>
                <div className="space-y-3">
                  {selectedTask.stages.map((stg, idx) => {
                    const isDone = stg.status === 'completed' || stg.status === 'approved';
                    const isWaiting = stg.status === 'waiting_approval';
                    return (
                      <div key={idx} className="flex items-start space-x-3 text-xs">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px] ${
                          isDone ? 'bg-emerald-100 text-emerald-800' :
                          isWaiting ? 'bg-amber-100 text-amber-900 animate-pulse' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                          <div className="flex items-center justify-between font-bold text-slate-800 mb-0.5">
                            <span>{stg.label}</span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">{stg.status}</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed text-[11px]">{stg.detail || 'Executed step'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tool Calls Log */}
              {selectedTask.tool_calls && selectedTask.tool_calls.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Business Tools Invoked ({selectedTask.tool_calls.length})
                  </h3>
                  <div className="space-y-2.5">
                    {selectedTask.tool_calls.map((tc, idx) => (
                      <div key={idx} className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-paytm-cyan font-bold">
                          <span>$ call: {tc.tool}()</span>
                          <span className="text-slate-400 text-[10px]">SUCCESS</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          params: {JSON.stringify(tc.params)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outcome Summary */}
              {selectedTask.result_summary && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-medium">
                  <div className="font-bold text-emerald-900 mb-1">Terminal Outcome:</div>
                  <p>{selectedTask.result_summary}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#E8EDF4] rounded-2xl p-12 text-center text-slate-400 text-xs shadow-card">
              Select a task from the list to inspect its execution trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
