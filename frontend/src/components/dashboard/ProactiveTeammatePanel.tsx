import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  ShieldAlert,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Radio,
  Zap,
  CheckCircle2,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';
import { api } from '../../services/api';

interface ProactiveTeammatePanelProps {
  onTriggerPrompt: (prompt: string) => void;
}

export const ProactiveTeammatePanel: React.FC<ProactiveTeammatePanelProps> = ({ onTriggerPrompt }) => {
  const [activeTab, setActiveTab] = useState<'briefing' | 'churn' | 'fraud'>('briefing');
  const [briefing, setBriefing] = useState<any>(null);
  const [churnData, setChurnData] = useState<any>(null);
  const [fraudData, setFraudData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    setLoading(true);
    try {
      const data = await api.getMorningBriefing();
      setBriefing(data);
    } catch (err) {
      console.error('Failed to load morning briefing', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChurnRadar = async () => {
    if (churnData) return;
    try {
      const data = await api.getChurnRadar();
      setChurnData(data);
    } catch (err) {
      console.error('Failed to load churn radar', err);
    }
  };

  const loadFraudWatchdog = async () => {
    if (fraudData) return;
    try {
      const data = await api.getFraudWatchdog();
      setFraudData(data);
    } catch (err) {
      console.error('Failed to load fraud watchdog', err);
    }
  };

  const handleTabChange = (tab: 'briefing' | 'churn' | 'fraud') => {
    setActiveTab(tab);
    if (tab === 'churn') loadChurnRadar();
    if (tab === 'fraud') loadFraudWatchdog();
  };

  const toggleAudio = () => {
    if (audioPlaying && audioElement) {
      audioElement.pause();
      setAudioPlaying(false);
      return;
    }

    if (briefing?.tts_audio_base64) {
      const audioUrl = `data:audio/wav;base64,${briefing.tts_audio_base64}`;
      const audio = new Audio(audioUrl);
      audio.onended = () => setAudioPlaying(false);
      audio.onerror = () => {
        setAudioPlaying(false);
        fallbackWebSpeech();
      };
      audio.play().then(() => {
        setAudioElement(audio);
        setAudioPlaying(true);
      }).catch(() => fallbackWebSpeech());
    } else {
      fallbackWebSpeech();
    }
  };

  const fallbackWebSpeech = () => {
    if ('speechSynthesis' in window && briefing?.briefing?.hindi_soundbox) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(briefing.briefing.hindi_soundbox);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setAudioPlaying(false);
      window.speechSynthesis.speak(utterance);
      setAudioPlaying(true);
    }
  };

  return (
    <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all">
      {/* Header with USP Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-paytm-blue flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-paytm-blue" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#0F172A]">Autonomous Proactive Watch</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                Live Sarvam 105B Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ActionMate diagnoses your business state before you ask — with zero hallucinations.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto">
          <button
            onClick={() => handleTabChange('briefing')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'briefing' ? 'bg-white text-paytm-dark shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Morning Briefing
          </button>
          <button
            onClick={() => handleTabChange('churn')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'churn' ? 'bg-white text-paytm-dark shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Churn Radar
          </button>
          <button
            onClick={() => handleTabChange('fraud')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'fraud' ? 'bg-white text-paytm-dark shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Fraud Watchdog
          </button>
        </div>
      </div>

      {/* Tab 1: Morning Briefing */}
      {activeTab === 'briefing' && (
        <div className="pt-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-paytm-blue" />
              <span className="text-xs font-medium">Generating live executive briefing with Sarvam 105B...</span>
            </div>
          ) : briefing ? (
            <>
              {/* Spoken Hindi Soundbox Banner */}
              <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-paytm-blue text-white rounded-xl shadow-xs mt-0.5">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-paytm-dark">Paytm Soundbox Morning Broadcast</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded">
                        Sarvam Bulbul v3 TTS (Hindi)
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 mt-1 font-medium">
                      "{briefing.briefing?.hindi_soundbox || 'Namaskar! Aaj ka business summary taiyar hai.'}"
                    </p>
                  </div>
                </div>

                <button
                  onClick={toggleAudio}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    audioPlaying
                      ? 'bg-rose-500 text-white shadow-xs animate-pulse'
                      : 'bg-paytm-blue text-white hover:bg-[#002970] shadow-xs'
                  }`}
                >
                  {audioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{audioPlaying ? 'Pause Audio' : 'Play Soundbox Voice'}</span>
                </button>
              </div>

              {/* Briefing English Summary & Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="md:col-span-2 space-y-3">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Executive Summary</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        briefing.briefing?.health === 'good'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        Health: {briefing.briefing?.health || 'Concern'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-normal">
                      {briefing.briefing?.briefing_english}
                    </p>
                    <p className="text-xs text-paytm-blue mt-2 font-medium italic">
                      "{briefing.briefing?.closing_line || 'Let\'s make today a great day for your business!'}"
                    </p>
                  </div>

                  {/* Top Proactive Actions Identified */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700">Top Priority Actions for Today:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {briefing.briefing?.top_actions?.map((action: string, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => onTriggerPrompt(action)}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-paytm-blue hover:bg-blue-50/40 rounded-xl cursor-pointer transition-all group"
                        >
                          <div className="flex items-center space-x-2 text-xs font-medium text-slate-800">
                            <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-paytm-blue group-hover:text-white flex items-center justify-center font-bold text-[10px] transition-colors">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[200px]">{action}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-paytm-blue group-hover:translate-x-0.5 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Proactive Recommendation Card */}
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-2">
                      <Zap className="w-4 h-4 text-indigo-600" />
                      <span>AI Teammate Suggestion</span>
                    </div>
                    <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                      {briefing.briefing?.suggestion || 'Run a promotional campaign during evening peak hours to recover footfall.'}
                    </p>
                  </div>

                  <button
                    onClick={() => onTriggerPrompt(briefing.briefing?.suggestion || 'Create re-engagement campaign')}
                    className="mt-4 w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    <span>Execute Suggestion</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">Briefing data unavailable.</p>
          )}
        </div>
      )}

      {/* Tab 2: Predictive Churn Radar */}
      {activeTab === 'churn' && (
        <div className="pt-5 space-y-4">
          {!churnData ? (
            <div className="flex items-center justify-center py-8 text-slate-400 space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-paytm-blue" />
              <span className="text-xs font-medium">Computing R/F/V churn probabilities from transaction ledger...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <div className="text-[11px] font-bold text-red-700 uppercase">High Churn Risk</div>
                  <div className="text-xl font-extrabold text-red-900 mt-0.5">{churnData.summary?.red_count} Customers</div>
                  <div className="text-[10px] text-red-600 mt-1">Churn score &gt; 60%</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="text-[11px] font-bold text-amber-700 uppercase">At Risk</div>
                  <div className="text-xl font-extrabold text-amber-900 mt-0.5">{churnData.summary?.amber_count} Customers</div>
                  <div className="text-[10px] text-amber-600 mt-1">Churn score 30–60%</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">Loyal Cohort</div>
                  <div className="text-xl font-extrabold text-emerald-900 mt-0.5">{churnData.summary?.green_count} Customers</div>
                  <div className="text-[10px] text-emerald-600 mt-1">Churn score &lt; 30%</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="text-[11px] font-bold text-paytm-blue uppercase">At-Risk Revenue</div>
                  <div className="text-xl font-extrabold text-paytm-dark mt-0.5">
                    ₹{churnData.summary?.total_at_risk_monthly_revenue?.toLocaleString('en-IN') || '0'}/mo
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Projected monthly loss</div>
                </div>
              </div>

              {/* Table of Top High-Risk Customers */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Last Visit</th>
                      <th className="py-2.5 px-3">Lifetime Spend</th>
                      <th className="py-2.5 px-3">Churn Score</th>
                      <th className="py-2.5 px-3">Risk Band</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {churnData.high_risk_customers?.slice(0, 5).map((cust: any) => (
                      <tr key={cust.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {cust.name}
                          <span className="block text-[10px] text-slate-400 font-normal">{cust.favorite_item}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{cust.recency_days} days ago</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">₹{cust.total_spent?.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-red-500 h-1.5 rounded-full"
                                style={{ width: `${cust.churn_probability}%` }}
                              />
                            </div>
                            <span className="font-bold text-red-600">{cust.churn_probability}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-red-100 text-red-800">
                            {cust.risk_label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onTriggerPrompt(`Create a personalised re-engagement offer for ${cust.name} who spends on ${cust.favorite_item}.`)}
                            className="px-2.5 py-1 bg-paytm-blue hover:bg-[#002970] text-white rounded-lg font-bold text-[11px] transition-colors"
                          >
                            Win Back
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Fraud Watchdog */}
      {activeTab === 'fraud' && (
        <div className="pt-5 space-y-4">
          {!fraudData ? (
            <div className="flex items-center justify-center py-8 text-slate-400 space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-paytm-blue" />
              <span className="text-xs font-medium">Scanning live transaction stream for velocity & structuring anomalies...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/70 border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${
                    fraudData.overall_risk_level === 'CLEAR'
                      ? 'bg-emerald-100 text-emerald-800'
                      : fraudData.overall_risk_level === 'HIGH'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {fraudData.overall_risk_level === 'CLEAR' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#0F172A]">Real-Time Security Status:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        fraudData.overall_risk_level === 'CLEAR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {fraudData.overall_risk_level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{fraudData.watchdog_summary}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Scanned Window</span>
                  <span className="text-xs font-bold text-slate-700">Last 48 Hours ({fraudData.total_transactions_scanned} txns)</span>
                </div>
              </div>

              {/* Anomalies List */}
              {fraudData.anomalies?.length > 0 ? (
                <div className="space-y-2">
                  {fraudData.anomalies.map((anom: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white border border-red-100 rounded-xl flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-red-700">{anom.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-red-100 text-red-800 rounded">
                            Risk {anom.risk_score}/100
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{anom.detail}</p>
                        <p className="text-[11px] text-indigo-700 font-medium">👉 {anom.recommended_action}</p>
                      </div>
                      <button
                        onClick={() => onTriggerPrompt(`Investigate suspicious pattern: ${anom.title}`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg shrink-0 transition-colors"
                      >
                        Investigate
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-emerald-900">Zero Security Anomalies Detected</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    No velocity spikes, midnight card attempts, or structuring patterns detected in the last 48 hours.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

