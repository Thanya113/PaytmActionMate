import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  IndianRupee, 
  Users, 
  MessageSquare, 
  Sliders, 
  Check, 
  X, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { Approval } from '../../types';

interface ApprovalsViewProps {
  onRefreshOverview: () => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ onRefreshOverview }) => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('ALL');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.getApprovals();
      setApprovals(res.approvals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (approvalId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      await api.submitApprovalAction(approvalId, action);
      await fetchApprovals();
      onRefreshOverview();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredApprovals = approvals.filter(a => {
    if (activeTab === 'ALL') return true;
    return a.status === activeTab;
  });

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#0F172A]">Human Approval & Governance Hub</h1>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-900 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-amber-300">
                {pendingCount} Pending Action{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Paytm ActionMate strictly stops at critical decision gates before committing merchant funds, modifying pricing, or broadcasting customer messages.
          </p>
        </div>

        <button
          onClick={fetchApprovals}
          className="flex items-center space-x-1.5 px-3 py-2 bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-[#E8EDF4] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#E8EDF4] pb-2">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-paytm-dark text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-[#0F172A]'
            }`}
          >
            {tab === 'ALL' ? 'All Approvals' : tab === 'PENDING' ? `Pending (${pendingCount})` : tab}
          </button>
        ))}
      </div>

      {/* Approval Cards List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading approval records...</div>
      ) : filteredApprovals.length === 0 ? (
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-12 text-center shadow-card">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-[#0F172A]">No Approvals Found in Queue</h3>
          <p className="text-xs text-slate-500 mt-1">All sensitive operations have been reviewed and verified.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((appr) => {
            const isPending = appr.status === 'PENDING';
            const isApproved = appr.status === 'APPROVED';
            const isRejected = appr.status === 'REJECTED';

            return (
              <div
                key={appr.id}
                className={`bg-white border rounded-2xl p-6 shadow-card transition-all ${
                  isPending ? 'border-amber-300 ring-1 ring-amber-200' : 'border-[#E8EDF4]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {appr.id}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-paytm-blue border border-blue-200">
                        {appr.action_type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        appr.risk_level === 'HIGH' ? 'bg-red-50 text-red-700' :
                        appr.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-800' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {appr.risk_level} Risk
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#0F172A]">{appr.title}</h2>
                    <p className="text-xs text-slate-600 max-w-2xl">{appr.description}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isPending ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {appr.status}
                    </span>
                  </div>
                </div>

                {/* Parameters Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs">
                  <div className="bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Estimated Budget Exposure</span>
                    <span className="font-bold text-[#0F172A] text-sm">
                      ₹{appr.estimated_cost?.toLocaleString('en-IN') || 0}
                    </span>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Audience Reach</span>
                    <span className="font-bold text-indigo-700 text-sm">
                      {appr.audience_reach} Customers
                    </span>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Coupon Code</span>
                    <span className="font-mono font-bold text-paytm-blue text-sm">
                      {appr.parameters?.coupon_code || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Channel</span>
                    <span className="font-bold text-slate-700 text-sm truncate block">
                      {appr.parameters?.channel || 'SMS & WhatsApp'}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="text-slate-400 font-mono text-[11px]">
                    Requested on {new Date(appr.requested_at).toLocaleString('en-IN')}
                    {appr.decided_at && ` • Decided on ${new Date(appr.decided_at).toLocaleString('en-IN')} by ${appr.decided_by}`}
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecision(appr.id, 'reject')}
                        disabled={isProcessing}
                        className="px-3.5 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold transition-colors flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline Action</span>
                      </button>
                      <button
                        onClick={() => handleDecision(appr.id, 'approve')}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Authorize & Dispatch</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
