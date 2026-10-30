import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Key, 
  Cpu, 
  Mic, 
  Volume2, 
  ShieldCheck, 
  Store, 
  Save, 
  Check, 
  AlertCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { SystemSettings } from '../../types';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Form state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelSelect, setModelSelect] = useState('sarvam-105b');
  const [sttModelSelect, setSttModelSelect] = useState('saaras:v4');
  const [ttsModelSelect, setTtsModelSelect] = useState('bulbul:v4-flash');
  const [speakerSelect, setSpeakerSelect] = useState('meera');
  const [soundboxLangSelect, setSoundboxLangSelect] = useState('hi-IN');
  const [autoApproveLimit, setAutoApproveLimit] = useState(500);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await api.getSettings();
        setSettings(res);
        setModelSelect(res.sarvam_model || 'sarvam-105b');
        setSttModelSelect(res.sarvam_stt_model || 'saaras:v4');
        setTtsModelSelect(res.sarvam_tts_model || 'bulbul:v4-flash');
        setSpeakerSelect(res.tts_speaker || 'meera');
        setSoundboxLangSelect(res.soundbox_voice_lang || 'hi-IN');
        setAutoApproveLimit(res.auto_approve_threshold || 500);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload: any = {
        sarvam_model: modelSelect,
        sarvam_stt_model: sttModelSelect,
        sarvam_tts_model: ttsModelSelect,
        tts_speaker: speakerSelect,
        soundbox_voice_lang: soundboxLangSelect,
        auto_approve_threshold: Number(autoApproveLimit)
      };
      if (apiKeyInput.trim()) {
        payload.sarvam_api_key = apiKeyInput.trim();
      }

      await api.updateSettings(payload);
      setSaveSuccess(true);
      setApiKeyInput('');
      
      // Refresh
      const updated = await api.getSettings();
      setSettings(updated);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading system settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">AI Teammate Configuration & Security</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure Sarvam AI credentials, reasoning models, autonomous risk limits, and Soundbox voice preferences.
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Real Sarvam AI Configuration */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-paytm-blue" />
              <h2 className="text-sm font-bold text-[#0F172A]">Sarvam AI Integration (Official Partner)</h2>
            </div>
            <a
              href="https://docs.sarvam.ai/api/getting-started/welcome"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-paytm-blue hover:underline flex items-center space-x-1 font-semibold"
            >
              <span>Sarvam API Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Sarvam Subscription Key (<code className="text-slate-500">api-subscription-key</code>)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={settings.sarvam_api_key_configured ? `Configured (${settings.sarvam_api_key_masked})` : "Enter your Sarvam AI API Key..."}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-paytm-blue font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Stored securely on backend environment variables. Never exposed to frontend code.
                If not set, ActionMate runs in local authentic reasoning mode.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reasoning LLM</label>
                <select
                  value={modelSelect}
                  onChange={(e) => setModelSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-xs focus:outline-hidden focus:border-paytm-blue"
                >
                  <option value="sarvam-105b">Sarvam 105B (Primary Reasoning - 128k context)</option>
                  <option value="sarvam-30b">Sarvam 30B (Low-latency agent loop)</option>
                  <option value="sarvam-2b">Sarvam 2B (On-device Edge)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">MoE architecture tailored for Indic fintech reasoning</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Speech-to-Text (STT)</label>
                <select
                  value={sttModelSelect}
                  onChange={(e) => setSttModelSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-xs focus:outline-hidden focus:border-paytm-blue"
                >
                  <option value="saaras:v4">Saaras v4 (Flagship Indic speech recognition)</option>
                  <option value="saaras:v3">Saaras v3 (Fast ASR)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Text-to-Speech (TTS)</label>
                <select
                  value={ttsModelSelect}
                  onChange={(e) => setTtsModelSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-xs focus:outline-hidden focus:border-paytm-blue"
                >
                  <option value="bulbul:v4-flash">Bulbul v4 Flash (Low latency expressive voice)</option>
                  <option value="bulbul:v1">Bulbul v1</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Voice Speaker Profile</label>
                <select
                  value={speakerSelect}
                  onChange={(e) => setSpeakerSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-xs focus:outline-hidden focus:border-paytm-blue"
                >
                  <option value="meera">Meera (Warm, Professional Hindi/English)</option>
                  <option value="arvind">Arvind (Clear, Formal Indic Voice)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Autonomous Safety & Approval Limits */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-[#0F172A]">Autonomous Governance & Safety Boundaries</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Consequential Action Gate Threshold (₹)
              </label>
              <input
                type="number"
                value={autoApproveLimit}
                onChange={(e) => setAutoApproveLimit(Number(e.target.value))}
                min={0}
                step={100}
                className="w-full sm:w-64 px-3 py-2 border border-slate-200 rounded-xl font-bold text-sm focus:outline-hidden focus:border-paytm-blue"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Any campaign budget, voucher issuance, or refund exceeding ₹{autoApproveLimit} triggers a mandatory human approval gate.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 text-[11px]">Safety Policy Enforced:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                <li>No financial or marketing actions executed without merchant approval</li>
                <li>Full cryptographic audit logging for every tool call and bank query</li>
                <li>Zero autonomous lending, loan, or credit decisions allowed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 3. Merchant Store Details */}
        <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-paytm-blue" />
            <h2 className="text-sm font-bold text-[#0F172A]">Paytm Business Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Business Name</span>
              <span className="font-bold text-slate-800">{settings.merchant_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Paytm VPA</span>
              <span className="font-mono font-bold text-slate-800">{settings.merchant_vpa}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Soundbox Default Language</span>
              <span className="font-bold text-slate-800">Hindi + English (Bilingual)</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Subscription Plan</span>
              <span className="font-bold text-emerald-700">Paytm Business Enterprise Pro</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-paytm-dark hover:bg-paytm-blue text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Updating...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
