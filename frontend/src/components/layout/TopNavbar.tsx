import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Globe, 
  ChevronDown, 
  CheckCircle2, 
  Sparkles, 
  User, 
  ShieldCheck,
  Calendar,
  Clock
} from 'lucide-react';
import { Merchant } from '../../types';

interface TopNavbarProps {
  merchant?: Merchant;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  aiStatus?: 'ready' | 'reasoning' | 'executing';
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  merchant,
  currentLanguage,
  onLanguageChange,
  onOpenNotifications,
  unreadCount,
  aiStatus = 'ready'
}) => {
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      };
      setCurrentDateTime(now.toLocaleDateString('en-IN', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const languages = [
    { code: 'en-IN', label: 'English', native: 'English' },
    { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
    { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
    { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
    { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
    { code: 'mr-IN', label: 'Marathi', native: 'मराठी' },
  ];

  const currentLangObj = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <header className="h-16 bg-white border-b border-[#E8EDF4] fixed top-0 right-0 left-64 z-20 px-6 flex items-center justify-between">
      {/* Left: Brand Context & Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            Paytm for Business
          </span>
          <span className="text-slate-300">|</span>
          {/* Autonomous Status Badge */}
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-800">
              {aiStatus === 'reasoning' ? 'Sarvam 105B Reasoning...' : aiStatus === 'executing' ? 'Executing Tool...' : 'ActionMate Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Date, Language, Notifications, Merchant Profile */}
      <div className="flex items-center space-x-4">
        {/* Date Time */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E8EDF4] px-3 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-paytm-blue" />
          <span className="font-medium text-[#334155]">{currentDateTime}</span>
        </div>

        {/* Language Selector (Powered by Sarvam Translation) */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center space-x-1.5 text-xs font-medium text-[#334155] bg-[#F8FAFC] hover:bg-slate-100 border border-[#E8EDF4] px-2.5 py-1.5 rounded-lg transition-colors"
            title="Sarvam AI Indic Language Selector"
          >
            <Globe className="w-3.5 h-3.5 text-paytm-blue" />
            <span>{currentLangObj.native}</span>
            <ChevronDown className="w-3 h-3 text-[#64748B]" />
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E8EDF4] rounded-xl shadow-lg py-1 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                Sarvam AI Languages
              </div>
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onLanguageChange(l.code);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F8FAFC] ${
                    currentLanguage === l.code ? 'text-paytm-blue font-bold bg-blue-50/50' : 'text-[#334155]'
                  }`}
                >
                  <span>{l.native}</span>
                  <span className="text-[11px] text-slate-400">{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          title="Notifications & Alerts"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-[#E8EDF4]" />

        {/* Merchant Profile */}
        <div className="flex items-center space-x-3 pl-1">
          <div className="w-9 h-9 rounded-full bg-paytm-dark text-white flex items-center justify-center font-bold text-xs shadow-sm border border-paytm-blue/20">
            RS
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[#0F172A] leading-tight">
              {merchant?.owner_name || 'Rajesh Sharma'}
            </div>
            <div className="text-[11px] text-[#64748B] leading-tight flex items-center space-x-1">
              <span>{merchant?.city || 'Connaught Place'}</span>
              <span>•</span>
              <span className="font-mono text-[10px] text-slate-500">{merchant?.id || 'PAYTM-M-984214'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
