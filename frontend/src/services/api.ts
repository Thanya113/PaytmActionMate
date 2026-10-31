import {
  Merchant,
  OverviewSummary,
  PerformanceData,
  AIInsight,
  QuickAction,
  Task,
  Approval,
  Transaction,
  Customer,
  Settlement,
  SoundboxDevice,
  PerformanceKPIs,
  SystemSettings
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface OverviewResponse {
  merchant: Merchant;
  summary: OverviewSummary;
  performance: PerformanceData;
  insights: AIInsight[];
  active_tasks: Task[];
  quick_actions: QuickAction[];
}

export const api = {
  async getOverview(): Promise<OverviewResponse> {
    const res = await fetch(`${API_BASE_URL}/overview`);
    if (!res.ok) throw new Error('Failed to fetch overview metrics');
    return res.json();
  },

  async sendChatMessage(message: string, merchantId: string = 'PAYTM-M-984214'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/teammate/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, merchant_id: merchantId })
    });
    if (!res.ok) throw new Error('Failed to communicate with AI teammate');
    return res.json();
  },

  async transcribeVoice(audioBlob: Blob, languageCode: string = 'hi-IN'): Promise<{ transcript: string; provider: string }> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('language_code', languageCode);

    const res = await fetch(`${API_BASE_URL}/teammate/voice-to-text`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Voice transcription failed');
    return res.json();
  },

  async synthesizeSpeech(text: string, targetLanguageCode: string = 'hi-IN'): Promise<{ success: boolean; audio_base64: string | null; provider: string }> {
    const res = await fetch(`${API_BASE_URL}/teammate/text-to-speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_language_code: targetLanguageCode })
    });
    if (!res.ok) throw new Error('Speech synthesis failed');
    return res.json();
  },

  async translateText(text: string, targetLanguageCode: string): Promise<{ translated_text: string }> {
    const res = await fetch(`${API_BASE_URL}/teammate/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_language_code: targetLanguageCode })
    });
    if (!res.ok) throw new Error('Translation failed');
    return res.json();
  },

  async getTasks(): Promise<{ tasks: Task[] }> {
    const res = await fetch(`${API_BASE_URL}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async getTask(taskId: string): Promise<Task> {
    const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
    if (!res.ok) throw new Error(`Failed to fetch task ${taskId}`);
    return res.json();
  },

  async getApprovals(): Promise<{ approvals: Approval[] }> {
    const res = await fetch(`${API_BASE_URL}/approvals`);
    if (!res.ok) throw new Error('Failed to fetch approvals');
    return res.json();
  },

  async submitApprovalAction(approvalId: string, action: 'approve' | 'reject' | 'modify', modifiedParams?: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/approvals/${approvalId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, modified_parameters: modifiedParams })
    });
    if (!res.ok) throw new Error(`Approval action ${action} failed`);
    return res.json();
  },

  async getTransactions(mode?: string, status?: string): Promise<{ transactions: Transaction[] }> {
    const params = new URLSearchParams();
    if (mode) params.append('mode', mode);
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE_URL}/operations/transactions?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async getSettlements(): Promise<{ settlements: Settlement[] }> {
    const res = await fetch(`${API_BASE_URL}/operations/settlements`);
    if (!res.ok) throw new Error('Failed to fetch settlements');
    return res.json();
  },

  async getCustomers(segment?: string): Promise<{ customers: Customer[] }> {
    const params = new URLSearchParams();
    if (segment) params.append('segment', segment);
    const res = await fetch(`${API_BASE_URL}/operations/customers?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  async getDevices(): Promise<{ devices: SoundboxDevice[] }> {
    const res = await fetch(`${API_BASE_URL}/operations/devices`);
    if (!res.ok) throw new Error('Failed to fetch devices');
    return res.json();
  },

  async testSoundbox(deviceId: string = 'SB-DEL-9921', message: string = 'Paytm par ₹150 prapt hue'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/operations/soundbox/test-voice?device_id=${encodeURIComponent(deviceId)}&message=${encodeURIComponent(message)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to test soundbox voice');
    return res.json();
  },

  async createPaymentLink(data: { customer_name: string; customer_phone: string; amount: number; description: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/operations/payment-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create payment link');
    return res.json();
  },

  async getInsights(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/insights`);
    if (!res.ok) throw new Error('Failed to fetch business insights');
    return res.json();
  },

  async getPerformance(): Promise<PerformanceKPIs> {
    const res = await fetch(`${API_BASE_URL}/performance`);
    if (!res.ok) throw new Error('Failed to fetch performance KPIs');
    return res.json();
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE_URL}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data: Partial<SystemSettings & { sarvam_api_key?: string }>): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async getMorningBriefing(): Promise<{
    briefing: {
      health: string;
      briefing_english: string;
      top_actions: string[];
      suggestion: string;
      hindi_soundbox: string;
      closing_line: string;
    };
    tts_audio_base64: string | null;
    tts_provider: string;
    snapshot: any;
    generated_at: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/teammate/morning-briefing`);
    if (!res.ok) throw new Error('Failed to fetch morning briefing');
    return res.json();
  },

  async getChurnRadar(): Promise<{
    computed_at: string;
    total_customers_scored: number;
    summary: {
      green_count: number;
      amber_count: number;
      red_count: number;
      total_at_risk_monthly_revenue: number;
      churn_radar_insight: string;
    };
    high_risk_customers: any[];
    medium_risk_customers: any[];
    loyal_customers: any[];
  }> {
    const res = await fetch(`${API_BASE_URL}/teammate/churn-radar`);
    if (!res.ok) throw new Error('Failed to fetch churn radar');
    return res.json();
  },

  async getFraudWatchdog(): Promise<{
    scanned_at: string;
    total_transactions_scanned: number;
    total_amount_scanned: number;
    overall_risk_level: string;
    overall_risk_score: number;
    anomaly_count: number;
    anomalies: any[];
    watchdog_summary: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/teammate/fraud-watchdog`);
    if (!res.ok) throw new Error('Failed to fetch fraud watchdog');
    return res.json();
  }
};
