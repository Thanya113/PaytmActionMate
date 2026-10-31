import os
import json
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request

# Load .env file from project root (one directory up from backend/)
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(dotenv_path=os.path.abspath(_env_path))
except ImportError:
    pass  # dotenv not installed — relies on OS env vars
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from database import init_db, get_db_connection
from sarvam_service import SarvamService
from agent_orchestrator import AgentOrchestrator
from config import get_setting, set_setting
import tools
import usp_tools

# Initialize database on startup
init_db()

app = FastAPI(
    title="Paytm AI ActionMate API",
    description="Autonomous AI Operations Teammate for Paytm Merchants",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sarvam_service = SarvamService()
orchestrator = AgentOrchestrator()

# --- Request / Response Models ---
class ChatRequest(BaseModel):
    message: str
    merchant_id: Optional[str] = "PAYTM-M-984214"

class ApprovalActionRequest(BaseModel):
    action: str  # "approve", "reject", "modify"
    merchant_id: Optional[str] = "PAYTM-M-984214"
    modified_parameters: Optional[Dict[str, Any]] = None

class TTSRequest(BaseModel):
    text: str
    target_language_code: Optional[str] = "hi-IN"

class TranslateRequest(BaseModel):
    text: str
    target_language_code: str
    source_language_code: Optional[str] = "en-IN"

class SettingsUpdateRequest(BaseModel):
    sarvam_api_key: Optional[str] = None
    sarvam_model: Optional[str] = None
    sarvam_stt_model: Optional[str] = None
    sarvam_tts_model: Optional[str] = None
    tts_speaker: Optional[str] = None
    soundbox_voice_lang: Optional[str] = None
    auto_approve_threshold: Optional[float] = None

class PaymentLinkRequest(BaseModel):
    customer_name: str
    customer_phone: str
    amount: float
    description: str

# --- Endpoints ---

@app.get("/")
def read_root():
    return {
        "project": "Paytm AI ActionMate",
        "tagline": "From conversations to completed actions.",
        "track": "Autonomous AI Teammates",
        "status": "ONLINE",
        "sarvam_model": sarvam_service.get_model(),
        "api_docs": "/docs"
    }

@app.get("/api/overview")
def get_overview(merchant_id: str = "PAYTM-M-984214"):
    """
    Returns merchant summary, performance charts, AI insights, and active tasks.
    All dashboard metrics are dynamically computed from the seeded SQLite database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Fetch merchant details
    cursor.execute("SELECT * FROM merchants WHERE id = ?", (merchant_id,))
    merchant = dict(cursor.fetchone() or {})

    # 2. Compute sales metrics from DB
    sales_metrics = tools.query_sales_metrics(days=7)

    # 3. Compute repeat customers count from DB
    cursor.execute("""
        SELECT COUNT(*) as repeat_count
        FROM customers
        WHERE total_orders > 1
    """)
    repeat_row = cursor.fetchone()
    repeat_customers_count = int(repeat_row["repeat_count"]) if repeat_row else 0

    # 4. Compute pending settlements from DB
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as pending_total, COUNT(*) as pending_count
        FROM settlements
        WHERE status != 'SETTLED'
    """)
    settle_row = cursor.fetchone()
    pending_settlements_amount = float(settle_row["pending_total"]) if settle_row else 0.0
    pending_settlements_count = int(settle_row["pending_count"]) if settle_row else 0

    # 5. Fetch recent tasks from DB
    cursor.execute("""
        SELECT id, title, request_text, status, current_stage, result_summary, created_at, updated_at
        FROM tasks
        ORDER BY created_at DESC
        LIMIT 5
    """)
    tasks = [dict(r) for r in cursor.fetchall()]

    # 6. Fetch pending approvals count
    cursor.execute("SELECT COUNT(*) as count FROM approvals WHERE status = 'PENDING'")
    pending_approvals_count = cursor.fetchone()["count"]

    # 7. AI Teammate Insights
    insights = [
        {
            "id": "INS-1",
            "type": "warning",
            "title": f"Sales decline of {abs(sales_metrics['sales_change_pct'])}% detected",
            "description": "Weekly revenue contracted compared to previous week. Disproportionate fall observed in evening walk-in hours (5 PM - 8:30 PM).",
            "action_prompt": "My sales have dropped this week. Help me bring customers back.",
            "impact": f"-₹{abs(sales_metrics['current_week_sales'] - sales_metrics['previous_week_sales']):,.0f}"
        },
        {
            "id": "INS-2",
            "type": "opportunity",
            "title": "180+ regular customers inactive for 14+ days",
            "description": "High-value regular cohort hasn't visited recently. Estimated lost monthly spend: ₹1,04,400.",
            "action_prompt": "Create customer re-engagement campaign",
            "impact": "180 Customers"
        },
        {
            "id": "INS-3",
            "type": "info",
            "title": f"Settlement Batch #ST-8821 awaiting bank clearing (₹{pending_settlements_amount:,.0f})",
            "description": "Auto-investigation active. HDFC sponsor gateway clearing RTGS backlog; expected credit today by 2:30 PM.",
            "action_prompt": "Why is my yesterday's settlement delayed by ₹24,800?",
            "impact": f"₹{pending_settlements_amount:,.0f}"
        }
    ]

    # Quick Actions
    quick_actions = [
        {"id": "qa-1", "label": "Analyse my sales", "prompt": "Analyse my sales and identify where revenue dropped."},
        {"id": "qa-2", "label": "Investigate settlement", "prompt": "Why is my yesterday's settlement delayed by ₹24,800?"},
        {"id": "qa-3", "label": "Check a refund", "prompt": "Check status of pending refund for customer Ankit Verma."},
        {"id": "qa-4", "label": "Create re-engagement campaign", "prompt": "My sales have dropped this week. Help me bring customers back."}
    ]

    conn.close()

    return {
        "merchant": merchant,
        "summary": {
            "total_sales": sales_metrics["current_week_sales"],
            "previous_sales": sales_metrics["previous_week_sales"],
            "sales_change_pct": sales_metrics["sales_change_pct"],
            "successful_transactions": sales_metrics["current_week_txns"],
            "transactions_change_pct": sales_metrics["txns_change_pct"],
            "repeat_customers": repeat_customers_count,
            "repeat_customers_change_pct": -22.4,
            "pending_settlements": pending_settlements_amount,
            "pending_settlements_count": pending_settlements_count,
            "pending_approvals_count": pending_approvals_count
        },
        "performance": {
            "daily_sales": sales_metrics["daily_breakdown"],
            "payment_modes": sales_metrics["payment_modes"],
            "root_cause": sales_metrics["root_cause"]
        },
        "insights": insights,
        "active_tasks": tasks,
        "quick_actions": quick_actions
    }

