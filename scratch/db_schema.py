import sqlite3

conn = sqlite3.connect('data/database.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
for t in tables:
    t_name = t[0]
    cursor.execute(f"PRAGMA table_info({t_name})")
    columns = [c[1] for c in cursor.fetchall()]
    print(f"Table: {t_name}, Columns: {columns}")
conn.close()
