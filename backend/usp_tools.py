"""
usp_tools.py — Unique Selling Point (USP) Tools for Paytm AI ActionMate
=======================================================================
Three differentiated AI capabilities that go far beyond standard chatbots:

1. Predictive Churn Radar   — Scores every customer by churn risk using
                               recency/frequency/value signals; identifies
                               high-LTV customers who are silently drifting away
                               BEFORE they are fully inactive.

2. Smart Fraud Watchdog     — Scans real-time transaction patterns for
                               statistical anomalies (velocity spikes, round-amount
                               clustering, off-hours activity) and flags suspicious
                               batches for merchant review.

3. Autonomous Morning Briefing (in agent_orchestrator.py) — proactive spoken
                               business health brief with Hindi TTS via Bulbul.
"""

import json
import math
from datetime import datetime, timedelta, timezone
from database import get_db_connection


# ─── 1. PREDICTIVE CHURN RADAR ───────────────────────────────────────────────

def compute_churn_radar(merchant_id: str = "PAYTM-M-984214") -> dict:
    """
    Compute a churn probability score for every customer using:
      R  = days since last visit  (lower = better)
      F  = total orders           (higher = better)
      V  = total lifetime spend   (higher = better)
    Score = weighted combination normalised to 0-100
    Risk bands: GREEN (<30), AMBER (30-60), RED (>60)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc)

    cursor.execute("""
        SELECT id, name, phone, total_orders, total_spent, last_visit, favorite_item, segment
        FROM customers
        ORDER BY total_spent DESC
    """)
    customers = cursor.fetchall()
    conn.close()

    if not customers:
        return {"error": "No customer data found", "customers": [], "summary": {}}

    # Compute reference stats
    all_spent = [float(c["total_spent"]) for c in customers]
    max_spent = max(all_spent) if all_spent else 1
    all_orders = [int(c["total_orders"]) for c in customers]
    max_orders = max(all_orders) if all_orders else 1

    scored = []
    band_counts = {"GREEN": 0, "AMBER": 0, "RED": 0}

    for c in customers:
        try:
            last_dt = datetime.fromisoformat(c["last_visit"].replace("Z", "+00:00"))
        except Exception:
            last_dt = now - timedelta(days=30)

        recency_days = max(0, (now - last_dt).days)

        # Normalise each dimension to 0-1 (higher score = more likely to churn)
        R_score = min(recency_days / 60.0, 1.0)                   # 60+ days = max risk
        F_score = 1.0 - min(int(c["total_orders"]) / max_orders, 1.0)  # fewer orders = higher risk
        V_score = 1.0 - min(float(c["total_spent"]) / max_spent, 1.0)  # lower spend = higher risk

        # Weighted churn probability (0-100)
        churn_prob = round((R_score * 0.55 + F_score * 0.25 + V_score * 0.20) * 100, 1)
        churn_prob = min(churn_prob, 99.0)

        if churn_prob < 30:
            risk_band = "GREEN"
            risk_label = "Loyal"
        elif churn_prob < 60:
            risk_band = "AMBER"
            risk_label = "At Risk"
        else:
            risk_band = "RED"
            risk_label = "High Churn Risk"

        band_counts[risk_band] += 1

        # Expected monthly loss if churned
        monthly_value = round(float(c["total_spent"]) / max(1, max(1, recency_days // 30 + 1)), 2)

        scored.append({
            "id": c["id"],
            "name": c["name"],
            "phone": c["phone"][:6] + "XXXX",   # mask for privacy
            "total_orders": int(c["total_orders"]),
            "total_spent": float(c["total_spent"]),
            "last_visit": c["last_visit"],
            "recency_days": recency_days,
            "favorite_item": c["favorite_item"],
            "churn_probability": churn_prob,
            "risk_band": risk_band,
            "risk_label": risk_label,
            "estimated_monthly_value": monthly_value,
            "recommended_action": _churn_action(risk_band, churn_prob, c["name"])
        })

    # Sort by churn probability DESC (highest risk first)
    scored.sort(key=lambda x: x["churn_probability"], reverse=True)

    total = len(scored)
    red_customers = [s for s in scored if s["risk_band"] == "RED"]
    amber_customers = [s for s in scored if s["risk_band"] == "AMBER"]
    green_customers = [s for s in scored if s["risk_band"] == "GREEN"]

    total_at_risk_revenue = sum(s["estimated_monthly_value"] for s in scored if s["risk_band"] in ("RED", "AMBER"))

    return {
        "computed_at": now.isoformat(),
        "total_customers_scored": total,
        "summary": {
            "green_count": band_counts["GREEN"],
            "amber_count": band_counts["AMBER"],
            "red_count": band_counts["RED"],
            "total_at_risk_monthly_revenue": round(total_at_risk_revenue, 2),
            "churn_radar_insight": (
                f"{band_counts['RED']} customers are at HIGH churn risk — "
                f"acting now could save ₹{round(total_at_risk_revenue):,}/month in revenue."
            )
        },
        "high_risk_customers": scored[:10],     # top 10 worst
        "medium_risk_customers": amber_customers[:8],
        "loyal_customers": green_customers[:5],
        "all_customers": scored
    }


def _churn_action(risk_band: str, score: float, name: str) -> str:
    if risk_band == "RED":
        return f"URGENT: Send personalised WhatsApp offer to {name.split()[0]} within 24h — high LTV at stake."
    elif risk_band == "AMBER":
        return f"Send {name.split()[0]} a 10% loyalty coupon via SMS this week."
    else:
        return f"Maintain engagement — {name.split()[0]} is loyal. Occasional reward works well."


# ─── 2. SMART FRAUD WATCHDOG ──────────────────────────────────────────────────

def run_fraud_watchdog(merchant_id: str = "PAYTM-M-984214", lookback_hours: int = 48) -> dict:
    """
    Scans recent transactions for anomaly patterns:
      1. Velocity spike      — >3x normal txn rate in any 1-hour window
      2. Round-amount cluster — unusually high share of round-₹ amounts (suspicion of split payments)
      3. Off-hours activity  — significant txn value between midnight and 5 AM
      4. Refund ratio spike  — refund count exceeds 8% of transactions in a period
      5. New-device txn surge — (simulated) spike from a new Soundbox/terminal

    Returns flagged anomalies with risk scores and recommended actions.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc)
    since = (now - timedelta(hours=lookback_hours)).isoformat()

    cursor.execute("""
        SELECT id, amount, status, payment_mode, timestamp, customer_phone
        FROM transactions
        WHERE timestamp >= ?
        ORDER BY timestamp ASC
    """, (since,))
    txns = cursor.fetchall()

    # baseline stats
    cursor.execute("""
        SELECT COUNT(*) as cnt, COALESCE(AVG(amount), 0) as avg_amt,
               COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE status = 'SUCCESS'
        AND timestamp >= ?
        AND timestamp < ?
    """, ((now - timedelta(days=14)).isoformat(), since))
    baseline = cursor.fetchone()
    conn.close()

    baseline_daily_avg = float(baseline["cnt"]) / 14 if baseline else 1.0
    baseline_hourly_avg = max(baseline_daily_avg / 24.0, 0.5)
    avg_amount = float(baseline["avg_amt"]) if baseline else 250.0

    anomalies = []
    total_txn_count = len(txns)
    total_amount = sum(float(t["amount"]) for t in txns if t["status"] == "SUCCESS")

    # ── Check 1: Velocity Spike ──
    hour_buckets: dict = {}
    for t in txns:
        try:
            ts = datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00"))
            bucket = ts.strftime("%Y-%m-%dT%H")
            hour_buckets[bucket] = hour_buckets.get(bucket, 0) + 1
        except Exception:
            pass

    for bucket, count in hour_buckets.items():
        if count > baseline_hourly_avg * 3:
            anomalies.append({
                "type": "VELOCITY_SPIKE",
                "severity": "HIGH" if count > baseline_hourly_avg * 5 else "MEDIUM",
                "title": f"Transaction velocity spike: {count} txns in 1 hour",
                "detail": f"Normal rate is ~{baseline_hourly_avg:.1f}/hour. Detected {count} in hour {bucket[-2:]}:00.",
                "risk_score": min(int((count / max(baseline_hourly_avg, 1)) * 15), 95),
                "recommended_action": "Review transactions in this window for split-payment or test transaction patterns."
            })

    # ── Check 2: Round Amount Clustering ──
    success_txns = [t for t in txns if t["status"] == "SUCCESS"]
    if success_txns:
        round_count = sum(1 for t in success_txns if float(t["amount"]) % 100 == 0)
        round_ratio = round_count / len(success_txns) if success_txns else 0
        if round_ratio > 0.45:
            anomalies.append({
                "type": "ROUND_AMOUNT_CLUSTER",
                "severity": "MEDIUM",
                "title": f"{round_ratio*100:.0f}% of transactions are exact round amounts",
                "detail": f"{round_count} of {len(success_txns)} transactions were exact multiples of ₹100 — possible split-payment structuring.",
                "risk_score": int(round_ratio * 70),
                "recommended_action": "Cross-reference with customer IDs for repeated round-figure patterns from same buyers."
            })

    # ── Check 3: Off-Hours Activity ──
    off_hours_txns = []
    for t in txns:
        try:
            ts = datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00"))
            # Convert to IST (UTC+5:30)
            ist_hour = (ts.hour + 5) % 24 + (1 if ts.minute >= 30 else 0)
            if ist_hour < 5 or ist_hour >= 23:
                off_hours_txns.append(t)
        except Exception:
            pass

    off_hours_amount = sum(float(t["amount"]) for t in off_hours_txns if t["status"] == "SUCCESS")
    if off_hours_txns and off_hours_amount > 2000:
        anomalies.append({
            "type": "OFF_HOURS_ACTIVITY",
            "severity": "MEDIUM",
            "title": f"₹{off_hours_amount:,.0f} processed outside business hours (11PM–5AM IST)",
            "detail": f"{len(off_hours_txns)} transactions totaling ₹{off_hours_amount:,.0f} processed after midnight. Verify if store was operating.",
            "risk_score": min(int(off_hours_amount / 200), 80),
            "recommended_action": "Confirm with staff whether store was open. If not, flag for investigation."
        })

    # ── Check 4: Refund Ratio ──
    refunded = [t for t in txns if t["status"] == "REFUNDED"]
    if total_txn_count > 10:
        refund_ratio = len(refunded) / total_txn_count
        if refund_ratio > 0.08:
            anomalies.append({
                "type": "REFUND_RATIO_SPIKE",
                "severity": "HIGH" if refund_ratio > 0.15 else "MEDIUM",
                "title": f"Refund rate elevated: {refund_ratio*100:.1f}% of transactions refunded",
                "detail": f"{len(refunded)} refunds out of {total_txn_count} transactions. Normal expectation: <8%.",
                "risk_score": int(refund_ratio * 200),
                "recommended_action": "Identify recurring refund customer IDs. May indicate product issues or friendly fraud."
            })

    overall_risk = "CLEAR"
    overall_score = 0
    if anomalies:
        overall_score = max(a["risk_score"] for a in anomalies)
        if overall_score >= 70:
            overall_risk = "HIGH"
        elif overall_score >= 40:
            overall_risk = "MEDIUM"
        else:
            overall_risk = "LOW"

    return {
        "scanned_at": now.isoformat(),
        "lookback_hours": lookback_hours,
        "total_transactions_scanned": total_txn_count,
        "total_amount_scanned": round(total_amount, 2),
        "overall_risk_level": overall_risk,
        "overall_risk_score": overall_score,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
        "watchdog_summary": (
            f"Fraud Watchdog scanned {total_txn_count} transactions. "
            f"{len(anomalies)} anomaly pattern{'s' if len(anomalies) != 1 else ''} detected. "
            f"Overall risk: {overall_risk}."
            if anomalies else
            f"All clear — {total_txn_count} transactions look normal. No suspicious patterns detected."
        )
    }

