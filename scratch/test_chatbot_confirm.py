import sys
import os
import json

sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import db, chatbot

def test():
    print("Testing chatbot confirmation API logic...")
    db.init_db()
    
    # 1. Test training confirmation
    reply1 = chatbot.generate_reply("yarın saat 16:00'ya antrenman ekle", "team-1")
    print("\nTraining Initial Reply:")
    print(reply1[:200]) # print prefix
    
    reply2 = chatbot.generate_reply("onayla", "team-1", confirm_action="add_one_time_event", day="2026-06-20")
    print("Training Confirmation Reply:")
    print(reply2)
    
    # 2. Test attribute modification confirmation
    # Let's find an active player first
    conn = db.get_connection()
    player = conn.execute("SELECT id, name, attributes, injury_status FROM players LIMIT 1").fetchone()
    conn.close()
    
    if player:
        player_name = player["name"]
        print(f"\nTesting with player: {player_name}")
        
        # Ask to change shooting (şut) to 88
        query = f"{player_name} şutunu 88 yap"
        reply_attr1 = chatbot.generate_reply(query, "team-1")
        print("Attribute Update Initial Reply:")
        print(reply_attr1)
        
        # Confirm it
        reply_attr2 = chatbot.generate_reply("onayla", "team-1", confirm_action="update_player_attribute")
        print("Attribute Update Confirmation Reply:")
        print(reply_attr2)
        
        # Check in DB
        conn = db.get_connection()
        p_row = conn.execute("SELECT attributes FROM players WHERE id = ?", (player["id"],)).fetchone()
        conn.close()
        p_attrs = json.loads(p_row["attributes"]) if p_row else {}
        print(f"New shooting value in DB: {p_attrs.get('shooting')}")
        
        # Ask to change status to Sakat
        status_query = f"{player_name} sakat yap"
        reply_status1 = chatbot.generate_reply(status_query, "team-1")
        print("\nStatus Update Initial Reply:")
        print(reply_status1)
        
        # Confirm status change
        reply_status2 = chatbot.generate_reply("onayla", "team-1", confirm_action="update_player_status")
        print("Status Update Confirmation Reply:")
        print(reply_status2)
        
        # Check status in DB
        conn = db.get_connection()
        p_row2 = conn.execute("SELECT injury_status FROM players WHERE id = ?", (player["id"],)).fetchone()
        # Restore old status and attributes
        conn.execute("UPDATE players SET injury_status = ?, attributes = ? WHERE id = ?", (player["injury_status"], player["attributes"], player["id"]))
        conn.commit()
        conn.close()
        print(f"Status in DB before restore: {p_row2['injury_status']}")
        
    # Clean up test event
    conn = db.get_connection()
    events = conn.execute("SELECT * FROM calendar_events WHERE team_id = ? AND date = ?", ("team-1", "2026-06-20")).fetchall()
    conn.close()
    if events:
        db.delete_calendar_event(events[0]["id"])
        print("\nCleaned up test event.")

if __name__ == "__main__":
    test()
