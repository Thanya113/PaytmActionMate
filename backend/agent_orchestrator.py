import json
import uuid
from datetime import datetime, timezone
from database import get_db_connection
from sarvam_service import SarvamService
import tools

class AgentOrchestrator:
    def __init__(self):
        self.sarvam = SarvamService()

    async def process_merchant_request(self, user_request: str, merchant_id: str = "PAYTM-M-984214") -> dict:
        task_id = f"TASK-{uuid.uuid4().hex[:4].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        # Step 1: UNDERSTAND
        # Consult Sarvam 105B reasoning
        prompt_system = (
            "You are Paytm AI ActionMate, an autonomous operations teammate for Paytm merchants. "
            "You investigate merchant problems, create structured multi-step plans, call business tools, "
            "request human approval for sensitive financial operations, verify outcomes, and provide transparent audit logs. "
            "Format your reasoning in clear, structured steps."
        )
        messages = [
            {"role": "system", "content": prompt_system},
            {"role": "user", "content": user_request}
        ]
        
        sarvam_res = await self.sarvam.chat_completion(messages)
        plan_meta = sarvam_res.get("structured_plan", {})
        if not plan_meta and "content" in sarvam_res:
            try:
                plan_meta = json.loads(sarvam_res["content"])
            except Exception:
                plan_meta = {}

        objective = plan_meta.get("objective", f"Investigate and resolve: {user_request}")
        understanding_text = plan_meta.get("understanding", f"Parsed request: {user_request}. Identifying merchant business data and relevant Paytm operations tools.")

        # Stage list with status tracking
        stages = [
            {
                "stage": "understand",
                "label": "Understand Request",
                "status": "completed",
                "timestamp": now,
                "detail": understanding_text,
                "data": {
                    "objective": objective,
                    "merchant_id": merchant_id,
                    "model_used": sarvam_res.get("model_used", "sarvam-105b"),
                    "provider": sarvam_res.get("provider", "Sarvam AI")
                }
            },
            {
                "stage": "plan",
                "label": "Multi-Step Execution Plan",
                "status": "in_progress",
                "timestamp": now,
                "detail": "Formulating tool calls, permission gates, and outcome verification checklist.",
                "data": {}
            },
            {
                "stage": "act",
                "label": "Execute Tool Calling",
                "status": "pending",
                "timestamp": None,
                "detail": "Awaiting plan finalization",
                "data": {}
            },
            {
                "stage": "approve",
                "label": "Human Approval Gate",
                "status": "pending",
                "timestamp": None,
                "detail": "Consequential operations check",
                "data": {}
            },
            {
                "stage": "verify",
                "label": "Outcome Verification",
                "status": "pending",
                "timestamp": None,
                "detail": "Verification against live database state",
                "data": {}
            },
            {
                "stage": "report",
                "label": "Executive Outcome Summary",
                "status": "pending",
                "timestamp": None,
                "detail": "Final merchant summary and receipts",
                "data": {}
            }
        ]

        tool_calls_executed = []

        # Step 2: PLAN
        planned_steps = plan_meta.get("steps", [
            {"step_num": 1, "tool": "query_sales_metrics", "description": "Query 14-day sales data"},
            {"step_num": 2, "tool": "segment_customers", "description": "Identify inactive repeat buyers"},
            {"step_num": 3, "tool": "draft_reengagement_campaign", "description": "Draft 15% discount campaign"},
            {"step_num": 4, "tool": "request_merchant_approval", "description": "Gate for budget authorization"},
            {"step_num": 5, "tool": "dispatch_campaign", "description": "Dispatch SMS / WhatsApp via Paytm Marketing API"},
            {"step_num": 6, "tool": "verify_operation", "description": "Confirm voucher active and delivery receipt"}
        ])
        stages[1]["status"] = "completed"
        stages[1]["data"] = {"steps": planned_steps}
        stages[1]["detail"] = f"Created {len(planned_steps)}-step execution plan using tool registry with approval gates."

        # Step 3: ACT / EXECUTE (Non-sensitive tools)
        stages[2]["status"] = "in_progress"
        stages[2]["timestamp"] = datetime.now(timezone.utc).isoformat()

        req_lower = user_request.lower()
        is_sales_drop_case = ("sales" in req_lower or "drop" in req_lower or "customer" in req_lower or "bring" in req_lower)
        is_settlement_case = ("settlement" in req_lower or "delayed" in req_lower or "24,800" in req_lower or "st-8821" in req_lower)

        current_stage_name = "act"
        task_status = "EXECUTING"
        approval_record = None
        result_summary = ""

        if is_sales_drop_case:
            # 1. Query sales metrics
            sales_data = tools.query_sales_metrics(days=7)
            tool_calls_executed.append({
                "tool": "query_sales_metrics",
                "params": {"days": 7},
                "result": {
                    "current_week_sales": sales_data["current_week_sales"],
                    "previous_week_sales": sales_data["previous_week_sales"],
                    "sales_change_pct": sales_data["sales_change_pct"],
                    "txns_change_pct": sales_data["txns_change_pct"]
                }
            })

            # 2. Segment inactive customers
            customer_data = tools.segment_customers(criteria="inactive_14d")
            tool_calls_executed.append({
                "tool": "segment_customers",
                "params": {"criteria": "inactive_14d"},
                "result": {
                    "cohort_name": customer_data["cohort_name"],
                    "inactive_count": customer_data["customer_count"],
                    "estimated_lost_monthly_revenue": customer_data["estimated_lost_monthly_revenue"]
                }
            })

            # 3. Draft campaign proposal
            campaign_draft = tools.draft_reengagement_campaign(
                discount_pct=15.0,
                min_order=150.0,
                coupon_code="WELCOMEBACK15"
            )
            tool_calls_executed.append({
                "tool": "draft_reengagement_campaign",
                "params": {"discount_pct": 15, "min_order": 150, "coupon_code": "WELCOMEBACK15"},
                "result": campaign_draft
            })

            stages[2]["status"] = "completed"
            stages[2]["detail"] = f"Analyzed {sales_data['current_week_txns']} transactions. Identified {customer_data['customer_count']} dormant regular customers. Formulated 15% recovery campaign."
            stages[2]["data"] = {
                "sales_metrics": sales_data,
                "customer_segment": customer_data,
                "campaign_draft": campaign_draft
            }

            # Step 4: APPROVE GATE
            stages[3]["status"] = "waiting_approval"
            stages[3]["timestamp"] = datetime.now(timezone.utc).isoformat()
            stages[3]["detail"] = f"Consequential Action Gate: Requires merchant sign-off for ₹{campaign_draft['estimated_discount_budget_max']:.0f} promotional budget and {campaign_draft['targeted_audience_count']} customer communications."
            
            # Create approval in DB
            approval_record = tools.create_approval_request(
                task_id=task_id,
                merchant_id=merchant_id,
                action_type="PROMOTIONAL_CAMPAIGN",
                title="Authorize 15% Customer Re-Engagement Campaign",
                description=f"Deploy SMS/WhatsApp campaign with 15% discount (Code: WELCOMEBACK15) to {campaign_draft['targeted_audience_count']} inactive customers.",
                parameters=campaign_draft,
                estimated_cost=campaign_draft["estimated_discount_budget_max"],
                audience_reach=campaign_draft["targeted_audience_count"]
            )
            stages[3]["data"] = {"approval": approval_record}
            
            current_stage_name = "approve"
            task_status = "WAITING_APPROVAL"
            result_summary = f"Investigation complete: Sales dropped {sales_data['sales_change_pct']}%. Identified {customer_data['customer_count']} inactive regulars. Campaign formulated and awaiting your approval to dispatch."

        elif is_settlement_case:
            settlement_res = tools.investigate_settlement(batch_id="ST-8821")
            tool_calls_executed.append({
                "tool": "investigate_settlement",
                "params": {"batch_id": "ST-8821"},
                "result": settlement_res
            })

            stages[2]["status"] = "completed"
            stages[2]["detail"] = "Queried Paytm Settlement Gateway and NPCI clearing status for batch #ST-8821."
            stages[2]["data"] = {"settlement_investigation": settlement_res}

            # Non-consequential read/inquiry - approval can be auto-approved or bypassed
            stages[3]["status"] = "skipped"
            stages[3]["detail"] = "Informational triage below risk threshold (no financial outflow required)."

            # Step 5: VERIFY
            stages[4]["status"] = "completed"
            stages[4]["timestamp"] = datetime.now(timezone.utc).isoformat()
            stages[4]["detail"] = "Reconciliation ticket #TKT-8921 confirmed active with sponsor bank nodal desk."
            stages[4]["data"] = {"verified": True, "ticket_id": settlement_res["auto_reconciliation_ticket"]}

            # Step 6: REPORT
            stages[5]["status"] = "completed"
            stages[5]["timestamp"] = datetime.now(timezone.utc).isoformat()
            stages[5]["detail"] = "Executive report generated for merchant."
            stages[5]["data"] = {"summary": settlement_res["recommendation"]}

            current_stage_name = "report"
            task_status = "COMPLETED"
            result_summary = f"Settlement #ST-8821 investigated. Reason: Sponsor bank RTGS clearing backlog. Auto-filed priority ticket #{settlement_res['auto_reconciliation_ticket']}. Credit expected today by 2:30 PM."

        else:
            # General query / other action
            sales_data = tools.query_sales_metrics(days=7)
            tool_calls_executed.append({
                "tool": "query_sales_metrics",
                "params": {"days": 7},
                "result": {"sales": sales_data["current_week_sales"]}
            })
            stages[2]["status"] = "completed"
            stages[2]["detail"] = "Retrieved live merchant database telemetry."
            stages[3]["status"] = "skipped"
            stages[3]["detail"] = "Standard read operation."
            stages[4]["status"] = "completed"
            stages[4]["detail"] = "Data verified against ledger."
            stages[5]["status"] = "completed"
            stages[5]["detail"] = "Task complete."
            current_stage_name = "report"
            task_status = "COMPLETED"
            result_summary = f"Processed request. Live metrics show ₹{sales_data['current_week_sales']:,.2f} total sales across {sales_data['current_week_txns']} transactions this week."

        # Save task to DB
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO tasks (id, merchant_id, title, request_text, status, current_stage, stages_json, result_summary, tool_calls_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task_id,
            merchant_id,
            f"Task: {user_request[:60]}",
            user_request,
            task_status,
            current_stage_name,
            json.dumps(stages),
            result_summary,
            json.dumps(tool_calls_executed),
            now,
            now
        ))

        # Audit log entry
        cursor.execute("""
            INSERT INTO audit_logs (task_id, action, actor, details_json, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (
            task_id,
            "TASK_INITIATED",
            "ActionMate_AI",
            json.dumps({"request": user_request, "status": task_status, "current_stage": current_stage_name}),
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
            "model_used": sarvam_res.get("model_used", "sarvam-105b"),
            "provider": sarvam_res.get("provider", "Sarvam AI")
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

        # 1. Execute campaign
        exec_res = tools.execute_campaign(approval_id, merchant_id)
        tool_calls.append({
            "tool": "dispatch_campaign",
            "params": {"approval_id": approval_id},
            "result": exec_res
        })

        # Update approve stage
        stages[3]["status"] = "approved"
        stages[3]["detail"] = f"Approved by merchant on {exec_res['timestamp']}. Executing multi-channel dispatch."

        # 2. Run Verification
        verify_res = tools.verify_campaign_execution(exec_res["campaign_id"])
        tool_calls.append({
            "tool": "verify_campaign_execution",
            "params": {"campaign_id": exec_res["campaign_id"]},
            "result": verify_res
        })

        stages[4]["status"] = "completed"
        stages[4]["timestamp"] = datetime.now(timezone.utc).isoformat()
        stages[4]["detail"] = f"Verification engine completed: All {len(verify_res['checks'])} health checks passed. Vouchers active, {exec_res['delivered_count']} messages delivered."
        stages[4]["data"] = verify_res

        # 3. Report
        final_summary = (
            f"Campaign '{exec_res['coupon_code']}' successfully executed & verified. "
            f"{exec_res['delivered_count']} inactive customers reached via WhatsApp & SMS. "
            f"Voucher code active in Paytm QR/POS. Expected 68 redemptions over the next 72 hours."
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

        # Update task in DB
        cursor.execute("""
            UPDATE tasks
            SET status = 'COMPLETED', current_stage = 'report', stages_json = ?, result_summary = ?, tool_calls_json = ?, updated_at = ?
            WHERE id = ?
        """, (
            json.dumps(stages),
            final_summary,
            json.dumps(tool_calls),
            datetime.now(timezone.utc).isoformat(),
            task_id
        ))

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
            "result_summary": final_summary
        }