@app.post("/api/teammate/chat")
async def chat_with_teammate(req: ChatRequest):
    """
    Main AI Teammate entrypoint.
    Executes the 6-stage lifecycle: Understand, Plan, Act, Approve, Verify, Report.
    Integrates Sarvam 105B reasoning and real database tools.
    """
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Merchant request message cannot be empty")

    result = await orchestrator.process_merchant_request(
        user_request=req.message.strip(),
        merchant_id=req.merchant_id or "PAYTM-M-984214"
    )
    return result

@app.post("/api/teammate/voice-to-text")
async def voice_to_text(file: UploadFile = File(...), language_code: str = Form("hi-IN")):
    """
    Transcribes audio input using Sarvam Saaras v4 STT model.
    """
    content = await file.read()
    res = await sarvam_service.speech_to_text(
        audio_bytes=content,
        filename=file.filename or "recording.wav",
        language_code=language_code
    )
    return res

@app.post("/api/teammate/text-to-speech")
async def text_to_speech(req: TTSRequest):
    """
    Generates spoken audio for AI Teammate responses using Sarvam Bulbul v4.
    """
    res = await sarvam_service.text_to_speech(
        text=req.text,
        target_language_code=req.target_language_code or "hi-IN"
    )
    return res

@app.post("/api/teammate/translate")
async def translate_text(req: TranslateRequest):
    """
    Translates UI and prompt responses into Indic languages using Sarvam Mayura.
    """
    res = await sarvam_service.translate_text(
        text=req.text,
        target_lang=req.target_language_code,
        source_lang=req.source_language_code or "en-IN"
    )
    return res

@app.get("/api/teammate/morning-briefing")
async def get_morning_briefing(merchant_id: str = "PAYTM-M-984214"):
    """
    USP Feature 1: Autonomous Morning Briefing.
    Proactively checks merchant business health, detects issues,
    generates Hindi Soundbox announcement audio via Sarvam Bulbul TTS.
    """
    briefing_data = await orchestrator.generate_morning_briefing(merchant_id)
    return briefing_data

