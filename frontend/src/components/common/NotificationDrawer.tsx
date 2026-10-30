import React from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  Users, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
  onTriggerPrompt: (prompt: string) => void;
  pendingApprovalsCount: number;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onTriggerPrompt,
  pendingApprovalsCount
}) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 'notif-1',
      title: 'Action Gate Required: 15% Customer Re-Engagement Campaign',
      desc: 'Promotional budget of ₹1,800 requires your sign-off before dispatch to 180 inactive customers.',
      time: 'Just now',
      type: 'approval',
      tab: 'approvals' as NavigationTab,
      actionPrompt: null
    },
    {
      id: 'notif-2',
      title: 'Settlement Batch #ST-8821 Delayed (₹24,800)',
      desc: 'ActionMate opened tracking ticket #TKT-8921 with HDFC sponsor bank clearing desk.',
      time: '2 hours ago',
      type: 'settlement',
      tab: 'operations' as NavigationTab,
      actionPrompt: "Why is my yesterday's settlement delayed by ₹24,800?"
    },
    {
      id: 'notif-3',
      title: 'Weekly Sales Contraction Alert (-14.2%)',
      desc: 'Evening footfall dropped 24.8%. 180+ regular customers have not visited in 14 days.',
      time: '5 hours ago',
      type: 'insight',
      tab: 'insights' as NavigationTab,
      actionPrompt: "My sales have dropped this week. Help me bring customers back."
    },
    {
      id: 'notif-4',
      title: 'Soundbox 3.0 Battery Health: 86%',
      desc: '4G connection stable with Airtel IoT. All voice notifications delivered with 120ms average latency.',
      time: '1 day ago',
      type: 'device',
      tab: 'operations' as NavigationTab,
      actionPrompt: null
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-[#E8EDF4]">
        {/* Header */}
        <div className="p-5 border-b border-[#E8EDF4] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-paytm-dark text-paytm-cyan rounded-xl shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Notifications & Alerts</h2>
              <span className="text-[11px] text-slate-500">Real-time Paytm merchant telemetry</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-4 space-y-3">
          {notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-4 rounded-xl border transition-all ${
                n.type === 'approval' ? 'bg-amber-50/60 border-amber-200' :
                n.type === 'settlement' ? 'bg-blue-50/50 border-blue-200' :
                'bg-[#F8FAFC] border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                <span className={`font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  n.type === 'approval' ? 'bg-amber-200 text-amber-900' :
                  n.type === 'settlement' ? 'bg-blue-100 text-paytm-blue' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {n.type}
                </span>
                <span>{n.time}</span>
              </div>

              <h4 className="text-xs font-bold text-[#0F172A] mt-1">{n.title}</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{n.desc}</p>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60">
                <button
                  onClick={() => {
                    onNavigate(n.tab);
                    onClose();
                  }}
                  className="text-[11px] font-bold text-paytm-blue hover:underline flex items-center space-x-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {n.actionPrompt && (
                  <button
                    onClick={() => {
                      onTriggerPrompt(n.actionPrompt!);
                      onClose();
                    }}
                    className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-300 text-slate-700 hover:text-paytm-blue"
                  >
                    ActionMate Solve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8EDF4] bg-[#F8FAFC] text-center text-[11px] text-slate-500">
          Paytm ActionMate monitors your merchant operations 24/7.
        </div>
      </div>
    </div>
  );
};
