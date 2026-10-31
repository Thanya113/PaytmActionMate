import React, { useState } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Users, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  Search, 
  HelpCircle,
  FileCheck2,
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react';
import { OverviewResponse } from '../../services/api';
import { NavigationTab, DailySale } from '../../types';
import { ProactiveTeammatePanel } from './ProactiveTeammatePanel';

interface OverviewViewProps {
  data: OverviewResponse | null;
  loading: boolean;
  onNavigate: (tab: NavigationTab) => void;
  onTriggerPrompt: (prompt: string) => void;
  onRefresh: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  loading,
  onNavigate,
  onTriggerPrompt,
  onRefresh
}) => {
  const [hoveredDay, setHoveredDay] = useState<DailySale | null>(null);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-3 border-paytm-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading merchant telemetry from Paytm database...</p>
      </div>
    );
  }

  const { merchant, summary, performance, insights, active_tasks, quick_actions } = data;

  // Chart scaling calculations
  const maxSale = Math.max(...performance.daily_sales.map(d => Math.max(d.current_sales, d.previous_sales)), 30000);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* A. Welcome Section */}
      <div className="bg-gradient-to-r from-paytm-dark via-[#073A82] to-paytm-dark rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-paytm-cyan text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Autonomous Operations Active</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good morning, {merchant.owner_name || 'Rajesh'}! Your business teammate is ready.
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            ActionMate continuously monitors sales, customer visit cycles, and bank settlements for <span className="text-white font-medium">{merchant.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('teammate')}
            className="flex items-center space-x-2 bg-paytm-cyan text-paytm-dark font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#38CBF7] transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Teammate Workspace</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors"
            title="Refresh Database Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* B. Merchant Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Sales (7 Days)</span>
            <span className="p-2 bg-blue-50 text-paytm-blue rounded-xl">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            ₹{summary.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="flex items-center space-x-1.5 mt-2.5 text-xs">
            <span className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded ${
              summary.sales_change_pct < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {summary.sales_change_pct < 0 ? <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
              {Math.abs(summary.sales_change_pct)}%
            </span>
            <span className="text-slate-500">vs prev week (₹{summary.previous_sales.toLocaleString('en-IN')})</span>
          </div>
        </div>

        {/* Successful Transactions */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Successful Transactions</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            {summary.successful_transactions.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center space-x-1.5 mt-2.5 text-xs">
            <span className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded ${
              summary.transactions_change_pct < 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {summary.transactions_change_pct < 0 ? <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
              {Math.abs(summary.transactions_change_pct)}%
            </span>
            <span className="text-slate-500">98.4% success rate</span>
          </div>
        </div>

        {/* Repeat Customers */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Repeat Customers</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            {summary.repeat_customers}
          </div>
          <div className="flex items-center space-x-1.5 mt-2.5 text-xs">
            <span className="inline-flex items-center font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700">
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              22.4% drop
            </span>
            <span className="text-slate-500">180+ dormant 14+ days</span>
          </div>
        </div>

        {/* Pending Settlements */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Pending Settlements</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            ₹{summary.pending_settlements.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <div className="flex items-center space-x-1.5 mt-2.5 text-xs">
            <span className="inline-flex items-center font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">
              Batch #ST-8821
            </span>
            <span className="text-slate-500">Auto-tracking with Bank</span>
          </div>
        </div>
      </div>

      {/* Proactive AI Teammate Operations (USP: Morning Briefing + Churn Radar + Fraud Watchdog) */}
      <ProactiveTeammatePanel onTriggerPrompt={onTriggerPrompt} />

      {/* C. Business Performance & Visual Comparison Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sales Performance Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">7-Day Sales Trajectory & Comparison</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current week vs previous week. Notice the sudden evening sales contraction.
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-sm bg-paytm-blue inline-block" />
                <span className="text-[#334155]">Current Week</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" />
                <span className="text-slate-500">Previous Week</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG / Bar comparison chart */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100">
            {performance.daily_sales.map((day, idx) => {
              const currentHeightPct = Math.round((day.current_sales / maxSale) * 100);
              const prevHeightPct = Math.round((day.previous_sales / maxSale) * 100);
              const isDrop = day.current_sales < day.previous_sales;

              return (
                <div 
                  key={idx} 
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div className="w-full flex items-end justify-center gap-1.5 h-full pb-2">
                    {/* Previous week bar */}
                    <div 
                      className="w-1/2 max-w-[20px] bg-slate-200 group-hover:bg-slate-300 rounded-t-md transition-all duration-200"
                      style={{ height: `${Math.max(prevHeightPct, 6)}%` }}
                      title={`Previous ${day.day}: ₹${day.previous_sales.toLocaleString('en-IN')}`}
                    />
                    {/* Current week bar */}
                    <div 
                      className={`w-1/2 max-w-[20px] rounded-t-md transition-all duration-200 ${
                        isDrop ? 'bg-paytm-blue group-hover:bg-blue-800' : 'bg-emerald-500 group-hover:bg-emerald-600'
                      }`}
                      style={{ height: `${Math.max(currentHeightPct, 6)}%` }}
                      title={`Current ${day.day}: ₹${day.current_sales.toLocaleString('en-IN')}`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 mt-2">{day.day}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{day.date}</span>
                </div>
              );
            })}
          </div>

          {/* Hover details / Root cause bar */}
          <div className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 bg-[#F8FAFC] p-3 rounded-xl border border-[#E8EDF4]">
            <div className="flex items-center space-x-2">
              <span className="p-1 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">DIAGNOSTIC</span>
              <span className="text-slate-700 font-medium">
                {hoveredDay 
                  ? `${hoveredDay.day} (${hoveredDay.date}): Current ₹${hoveredDay.current_sales.toLocaleString('en-IN')} vs Previous ₹${hoveredDay.previous_sales.toLocaleString('en-IN')}`
                  : performance.root_cause
                }
              </span>
            </div>
            <button
              onClick={() => onTriggerPrompt('My sales have dropped this week. Help me bring customers back.')}
              className="text-paytm-blue font-bold hover:underline mt-2 sm:mt-0 flex items-center space-x-1 shrink-0"
            >
              <span>Bring customers back</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Payment Modes Breakdown */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Payment Channel Mix</h2>
            <p className="text-xs text-slate-500 mt-0.5">Paytm QR and Soundbox drive 82% of customer volume.</p>

            <div className="space-y-4 mt-6">
              {performance.payment_modes.map((pm, idx) => {
                const totalModeSales = performance.payment_modes.reduce((acc, curr) => acc + curr.total, 0);
                const pct = totalModeSales > 0 ? Math.round((pm.total / totalModeSales) * 100) : 0;

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{pm.mode}</span>
                      <span className="font-bold text-[#0F172A]">₹{pm.total.toLocaleString('en-IN')} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-paytm-blue' : idx === 1 ? 'bg-paytm-cyan' : idx === 2 ? 'bg-teal-500' : 'bg-indigo-400'
                        }`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span className="font-medium">Device: Soundbox 3.0 LCD</span>
            <span className="text-emerald-600 font-bold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>Instant Voice Alerts Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* D. AI Teammate Insights Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-paytm-blue" />
            <h2 className="text-base font-bold text-[#0F172A]">Proactive AI Teammate Insights</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Updated 2 mins ago</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((ins) => (
            <div 
              key={ins.id}
              className={`border rounded-2xl p-5 bg-white shadow-card transition-all hover:shadow-card-hover flex flex-col justify-between ${
                ins.type === 'warning' ? 'border-amber-200' : ins.type === 'opportunity' ? 'border-blue-200' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                    ins.type === 'warning' ? 'bg-amber-100 text-amber-800' : ins.type === 'opportunity' ? 'bg-blue-100 text-paytm-blue' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {ins.type}
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono">{ins.impact}</span>
                </div>
                <h3 className="text-sm font-bold text-[#0F172A] leading-snug">{ins.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{ins.description}</p>
              </div>

              <button
                onClick={() => onTriggerPrompt(ins.action_prompt)}
                className="mt-4 w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-[#F8FAFC] hover:bg-paytm-dark hover:text-white text-paytm-blue font-bold text-xs transition-colors border border-[#E8EDF4]"
              >
                <span>Take Action with ActionMate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* E & F: Active Tasks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Tasks (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Live Teammate Task Executions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tasks investigated, planned, approved, and verified.</p>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs font-bold text-paytm-blue hover:underline"
            >
              View All Tasks
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {active_tasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No active tasks in database.</p>
            ) : (
              active_tasks.map((task) => (
                <div key={task.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {task.id}
                      </span>
                      <span className="text-xs font-bold text-[#0F172A]">{task.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{task.result_summary || task.request_text}</p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      task.status === 'WAITING_APPROVAL' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-blue-50 text-paytm-blue border border-blue-200'
                    }`}>
                      {task.status === 'WAITING_APPROVAL' ? 'Waiting Approval' : task.status}
                    </span>
                    <button
                      onClick={() => onNavigate('tasks')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions (1 Col) */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-4 h-4 text-paytm-blue" />
              <h2 className="text-base font-bold text-[#0F172A]">Quick Operations</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Trigger one-click autonomous investigations.</p>

            <div className="space-y-2.5">
              {quick_actions.map((qa) => (
                <button
                  key={qa.id}
                  onClick={() => onTriggerPrompt(qa.prompt)}
                  className="w-full text-left p-3 rounded-xl bg-[#F8FAFC] hover:bg-blue-50/60 border border-[#E8EDF4] transition-all hover:border-paytm-blue/30 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A] group-hover:text-paytm-blue">{qa.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-paytm-blue transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{qa.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-paytm-dark flex items-center justify-between">
            <span className="font-semibold">Voice Commands Ready</span>
            <span className="text-[11px] text-paytm-blue font-bold">Saaras v4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
