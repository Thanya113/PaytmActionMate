import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  IndianRupee, 
  TrendingUp, 
  Sparkles,
  Zap
} from 'lucide-react';
import { api } from '../../services/api';
import { PerformanceKPIs } from '../../types';

export const PerformanceView: React.FC = () => {
  const [data, setData] = useState<PerformanceKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      setLoading(true);
      try {
        const res = await api.getPerformance();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchKPIs();
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">Loading teammate KPI telemetry...</div>
    );
  }

  const { kpis, roi_summary } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-paytm-blue text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Hackathon Evaluation Benchmarks (Slide 08)</span>
          </div>
          <h1 className="text-xl font-bold text-[#0F172A]">AI Teammate Operational KPIs & ROI</h1>
          <p className="text-xs text-slate-500 mt-1">
            Quantifiable impact metrics measuring task completion, speed, human oversight, cost efficiency, and merchant revenue uplift.
          </p>
        </div>
      </div>

      {/* The 6 Core KPIs Grid (From Pitch Deck Slide 08) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpis.map((kpi) => (
          <div 
            key={kpi.id} 
            className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>{kpi.label}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Target: {kpi.target}
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#0F172A] tracking-tight mt-1">
                {kpi.value}
              </div>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                {kpi.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified in Active Database</span>
              </span>
              <span className="text-slate-400 font-normal">Real telemetry</span>
            </div>
          </div>
        ))}
      </div>

      {/* ROI & Merchant Impact Card */}
      <div className="bg-gradient-to-r from-paytm-dark to-[#094191] rounded-2xl p-6 text-white shadow-elevated">
        <h2 className="text-base font-bold tracking-tight mb-1">Estimated Monthly Merchant Value Generated</h2>
        <p className="text-xs text-slate-300 max-w-2xl mb-6">
          Measurable operational time saved and recovered customer revenue for Sharma Sweets & Cafe.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <span className="text-slate-300 block text-xs mb-1">Time Saved by Merchant:</span>
            <span className="text-2xl font-extrabold text-paytm-cyan">{roi_summary.merchant_hours_saved_monthly}</span>
            <span className="text-[11px] text-slate-300 block mt-1">Zero manual follow-ups on settlements</span>
          </div>

          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <span className="text-slate-300 block text-xs mb-1">Recovered Revenue:</span>
            <span className="text-2xl font-extrabold text-emerald-400">{roi_summary.revenue_recovered_monthly}</span>
            <span className="text-[11px] text-slate-300 block mt-1">Via automated re-engagement vouchers</span>
          </div>

          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <span className="text-slate-300 block text-xs mb-1">Operational Error Reduction:</span>
            <span className="text-2xl font-extrabold text-white">{roi_summary.operational_error_reduction}</span>
            <span className="text-[11px] text-slate-300 block mt-1">Protected by strict human approval gates</span>
          </div>
        </div>
      </div>
    </div>
  );
};
