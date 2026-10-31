import sqlite3

conn = sqlite3.connect("paytm_actionmate.db")
c = conn.cursor()
c.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("sarvam_model", "sarvam-105b"))
c.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("sarvam_stt_model", "saaras:v2"))
c.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ("sarvam_tts_model", "bulbul:v2"))
conn.commit()
conn.close()
print("Model names updated to sarvam-105b / saaras:v2 / bulbul:v2")
