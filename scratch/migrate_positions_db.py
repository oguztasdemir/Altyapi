import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "database.db")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

pos_map = {
    "GK": "KL",
    "CB": "STP",
    "LB": "SLB",
    "RB": "SĞB",
    "DM": "DOS",
    "CM": "OS",
    "LM": "SLK",
    "RM": "SĞK",
    "AM": "OOS",
    "ST": "SNT"
}

players = conn.execute("SELECT id, name, primary_position, secondary_positions FROM players").fetchall()
print(f"Migrating {len(players)} players in database...")

for p in players:
    pid = p["id"]
    p_name = p["name"]
    old_prim = p["primary_position"] or ""
    old_sec = p["secondary_positions"] or ""
    
    # Translate primary
    new_prim = old_prim
    for en, tr in pos_map.items():
        if old_prim.strip().upper() == en:
            new_prim = tr
            break
            
    # Translate secondary list
    sec_list = [s.strip().upper() for s in old_sec.split(",") if s.strip()]
    new_sec_list = []
    for s in sec_list:
        trans = pos_map.get(s, s)
        new_sec_list.append(trans)
    new_sec = ", ".join(new_sec_list)
    
    if new_prim != old_prim or new_sec != old_sec:
        print(f"- Updating {p_name}: Primary '{old_prim}' -> '{new_prim}', Secondary '{old_sec}' -> '{new_sec}'")
        conn.execute("UPDATE players SET primary_position = ?, secondary_positions = ? WHERE id = ?", (new_prim, new_sec, pid))

conn.commit()
conn.close()
print("Database migration complete.")
