import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  PieChart, 
  Users, 
  IndianRupee, 
  ArrowRight, 
  AlertTriangle, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

interface InsightsViewProps {
  onTriggerPrompt: (prompt: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ onTriggerPrompt }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const res = await api.getInsights();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Aggregating business intelligence telemetry from Paytm ledger...
      </div>
    );
  }

  const { category_shares, hourly_trend, cohort_retention, recommendation } = data;
  const maxHourlySales = Math.max(...hourly_trend.map((h: any) => h.sales), 30000);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Paytm Business Insights & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Deep multi-dimensional analysis of sales velocity, hourly traffic heatmaps, category profitability, and customer cohort retention.
          </p>
        </div>

        <button
          onClick={() => onTriggerPrompt('My sales have dropped this week. Help me bring customers back.')}
          className="flex items-center space-x-2 bg-paytm-dark hover:bg-paytm-blue text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm shrink-0"
        >
          <Sparkles className="w-4 h-4 text-paytm-cyan" />
          <span>Launch AI Recovery Action</span>
        </button>
      </div>

      {/* Strategic Callout */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-5 shadow-card flex items-start space-x-3.5">
        <div className="p-2 bg-paytm-blue text-white rounded-xl shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 text-paytm-cyan" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="font-extrabold text-[#0F172A] text-sm">ActionMate Strategic Diagnostic</div>
          <p className="text-slate-700 leading-relaxed">{recommendation}</p>
        </div>
      </div>

      {/* Hourly Footfall & Revenue Trajectory */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Hourly Revenue & Footfall Distribution</h2>
            <p className="text-xs text-slate-500 mt-0.5">Identifies peak periods and highlights the evening dip (5 PM - 8 PM).</p>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
            <span className="text-slate-600 font-medium">Contraction Period (5 PM - 8 PM)</span>
          </div>
        </div>

        <div className="h-56 flex items-end justify-between gap-4 pt-6 px-2 border-b border-slate-100">
          {hourly_trend.map((h: any, idx: number) => {
            const heightPct = Math.round((h.sales / maxHourlySales) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div 
                  className={`w-full max-w-[36px] rounded-t-md transition-all ${
                    h.drop_flag ? 'bg-red-400 group-hover:bg-red-500' : 'bg-paytm-blue group-hover:bg-blue-800'
                  }`}
                  style={{ height: `${Math.max(heightPct, 10)}%` }}
                  title={`${h.hour}: ₹${h.sales.toLocaleString('en-IN')} (${h.traffic} visits)`}
                />
                <span className="text-[11px] font-bold text-slate-600 mt-2 font-mono">{h.hour}</span>
                <span className="text-[10px] text-slate-400 font-mono">₹{h.sales / 1000}k</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Shares & Cohort Retention (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Contribution */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Product Category Contribution</h2>
            <p className="text-xs text-slate-500 mt-0.5">Revenue breakdown across major store offerings.</p>
          </div>

          <div className="space-y-3.5 text-xs">
            {category_shares.map((cat: any, idx: number) => {
              const total = category_shares.reduce((a: number, c: any) => a + c.sales, 0);
              const pct = total > 0 ? Math.round((cat.sales / total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-700 font-bold">{cat.category}</span>
                    <span className="text-[#0F172A] font-bold">₹{cat.sales.toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        idx === 0 ? 'bg-paytm-dark' : idx === 1 ? 'bg-paytm-blue' : idx === 2 ? 'bg-paytm-cyan' : 'bg-indigo-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cohort Retention Curve */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Customer Cohort Retention Rate</h2>
            <p className="text-xs text-slate-500 mt-0.5">Weekly repeat purchase decay over 6 consecutive cycles.</p>
          </div>

          <div className="space-y-3 text-xs">
            {cohort_retention.map((cr: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <span className="font-semibold text-slate-700">{cr.week}</span>
                <div className="flex items-center space-x-3 w-1/2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${cr.retention}%` }} 
                    />
                  </div>
                  <span className="font-bold text-slate-800 w-10 text-right">{cr.retention}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E8EDF4] rounded-xl text-[11px] text-slate-600">
            Reactivation campaigns triggered between Week 2 and Week 3 yield an average 34% increase in retention.
          </div>
        </div>
      </div>
    </div>
  );
};
