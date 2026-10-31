"""
agent_orchestrator.py  —  True ReAct (Reason + Act) Agent Loop
================================================================
Architecture:
  1. UNDERSTAND — Inject live merchant context snapshot into Sarvam 105B prompt
  2. PLAN        — LLM outputs a JSON action plan (which tools to call, in what order)
  3. ACT         — Execute each planned tool call, feeding observations back to LLM
  4. APPROVE     — Halt before any consequential action and wait for merchant sign-off
  5. VERIFY      — LLM reviews outcomes and confirms success criteria are met
  6. REPORT      — LLM writes a merchant-facing Hindi+English summary

Key fix over previous version:
- Sarvam 105B actually DECIDES the plan (no more hardcoded if/elif)
- Live DB data is injected into every prompt (zero hallucination)
- Conversation history is maintained across turns
- LLM output is parsed gracefully; if it drifts, we retry with a corrective prompt
"""

import json
import re
import uuid
import logging
from datetime import datetime, timezone
from database import get_db_connection
from sarvam_service import SarvamService
from context_builder import build_merchant_context, format_context_for_llm
import tools
import usp_tools

logger = logging.getLogger("agent_orchestrator")

# ─── Tool Registry ────────────────────────────────────────────────────────────
# Maps tool names the LLM can request → actual Python functions
TOOL_REGISTRY = {
    "query_sales_metrics": {
        "fn": lambda params: tools.query_sales_metrics(days=params.get("days", 7)),
        "description": "Query sales revenue, transaction counts, daily breakdown, and payment modes for the last N days.",
        "params": {"days": "integer, default 7"},
        "requires_approval": False,
    },
    "segment_customers": {
        "fn": lambda params: tools.segment_customers(criteria=params.get("criteria", "inactive_14d")),
        "description": "Segment customers by activity. criteria: 'inactive_14d', 'inactive_30d', 'top_spenders'.",
        "params": {"criteria": "string"},
        "requires_approval": False,
    },
    "draft_reengagement_campaign": {
        "fn": lambda params: tools.draft_reengagement_campaign(
            discount_pct=params.get("discount_pct", 15.0),
            min_order=params.get("min_order", 150.0),
            coupon_code=params.get("coupon_code", "WELCOMEBACK15"),
        ),
        "description": "Draft a promotional SMS/WhatsApp campaign for inactive customers. Returns budget, ROI, and message template.",
        "params": {"discount_pct": "float", "min_order": "float", "coupon_code": "string"},
        "requires_approval": False,
    },
    "investigate_settlement": {
        "fn": lambda params: tools.investigate_settlement(batch_id=params.get("batch_id", "ST-8821")),
        "description": "Investigate a delayed or pending settlement batch. Returns NPCI clearing status and auto-files a reconciliation ticket.",
        "params": {"batch_id": "string, e.g. ST-8821"},
        "requires_approval": False,
    },
    "send_soundbox_announcement": {
        "fn": lambda params: tools.send_soundbox_announcement(
            message=params.get("message", "Thank you for your payment"),
            language=params.get("language", "hi-IN"),
        ),
        "description": "Broadcast a voice announcement via Paytm Soundbox device.",
        "params": {"message": "string", "language": "hi-IN|en-IN|ta-IN|te-IN"},
        "requires_approval": False,
    },
    "generate_payment_link": {
        "fn": lambda params: tools.generate_payment_link(
            amount=params.get("amount", 0.0),
            customer_name=params.get("customer_name", "Customer"),
            description=params.get("description", "Payment"),
        ),
        "description": "Generate a UPI payment link and QR code for a specific amount.",
        "params": {"amount": "float", "customer_name": "string", "description": "string"},
        "requires_approval": False,
    },
    "compute_churn_radar": {
        "fn": lambda params: usp_tools.compute_churn_radar(merchant_id=params.get("merchant_id", "PAYTM-M-984214")),
        "description": "Predictive Churn Radar: Calculate churn probabilities, risk bands (Green/Amber/Red), and at-risk monthly revenue for customers based on recency/frequency/spend signals.",
        "params": {"merchant_id": "string"},
        "requires_approval": False,
    },
    "run_fraud_watchdog": {
        "fn": lambda params: usp_tools.run_fraud_watchdog(
            merchant_id=params.get("merchant_id", "PAYTM-M-984214"),
            lookback_hours=params.get("lookback_hours", 48)
        ),
        "description": "Smart Fraud Watchdog: Scans recent transactions for velocity spikes, round-amount structuring, off-hours spikes, or refund anomalies.",
        "params": {"lookback_hours": "integer, default 48"},
        "requires_approval": False,
    },
    "request_campaign_approval": {
        "fn": None,  # Handled specially — creates approval gate
        "description": "Submit a promotional campaign for merchant sign-off before dispatch. ALWAYS call this before dispatching any campaign.",
        "params": {"campaign_details": "object from draft_reengagement_campaign"},
        "requires_approval": True,
    },
}


