import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "database.db")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

players = conn.execute("SELECT id, name, primary_position, secondary_positions FROM players").fetchall()
print(f"Total players: {len(players)}")

positions = set()
for p in players:
    print(f"- {p['name']}: {p['primary_position']} (Secondary: {p['secondary_positions']})")
    if p['primary_position']:
        positions.add(p['primary_position'])
    if p['secondary_positions']:
        for s in p['secondary_positions'].split(','):
            positions.add(s.strip())

print("\nAll unique position values in DB:")
for pos in sorted(positions):
    print(f"  '{pos}'")

conn.close()
