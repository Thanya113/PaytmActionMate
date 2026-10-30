import sqlite3
import json
import os
from datetime import datetime, timedelta, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "paytm_actionmate.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Merchants table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        vpa TEXT NOT NULL,
        city TEXT NOT NULL,
        address TEXT NOT NULL,
        gstin TEXT NOT NULL,
        plan TEXT NOT NULL,
        soundbox_id TEXT,
        auto_approve_limit REAL DEFAULT 500.0,
        created_at TEXT NOT NULL
    );
    """)

    # Transactions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        amount REAL NOT NULL,
        payment_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        utr TEXT,
        soundbox_broadcast INTEGER DEFAULT 1,
        category TEXT,
        timestamp TEXT NOT NULL
    );
    """)

    # Customers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        total_orders INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0.0,
        last_visit TEXT NOT NULL,
        segment TEXT NOT NULL,
        favorite_item TEXT
    );
    """)

    # Settlements table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        batch_date TEXT NOT NULL,
        amount REAL NOT NULL,
        txn_count INTEGER NOT NULL,
        status TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        bank_utr TEXT,
        expected_time TEXT NOT NULL,
        actual_time TEXT,
        notes TEXT
    );
    """)

    # Soundbox devices table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS soundbox_devices (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        model TEXT NOT NULL,
        sim_carrier TEXT NOT NULL,
        battery_percent INTEGER NOT NULL,
        status TEXT NOT NULL,
        language TEXT NOT NULL,
        last_ping TEXT NOT NULL
    );
    """)

    # Tasks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        request_text TEXT NOT NULL,
        status TEXT NOT NULL,
        current_stage TEXT NOT NULL,
        stages_json TEXT NOT NULL,
        result_summary TEXT,
        tool_calls_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Approvals table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        merchant_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        parameters_json TEXT NOT NULL,
        status TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        estimated_cost REAL DEFAULT 0.0,
        audience_reach INTEGER DEFAULT 0,
        requested_at TEXT NOT NULL,
        decided_at TEXT,
        decided_by TEXT
    );
    """)

    # Campaigns table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        merchant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        coupon_code TEXT NOT NULL,
        discount_pct REAL NOT NULL,
        min_order REAL NOT NULL,
        target_segment TEXT NOT NULL,
        channel TEXT NOT NULL,
        message_template TEXT NOT NULL,
        status TEXT NOT NULL,
        targeted_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        delivered_count INTEGER DEFAULT 0,
        redeemed_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    # Audit logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        details_json TEXT NOT NULL,
        timestamp TEXT NOT NULL
    );
    """)

    # System settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    conn.commit()

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM merchants")
    if cursor.fetchone()[0] == 0:
        seed_database(conn)

    conn.close()

def seed_database(conn):
    cursor = conn.cursor()
    now = datetime.now(timezone.utc)

    # 1. Merchant profile
    merchant_id = "PAYTM-M-984214"
    cursor.execute("""
    INSERT INTO merchants (id, name, owner_name, phone, vpa, city, address, gstin, plan, soundbox_id, auto_approve_limit, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        merchant_id,
        "Sharma Sweets & Cafe",
        "Rajesh Sharma",
        "+91 98101 23456",
        "sharmasweets@paytm",
        "New Delhi",
        "Shop 14, Block B, Inner Circle, Connaught Place, New Delhi - 110001",
        "07AAAAA0000A1Z5",
        "Paytm Business Enterprise Pro",
        "SB-DEL-9921",
        500.0,
        (now - timedelta(days=120)).isoformat()
    ))

    # 2. Soundbox device
    cursor.execute("""
    INSERT INTO soundbox_devices (id, merchant_id, model, sim_carrier, battery_percent, status, language, last_ping)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "SB-DEL-9921",
        merchant_id,
        "Paytm Soundbox 3.0 LCD (4G)",
        "Airtel IoT 4G",
        86,
        "ONLINE",
        "Hindi + English",
        now.isoformat()
    ))

    # 3. Seed Customers (regular, dormant, inactive)
    customers_data = [
        ("CUST-101", "Ankit Verma", "+91 98112 34567", 24, 6800.0, 15, "INACTIVE_14D", "Kaju Katli & Samosa"),
        ("CUST-102", "Pooja Malhotra", "+91 98223 45678", 18, 5400.0, 16, "INACTIVE_14D", "Rasmalai & Masala Chai"),
        ("CUST-103", "Vikram Singhania", "+91 98334 56789", 32, 12500.0, 18, "DORMANT_VIP", "Motichoor Ladoo Box"),
        ("CUST-104", "Meenakshi Sundaram", "+91 98445 67890", 22, 7200.0, 14, "INACTIVE_14D", "Dhokla & Filter Coffee"),
        ("CUST-105", "Rohan Mehta", "+91 98556 78901", 15, 3900.0, 17, "INACTIVE_14D", "Gulab Jamun"),
        ("CUST-106", "Sanya Gupta", "+91 98667 89012", 29, 9800.0, 21, "DORMANT_VIP", "Assorted Dry Fruit Hampers"),
        ("CUST-107", "Karan Chawla", "+91 98778 90123", 8, 2200.0, 2, "ACTIVE_REGULAR", "Chole Bhature Combo"),
        ("CUST-108", "Neha Kapoor", "+91 98889 01234", 12, 3400.0, 1, "ACTIVE_REGULAR", "Raj Kachori"),
        ("CUST-109", "Amitabh Sen", "+91 98990 12345", 35, 14200.0, 22, "DORMANT_VIP", "Sandesh & Mishti Doi"),
        ("CUST-110", "Divya Nair", "+91 98109 87654", 6, 1850.0, 3, "ACTIVE_REGULAR", "Paneer Jalebi"),
        ("CUST-111", "Arun Joshi", "+91 98218 76543", 19, 5800.0, 16, "INACTIVE_14D", "Pista Burfi"),
        ("CUST-112", "Simran Kaur", "+91 98327 65432", 14, 4200.0, 15, "INACTIVE_14D", "Special Thali"),
    ]

    for cid, name, phone, orders, spent, days_ago, segment, fav in customers_data:
        last_visit_time = (now - timedelta(days=days_ago, hours=3)).isoformat()
        cursor.execute("""
        INSERT INTO customers (id, name, phone, total_orders, total_spent, last_visit, segment, favorite_item)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (cid, name, phone, orders, spent, last_visit_time, segment, fav))

    # Add 40 additional realistic customers to demonstrate cohort size of 180+ inactive customers
    for i in range(113, 220):
        days_ago = 14 + (i % 12) if i % 2 == 0 else (i % 7)
        seg = "INACTIVE_14D" if days_ago >= 14 else "ACTIVE_REGULAR"
        cursor.execute("""
        INSERT INTO customers (id, name, phone, total_orders, total_spent, last_visit, segment, favorite_item)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"CUST-{i}",
            f"Customer {i}",
            f"+91 9871{i:05d}",
            8 + (i % 20),
            (8 + (i % 20)) * 260.0,
            (now - timedelta(days=days_ago, hours=(i % 10))).isoformat(),
            seg,
            "Sweets & Snacks"
        ))

    # 4. Transactions (Previous week had high sales ~₹1,72,800; Current week dropped ~₹1,48,250: drop of -14.2%)
    modes = ["Paytm QR", "Soundbox UPI", "Paytm Wallet", "Debit Card"]
    categories = ["Sweets", "Snacks", "Beverages", "Gift Box"]
    amounts = [120.0, 240.0, 350.0, 480.0, 180.0, 650.0, 920.0, 150.0, 280.0, 520.0, 1100.0]

    txn_counter = 1000
    # Last 14 days
    for day in range(14, -1, -1):
        # Days 14-8 is previous week; Days 7-0 is current week
        is_previous_week = (day > 7)
        # Previous week had around 95 txns/day, current week has dropped to around 72 txns/day
        count_for_day = 92 + (day % 7) * 3 if is_previous_week else 68 + (day % 5) * 2

        for t in range(count_for_day):
            txn_counter += 1
            hour = 8 + (t % 14)  # 8am to 10pm
            minute = (t * 7) % 60
            txn_time = (now - timedelta(days=day, hours=(24 - hour), minutes=minute))
            amt = amounts[(t + day) % len(amounts)]
            mode = modes[t % len(modes)]
            cat = categories[(t * 3) % len(categories)]
            status = "SUCCESS" if (t % 45 != 0) else "FAILED"
            utr = f"4291{day:02d}{txn_counter:06d}"

            cursor.execute("""
            INSERT INTO transactions (id, merchant_id, customer_name, customer_phone, amount, payment_mode, status, utr, soundbox_broadcast, category, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"TXN-{txn_counter}",
                merchant_id,
                f"Customer {100 + (t % 25)}",
                f"+91 98112 {(10000 + t) % 90000}",
                amt,
                mode,
                status,
                utr,
                1 if status == "SUCCESS" else 0,
                cat,
                txn_time.isoformat()
            ))

    # 5. Settlements (Include the delayed settlement batch #ST-8821)
    settlements_data = [
        ("ST-8824", (now - timedelta(days=0)).strftime("%Y-%m-%d"), 21450.0, 84, "SETTLED", "HDFC Bank (A/C **9012)", "HDFC4291081912", (now - timedelta(hours=6)).isoformat(), (now - timedelta(hours=5, minutes=15)).isoformat(), "Auto-settled via Paytm Instant Payouts"),
        ("ST-8823", (now - timedelta(days=1)).strftime("%Y-%m-%d"), 22100.0, 88, "SETTLED", "HDFC Bank (A/C **9012)", "HDFC4290971822", (now - timedelta(days=1, hours=6)).isoformat(), (now - timedelta(days=1, hours=5)).isoformat(), "Auto-settled successfully"),
        ("ST-8822", (now - timedelta(days=2)).strftime("%Y-%m-%d"), 19800.0, 79, "SETTLED", "HDFC Bank (A/C **9012)", "HDFC4290861733", (now - timedelta(days=2, hours=6)).isoformat(), (now - timedelta(days=2, hours=5, minutes=30)).isoformat(), "Auto-settled successfully"),
        ("ST-8821", (now - timedelta(days=3)).strftime("%Y-%m-%d"), 24800.0, 96, "DELAYED_INVESTIGATING", "HDFC Bank (A/C **9012)", None, (now - timedelta(days=3, hours=6)).isoformat(), None, "Bank clearing delay: NPCI settlement acknowledgement pending. ActionMate automated UTR tracker assigned."),
        ("ST-8820", (now - timedelta(days=4)).strftime("%Y-%m-%d"), 25400.0, 102, "SETTLED", "HDFC Bank (A/C **9012)", "HDFC4290641555", (now - timedelta(days=4, hours=6)).isoformat(), (now - timedelta(days=4, hours=5)).isoformat(), "Auto-settled successfully"),
        ("ST-8819", (now - timedelta(days=5)).strftime("%Y-%m-%d"), 23900.0, 94, "SETTLED", "HDFC Bank (A/C **9012)", "HDFC4290531466", (now - timedelta(days=5, hours=6)).isoformat(), (now - timedelta(days=5, hours=5)).isoformat(), "Auto-settled successfully"),
    ]

    for sid, bdate, amt, cnt, stat, bname, butr, exp, act, nts in settlements_data:
        cursor.execute("""
        INSERT INTO settlements (id, merchant_id, batch_date, amount, txn_count, status, bank_name, bank_utr, expected_time, actual_time, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sid, merchant_id, bdate, amt, cnt, stat, bname, butr, exp, act, nts))

    # 6. Existing Tasks showing prior autonomous actions
    stages_1041 = [
        {"stage": "understand", "label": "Understand Request", "status": "completed", "detail": "Merchant queried delayed settlement #ST-8821 of ₹24,800"},
        {"stage": "plan", "label": "Multi-Step Execution Plan", "status": "completed", "detail": "1. Query bank clearing gateway 2. Check NPCI UTR status 3. Notify merchant"},
        {"stage": "act", "label": "Execute Tool Calling", "status": "completed", "detail": "Called check_settlement_gateway(batch='ST-8821'). Identified pending NPCI ACK."},
        {"stage": "approve", "label": "Human Approval Gate", "status": "skipped", "detail": "Read-only inquiry below risk threshold. No financial outflow."},
        {"stage": "verify", "label": "Outcome Verification", "status": "completed", "detail": "Bank nodal officer ticket #TKT-8921 opened automatically."},
        {"stage": "report", "label": "Executive Outcome Summary", "status": "completed", "detail": "Report generated. Expected bank credit within 4 banking hours."}
    ]
    tool_calls_1041 = [
        {"tool": "query_settlement_status", "params": {"batch_id": "ST-8821"}, "result": "DELAYED at Partner Bank Gateway"},
        {"tool": "open_bank_reconciliation_ticket", "params": {"batch_id": "ST-8821", "amount": 24800}, "result": "Ticket #TKT-8921 opened"}
    ]

    cursor.execute("""
    INSERT INTO tasks (id, merchant_id, title, request_text, status, current_stage, stages_json, result_summary, tool_calls_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "TASK-1041",
        merchant_id,
        "Investigate delayed batch settlement ST-8821",
        "Why is my yesterday's settlement delayed by ₹24,800?",
        "COMPLETED",
        "report",
        json.dumps(stages_1041),
        "Identified bank gateway clearing delay. Auto-filed nodal ticket #TKT-8921. Payout scheduled for release today.",
        json.dumps(tool_calls_1041),
        (now - timedelta(hours=4)).isoformat(),
        (now - timedelta(hours=3, minutes=45)).isoformat()
    ))

    # 7. Seed Settings
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("sarvam_api_key", ""))
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("sarvam_model", "sarvam-105b"))
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("sarvam_stt_model", "saaras:v4"))
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("sarvam_tts_model", "bulbul:v4-flash"))
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("tts_speaker", "meera"))
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("soundbox_voice_lang", "hi-IN"))
    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("auto_approve_threshold", "500.0"))

    # 8. Seed Audit logs
    cursor.execute("""
    INSERT INTO audit_logs (task_id, action, actor, details_json, timestamp)
    VALUES (?, ?, ?, ?, ?)
    """, (
        "TASK-1041",
        "SETTLEMENT_RECONCILIATION_QUERY",
        "ActionMate_AI",
        json.dumps({"batch_id": "ST-8821", "amount": 24800, "status": "DELAYED_INVESTIGATING"}),
        (now - timedelta(hours=4)).isoformat()
    ))

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized and seeded successfully!")