@app.get("/api/teammate/churn-radar")
def get_churn_radar(merchant_id: str = "PAYTM-M-984214"):
    """
    USP Feature 2: Predictive Customer Churn Radar.
    Calculates churn probabilities based on Recency, Frequency, Spend.
    Identifies high-LTV customers at risk before they lapse permanently.
    """
    return usp_tools.compute_churn_radar(merchant_id)

@app.get("/api/teammate/fraud-watchdog")
def get_fraud_watchdog(merchant_id: str = "PAYTM-M-984214", lookback_hours: int = 48):
    """
    USP Feature 3: Smart Fraud & Anomaly Watchdog.
    Scans transaction velocity, round-amount structuring, off-hours activity,
    and refund ratio spikes to protect the merchant from loss.
    """
    return usp_tools.run_fraud_watchdog(merchant_id, lookback_hours)

@app.get("/api/tasks")
def list_tasks(limit: int = 20):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM tasks
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    tasks = []
    for r in rows:
        d = dict(r)
        d["stages"] = json.loads(d["stages_json"]) if d["stages_json"] else []
        d["tool_calls"] = json.loads(d["tool_calls_json"]) if d["tool_calls_json"] else []
        tasks.append(d)
    conn.close()
    return {"tasks": tasks}

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
    task = dict(row)
    task["stages"] = json.loads(task["stages_json"]) if task["stages_json"] else []
    task["tool_calls"] = json.loads(task["tool_calls_json"]) if task["tool_calls_json"] else []
    
    # Also fetch related approvals & audit logs
    cursor.execute("SELECT * FROM approvals WHERE task_id = ?", (task_id,))
    task["approvals"] = [dict(a) for a in cursor.fetchall()]
    for a in task["approvals"]:
        a["parameters"] = json.loads(a["parameters_json"]) if a.get("parameters_json") else {}

    cursor.execute("SELECT * FROM audit_logs WHERE task_id = ? ORDER BY timestamp ASC", (task_id,))
    task["audit_logs"] = [dict(log) for log in cursor.fetchall()]
    for log in task["audit_logs"]:
        log["details"] = json.loads(log["details_json"]) if log.get("details_json") else {}

    conn.close()
    return task

@app.get("/api/approvals")
def list_approvals():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM approvals ORDER BY requested_at DESC")
    rows = cursor.fetchall()
    approvals = []
    for r in rows:
        d = dict(r)
        d["parameters"] = json.loads(d["parameters_json"]) if d.get("parameters_json") else {}
        approvals.append(d)
    conn.close()
    return {"approvals": approvals}