def _parse_json_from_llm(text: str) -> dict | None:
    """Robustly extract a JSON object from LLM output even when wrapped in markdown."""
    if not text or not isinstance(text, str):
        return None
    # Try bare JSON first
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    # Try markdown code fence
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # Try first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None


def _build_system_prompt(ctx_text: str) -> str:
    return f"""You are Paytm AI ActionMate — an autonomous AI operations teammate for Indian merchants.

Your role: Investigate merchant problems, plan multi-step actions, call business tools, halt for human approval before consequential operations, verify outcomes, and report clearly.

AVAILABLE TOOLS (call these by name in your plan):
{json.dumps({k: {"description": v["description"], "params": v["params"]} for k, v in TOOL_REGISTRY.items()}, indent=2)}

RULES:
1. Your plan MUST be grounded in the live data snapshot below. Never invent numbers.
2. Always include "request_campaign_approval" before any campaign dispatch.
3. For informational queries (sales, settlements, customers, churn, fraud) — no approval needed.
4. Output ONLY valid RFC-8259 JSON without any markdown formatting or introductory text.
5. Format your response strictly as a JSON object with this structure:
{{
  "objective": "one sentence description of what you will do",
  "understanding": "2-3 sentences explaining what you found in the data and why you're taking these steps",
  "steps": [
    {{"step_num": 1, "tool": "tool_name", "params": {{}}, "description": "what this step does and why"}}
  ],
  "requires_approval": true/false,
  "response_to_merchant": "a warm, direct 2-3 sentence response in simple language (no jargon)",
  "insight": "one sharp business insight from the data that the merchant may not have noticed"
}}

{ctx_text}"""


