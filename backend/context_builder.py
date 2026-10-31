"""
context_builder.py
Builds a rich, live merchant snapshot from the database.
This is injected into every Sarvam 105B prompt so the LLM
reasons about *real data*, not hallucinated numbers.
"""
import json
from datetime import datetime, timedelta, timezone
from database import get_db_connection


def build_merchant_context(merchant_id: str = "PAYTM-M-984214") -> dict:
    """Returns a dict of live merchant data pulled fresh from SQLite."""
    conn = get_db_connection()
    c = conn.cursor()
    now = datetime.now(timezone.utc)

    # --- Merchant profile ---
    c.execute("SELECT * FROM merchants WHERE id = ?", (merchant_id,))
    row = c.fetchone()
    merchant = dict(row) if row else {}

    # --- Sales: last 7 days vs previous 7 days ---
    seven_ago = (now - timedelta(days=7)).isoformat()
    fourteen_ago = (now - timedelta(days=14)).isoformat()

    c.execute("""
        SELECT COUNT(*) txns, COALESCE(SUM(amount),0) sales,
               COUNT(DISTINCT customer_phone) unique_cust
        FROM transactions WHERE timestamp >= ? AND status='SUCCESS'
    """, (seven_ago,))
    cur = c.fetchone()

    c.execute("""
        SELECT COUNT(*) txns, COALESCE(SUM(amount),0) sales
        FROM transactions WHERE timestamp >= ? AND timestamp < ? AND status='SUCCESS'
    """, (fourteen_ago, seven_ago))
    prev = c.fetchone()

    curr_sales = round(float(cur["sales"]), 2)
    prev_sales = round(float(prev["sales"]), 2)
    sales_pct = round(((curr_sales - prev_sales) / prev_sales * 100), 1) if prev_sales else 0.0
    curr_txns = int(cur["txns"])
    prev_txns = int(prev["txns"])
    txn_pct = round(((curr_txns - prev_txns) / prev_txns * 100), 1) if prev_txns else 0.0

    # --- Payment modes breakdown ---
    c.execute("""
        SELECT payment_mode, COUNT(*) cnt, COALESCE(SUM(amount),0) total
        FROM transactions WHERE timestamp >= ? AND status='SUCCESS'
        GROUP BY payment_mode ORDER BY total DESC
    """, (seven_ago,))
    payment_modes = [{"mode": r["payment_mode"], "count": r["cnt"], "total": round(r["total"], 2)}
                     for r in c.fetchall()]

    # --- Failed transactions ---
    c.execute("""
        SELECT COUNT(*) cnt, COALESCE(SUM(amount),0) amt
        FROM transactions WHERE timestamp >= ? AND status='FAILED'
    """, (seven_ago,))
    failed = c.fetchone()

    # --- Customers ---
    c.execute("SELECT COUNT(*) total FROM customers")
    total_cust = c.fetchone()["total"]

    cutoff_14 = (now - timedelta(days=14)).isoformat()
    c.execute("SELECT COUNT(*) cnt FROM customers WHERE last_visit <= ?", (cutoff_14,))
    inactive_14 = c.fetchone()["cnt"]

    cutoff_30 = (now - timedelta(days=30)).isoformat()
    c.execute("SELECT COUNT(*) cnt FROM customers WHERE last_visit <= ?", (cutoff_30,))
    inactive_30 = c.fetchone()["cnt"]

    c.execute("SELECT COUNT(*) cnt FROM customers WHERE total_orders > 1")
    repeat_cust = c.fetchone()["cnt"]

    # Top customers by spend
    c.execute("""
        SELECT name, phone, total_orders, total_spent, last_visit, favorite_item
        FROM customers ORDER BY total_spent DESC LIMIT 5
    """)
    top_customers = [dict(r) for r in c.fetchall()]

    # Recently churned high-value customers
    c.execute("""
        SELECT name, phone, total_orders, total_spent, last_visit, favorite_item
        FROM customers WHERE last_visit <= ? AND total_orders > 3
        ORDER BY total_spent DESC LIMIT 5
    """, (cutoff_14,))
    churned_vip = [dict(r) for r in c.fetchall()]

    # --- Settlements ---
    c.execute("SELECT * FROM settlements ORDER BY batch_date DESC LIMIT 10")
    settlements = []
    pending_amt = 0.0
    delayed_batches = []
    for r in c.fetchall():
        d = dict(r)
        settlements.append(d)
        if d["status"] != "SETTLED":
            pending_amt += float(d["amount"])
            delayed_batches.append(d)

    # --- Soundbox ---
    c.execute("SELECT * FROM soundbox_devices WHERE merchant_id = ? LIMIT 1", (merchant_id,))
    sb = c.fetchone()
    soundbox = dict(sb) if sb else {}

    # --- Active campaigns ---
    c.execute("SELECT * FROM campaigns WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 5", (merchant_id,))
    campaigns = [dict(r) for r in c.fetchall()]

    # --- Recent tasks ---
    c.execute("SELECT id, title, status, current_stage, result_summary, created_at FROM tasks ORDER BY created_at DESC LIMIT 5")
    recent_tasks = [dict(r) for r in c.fetchall()]

    # --- Pending approvals ---
    c.execute("SELECT * FROM approvals WHERE status='PENDING' ORDER BY requested_at DESC LIMIT 3")
    pending_approvals = [dict(r) for r in c.fetchall()]

    # --- Peak hours ---
    c.execute("""
        SELECT strftime('%H', timestamp) hr, COUNT(*) cnt, COALESCE(SUM(amount),0) total
        FROM transactions WHERE timestamp >= ? AND status='SUCCESS'
        GROUP BY hr ORDER BY total DESC LIMIT 5
    """, (seven_ago,))
    peak_hours = [{"hour": r["hr"], "txns": r["cnt"], "sales": round(r["total"], 2)} for r in c.fetchall()]

    conn.close()

    return {
        "merchant": {
            "id": merchant.get("id", merchant_id),
            "name": merchant.get("name", "Sharma Sweets & Cafe"),
            "city": merchant.get("city", "New Delhi"),
            "vpa": merchant.get("vpa", "sharmasweets@paytm"),
            "plan": merchant.get("plan", "Paytm Pro"),
            "category": merchant.get("category", "Food & Beverages"),
        },
        "sales_this_week": {
            "total_revenue": curr_sales,
            "transactions": curr_txns,
            "unique_customers": int(cur["unique_cust"]),
            "vs_last_week_revenue_pct": sales_pct,
            "vs_last_week_txns_pct": txn_pct,
            "trend": "declining" if sales_pct < -5 else ("growing" if sales_pct > 5 else "stable"),
        },
        "sales_last_week": {
            "total_revenue": prev_sales,
            "transactions": prev_txns,
        },
        "failed_transactions_7d": {
            "count": int(failed["cnt"]),
            "amount": round(float(failed["amt"]), 2),
        },
        "payment_modes_7d": payment_modes,
        "peak_hours_7d": peak_hours,
        "customers": {
            "total": total_cust,
            "repeat": repeat_cust,
            "inactive_14d": inactive_14,
            "inactive_30d": inactive_30,
            "top_5_by_spend": top_customers,
            "churned_vip_14d": churned_vip,
        },
        "settlements": {
            "pending_amount": round(pending_amt, 2),
            "pending_batches": len(delayed_batches),
            "delayed_details": delayed_batches,
            "recent": settlements[:5],
        },
        "soundbox": {
            "device_id": soundbox.get("device_id", "SB-DEL-9921"),
            "status": soundbox.get("status", "ONLINE"),
            "battery": soundbox.get("battery_pct", 86),
            "carrier": soundbox.get("carrier", "Airtel 4G"),
            "location": soundbox.get("location", "Counter"),
        },
        "active_campaigns": campaigns,
        "recent_tasks": recent_tasks,
        "pending_approvals": pending_approvals,
        "snapshot_timestamp": now.isoformat(),
    }


