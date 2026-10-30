export type NavigationTab = 
  | 'overview' 
  | 'teammate' 
  | 'insights' 
  | 'tasks' 
  | 'approvals' 
  | 'operations' 
  | 'performance' 
  | 'settings';

export interface Merchant {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  vpa: string;
  city: string;
  address: string;
  gstin: string;
  plan: string;
  soundbox_id: string;
  auto_approve_limit: number;
}

export interface OverviewSummary {
  total_sales: number;
  previous_sales: number;
  sales_change_pct: number;
  successful_transactions: number;
  transactions_change_pct: number;
  repeat_customers: number;
  repeat_customers_change_pct: number;
  pending_settlements: number;
  pending_settlements_count: number;
  pending_approvals_count: number;
}

export interface DailySale {
  day: string;
  date: string;
  current_sales: number;
  previous_sales: number;
  txns: number;
}

export interface PaymentMode {
  mode: string;
  count: number;
  total: number;
}

export interface PerformanceData {
  daily_sales: DailySale[];
  payment_modes: PaymentMode[];
  root_cause: string;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'info';
  title: string;
  description: string;
  action_prompt: string;
  impact: string;
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
}

export interface TaskStage {
  stage: 'understand' | 'plan' | 'act' | 'approve' | 'verify' | 'report';
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'waiting_approval' | 'approved' | 'rejected' | 'skipped' | 'cancelled';
  timestamp?: string;
  detail?: string;
  data?: any;
}

export interface ToolCall {
  tool: string;
  params: any;
  result: any;
}

export interface Task {
  id: string;
  merchant_id: string;
  title: string;
  request_text: string;
  status: 'EXECUTING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'DECLINED' | 'ESCALATED';
  current_stage: 'understand' | 'plan' | 'act' | 'approve' | 'verify' | 'report';
  stages: TaskStage[];
  result_summary?: string;
  tool_calls: ToolCall[];
  created_at: string;
  updated_at: string;
  approvals?: Approval[];
  audit_logs?: AuditLog[];
}

export interface Approval {
  id: string;
  task_id: string;
  merchant_id: string;
  action_type: string;
  title: string;
  description: string;
  parameters: {
    discount_pct?: number;
    min_order?: number;
    coupon_code?: string;
    target_audience_count?: number;
    estimated_discount_budget_max?: number;
    channel?: string;
    validity_days?: number;
    [key: string]: any;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  estimated_cost: number;
  audience_reach: number;
  requested_at: string;
  decided_at?: string;
  decided_by?: string;
}

export interface AuditLog {
  id: number;
  task_id: string;
  action: string;
  actor: string;
  details: any;
  timestamp: string;
}

export interface Transaction {
  id: string;
  merchant_id: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  payment_mode: string;
  status: string;
  utr: string;
  soundbox_broadcast: number;
  category: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  total_orders: number;
  total_spent: number;
  last_visit: string;
  segment: string;
  favorite_item: string;
}

export interface Settlement {
  id: string;
  merchant_id: string;
  batch_date: string;
  amount: number;
  txn_count: number;
  status: string;
  bank_name: string;
  bank_utr?: string;
  expected_time: string;
  actual_time?: string;
  notes?: string;
}

export interface SoundboxDevice {
  id: string;
  merchant_id: string;
  model: string;
  sim_carrier: string;
  battery_percent: number;
  status: string;
  language: string;
  last_ping: string;
}

export interface KPIItem {
  id: string;
  label: string;
  value: string;
  target: string;
  status: string;
  description: string;
}

export interface PerformanceKPIs {
  kpis: KPIItem[];
  roi_summary: {
    merchant_hours_saved_monthly: string;
    revenue_recovered_monthly: string;
    operational_error_reduction: string;
  };
}

export interface SystemSettings {
  sarvam_api_key_configured: boolean;
  sarvam_api_key_masked: string;
  sarvam_model: string;
  sarvam_stt_model: string;
  sarvam_tts_model: string;
  tts_speaker: string;
  soundbox_voice_lang: string;
  auto_approve_threshold: number;
  merchant_name: string;
  merchant_vpa: string;
}