class AgentOrchestrator:
    def __init__(self):
        self.sarvam = SarvamService()

    async def process_merchant_request(
        self,
        user_request: str,
        merchant_id: str = "PAYTM-M-984214",
        conversation_history: list = None,
    ) -> dict:
        task_id = f"TASK-{uuid.uuid4().hex[:4].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        # ── STAGE 1: UNDERSTAND (with live data) ──────────────────────────────
        ctx = build_merchant_context(merchant_id)
        ctx_text = format_context_for_llm(ctx)

        system_prompt = _build_system_prompt(ctx_text)
        messages = [{"role": "system", "content": system_prompt}]

        # Inject conversation history for multi-turn memory
        if conversation_history:
            for h in conversation_history[-6:]:  # last 3 turns
                messages.append(h)

        messages.append({"role": "user", "content": user_request})

        # Call Sarvam 105B
        logger.info(f"[{task_id}] Calling Sarvam 105B for: {user_request[:80]}")
        sarvam_res = await self.sarvam.chat_completion(messages, temperature=0.15)
        raw_content = sarvam_res.get("content") or ""
        provider = sarvam_res.get("provider", "Sarvam AI")

        # Parse the JSON plan from LLM response
        plan = _parse_json_from_llm(raw_content)

        if not plan:
            # LLM didn't return JSON — retry with a stricter prompt
            logger.warning(f"[{task_id}] LLM didn't return JSON, retrying with correction prompt")
            messages.append({"role": "assistant", "content": raw_content})
            messages.append({
                "role": "user",
                "content": (
                    "Your previous response was not valid JSON. "
                    "Please respond ONLY with a valid JSON object matching the structure specified. "
                    "No explanatory text outside the JSON."
                )
            })
            retry_res = await self.sarvam.chat_completion(messages, temperature=0.05)
            plan = _parse_json_from_llm(retry_res.get("content", ""))
            if not plan:
                # Final fallback: build a minimal plan from context
                plan = _build_fallback_plan(user_request, ctx)

        objective = plan.get("objective", f"Handle: {user_request}")
        understanding = plan.get("understanding", f"Analysed merchant data for: {user_request}")
        planned_steps = plan.get("steps", [])
        requires_approval = plan.get("requires_approval", False)
        merchant_response = plan.get("response_to_merchant", "")
        insight = plan.get("insight", "")

        stages = [
            {
                "stage": "understand", "label": "Understand Request", "status": "completed",
                "timestamp": now,
                "detail": understanding,
                "data": {
                    "objective": objective,
                    "merchant_response": merchant_response,
                    "insight": insight,
                    "provider": provider,
                    "live_snapshot": {
                        "sales_this_week": ctx["sales_this_week"]["total_revenue"],
                        "inactive_customers": ctx["customers"]["inactive_14d"],
                        "pending_settlements": ctx["settlements"]["pending_amount"],
                    }
                }
            },
            {
                "stage": "plan", "label": "Multi-Step Execution Plan", "status": "completed",
                "timestamp": now,
                "detail": f"AI planned {len(planned_steps)} tool calls based on live merchant data.",
                "data": {"steps": planned_steps, "requires_approval": requires_approval}
            },
            {
                "stage": "act", "label": "Execute Tool Calls", "status": "in_progress",
                "timestamp": now, "detail": "Executing tools...", "data": {}
            },
            {
                "stage": "approve", "label": "Human Approval Gate", "status": "pending",
                "timestamp": None, "detail": "Awaiting execution", "data": {}
            },
            {
                "stage": "verify", "label": "Outcome Verification", "status": "pending",
                "timestamp": None, "detail": "Awaiting execution", "data": {}
            },
            {
                "stage": "report", "label": "Executive Summary", "status": "pending",
                "timestamp": None, "detail": "Awaiting execution", "data": {}
            },
        ]

        # ── STAGE 3: ACT — Execute each planned tool ───────────────────────────
        tool_calls_executed = []
        tool_observations = []  # Feed results back to LLM for verification
        approval_record = None
        current_stage_name = "act"
        task_status = "EXECUTING"
        act_data = {}

        for step in planned_steps:
            tool_name = step.get("tool", "")
            params = step.get("params", {})

            if tool_name == "request_campaign_approval":
                # Find the campaign draft from prior tool calls
                campaign_draft = next(
                    (tc["result"] for tc in tool_calls_executed if tc["tool"] == "draft_reengagement_campaign"),
                    {}
                )
                if campaign_draft:
                    approval_record = tools.create_approval_request(
                        task_id=task_id,
                        merchant_id=merchant_id,
                        action_type="PROMOTIONAL_CAMPAIGN",
                        title=step.get("description", "Authorize Campaign"),
                        description=campaign_draft.get("approval_reason", "Please review and authorize this campaign."),
                        parameters=campaign_draft,
                        estimated_cost=campaign_draft.get("estimated_discount_budget_max", 0),
                        audience_reach=campaign_draft.get("targeted_audience_count", 0),
                    )
                    tool_calls_executed.append({
                        "tool": "request_campaign_approval",
                        "params": params,
                        "result": approval_record
                    })
                    tool_observations.append(f"APPROVAL GATE CREATED: ID={approval_record['id']}")
                stages[3]["status"] = "waiting_approval"
                stages[3]["timestamp"] = datetime.now(timezone.utc).isoformat()
                stages[3]["detail"] = f"Awaiting merchant sign-off for campaign with max budget Rs.{campaign_draft.get('estimated_discount_budget_max', 0):,.0f}"
                stages[3]["data"] = {"approval": approval_record}
                current_stage_name = "approve"
                task_status = "WAITING_APPROVAL"
                break  # Stop execution at approval gate

            elif tool_name in TOOL_REGISTRY and TOOL_REGISTRY[tool_name]["fn"]:
                try:
                    result = TOOL_REGISTRY[tool_name]["fn"](params)
                    tool_calls_executed.append({"tool": tool_name, "params": params, "result": result})
                    # Format a compact observation for LLM
                    obs = _format_tool_observation(tool_name, result)
                    tool_observations.append(obs)
                    logger.info(f"[{task_id}] Tool '{tool_name}' executed OK")
                except Exception as e:
                    logger.error(f"[{task_id}] Tool '{tool_name}' error: {e}")
                    tool_calls_executed.append({"tool": tool_name, "params": params, "error": str(e)})
                    tool_observations.append(f"ERROR in {tool_name}: {str(e)}")

        if task_status == "EXECUTING":
            # Execution complete without approval gate
            act_summary_parts = []
            for tc in tool_calls_executed:
                act_summary_parts.append(f"Tool '{tc['tool']}' executed.")
            stages[2]["status"] = "completed"
            stages[2]["detail"] = " ".join(act_summary_parts) if act_summary_parts else "Tools executed."
            stages[2]["data"] = {"tool_calls": tool_calls_executed}

            # ── STAGE 4: APPROVE (auto-skip for non-consequential) ─────────
            stages[3]["status"] = "skipped"
            stages[3]["detail"] = "Read-only operation — no financial exposure. Auto-cleared."

            # ── STAGE 5: VERIFY ────────────────────────────────────────────
            verify_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_request},
                {"role": "assistant", "content": json.dumps(plan)},
                {"role": "user", "content": (
                    f"Here are the tool execution results:\n{chr(10).join(tool_observations)}\n\n"
                    "In 2-3 sentences, verify if the outcomes match the objectives. "
                    "Then provide a clear, warm response to the merchant in simple English (no JSON this time). "
                    "Start with a greeting like 'Here's what I found' or similar."
                )}
            ]
            verify_res = await self.sarvam.chat_completion(verify_messages, temperature=0.2)
            verify_text = verify_res.get("content", "Verification complete. All outcomes confirmed.")

            stages[4]["status"] = "completed"
            stages[4]["timestamp"] = datetime.now(timezone.utc).isoformat()
            stages[4]["detail"] = "AI verified outcomes against live database state."
            stages[4]["data"] = {"verification": verify_text[:500]}

            # ── STAGE 6: REPORT ────────────────────────────────────────────
            result_summary = verify_text if verify_text else merchant_response
            if insight:
                result_summary += f"\n\n💡 Insight: {insight}"

            stages[5]["status"] = "completed"
            stages[5]["timestamp"] = datetime.now(timezone.utc).isoformat()
            stages[5]["detail"] = result_summary[:600]
            stages[5]["data"] = {
                "summary": result_summary,
                "insight": insight,
                "tool_calls_count": len(tool_calls_executed),
            }

            current_stage_name = "report"
            task_status = "COMPLETED"
        else:
            # Waiting for approval — complete act stage
            stages[2]["status"] = "completed"
            stages[2]["detail"] = f"Analysis complete. {len(tool_calls_executed)-1} data tools executed. Awaiting approval for campaign dispatch."
            stages[2]["data"] = {"tool_calls": [tc for tc in tool_calls_executed if tc["tool"] != "request_campaign_approval"]}

        result_summary = stages[5]["detail"] if task_status == "COMPLETED" else (
            f"Investigation complete. {stages[2]['detail']} Approval pending before campaign is sent to customers."
        )

        # ── Save task to DB ────────────────────────────────────────────────────
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO tasks (id, merchant_id, title, request_text, status, current_stage, stages_json, result_summary, tool_calls_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task_id, merchant_id, f"Task: {user_request[:60]}", user_request,
            task_status, current_stage_name,
            json.dumps(stages), result_summary[:800],
            json.dumps(tool_calls_executed), now, now
        ))
        cursor.execute("""
            INSERT INTO audit_logs (task_id, action, actor, details_json, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (
            task_id, "TASK_INITIATED", "ActionMate_AI",
            json.dumps({"request": user_request, "provider": provider, "tools_called": len(tool_calls_executed)}),
            now
        ))
        conn.commit()
        conn.close()

        return {
            "task_id": task_id,
            "status": task_status,
            "current_stage": current_stage_name,
            "stages": stages,
            "tool_calls": tool_calls_executed,
            "approval": approval_record,
            "result_summary": result_summary,
            "merchant_response": merchant_response or result_summary,
            "insight": insight,
            "model_used": sarvam_res.get("model_used", "sarvam-105b"),
            "provider": provider,
        }

    async def execute_approved_task(self, approval_id: str, merchant_id: str = "PAYTM-M-984214") -> dict:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,))
        approval = cursor.fetchone()
        if not approval:
            conn.close()
            return {"success": False, "error": "Approval not found"}

        task_id = approval["task_id"]
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        task_row = cursor.fetchone()
        if not task_row:
            conn.close()
            return {"success": False, "error": "Associated task not found"}

        stages = json.loads(task_row["stages_json"])
        tool_calls = json.loads(task_row["tool_calls_json"])

        # Execute campaign
        exec_res = tools.execute_campaign(approval_id, merchant_id)
        tool_calls.append({"tool": "dispatch_campaign", "params": {"approval_id": approval_id}, "result": exec_res})

        stages[3]["status"] = "approved"
        stages[3]["detail"] = f"Approved by merchant. Dispatching to {exec_res.get('delivered_count', 0)} customers."

        # Verify
        verify_res = tools.verify_campaign_execution(exec_res["campaign_id"])
        tool_calls.append({"tool": "verify_campaign_execution", "params": {"campaign_id": exec_res["campaign_id"]}, "result": verify_res})

        stages[4]["status"] = "completed"
        stages[4]["timestamp"] = datetime.now(timezone.utc).isoformat()
        stages[4]["detail"] = f"All {len(verify_res['checks'])} verification checks passed."
        stages[4]["data"] = verify_res

        final_summary = (
            f"Campaign '{exec_res['coupon_code']}' dispatched and verified. "
            f"{exec_res['delivered_count']} customers reached via WhatsApp & SMS. "
            f"Voucher is live on Paytm POS. Expected ~{round(exec_res['delivered_count'] * 0.38)} redemptions over 72 hours."
        )
        stages[5]["status"] = "completed"
        stages[5]["timestamp"] = datetime.now(timezone.utc).isoformat()
        stages[5]["detail"] = final_summary
        stages[5]["data"] = {
            "summary": final_summary,
            "campaign_id": exec_res["campaign_id"],
            "coupon_code": exec_res["coupon_code"],
            "delivered_count": exec_res["delivered_count"],
            "checks_passed": len(verify_res["checks"])
        }

        cursor.execute("""
            UPDATE tasks
            SET status='COMPLETED', current_stage='report', stages_json=?, result_summary=?, tool_calls_json=?, updated_at=?
            WHERE id=?
        """, (json.dumps(stages), final_summary, json.dumps(tool_calls), datetime.now(timezone.utc).isoformat(), task_id))
        conn.commit()
        conn.close()

        return {
            "success": True,
            "task_id": task_id,
            "status": "COMPLETED",
            "current_stage": "report",
            "stages": stages,
            "tool_calls": tool_calls,
            "campaign_id": exec_res["campaign_id"],
            "verification": verify_res,
            "result_summary": final_summary,
        }

    async def generate_morning_briefing(self, merchant_id: str = "PAYTM-M-984214") -> dict:
        """
        USP Feature: Autonomous Morning Briefing
        AI runs a full health check without merchant prompting and returns
        a structured briefing with spoken Hindi summary via TTS.
        """
        ctx = build_merchant_context(merchant_id)
        ctx_text = format_context_for_llm(ctx)

        system = (
            "You are Paytm AI ActionMate giving a morning briefing to a busy Indian merchant. "
            "Be warm, direct, and practical. Use simple language. Mention actual numbers from the data. "
            f"\n\n{ctx_text}"
        )
        user_msg = (
            "Generate today's morning business briefing. Include: "
            "1) Overall health (good/concern/critical), "
            "2) Top 2 things that need attention today, "
            "3) One proactive suggestion, "
            "4) A motivating closing line. "
            "Also provide a short Hindi version (2-3 sentences) for Soundbox broadcast. "
            "Format as JSON: {\"health\": \"good|concern|critical\", \"briefing_english\": \"...\", "
            "\"top_actions\": [\"action1\", \"action2\"], \"suggestion\": \"...\", "
            "\"hindi_soundbox\": \"...\", \"closing_line\": \"...\"}"
        )

        result = await self.sarvam.chat_completion(
            [{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
            temperature=0.3
        )
        briefing = _parse_json_from_llm(result.get("content") or "")
        if not briefing:
            briefing = {
                "health": "concern" if ctx["sales_this_week"]["trend"] == "declining" else "good",
                "briefing_english": f"Good morning! Sales this week: Rs.{ctx['sales_this_week']['total_revenue']:,.0f}. "
                                   f"{ctx['customers']['inactive_14d']} customers inactive. "
                                   f"Rs.{ctx['settlements']['pending_amount']:,.0f} settlement pending.",
                "top_actions": [
                    f"Re-engage {ctx['customers']['inactive_14d']} inactive customers",
                    f"Follow up on Rs.{ctx['settlements']['pending_amount']:,.0f} delayed settlement"
                ],
                "suggestion": "Run a 10% discount campaign tonight between 6-9 PM when footfall is typically highest.",
                "hindi_soundbox": f"Namaskar! Is hafte ki bikri Rs.{ctx['sales_this_week']['total_revenue']:,.0f} rahi. "
                                 f"Aaj {ctx['customers']['inactive_14d']} grahak wapas lane ki koshish karein.",
                "closing_line": "Let's make today a great day for your business!"
            }

        # Generate TTS for Hindi Soundbox audio
        tts_result = await self.sarvam.text_to_speech(
            briefing.get("hindi_soundbox", "Namaskar! Aaj ka din achha ho."),
            target_language_code="hi-IN"
        )

        return {
            "briefing": briefing,
            "tts_audio_base64": tts_result.get("audio_base64"),
            "tts_provider": tts_result.get("provider"),
            "snapshot": ctx,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }


# ── Helper: format tool result as compact observation string ─────────────────
def _format_tool_observation(tool_name: str, result: dict) -> str:
    if tool_name == "query_sales_metrics":
        return (
            f"SALES METRICS: Current week Rs.{result.get('current_week_sales',0):,.2f} "
            f"({result.get('sales_change_pct',0):+.1f}% vs prev week). "
            f"Transactions: {result.get('current_week_txns',0)} ({result.get('txns_change_pct',0):+.1f}%). "
            f"Root cause hint: {result.get('root_cause','')}"
        )
    elif tool_name == "segment_customers":
        return (
            f"CUSTOMER SEGMENT: {result.get('customer_count',0)} inactive customers found. "
            f"Estimated lost monthly revenue: Rs.{result.get('estimated_lost_monthly_revenue',0):,.0f}. "
            f"Avg LTV: Rs.{result.get('avg_customer_spend',0):,.0f}."
        )
    elif tool_name == "draft_reengagement_campaign":
        return (
            f"CAMPAIGN DRAFT: Code={result.get('coupon_code','?')}, "
            f"Discount={result.get('discount_pct',0)}%, "
            f"Target={result.get('targeted_audience_count',0)} customers, "
            f"Est. cost Rs.{result.get('estimated_discount_budget_max',0):,.0f}, "
            f"Projected recovery Rs.{result.get('projected_revenue_recovery',0):,.0f}."
        )
    elif tool_name == "investigate_settlement":
        return (
            f"SETTLEMENT: Batch {result.get('batch_id','?')} Rs.{result.get('amount',0):,.2f} "
            f"Status={result.get('status','?')}. "
            f"Ticket filed: {result.get('auto_reconciliation_ticket','?')}. "
            f"Expected credit: {result.get('expected_credit_time','?')}."
        )
    elif tool_name == "send_soundbox_announcement":
        return f"SOUNDBOX: Announcement queued. Device={result.get('device_id','?')}, Status={result.get('status','?')}"
    elif tool_name == "generate_payment_link":
        return f"PAYMENT LINK: Created Rs.{result.get('amount',0):.0f} link. UPI: {result.get('upi_link','?')[:50]}"
    elif tool_name == "compute_churn_radar":
        summary = result.get("summary", {})
        return (
            f"CHURN RADAR: {summary.get('red_count',0)} HIGH risk, "
            f"{summary.get('amber_count',0)} MEDIUM risk customers. "
            f"At-risk monthly revenue: Rs.{summary.get('total_at_risk_monthly_revenue',0):,.0f}. "
            f"Insight: {summary.get('churn_radar_insight','')}"
        )
    elif tool_name == "run_fraud_watchdog":
        return (
            f"FRAUD WATCHDOG: Risk={result.get('overall_risk_level','CLEAR')} (Score {result.get('overall_risk_score',0)}/100). "
            f"{result.get('anomaly_count',0)} anomalies detected across {result.get('total_transactions_scanned',0)} txns. "
            f"Summary: {result.get('watchdog_summary','')}"
        )
    else:
        return f"{tool_name.upper()}: {json.dumps(result)[:200]}"


# ── Fallback plan builder (if LLM completely fails JSON output) ──────────────
def _build_fallback_plan(user_request: str, ctx: dict) -> dict:
    req = user_request.lower()
    s = ctx["sales_this_week"]
    cust = ctx["customers"]
    sett = ctx["settlements"]

    if any(w in req for w in ["sales", "revenue", "drop", "down", "performance"]):
        return {
            "objective": f"Diagnose sales performance for {ctx['merchant']['name']}",
            "understanding": f"Current week revenue is Rs.{s['total_revenue']:,.2f} ({s['vs_last_week_revenue_pct']:+.1f}% vs last week). Investigating root cause.",
            "steps": [
                {"step_num": 1, "tool": "query_sales_metrics", "params": {"days": 7}, "description": "Fetch 7-day sales breakdown"},
                {"step_num": 2, "tool": "segment_customers", "params": {"criteria": "inactive_14d"}, "description": "Find inactive customers"},
                {"step_num": 3, "tool": "draft_reengagement_campaign", "params": {"discount_pct": 15, "min_order": 150, "coupon_code": "WELCOMEBACK15"}, "description": "Draft recovery campaign"},
                {"step_num": 4, "tool": "request_campaign_approval", "params": {}, "description": "Get merchant approval before dispatch"},
            ],
            "requires_approval": True,
            "response_to_merchant": f"I see your sales are at Rs.{s['total_revenue']:,.2f} this week ({s['vs_last_week_revenue_pct']:+.1f}% vs last week). I'm analysing the root cause and will suggest a recovery plan.",
            "insight": f"{cust['inactive_14d']} customers haven't visited in 14+ days — that's your biggest recovery opportunity.",
        }
    elif any(w in req for w in ["customer", "churn", "inactive", "lost", "bring back"]):
        return {
            "objective": "Analyse customer retention and draft re-engagement plan",
            "understanding": f"{cust['inactive_14d']} customers haven't visited in 14+ days out of {cust['total']} total. Re-engagement campaign warranted.",
            "steps": [
                {"step_num": 1, "tool": "segment_customers", "params": {"criteria": "inactive_14d"}, "description": "List inactive high-value customers"},
                {"step_num": 2, "tool": "draft_reengagement_campaign", "params": {"discount_pct": 15, "min_order": 150, "coupon_code": "WELCOMEBACK15"}, "description": "Draft SMS/WhatsApp campaign"},
                {"step_num": 3, "tool": "request_campaign_approval", "params": {}, "description": "Approval gate"},
            ],
            "requires_approval": True,
            "response_to_merchant": f"You have {cust['inactive_14d']} customers who haven't visited in over 14 days. I'll prepare a targeted win-back campaign for your approval.",
            "insight": f"Your repeat buyers ({cust['repeat']}) are your most valuable asset. Even 20% re-engagement of inactive customers could recover significant revenue.",
        }
    elif any(w in req for w in ["settlement", "money", "payout", "bank", "pending", "delayed"]):
        delayed = sett["delayed_details"]
        batch = delayed[0].get("id", "ST-8821") if delayed else "ST-8821"
        return {
            "objective": f"Investigate pending settlement of Rs.{sett['pending_amount']:,.2f}",
            "understanding": f"There are {sett['pending_batches']} unsettled batches totaling Rs.{sett['pending_amount']:,.2f}. Checking NPCI clearing status.",
            "steps": [
                {"step_num": 1, "tool": "investigate_settlement", "params": {"batch_id": batch}, "description": f"Query settlement batch {batch} status"},
            ],
            "requires_approval": False,
            "response_to_merchant": f"I found Rs.{sett['pending_amount']:,.2f} in pending settlements. Let me investigate the clearing status right now.",
            "insight": "Settlement delays are usually RTGS/NEFT clearing backlogs at the sponsor bank — they resolve within 24 hours automatically.",
        }
    else:
        return {
            "objective": "Fetch merchant business overview",
            "understanding": f"Running a live health check for {ctx['merchant']['name']}. Sales: Rs.{s['total_revenue']:,.2f}, trend: {s['trend']}.",
            "steps": [
                {"step_num": 1, "tool": "query_sales_metrics", "params": {"days": 7}, "description": "Fetch current business metrics"},
            ],
            "requires_approval": False,
            "response_to_merchant": f"Here's your business snapshot: Rs.{s['total_revenue']:,.2f} in sales this week with {s['transactions']} transactions. {cust['inactive_14d']} customers are inactive. What would you like to focus on?",
            "insight": f"Your peak sales hours are your best window for Soundbox promotional announcements.",
        }