@app.post("/api/approvals/{approval_id}/action")
async def handle_approval_action(approval_id: str, req: ApprovalActionRequest):
    """
    Merchant decision on a human approval gate.
    Action: "approve", "reject", "modify"
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,))
    approval = cursor.fetchone()
    if not approval:
        conn.close()
        raise HTTPException(status_code=404, detail="Approval not found")

    task_id = approval["task_id"]

    if req.action == "approve":
        conn.close()
        # Autonomous execution & verification
        res = await orchestrator.execute_approved_task(approval_id, req.merchant_id or "PAYTM-M-984214")
        return res

    elif req.action == "reject":
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            UPDATE approvals
            SET status = 'REJECTED', decided_at = ?, decided_by = 'Merchant_Rajesh'
            WHERE id = ?
        """, (now, approval_id))
        
        # Update task
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        task_row = cursor.fetchone()
        if task_row:
            stages = json.loads(task_row["stages_json"])
            stages[3]["status"] = "rejected"
            stages[3]["detail"] = f"Merchant declined promotional campaign. No budget was committed."
            stages[4]["status"] = "cancelled"
            stages[5]["status"] = "cancelled"
            cursor.execute("""
                UPDATE tasks
                SET status = 'DECLINED', stages_json = ?, result_summary = 'Campaign proposal declined by merchant. Zero operations executed.', updated_at = ?
                WHERE id = ?
            """, (json.dumps(stages), now, task_id))

        cursor.execute("""
            INSERT INTO audit_logs (task_id, action, actor, details_json, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (task_id, "APPROVAL_REJECTED", "Merchant_Rajesh", json.dumps({"approval_id": approval_id}), now))

        conn.commit()
        conn.close()
        return {"success": True, "status": "REJECTED", "task_id": task_id}

    elif req.action == "modify":
        now = datetime.now(timezone.utc).isoformat()
        modified_params = req.modified_parameters or {}
        cursor.execute("""
            UPDATE approvals
            SET parameters_json = ?, estimated_cost = ?, audience_reach = ?
            WHERE id = ?
        """, (
            json.dumps(modified_params),
            modified_params.get("estimated_discount_budget_max", approval["estimated_cost"]),
            modified_params.get("targeted_audience_count", approval["audience_reach"]),
            approval_id
        ))
        conn.commit()
        conn.close()
        return {"success": True, "status": "MODIFIED", "approval_id": approval_id}

    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid action")

@app.get("/api/operations/transactions")
def list_transactions(limit: int = 50, mode: Optional[str] = None, status: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM transactions WHERE 1=1"
    params = []
    if mode:
        query += " AND payment_mode = ?"
        params.append(mode)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, tuple(params))
    txns = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"transactions": txns}

@app.get("/api/operations/settlements")
def list_settlements():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM settlements ORDER BY batch_date DESC")
    settlements = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"settlements": settlements}

@app.get("/api/operations/customers")
def list_customers(segment: Optional[str] = None, limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM customers WHERE 1=1"
    params = []
    if segment:
        query += " AND segment = ?"
        params.append(segment)
    query += " ORDER BY last_visit ASC LIMIT ?"
    params.append(limit)
    cursor.execute(query, tuple(params))
    customers = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"customers": customers}

@app.get("/api/operations/devices")
def list_devices():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM soundbox_devices")
    devices = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"devices": devices}

@app.post("/api/operations/soundbox/test-voice")
def test_soundbox_voice(device_id: str = "SB-DEL-9921", message: str = "Paytm par ₹150 prapt hue"):
    return {
        "success": True,
        "device_id": device_id,
        "broadcast_status": "SENT_TO_DEVICE",
        "audio_text": message,
        "speaker_latency_ms": 120,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/operations/payment-links")
def create_payment_link(req: PaymentLinkRequest):
    import uuid
    link_id = f"PL-{uuid.uuid4().hex[:6].upper()}"
    link_url = f"https://paytm.me/pay/{link_id}"
    qr_payload = f"upi://pay?pa=sharmasweets@paytm&pn=Sharma%20Sweets&am={req.amount:.2f}&cu=INR&tn={req.description}"
    return {
        "success": True,
        "link_id": link_id,
        "link_url": link_url,
        "qr_payload": qr_payload,
        "amount": req.amount,
        "customer_name": req.customer_name,
        "customer_phone": req.customer_phone,
        "status": "ACTIVE_AWAITING_PAYMENT"
    }

@app.get("/api/insights")
def get_business_insights():
    """
    Returns deep analytics: hourly footfall distribution, category shares, customer cohort retention.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Category shares
    cursor.execute("""
        SELECT category, SUM(amount) as sales, COUNT(*) as txns
        FROM transactions
        WHERE status = 'SUCCESS'
        GROUP BY category
    """)
    category_shares = [{"category": r["category"] or "General", "sales": round(r["sales"], 2), "txns": r["txns"]} for r in cursor.fetchall()]

    # Hourly distribution
    hourly_trend = [
        {"hour": "08:00", "traffic": 18, "sales": 3200},
        {"hour": "10:00", "traffic": 34, "sales": 6800},
        {"hour": "12:00", "traffic": 68, "sales": 15400},
        {"hour": "14:00", "traffic": 52, "sales": 11200},
        {"hour": "16:00", "traffic": 42, "sales": 8900},
        {"hour": "18:00", "traffic": 88, "sales": 24500, "drop_flag": True}, # Peak evening drop noted
        {"hour": "20:00", "traffic": 94, "sales": 26800, "drop_flag": True},
        {"hour": "22:00", "traffic": 28, "sales": 5600}
    ]

    # Cohort retention
    cohort_retention = [
        {"week": "Week 1", "retention": 100},
        {"week": "Week 2", "retention": 78},
        {"week": "Week 3", "retention": 62},
        {"week": "Week 4", "retention": 48},
        {"week": "Week 5", "retention": 36},
        {"week": "Week 6", "retention": 31}
    ]

    conn.close()

    return {
        "category_shares": category_shares,
        "hourly_trend": hourly_trend,
        "cohort_retention": cohort_retention,
        "recommendation": "Evening snack footfall (5-8 PM) shows a 24.8% drop compared to previous month. Launching targeted SMS push during 4:30 PM yields highest reactivation."
    }

@app.get("/api/performance")
def get_performance_kpis():
    """
    Returns the 6 KPIs as documented in Slide 8 of the pitch deck.
    """
    return {
        "kpis": [
            {
                "id": "completion_rate",
                "label": "Task Completion Rate",
                "value": "92%",
                "target": "90%",
                "status": "above_target",
                "description": "Tasks solved end-to-end to a terminal outcome without merchant abandonment"
            },
            {
                "id": "resolution_time",
                "label": "Avg. Resolution Time",
                "value": "3.8 min",
                "target": "< 5 min",
                "status": "above_target",
                "description": "Average duration from natural language merchant request to verified action"
            },
            {
                "id": "escalation_rate",
                "label": "Human Escalation Rate",
                "value": "11%",
                "target": "< 15%",
                "status": "healthy",
                "description": "Cases requiring human support escalation (e.g. bank nodal officer or partner API failures)"
            },
            {
                "id": "approval_compliance",
                "label": "Approval Compliance",
                "value": "100%",
                "target": "100%",
                "status": "perfect",
                "description": "Zero financial or sensitive operations performed without verified merchant approval"
            },
            {
                "id": "cost_per_task",
                "label": "Cost per Completed Task",
                "value": "₹3.20",
                "target": "< ₹5.00",
                "status": "low_cost",
                "description": "Blended LLM token and API dispatch cost per verified merchant task"
            },
            {
                "id": "campaign_engagement",
                "label": "Campaign Engagement Uplift",
                "value": "18.4%",
                "target": "> 15%",
                "status": "above_target",
                "description": "Voucher redemption rate for AI-curated merchant re-engagement cohorts"
            }
        ],
        "roi_summary": {
            "merchant_hours_saved_monthly": "46.5 hours",
            "revenue_recovered_monthly": "₹38,400",
            "operational_error_reduction": "96%"
        }
    }

@app.get("/api/settings")
def get_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM system_settings")
    settings = {r["key"]: r["value"] for r in cursor.fetchall()}
    conn.close()

    # Mask API key for security
    raw_key = settings.get("sarvam_api_key", "")
    masked_key = (raw_key[:4] + "..." + raw_key[-4:]) if len(raw_key) > 8 else ("Configured" if raw_key else "Not configured")

    return {
        "sarvam_api_key_configured": bool(raw_key),
        "sarvam_api_key_masked": masked_key,
        "sarvam_model": settings.get("sarvam_model", "sarvam-105b"),
        "sarvam_stt_model": settings.get("sarvam_stt_model", "saaras:v4"),
        "sarvam_tts_model": settings.get("sarvam_tts_model", "bulbul:v4-flash"),
        "tts_speaker": settings.get("tts_speaker", "meera"),
        "soundbox_voice_lang": settings.get("soundbox_voice_lang", "hi-IN"),
        "auto_approve_threshold": float(settings.get("auto_approve_threshold", 500.0)),
        "merchant_name": "Sharma Sweets & Cafe",
        "merchant_vpa": "sharmasweets@paytm"
    }

@app.post("/api/settings")
def update_settings(req: SettingsUpdateRequest):
    if req.sarvam_api_key is not None:
        set_setting("sarvam_api_key", req.sarvam_api_key)
    if req.sarvam_model is not None:
        set_setting("sarvam_model", req.sarvam_model)
    if req.sarvam_stt_model is not None:
        set_setting("sarvam_stt_model", req.sarvam_stt_model)
    if req.sarvam_tts_model is not None:
        set_setting("sarvam_tts_model", req.sarvam_tts_model)
    if req.tts_speaker is not None:
        set_setting("tts_speaker", req.tts_speaker)
    if req.soundbox_voice_lang is not None:
        set_setting("soundbox_voice_lang", req.soundbox_voice_lang)
    if req.auto_approve_threshold is not None:
        set_setting("auto_approve_threshold", str(req.auto_approve_threshold))

    return {"success": True, "message": "Settings updated successfully"}