def format_context_for_llm(ctx: dict) -> str:
    """
    Converts the live merchant context dict into a concise, structured
    natural-language block that gets injected into the LLM system prompt.
    This grounds the model to real data, eliminating hallucinations.
    """
    m = ctx["merchant"]
    s = ctx["sales_this_week"]
    sl = ctx["sales_last_week"]
    cust = ctx["customers"]
    sett = ctx["settlements"]
    sb = ctx["soundbox"]

    trend_emoji = "DOWN" if s["trend"] == "declining" else ("UP" if s["trend"] == "growing" else "FLAT")

    lines = [
        f"=== LIVE MERCHANT SNAPSHOT ({ctx['snapshot_timestamp'][:16]} UTC) ===",
        f"Merchant: {m['name']} | {m['city']} | {m['category']} | Plan: {m['plan']}",
        f"UPI VPA: {m['vpa']}",
        "",
        f"SALES LAST 7 DAYS [{trend_emoji}]:",
        f"  Revenue: Rs.{s['total_revenue']:,.2f}  ({'+' if s['vs_last_week_revenue_pct'] >= 0 else ''}{s['vs_last_week_revenue_pct']}% vs prev week Rs.{sl['total_revenue']:,.2f})",
        f"  Transactions: {s['transactions']}  ({'+' if s['vs_last_week_txns_pct'] >= 0 else ''}{s['vs_last_week_txns_pct']}% vs prev week {sl['transactions']})",
        f"  Unique Customers: {s['unique_customers']}",
        f"  Failed Txns: {ctx['failed_transactions_7d']['count']} totaling Rs.{ctx['failed_transactions_7d']['amount']:,.2f}",
    ]

    if ctx["payment_modes_7d"]:
        pm_str = " | ".join(f"{p['mode']}: Rs.{p['total']:,.0f} ({p['count']} txns)" for p in ctx["payment_modes_7d"][:4])
        lines.append(f"  Payment Modes: {pm_str}")

    if ctx["peak_hours_7d"]:
        ph_str = " | ".join(f"{p['hour']}:00hrs Rs.{p['sales']:,.0f}" for p in ctx["peak_hours_7d"][:3])
        lines.append(f"  Peak Hours: {ph_str}")

    lines += [
        "",
        f"CUSTOMERS:",
        f"  Total: {cust['total']} | Repeat: {cust['repeat']} | Inactive 14d: {cust['inactive_14d']} | Inactive 30d: {cust['inactive_30d']}",
    ]

    if cust["churned_vip_14d"]:
        vip_names = "; ".join(f"{c['name']} (Rs.{c['total_spent']:,.0f} LTV, {c['total_orders']} orders)" for c in cust["churned_vip_14d"][:3])
        lines.append(f"  Churned VIP Customers (14d): {vip_names}")

    lines += [
        "",
        f"SETTLEMENTS:",
        f"  Pending: Rs.{sett['pending_amount']:,.2f} across {sett['pending_batches']} batch(es)",
    ]

    if sett["delayed_details"]:
        for d in sett["delayed_details"][:2]:
            lines.append(f"  DELAYED Batch {d.get('id','?')}: Rs.{d.get('amount',0):,.2f} Status={d.get('status','?')} Bank={d.get('bank_name','?')}")

    lines += [
        "",
        f"SOUNDBOX:",
        f"  Device: {sb['device_id']} | Status: {sb['status']} | Battery: {sb['battery']}% | Carrier: {sb['carrier']}",
    ]

    if ctx["active_campaigns"]:
        camp = ctx["active_campaigns"][0]
        lines.append(f"\nACTIVE CAMPAIGN: {camp.get('name','?')} | Code: {camp.get('coupon_code','?')} | Sent: {camp.get('sent_count',0)} | Delivered: {camp.get('delivered_count',0)}")

    if ctx["pending_approvals"]:
        lines.append(f"\nPENDING APPROVALS ({len(ctx['pending_approvals'])}):")
        for a in ctx["pending_approvals"]:
            lines.append(f"  - {a.get('title','?')} (ID: {a.get('id','?')}) Risk: {a.get('risk_level','?')}, Est. Cost: Rs.{a.get('estimated_cost',0):,.0f}")

    lines.append("\n=== END SNAPSHOT ===")
    return "\n".join(lines)
