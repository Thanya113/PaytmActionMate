import sqlite3

db_path = "paytm_actionmate.db"
key = "sk_ujampafn_xKQ1g5KptnuBvMGInoMXLhkd"

conn = sqlite3.connect(db_path)
c = conn.cursor()

settings = [
    ("sarvam_api_key", key),
    ("sarvam_model", "sarvam-m"),
    ("sarvam_stt_model", "saaras:v2"),
    ("sarvam_tts_model", "bulbul:v2"),
    ("tts_speaker", "meera"),
]

for k, v in settings:
    c.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", (k, v))

conn.commit()
print("API key and model settings saved to database.")

# Verify
c.execute("SELECT key, value FROM system_settings WHERE key LIKE '%sarvam%' OR key LIKE '%tts%'")
for row in c.fetchall():
    k, v = row
    masked = v[:12] + "..." + v[-4:] if len(v) > 16 else v
    print(f"  {k} = {masked}")

conn.close()
