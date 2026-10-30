import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  TrendingUp, 
  CheckSquare, 
  ShieldCheck, 
  Layers, 
  BarChart3, 
  Settings, 
  Sparkles,
  Store,
  Wifi
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  pendingApprovalsCount
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { 
      id: 'teammate', 
      label: 'My AI Teammate', 
      icon: <Bot className="w-5 h-5" />, 
      badge: 'Sarvam 105B',
      badgeColor: 'bg-paytm-cyan/15 text-paytm-dark font-medium text-[11px]'
    },
    { id: 'insights', label: 'Business Insights', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'tasks', label: 'Tasks & Activities', icon: <CheckSquare className="w-5 h-5" /> },
    { 
      id: 'approvals', 
      label: 'Approvals', 
      icon: <ShieldCheck className="w-5 h-5" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 font-semibold text-[11px]'
    },
    { id: 'operations', label: 'Merchant Operations', icon: <Layers className="w-5 h-5" /> },
    { id: 'performance', label: 'Performance & ROI', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E8EDF4] flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-[#E8EDF4] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-paytm-dark flex items-center justify-center shadow-md">
              <span className="text-white font-extrabold text-lg tracking-tight">P</span>
              <span className="text-paytm-cyan font-bold text-lg">AI</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-[#0F172A] tracking-tight text-base leading-tight">Paytm</span>
                <span className="font-extrabold text-paytm-blue text-base leading-tight">ActionMate</span>
              </div>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-paytm-blue bg-blue-50 px-1.5 py-0.5 rounded">
                  AI Operations Teammate
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-paytm-dark text-white shadow-sm font-semibold'
                    : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-paytm-cyan' : 'text-[#64748B]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Merchant & Device Status Footer */}
      <div className="p-4 border-t border-[#E8EDF4] bg-[#F8FAFC]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Store className="w-4 h-4 text-paytm-blue" />
            <span className="text-xs font-bold text-[#0F172A] truncate max-w-[130px]">Sharma Sweets</span>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
            PRO
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 border-t border-slate-200/60">
          <div className="flex items-center space-x-1">
            <Wifi className="w-3 h-3 text-emerald-600" />
            <span>Soundbox 3.0 Online</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">86%</span>
        </div>
      </div>
    </aside>
  );
};
