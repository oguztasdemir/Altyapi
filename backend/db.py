import sqlite3
import os
import json

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "database.db")

def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
    except Exception as e:
        print("Failed to set WAL or synchronous pragmas:", e)
    return conn

def vacuum_db():
    conn = get_connection()
    try:
        conn.execute("VACUUM;")
        print("Database defragmented (VACUUM) successfully.")
    except Exception as e:
        print("VACUUM failed:", e)
    finally:
        conn.close()

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # Teams Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
    );
    """)
    
    # Check/Add is_archived to teams dynamically
    try:
        cursor.execute("SELECT is_archived FROM teams LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE teams ADD COLUMN is_archived INTEGER DEFAULT 0")
    
    # Players Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        nationality TEXT,
        foot TEXT,
        primary_position TEXT,
        secondary_positions TEXT,
        photo TEXT,
        attributes TEXT,
        squad_role TEXT DEFAULT 'Rotasyon',
        height INTEGER DEFAULT 175,
        weight INTEGER DEFAULT 70,
        injury_status TEXT DEFAULT 'Sağlıklı',
        coach_notes TEXT DEFAULT '',
        matches_played INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        match_rating REAL DEFAULT 6.0,
        parent_name TEXT DEFAULT '',
        parent_phone TEXT DEFAULT '',
        fee_status TEXT DEFAULT 'Ödenmedi',
        current_ability INTEGER DEFAULT 3,
        potential_ability INTEGER DEFAULT 4,
        blood_type TEXT DEFAULT 'Bilinmiyor',
        chronic_illnesses TEXT DEFAULT '',
        allergies TEXT DEFAULT '',
        medications TEXT DEFAULT '',
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)
    
    # Check/Add columns dynamically
    columns_to_add = [
        ("squad_role", "TEXT DEFAULT 'Rotasyon'"),
        ("height", "INTEGER DEFAULT 175"),
        ("weight", "INTEGER DEFAULT 70"),
        ("injury_status", "TEXT DEFAULT 'Sağlıklı'"),
        ("coach_notes", "TEXT DEFAULT ''"),
        ("matches_played", "INTEGER DEFAULT 0"),
        ("goals", "INTEGER DEFAULT 0"),
        ("assists", "INTEGER DEFAULT 0"),
        ("yellow_cards", "INTEGER DEFAULT 0"),
        ("red_cards", "INTEGER DEFAULT 0"),
        ("match_rating", "REAL DEFAULT 6.0"),
        ("parent_name", "TEXT DEFAULT ''"),
        ("parent_phone", "TEXT DEFAULT ''"),
        ("fee_status", "TEXT DEFAULT 'Ödenmedi'"),
        ("current_ability", "INTEGER DEFAULT 3"),
        ("potential_ability", "INTEGER DEFAULT 4"),
        ("fee_amount", "INTEGER DEFAULT NULL"),
        ("fee_discount_locked", "INTEGER DEFAULT 0"),
        ("growth_history", "TEXT DEFAULT '[]'"),
        ("blood_type", "TEXT DEFAULT 'Bilinmiyor'"),
        ("chronic_illnesses", "TEXT DEFAULT ''"),
        ("allergies", "TEXT DEFAULT ''"),
        ("medications", "TEXT DEFAULT ''")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"SELECT {col_name} FROM players LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute(f"ALTER TABLE players ADD COLUMN {col_name} {col_type}")
        
    # Coaches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coaches (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # Attendance Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)

    # Injuries Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS injuries (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        injury_type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        notes TEXT,
        rehab_stage TEXT DEFAULT 'Dinlenme',
        rehab_progress INTEGER DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)
    
    # Check/Add rehab columns dynamically
    try:
        cursor.execute("SELECT rehab_stage FROM injuries LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE injuries ADD COLUMN rehab_stage TEXT DEFAULT 'Dinlenme'")
        cursor.execute("ALTER TABLE injuries ADD COLUMN rehab_progress INTEGER DEFAULT 0")

    # Matches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        opponent TEXT NOT NULL,
        date TEXT NOT NULL,
        our_score INTEGER NOT NULL,
        opponent_score INTEGER NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # Match Player Stats Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS match_player_stats (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        rating REAL DEFAULT 6.0,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)

    try:
        cursor.execute("SELECT saves FROM match_player_stats LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE match_player_stats ADD COLUMN saves INTEGER DEFAULT 0")

    # Rating History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rating_history (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        date TEXT NOT NULL,
        rating INTEGER NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)

    # Attributes History Table for Radar Progression Chart
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attributes_history (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        date TEXT NOT NULL,
        attributes TEXT NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)
    
    # Admin Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        password_hash TEXT,
        email TEXT DEFAULT '',
        email_verified INTEGER DEFAULT 0,
        monthly_fee INTEGER DEFAULT 500,
        is_initialized INTEGER DEFAULT 0
    );
    """)

    # Verification Codes Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verification_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    """)
    
    # Expenses Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        type TEXT DEFAULT 'Gider'
    );
    """)
    
    # Kits Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS kits (
        id TEXT PRIMARY KEY,
        player_id TEXT,
        size TEXT NOT NULL,
        number INTEGER,
        status TEXT NOT NULL,
        notes TEXT,
        payment_status TEXT DEFAULT 'Ödenmedi',
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
    );
    """)
    
    cursor.execute("PRAGMA table_info(kits)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "payment_status" not in columns:
        cursor.execute("ALTER TABLE kits ADD COLUMN payment_status TEXT DEFAULT 'Ödenmedi'")

    # ── Training Sessions Table ─────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS training_sessions (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT DEFAULT '16:00',
        end_time TEXT DEFAULT '18:00',
        location TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        color TEXT DEFAULT '#00ff88',
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # ── Seasons Table ───────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seasons (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # ── Tournaments Table ───────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'Lig',
        start_date TEXT NOT NULL,
        end_date TEXT,
        notes TEXT DEFAULT '',
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # ── Calendar Events Table ───────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT DEFAULT '12:00',
        color TEXT DEFAULT '#4facfe',
        event_type TEXT DEFAULT 'Özel',
        description TEXT DEFAULT '',
        recurrence TEXT DEFAULT 'none',
        cancelled_dates TEXT DEFAULT '[]',
        linked_id TEXT DEFAULT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # Migrate existing calendar_events table if needed
    cursor.execute("PRAGMA table_info(calendar_events)")
    cal_cols = [row["name"] for row in cursor.fetchall()]
    if "event_type" not in cal_cols:
        cursor.execute("ALTER TABLE calendar_events ADD COLUMN event_type TEXT DEFAULT 'Özel'")
    if "description" not in cal_cols:
        cursor.execute("ALTER TABLE calendar_events ADD COLUMN description TEXT DEFAULT ''")
    if "recurrence" not in cal_cols:
        cursor.execute("ALTER TABLE calendar_events ADD COLUMN recurrence TEXT DEFAULT 'none'")
    if "cancelled_dates" not in cal_cols:
        cursor.execute("ALTER TABLE calendar_events ADD COLUMN cancelled_dates TEXT DEFAULT '[]'")
    if "linked_id" not in cal_cols:
        cursor.execute("ALTER TABLE calendar_events ADD COLUMN linked_id TEXT DEFAULT NULL")

    # Add tournament_id to matches if not exists
    cursor.execute("PRAGMA table_info(matches)")
    match_cols = [row["name"] for row in cursor.fetchall()]
    if "tournament_id" not in match_cols:
        cursor.execute("ALTER TABLE matches ADD COLUMN tournament_id TEXT DEFAULT NULL")

    # ── Player Goals Table ──────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS player_goals (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        title TEXT NOT NULL,
        target_value REAL NOT NULL,
        current_value REAL DEFAULT 0,
        unit TEXT DEFAULT '',
        deadline TEXT,
        status TEXT DEFAULT 'Aktif',
        goal_type TEXT DEFAULT 'Manuel',
        stat_key TEXT DEFAULT '',
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)

    # ── Announcements Table ─────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'Normal',
        is_pinned INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # ── Transfers Table ─────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        transfer_type TEXT NOT NULL,
        from_team TEXT DEFAULT '',
        to_team TEXT DEFAULT '',
        date TEXT NOT NULL,
        fee INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # ── Evaluations Table ───────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        week_date TEXT NOT NULL,
        attitude INTEGER DEFAULT 3,
        effort INTEGER DEFAULT 3,
        technical INTEGER DEFAULT 3,
        tactical INTEGER DEFAULT 3,
        physical INTEGER DEFAULT 3,
        overall REAL DEFAULT 3.0,
        notes TEXT DEFAULT '',
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)

    # ── Achievements Table ──────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        badge_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        earned_date TEXT NOT NULL,
        is_auto INTEGER DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)

    # ── Player Images Table (Gallery) ───────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS player_images (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        upload_date TEXT NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)

    # ── Player Archives Table (Videos & Docs) ───────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS player_archives (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        description TEXT DEFAULT '',
        upload_date TEXT NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    """)

    # ── Team Archives Table (Photos, Videos & Docs) ─────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS team_archives (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        description TEXT DEFAULT '',
        upload_date TEXT NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    """)

    # ── Audit Log Table ──────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT DEFAULT '',
        entity_type TEXT DEFAULT '',
        entity_name TEXT DEFAULT ''
    );
    """)

    

    # Seed default Admin settings row if empty
    cursor.execute("SELECT COUNT(*) as count FROM admin_settings")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("INSERT INTO admin_settings (id, password_hash, email, email_verified, monthly_fee, is_initialized) VALUES (1, NULL, '', 0, 500, 0)")

    # Seed default expenses if empty
    cursor.execute("SELECT COUNT(*) as count FROM expenses")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("INSERT INTO expenses (id, description, category, amount, date, type) VALUES (?, ?, ?, ?, ?, ?)",
                       ("exp-1", "Aylık Saha ve Tesis Kirası", "Kira", 4000.0, "2026-06-01", "Gider"))
        cursor.execute("INSERT INTO expenses (id, description, category, amount, date, type) VALUES (?, ?, ?, ?, ?, ?)",
                       ("exp-2", "Stopaj ve Gelir Vergisi Ödemesi", "Vergi", 1200.0, "2026-06-15", "Gider"))
        cursor.execute("INSERT INTO expenses (id, description, category, amount, date, type) VALUES (?, ?, ?, ?, ?, ?)",
                       ("exp-3", "Elektrik & Su Faturası", "Fatura", 650.0, "2026-06-10", "Gider"))
                       
    # Seed default kits if empty
    cursor.execute("SELECT COUNT(*) as count FROM kits")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("INSERT INTO kits (id, player_id, size, number, status, notes) VALUES (?, ?, ?, ?, ?, ?)",
                       ("kit-1", "player-1", "M", 10, "Teslim Edildi", "Arda Güler forması"))
        cursor.execute("INSERT INTO kits (id, player_id, size, number, status, notes) VALUES (?, ?, ?, ?, ?, ?)",
                       ("kit-2", "player-2", "L", 9, "Beklemede", "Endrick forması hazırlanıyor"))


    
    # Check template data
    cursor.execute("SELECT COUNT(*) as count FROM teams")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("INSERT INTO teams (id, name) VALUES (?, ?)", ("team-1", "Real Madrid Altyapı"))
        
        arda_attrs = {
            "crossing": 82, "finishing": 78, "heading": 50, "dribbling": 92, "passing": 88, "shooting": 82,
            "freekick": 90, "penalty": 85, "volley": 80, "longshots": 86, "corner": 88, "firsttouch": 94,
            "technique": 95, "tackling": 45, "sliding": 38, "longpassing": 85, "curve": 91,
            
            "decision": 86, "vision": 94, "determination": 80, "teamwork": 78, "positioning": 65,
            "aggression": 55, "anticipation": 84, "bravery": 60, "composure": 88, "concentration": 75,
            "leadership": 70, "workrate": 72,
            
            "pace": 76, "acceleration": 82, "stamina": 70, "strength": 60, "agility": 90,
            "jumping": 55, "balance": 82, "naturalfitness": 75, "flair": 93,
            
            "gk_handling": 5, "gk_kicking": 5, "gk_reflexes": 5, "gk_oneonones": 5, "gk_aerial": 5
        }
        endrick_attrs = {
            "crossing": 55, "finishing": 86, "heading": 70, "dribbling": 78, "passing": 62, "shooting": 85,
            "freekick": 68, "penalty": 80, "volley": 82, "longshots": 78, "corner": 58, "firsttouch": 75,
            "technique": 78, "tackling": 35, "sliding": 28, "longpassing": 55, "curve": 68,
            
            "decision": 70, "vision": 65, "determination": 90, "teamwork": 60, "positioning": 78,
            "aggression": 82, "anticipation": 80, "bravery": 85, "composure": 76, "concentration": 70,
            "leadership": 65, "workrate": 78,
            
            "pace": 88, "acceleration": 92, "stamina": 76, "strength": 82, "agility": 80,
            "jumping": 78, "balance": 85, "naturalfitness": 80, "flair": 82,
            
            "gk_handling": 5, "gk_kicking": 5, "gk_reflexes": 5, "gk_oneonones": 5, "gk_aerial": 5
        }
        
        cursor.execute("""
        INSERT INTO players (id, team_id, name, age, nationality, foot, primary_position, secondary_positions, photo, attributes, squad_role, height, weight, injury_status, coach_notes, matches_played, goals, assists, yellow_cards, red_cards, match_rating, parent_name, parent_phone, fee_status, current_ability, potential_ability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "player-1", "team-1", "Arda Güler", 21, "TÜRKİYE", "Sol", "AM", "RM, CM", None, json.dumps(arda_attrs), "Kilit Oyuncu", 175, 69, "Sağlıklı", "Yüksek potansiyele sahip. Serbest vuruş yeteneği üst seviyede.", 12, 4, 6, 1, 0, 7.8, "Süleyman Güler", "0555 123 45 67", "Ödendi", 4, 5
        ))
        
        cursor.execute("""
        INSERT INTO players (id, team_id, name, age, nationality, foot, primary_position, secondary_positions, photo, attributes, squad_role, height, weight, injury_status, coach_notes, matches_played, goals, assists, yellow_cards, red_cards, match_rating, parent_name, parent_phone, fee_status, current_ability, potential_ability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "player-2", "team-1", "Endrick", 19, "BREZİLYA", "Sol", "ST", "RM", None, json.dumps(endrick_attrs), "Yedek", 173, 75, "Sağlıklı", "Güçlü fizik ve şut kalitesi var. Bitiricilik üzerinde çalışılıyor.", 10, 5, 2, 2, 0, 7.2, "Douglas Sousa", "0555 987 65 43", "Ödenmedi", 3, 5
        ))
        
        cursor.execute("INSERT INTO coaches (id, team_id, name, role) VALUES (?, ?, ?, ?)", (
            "coach-1", "team-1", "Carlo Ancelotti", "Teknik Direktör"
        ))
        
        # Seed Rating History
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", ("rh-1", "player-1", "2026-03-01", 72))
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", ("rh-2", "player-1", "2026-04-01", 75))
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", ("rh-3", "player-1", "2026-05-01", 76))
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", ("rh-4", "player-1", "2026-06-01", 78))
        
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", ("rh-5", "player-2", "2026-03-01", 68))
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", ("rh-6", "player-2", "2026-04-01", 70))
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", ("rh-7", "player-2", "2026-05-01", 71))
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", ("rh-8", "player-2", "2026-06-01", 72))
        
        # Seed Attributes History
        for idx, date in enumerate(["2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"]):
            diff = (3 - idx) * 3
            p1_hist = {k: max(0, v - diff) for k, v in arda_attrs.items()}
            p2_hist = {k: max(0, v - diff) for k, v in endrick_attrs.items()}
            cursor.execute("INSERT INTO attributes_history (id, player_id, date, attributes) VALUES (?, ?, ?, ?)", (f"ah-1-{date}", "player-1", date, json.dumps(p1_hist)))
            cursor.execute("INSERT INTO attributes_history (id, player_id, date, attributes) VALUES (?, ?, ?, ?)", (f"ah-2-{date}", "player-2", date, json.dumps(p2_hist)))

        # Seed Injury History
        cursor.execute("INSERT INTO injuries (id, player_id, injury_type, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?)", ("inj-1", "player-1", "Ayak Bileği Burkulması", "2026-04-10", "2026-04-25", "Antrenmanda darbe aldı."))
        cursor.execute("INSERT INTO injuries (id, player_id, injury_type, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?)", ("inj-2", "player-2", "Hamstring Çekmesi", "2026-05-02", "2026-05-18", "Hafif yırtık tespit edildi."))
        
    # Create database indexes for performance optimization
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_player_date ON attendance(player_id, date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_injuries_player ON injuries(player_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_match_player_stats_match ON match_player_stats(match_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_match_player_stats_player ON match_player_stats(player_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rating_history_player ON rating_history(player_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_attributes_history_player ON attributes_history(player_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);")

    conn.commit()
    conn.close()

def get_teams(include_archived=False):
    conn = get_connection()
    cursor = conn.cursor()
    if include_archived:
        cursor.execute("SELECT * FROM teams")
    else:
        cursor.execute("SELECT * FROM teams WHERE is_archived = 0")
    teams_rows = cursor.fetchall()
    
    teams = []
    for t_row in teams_rows:
        team = {
            "id": t_row["id"],
            "name": t_row["name"],
            "is_archived": t_row["is_archived"],
            "players": [],
            "coaches": []
        }
        
        # Players
        cursor.execute("SELECT * FROM players WHERE team_id = ?", (t_row["id"],))
        player_rows = cursor.fetchall()
        for p_row in player_rows:
            # Dynamically aggregate stats from match records
            cursor.execute("""
                SELECT COUNT(*) as matches_played,
                       SUM(goals) as goals,
                       SUM(assists) as assists,
                       SUM(saves) as saves,
                       SUM(yellow_cards) as yellow_cards,
                       SUM(red_cards) as red_cards,
                       AVG(rating) as avg_rating
                FROM match_player_stats
                WHERE player_id = ?
            """, (p_row["id"],))
            agg_stats = cursor.fetchone()
            
            matches_played = agg_stats["matches_played"] or 0
            goals = agg_stats["goals"] or 0
            assists = agg_stats["assists"] or 0
            saves = agg_stats["saves"] or 0
            yellow_cards = agg_stats["yellow_cards"] or 0
            red_cards = agg_stats["red_cards"] or 0
            match_rating = agg_stats["avg_rating"] or 6.0
            
            team["players"].append({
                "id": p_row["id"],
                "name": p_row["name"],
                "age": p_row["age"],
                "nationality": p_row["nationality"],
                "foot": p_row["foot"],
                "primaryPosition": p_row["primary_position"],
                "secondaryPositions": p_row["secondary_positions"],
                "photo": p_row["photo"],
                "attributes": json.loads(p_row["attributes"]),
                "squadRole": p_row["squad_role"],
                "height": p_row["height"],
                "weight": p_row["weight"],
                "injuryStatus": p_row["injury_status"],
                "coachNotes": p_row["coach_notes"],
                "matchesPlayed": matches_played,
                "goals": goals,
                "assists": assists,
                "saves": saves,
                "yellowCards": yellow_cards,
                "redCards": red_cards,
                "matchRating": round(match_rating, 2),
                "parentName": p_row["parent_name"],
                "parentPhone": p_row["parent_phone"],
                "feeStatus": p_row["fee_status"],
                "feeAmount": p_row["fee_amount"] if "fee_amount" in p_row.keys() else None,
                "feeDiscountLocked": bool(p_row["fee_discount_locked"]) if "fee_discount_locked" in p_row.keys() else False,
                "currentAbility": p_row["current_ability"],
                "potentialAbility": p_row["potential_ability"],
                "growth_history": json.loads(p_row["growth_history"]) if "growth_history" in p_row.keys() and p_row["growth_history"] else [],
                "bloodType": p_row["blood_type"] if "blood_type" in p_row.keys() else "Bilinmiyor",
                "chronicIllnesses": p_row["chronic_illnesses"] if "chronic_illnesses" in p_row.keys() else "",
                "allergies": p_row["allergies"] if "allergies" in p_row.keys() else "",
                "medications": p_row["medications"] if "medications" in p_row.keys() else ""
            })
            
        # Coaches
        cursor.execute("SELECT * FROM coaches WHERE team_id = ?", (t_row["id"],))
        coach_rows = cursor.fetchall()
        for c_row in coach_rows:
            team["coaches"].append({
                "id": c_row["id"],
                "name": c_row["name"],
                "role": c_row["role"]
            })
            
        teams.append(team)
        
    conn.close()
    return teams

def add_team(team_id, name):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO teams (id, name) VALUES (?, ?)", (team_id, name))
    conn.commit()
    conn.close()

def update_team_name(team_id, name):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE teams SET name = ? WHERE id = ?", (name, team_id))
    conn.commit()
    conn.close()

def delete_team(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.execute("DELETE FROM teams WHERE id = ?", (team_id,))
    conn.commit()
    conn.close()

def add_player(player_id, team_id, name, age, nationality, foot, primary_pos, secondary_pos, photo, attributes, squad_role="Rotasyon", height=175, weight=70, injury_status="Sağlıklı", coach_notes="", matches_played=0, goals=0, assists=0, yellow_cards=0, red_cards=0, match_rating=6.0, parent_name="", parent_phone="", fee_status="Ödenmedi", current_ability=3, potential_ability=4, growth_history="[]", blood_type="Bilinmiyor", chronic_illnesses="", allergies="", medications=""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO players (id, team_id, name, age, nationality, foot, primary_position, secondary_positions, photo, attributes, squad_role, height, weight, injury_status, coach_notes, matches_played, goals, assists, yellow_cards, red_cards, match_rating, parent_name, parent_phone, fee_status, current_ability, potential_ability, growth_history, blood_type, chronic_illnesses, allergies, medications)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        player_id, team_id, name, age, nationality, foot, primary_pos, secondary_pos, photo, json.dumps(attributes), squad_role, height, weight, injury_status, coach_notes, matches_played, goals, assists, yellow_cards, red_cards, match_rating, parent_name, parent_phone, fee_status, current_ability, potential_ability, json.dumps(growth_history) if not isinstance(growth_history, str) else growth_history, blood_type, chronic_illnesses, allergies, medications
    ))
    
    # Track Rating History
    import datetime
    today = datetime.date.today().isoformat()
    overall = calculate_overall_rating(primary_pos, attributes)
    
    cursor.execute("SELECT id FROM rating_history WHERE player_id = ? AND date = ?", (player_id, today))
    row = cursor.fetchone()
    if row:
        cursor.execute("UPDATE rating_history SET rating = ? WHERE id = ?", (overall, row["id"]))
    else:
        history_id = f"rh-{player_id}-{today}"
        cursor.execute("INSERT INTO rating_history (id, player_id, date, rating) VALUES (?, ?, ?, ?)", (history_id, player_id, today, overall))
        
    # Track Attributes History
    cursor.execute("SELECT id FROM attributes_history WHERE player_id = ? AND date = ?", (player_id, today))
    attr_row = cursor.fetchone()
    if attr_row:
        cursor.execute("UPDATE attributes_history SET attributes = ? WHERE id = ?", (json.dumps(attributes), attr_row["id"]))
    else:
        attr_hist_id = f"ah-{player_id}-{today}"
        cursor.execute("INSERT INTO attributes_history (id, player_id, date, attributes) VALUES (?, ?, ?, ?)", (attr_hist_id, player_id, today, json.dumps(attributes)))

    conn.commit()
    conn.close()

def update_player_fee_settings(player_id, fee_amount, fee_discount_locked):
    """Update a player's custom fee amount and discount lock status."""
    conn = get_connection()
    cursor = conn.cursor()
    # fee_amount=None means use standard fee, otherwise use custom amount
    cursor.execute(
        "UPDATE players SET fee_amount = ?, fee_discount_locked = ? WHERE id = ?",
        (fee_amount, 1 if fee_discount_locked else 0, player_id)
    )
    conn.commit()
    conn.close()

def bulk_update_fees(team_id, new_amount):
    """Bulk update the standard monthly fee in admin settings.
    Players with fee_discount_locked=1 keep their custom fee_amount.
    All other players get fee_amount set to NULL (= use new standard)."""
    conn = get_connection()
    cursor = conn.cursor()
    # Update the global standard fee
    cursor.execute("UPDATE admin_settings SET monthly_fee = ? WHERE id = 1", (new_amount,))
    # Clear custom fee_amount for non-locked players (they'll inherit the new standard)
    cursor.execute(
        "UPDATE players SET fee_amount = NULL WHERE team_id = ? AND (fee_discount_locked = 0 OR fee_discount_locked IS NULL)",
        (team_id,)
    )
    conn.commit()
    conn.close()

def delete_player(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM players WHERE id = ?", (player_id,))
    conn.commit()
    conn.close()

def add_coach(coach_id, team_id, name, role):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO coaches (id, team_id, name, role) VALUES (?, ?, ?, ?)", (
        coach_id, team_id, name, role
    ))
    conn.commit()
    conn.close()

def delete_coach(coach_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM coaches WHERE id = ?", (coach_id,))
    conn.commit()
    conn.close()

# New Functions for App Expansion

def calculate_overall_rating(primary_position, attributes_dict):
    weights_map = {
        "GK": { "positioning": 0.35, "agility": 0.30, "decision": 0.20, "strength": 0.15 },
        "CB": { "marking": 0.40, "strength": 0.20, "positioning": 0.20, "heading": 0.10, "decision": 0.10 },
        "LB": { "pace": 0.30, "crossing": 0.20, "marking": 0.20, "stamina": 0.20, "passing": 0.10 },
        "RB": { "pace": 0.30, "crossing": 0.20, "marking": 0.20, "stamina": 0.20, "passing": 0.10 },
        "DM": { "marking": 0.30, "passing": 0.25, "positioning": 0.20, "teamwork": 0.15, "stamina": 0.10 },
        "CM": { "passing": 0.35, "vision": 0.25, "decision": 0.15, "teamwork": 0.15, "stamina": 0.10 },
        "LM": { "pace": 0.35, "dribbling": 0.25, "crossing": 0.20, "passing": 0.10, "shooting": 0.10 },
        "RM": { "pace": 0.35, "dribbling": 0.25, "crossing": 0.20, "passing": 0.10, "shooting": 0.10 },
        "AM": { "passing": 0.30, "vision": 0.30, "dribbling": 0.20, "decision": 0.10, "shooting": 0.10 },
        "ST": { "finishing": 0.35, "shooting": 0.25, "pace": 0.20, "heading": 0.10, "dribbling": 0.10 }
    }
    weights = weights_map.get(primary_position, weights_map["ST"])
    rating = 0.0
    weight_sum = 0.0
    for key, w in weights.items():
        rating += attributes_dict.get(key, 50) * w
        weight_sum += w
    
    unweighted = [attributes_dict.get(k, 50) for k in attributes_dict.keys() if k not in weights]
    if unweighted:
        avg_unweighted = sum(unweighted) / len(unweighted)
        rating = (rating * 0.80) + (avg_unweighted * 0.20)
    return round(rating)

def get_attendance(team_id, date):
    conn = get_connection()
    cursor = conn.cursor()
    # Get all players in the team
    cursor.execute("SELECT id, name FROM players WHERE team_id = ?", (team_id,))
    players = cursor.fetchall()
    
    records = []
    for p in players:
        cursor.execute("SELECT status FROM attendance WHERE player_id = ? AND date = ?", (p["id"], date))
        row = cursor.fetchone()
        status = row["status"] if row else ""
        records.append({
            "player_id": p["id"],
            "name": p["name"],
            "status": status
        })
    conn.close()
    return records

def get_all_attendance(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Get all players currently in the team
    cursor.execute("SELECT id, name FROM players WHERE team_id = ?", (team_id,))
    players = [dict(row) for row in cursor.fetchall()]
    
    # 2. Get all attendance records for these players
    cursor.execute("""
        SELECT a.player_id, a.date, a.status 
        FROM attendance a
        JOIN players p ON a.player_id = p.id
        WHERE p.team_id = ?
    """, (team_id,))
    att_rows = cursor.fetchall()
    
    # Group existing records by date
    date_records = {}
    for r in att_rows:
        d = r["date"]
        pid = r["player_id"]
        status = r["status"]
        if d not in date_records:
            date_records[d] = {}
        date_records[d][pid] = status
        
    # Ensure today's date is in the records
    import datetime
    today = datetime.date.today().isoformat()
    if today not in date_records:
        date_records[today] = {}
        
    # Construct final list of dates
    result = []
    for d in sorted(date_records.keys(), reverse=True):
        player_list = []
        for p in players:
            status = date_records[d].get(p["id"], "")
            player_list.append({
                "player_id": p["id"],
                "name": p["name"],
                "status": status
            })
        result.append({
            "date": d,
            "players": player_list
        })
        
    conn.close()
    return result

def save_attendance(records):
    conn = get_connection()
    cursor = conn.cursor()
    for rec in records:
        player_id = rec.get("player_id")
        date = rec.get("date")
        status = rec.get("status")
        
        # INSERT OR REPLACE
        att_id = f"att-{player_id}-{date}"
        cursor.execute("""
        INSERT OR REPLACE INTO attendance (id, player_id, date, status)
        VALUES (?, ?, ?, ?)
        """, (att_id, player_id, date, status))
    conn.commit()
    conn.close()

def get_injuries(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM injuries WHERE player_id = ? ORDER BY start_date DESC", (player_id,))
    rows = cursor.fetchall()
    injuries = []
    for r in rows:
        injuries.append({
            "id": r["id"],
            "player_id": r["player_id"],
            "injury_type": r["injury_type"],
            "start_date": r["start_date"],
            "end_date": r["end_date"] or "",
            "notes": r["notes"] or "",
            "rehab_stage": r["rehab_stage"] if "rehab_stage" in r.keys() else "Dinlenme",
            "rehab_progress": r["rehab_progress"] if "rehab_progress" in r.keys() else 0
        })
    conn.close()
    return injuries

def add_injury(injury_id, player_id, injury_type, start_date, end_date, notes, rehab_stage="Dinlenme", rehab_progress=0):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Insert injury
    cursor.execute("""
    INSERT OR REPLACE INTO injuries (id, player_id, injury_type, start_date, end_date, notes, rehab_stage, rehab_progress)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (injury_id, player_id, injury_type, start_date, end_date or None, notes or "", rehab_stage, int(rehab_progress)))
    
    # Update player injury status
    if not end_date:
        status = "Sakat"
    else:
        status = "Sağlıklı"
    cursor.execute("UPDATE players SET injury_status = ? WHERE id = ?", (status, player_id))
    
    conn.commit()
    conn.close()

def update_injury_rehab(injury_id, stage, progress):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE injuries SET rehab_stage = ?, rehab_progress = ? WHERE id = ?", (stage, int(progress), injury_id))
    conn.commit()
    conn.close()

def delete_injury(injury_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get player_id before deletion
    cursor.execute("SELECT player_id FROM injuries WHERE id = ?", (injury_id,))
    row = cursor.fetchone()
    if row:
        player_id = row["player_id"]
        cursor.execute("DELETE FROM injuries WHERE id = ?", (injury_id,))
        # Set status back to healthy if no other active injuries
        cursor.execute("SELECT COUNT(*) as active FROM injuries WHERE player_id = ? AND (end_date IS NULL OR end_date = '')", (player_id,))
        if cursor.fetchone()["active"] == 0:
            cursor.execute("UPDATE players SET injury_status = 'Sağlıklı' WHERE id = ?", (player_id,))
            
    conn.commit()
    conn.close()

def get_rating_history(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    # Fetch from rating_history
    cursor.execute("SELECT date, rating FROM rating_history WHERE player_id = ? ORDER BY date ASC", (player_id,))
    rows = cursor.fetchall()
    history = []
    for r in rows:
        history.append({
            "date": r["date"],
            "rating": r["rating"]
        })
        
    # Fetch from match_player_stats joined with matches
    cursor.execute("""
        SELECT m.date, mps.rating 
        FROM match_player_stats mps
        JOIN matches m ON mps.match_id = m.id
        WHERE mps.player_id = ?
        ORDER BY m.date ASC
    """, (player_id,))
    match_rows = cursor.fetchall()
    for r in match_rows:
        history.append({
            "date": r["date"],
            "rating": r["rating"]
        })
        
    # Sort history by date
    history.sort(key=lambda x: x["date"])
    conn.close()
    return history

def get_player_match_stats(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.date, m.opponent, mps.goals, mps.assists, mps.saves, mps.rating
        FROM match_player_stats mps
        JOIN matches m ON mps.match_id = m.id
        WHERE mps.player_id = ?
        ORDER BY m.date DESC
        LIMIT 5
    """, (player_id,))
    rows = cursor.fetchall()
    conn.close()
    # Return in chronological order
    stats = [{"date": r["date"], "opponent": r["opponent"], "goals": r["goals"], "assists": r["assists"], "saves": r["saves"] if "saves" in r.keys() else 0, "rating": r["rating"]} for r in rows]
    stats.reverse()
    return stats


def get_finance_summary(team_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Fetch players with fee fields
    if team_id:
        cursor.execute("SELECT id, name, parent_name, parent_phone, fee_status, fee_amount, fee_discount_locked FROM players WHERE team_id = ?", (team_id,))
    else:
        cursor.execute("SELECT id, name, parent_name, parent_phone, fee_status, fee_amount, fee_discount_locked FROM players")
    rows = cursor.fetchall()
    
    total_paid = 0
    total_unpaid = 0
    total_overdue = 0
    debtors = []
    all_players = []
    
    cursor.execute("SELECT monthly_fee FROM admin_settings WHERE id = 1")
    setting_row = cursor.fetchone()
    STANDARD_FEE = setting_row["monthly_fee"] if (setting_row and setting_row["monthly_fee"]) else 500
    
    for r in rows:
        status = r["fee_status"] or "Ödenmedi"
        # Determine effective fee: custom amount if set, else standard
        custom_fee = r["fee_amount"]
        try:
            effective_fee = int(custom_fee) if (custom_fee is not None and custom_fee != '') else STANDARD_FEE
        except (TypeError, ValueError):
            effective_fee = STANDARD_FEE
        
        is_locked = bool(r["fee_discount_locked"])
        
        player_record = {
            "id": r["id"],
            "name": r["name"],
            "parent_name": r["parent_name"] or "-",
            "parent_phone": r["parent_phone"] or "-",
            "fee_status": status,
            "amount": effective_fee,
            "fee_discount_locked": is_locked,
            "standard_fee": STANDARD_FEE
        }
        all_players.append(player_record)
        
        if status == "Ödendi":
            total_paid += effective_fee
        elif status == "Ödenmedi":
            total_unpaid += effective_fee
            debtors.append(player_record)
        elif status == "Gecikti":
            total_overdue += effective_fee
            debtors.append(player_record)
            
    conn.close()
    return {
        "total_paid": total_paid,
        "total_unpaid": total_unpaid,
        "total_overdue": total_overdue,
        "standard_fee": STANDARD_FEE,
        "debtors": debtors,
        "all_players": all_players
    }

def get_admin_settings():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash, email, email_verified, monthly_fee, is_initialized FROM admin_settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "password_hash": row["password_hash"],
            "email": row["email"],
            "email_verified": row["email_verified"],
            "monthly_fee": row["monthly_fee"],
            "is_initialized": row["is_initialized"]
        }
    return None

def update_admin_settings(email, monthly_fee):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email FROM admin_settings WHERE id = 1")
    row = cursor.fetchone()
    email_verified = 1
    if row and row["email"] != email:
        email_verified = 0
    
    cursor.execute("UPDATE admin_settings SET email = ?, monthly_fee = ?, email_verified = ? WHERE id = 1", (email, monthly_fee, email_verified))
    conn.commit()
    conn.close()


def archive_team(team_id, is_archived):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE teams SET is_archived = ? WHERE id = ?", (is_archived, team_id))
    conn.commit()
    conn.close()

def get_matches(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM matches WHERE team_id = ? ORDER BY date DESC", (team_id,))
    rows = cursor.fetchall()
    matches = []
    for r in rows:
        match = {
            "id": r["id"],
            "team_id": r["team_id"],
            "opponent": r["opponent"],
            "date": r["date"],
            "our_score": r["our_score"],
            "opponent_score": r["opponent_score"],
            "player_stats": []
        }
        # Fetch player stats
        cursor.execute("""
            SELECT mps.*, p.name as player_name 
            FROM match_player_stats mps
            JOIN players p ON mps.player_id = p.id
            WHERE mps.match_id = ?
        """, (r["id"],))
        p_rows = cursor.fetchall()
        for pr in p_rows:
            match["player_stats"].append({
                "player_id": pr["player_id"],
                "player_name": pr["player_name"],
                "goals": pr["goals"],
                "assists": pr["assists"],
                "saves": pr["saves"] if "saves" in pr.keys() else 0,
                "yellow_cards": pr["yellow_cards"],
                "red_cards": pr["red_cards"],
                "rating": pr["rating"]
            })
        matches.append(match)
    conn.close()
    return matches

def add_match(match_id, team_id, opponent, date, our_score, opponent_score, player_stats):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO matches (id, team_id, opponent, date, our_score, opponent_score)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (match_id, team_id, opponent, date, our_score, opponent_score))
    
    # Delete existing stats for this match
    cursor.execute("DELETE FROM match_player_stats WHERE match_id = ?", (match_id,))
    
    for stat in player_stats:
        stat_id = f"mps-{match_id}-{stat['player_id']}"
        cursor.execute("""
        INSERT INTO match_player_stats (id, match_id, player_id, goals, assists, saves, yellow_cards, red_cards, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (stat_id, match_id, stat['player_id'], int(stat.get('goals', 0)), int(stat.get('assists', 0)), int(stat.get('saves', 0)), int(stat.get('yellow_cards', 0)), int(stat.get('red_cards', 0)), float(stat.get('rating', 6.0))))
        
    conn.commit()
    conn.close()

def delete_match(match_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM matches WHERE id = ?", (match_id,))
    conn.commit()
    conn.close()

def get_expenses():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM expenses ORDER BY date DESC")
    rows = cursor.fetchall()
    expenses = []
    for r in rows:
        expenses.append({
            "id": r["id"],
            "description": r["description"],
            "category": r["category"],
            "amount": r["amount"],
            "date": r["date"],
            "type": r["type"]
        })
    conn.close()
    return expenses

def add_expense(expense_id, description, category, amount, date, expense_type="Gider"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO expenses (id, description, category, amount, date, type)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (expense_id, description, category, float(amount), date, expense_type))
    conn.commit()
    conn.close()

def delete_expense(expense_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    conn.close()

def get_kits():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT k.*, p.name as player_name 
    FROM kits k
    LEFT JOIN players p ON k.player_id = p.id
    ORDER BY k.number ASC
    """)
    rows = cursor.fetchall()
    kits = []
    for r in rows:
        kits.append({
            "id": r["id"],
            "player_id": r["player_id"] or "",
            "player_name": r["player_name"] or "Atanmamış",
            "size": r["size"],
            "number": r["number"] if r["number"] is not None else "",
            "status": r["status"],
            "notes": r["notes"] or "",
            "payment_status": r.get("payment_status", "Ödenmedi") if hasattr(r, 'get') else r["payment_status"]
        })
    conn.close()
    return kits

def add_kit(kit_id, player_id, size, number, status, notes, payment_status="Ödenmedi"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO kits (id, player_id, size, number, status, notes, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (kit_id, player_id or None, size, int(number) if (number is not None and str(number).strip() != "") else None, status, notes or "", payment_status))
    conn.commit()
    conn.close()

def delete_kit(kit_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM kits WHERE id = ?", (kit_id,))
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# TRAINING SESSIONS
# ═══════════════════════════════════════════════════════════════════
def get_training_sessions(team_id, date_from=None, date_to=None):
    conn = get_connection()
    cursor = conn.cursor()
    if date_from and date_to:
        cursor.execute("SELECT * FROM training_sessions WHERE team_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, start_time ASC", (team_id, date_from, date_to))
    else:
        cursor.execute("SELECT * FROM training_sessions WHERE team_id = ? ORDER BY date ASC, start_time ASC", (team_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "team_id": r["team_id"], "title": r["title"], "date": r["date"],
             "start_time": r["start_time"], "end_time": r["end_time"], "location": r["location"] or "",
             "notes": r["notes"] or "", "color": r["color"] or "#00ff88"} for r in rows]

def add_training_session(sid, team_id, title, date, start_time, end_time, location, notes, color):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO training_sessions (id, team_id, title, date, start_time, end_time, location, notes, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (sid, team_id, title, date, start_time, end_time, location or "", notes or "", color or "#00ff88"))
    conn.commit()
    conn.close()

def delete_training_session(sid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM training_sessions WHERE id = ?", (sid,))
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# SEASONS
# ═══════════════════════════════════════════════════════════════════
def get_seasons(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM seasons WHERE team_id = ? ORDER BY start_date DESC", (team_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "team_id": r["team_id"], "name": r["name"], "start_date": r["start_date"],
             "end_date": r["end_date"], "is_active": bool(r["is_active"])} for r in rows]

def add_season(sid, team_id, name, start_date, end_date, is_active=False):
    conn = get_connection()
    cursor = conn.cursor()
    if is_active:
        cursor.execute("UPDATE seasons SET is_active = 0 WHERE team_id = ?", (team_id,))
    cursor.execute("INSERT OR REPLACE INTO seasons (id, team_id, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)",
                   (sid, team_id, name, start_date, end_date, 1 if is_active else 0))
    conn.commit()
    conn.close()

def set_active_season(sid, team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE seasons SET is_active = 0 WHERE team_id = ?", (team_id,))
    cursor.execute("UPDATE seasons SET is_active = 1 WHERE id = ?", (sid,))
    conn.commit()
    conn.close()

def delete_season(sid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM seasons WHERE id = ?", (sid,))
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# TOURNAMENTS
# ═══════════════════════════════════════════════════════════════════
def get_tournaments(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tournaments WHERE team_id = ? ORDER BY start_date DESC", (team_id,))
    rows = cursor.fetchall()
    result = []
    for r in rows:
        cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN our_score > opponent_score THEN 1 ELSE 0 END) as wins, SUM(CASE WHEN our_score = opponent_score THEN 1 ELSE 0 END) as draws, SUM(CASE WHEN our_score < opponent_score THEN 1 ELSE 0 END) as losses, SUM(our_score) as gf, SUM(opponent_score) as ga FROM matches WHERE tournament_id = ?", (r["id"],))
        stats = cursor.fetchone()
        result.append({"id": r["id"], "team_id": r["team_id"], "name": r["name"], "type": r["type"],
                        "start_date": r["start_date"], "end_date": r["end_date"] or "", "notes": r["notes"] or "",
                        "stats": {"total": stats["total"] or 0, "wins": stats["wins"] or 0, "draws": stats["draws"] or 0,
                                  "losses": stats["losses"] or 0, "gf": stats["gf"] or 0, "ga": stats["ga"] or 0}})
    conn.close()
    return result

def add_tournament(tid, team_id, name, ttype, start_date, end_date, notes):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO tournaments (id, team_id, name, type, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
                   (tid, team_id, name, ttype, start_date, end_date or None, notes or ""))
    conn.commit()
    conn.close()

def delete_tournament(tid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tournaments WHERE id = ?", (tid,))
    conn.commit()
    conn.close()

# ═══════════════════════════════════════════════════════════════════
# CALENDAR EVENTS
# ═══════════════════════════════════════════════════════════════════
def get_calendar_events(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, team_id, title, date, time, color,
               COALESCE(event_type, 'Özel') as event_type,
               COALESCE(description, '') as description,
               COALESCE(recurrence, 'none') as recurrence,
               COALESCE(cancelled_dates, '[]') as cancelled_dates,
               linked_id
        FROM calendar_events
        WHERE team_id = ?
        ORDER BY date ASC, time ASC
    """, (team_id,))
    rows = cursor.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["cancelled_dates"] = json.loads(d["cancelled_dates"] or "[]")
        except:
            d["cancelled_dates"] = []
        result.append(d)
    conn.close()
    return result

def add_calendar_event(eid, team_id, title, date, time, color,
                       event_type="Özel", description="", recurrence="none",
                       cancelled_dates=None, linked_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    cancelled_json = json.dumps(cancelled_dates or [])
    cursor.execute("""
        INSERT OR REPLACE INTO calendar_events
            (id, team_id, title, date, time, color, event_type, description, recurrence, cancelled_dates, linked_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (eid, team_id, title, date, time, color, event_type, description, recurrence, cancelled_json, linked_id))
    conn.commit()
    conn.close()

def update_calendar_event(eid, title, time, color, event_type, description, recurrence):
    """Update an existing calendar event's metadata."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE calendar_events
        SET title=?, time=?, color=?, event_type=?, description=?, recurrence=?
        WHERE id=?
    """, (title, time, color, event_type, description, recurrence, eid))
    conn.commit()
    conn.close()

def cancel_calendar_occurrence(eid, date_to_cancel):
    """Add a specific date to the cancelled_dates list for a recurring event."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT cancelled_dates FROM calendar_events WHERE id = ?", (eid,))
    row = cursor.fetchone()
    if row:
        try:
            dates = json.loads(row["cancelled_dates"] or "[]")
        except:
            dates = []
        if date_to_cancel not in dates:
            dates.append(date_to_cancel)
        cursor.execute("UPDATE calendar_events SET cancelled_dates = ? WHERE id = ?",
                       (json.dumps(dates), eid))
        conn.commit()
    conn.close()

def delete_calendar_event(eid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM calendar_events WHERE id = ?", (eid,))
    conn.commit()
    conn.close()

def link_match_to_tournament(match_id, tournament_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE matches SET tournament_id = ? WHERE id = ?", (tournament_id, match_id))
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# PLAYER GOALS
# ═══════════════════════════════════════════════════════════════════
def get_player_goals(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM player_goals WHERE player_id = ? ORDER BY deadline ASC", (player_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "player_id": r["player_id"], "title": r["title"], "target_value": r["target_value"],
             "current_value": r["current_value"], "unit": r["unit"] or "", "deadline": r["deadline"] or "",
             "status": r["status"], "goal_type": r["goal_type"], "stat_key": r["stat_key"] or ""} for r in rows]

def add_player_goal(gid, player_id, title, target_value, current_value, unit, deadline, status, goal_type, stat_key):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO player_goals (id, player_id, title, target_value, current_value, unit, deadline, status, goal_type, stat_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (gid, player_id, title, float(target_value), float(current_value), unit or "", deadline or None, status, goal_type, stat_key or ""))
    conn.commit()
    conn.close()

def update_player_goal_progress(gid, current_value, status):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE player_goals SET current_value = ?, status = ? WHERE id = ?", (float(current_value), status, gid))
    conn.commit()
    conn.close()

def delete_player_goal(gid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM player_goals WHERE id = ?", (gid,))
    conn.commit()
    conn.close()

def sync_stat_goals(player_id):
    """Auto-update goals that are linked to player statistics."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM player_goals WHERE player_id = ? AND goal_type = 'İstatistik' AND status = 'Aktif'", (player_id,))
    goals = cursor.fetchall()
    if not goals:
        conn.close()
        return
    # Get current stats
    cursor.execute("SELECT SUM(goals) as goals, SUM(assists) as assists, COUNT(*) as matches FROM match_player_stats WHERE player_id = ?", (player_id,))
    stats = cursor.fetchone()
    stat_map = {"goals": stats["goals"] or 0, "assists": stats["assists"] or 0, "matches": stats["matches"] or 0}
    for g in goals:
        key = g["stat_key"]
        if key in stat_map:
            new_val = stat_map[key]
            new_status = "Tamamlandı" if new_val >= g["target_value"] else "Aktif"
            cursor.execute("UPDATE player_goals SET current_value = ?, status = ? WHERE id = ?", (new_val, new_status, g["id"]))
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# ANNOUNCEMENTS
# ═══════════════════════════════════════════════════════════════════
def get_announcements(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM announcements WHERE team_id = ? ORDER BY is_pinned DESC, created_at DESC", (team_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "team_id": r["team_id"], "title": r["title"], "content": r["content"],
             "priority": r["priority"], "is_pinned": bool(r["is_pinned"]), "created_at": r["created_at"]} for r in rows]

def add_announcement(aid, team_id, title, content, priority, is_pinned, created_at):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO announcements (id, team_id, title, content, priority, is_pinned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                   (aid, team_id, title, content, priority, 1 if is_pinned else 0, created_at))
    conn.commit()
    conn.close()

def delete_announcement(aid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM announcements WHERE id = ?", (aid,))
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# TRANSFERS
# ═══════════════════════════════════════════════════════════════════
def get_transfers(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""SELECT t.*, p.name as player_name FROM transfers t 
                      JOIN players p ON t.player_id = p.id 
                      WHERE t.team_id = ? ORDER BY t.date DESC""", (team_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "player_id": r["player_id"], "player_name": r["player_name"], "team_id": r["team_id"],
             "transfer_type": r["transfer_type"], "from_team": r["from_team"] or "", "to_team": r["to_team"] or "",
             "date": r["date"], "fee": r["fee"] or 0, "notes": r["notes"] or ""} for r in rows]

def add_transfer(tid, player_id, team_id, transfer_type, from_team, to_team, date, fee, notes):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO transfers (id, player_id, team_id, transfer_type, from_team, to_team, date, fee, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (tid, player_id, team_id, transfer_type, from_team or "", to_team or "", date, int(fee or 0), notes or ""))
    conn.commit()
    conn.close()

def delete_transfer(tid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transfers WHERE id = ?", (tid,))
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# EVALUATIONS
# ═══════════════════════════════════════════════════════════════════
def get_evaluations(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM evaluations WHERE player_id = ? ORDER BY week_date DESC", (player_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "player_id": r["player_id"], "week_date": r["week_date"],
             "attitude": r["attitude"], "effort": r["effort"], "technical": r["technical"],
             "tactical": r["tactical"], "physical": r["physical"], "overall": r["overall"],
             "notes": r["notes"] or ""} for r in rows]

def add_evaluation(eid, player_id, week_date, attitude, effort, technical, tactical, physical, notes):
    overall = round((attitude + effort + technical + tactical + physical) / 5.0, 1)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO evaluations (id, player_id, week_date, attitude, effort, technical, tactical, physical, overall, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (eid, player_id, week_date, attitude, effort, technical, tactical, physical, overall, notes or ""))
    conn.commit()
    conn.close()

def delete_evaluation(eid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM evaluations WHERE id = ?", (eid,))
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# ACHIEVEMENTS
# ═══════════════════════════════════════════════════════════════════
def get_achievements(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM achievements WHERE player_id = ? ORDER BY earned_date DESC", (player_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "player_id": r["player_id"], "badge_type": r["badge_type"],
             "title": r["title"], "description": r["description"] or "", "earned_date": r["earned_date"],
             "is_auto": bool(r["is_auto"])} for r in rows]

def add_achievement(aid, player_id, badge_type, title, description, earned_date, is_auto=False):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO achievements (id, player_id, badge_type, title, description, earned_date, is_auto) VALUES (?, ?, ?, ?, ?, ?, ?)",
                   (aid, player_id, badge_type, title, description or "", earned_date, 1 if is_auto else 0))
    conn.commit()
    conn.close()

def delete_achievement(aid):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM achievements WHERE id = ?", (aid,))
    conn.commit()
    conn.close()

def check_and_award_achievements(player_id):
    """Auto-check and award stat-based achievements for a player."""
    import datetime
    today = datetime.date.today().isoformat()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT SUM(goals) as goals, SUM(assists) as assists, COUNT(*) as matches FROM match_player_stats WHERE player_id = ?", (player_id,))
    stats = cursor.fetchone()
    goals = stats["goals"] or 0
    assists = stats["assists"] or 0
    matches = stats["matches"] or 0

    # Attendance count
    cursor.execute("SELECT COUNT(*) as cnt FROM attendance WHERE player_id = ? AND status = 'Katıldı'", (player_id,))
    att = cursor.fetchone()
    attended = att["cnt"] or 0

    conn.close()

    BADGE_RULES = [
        ("ilk_gol", "⚽ İlk Gol", "İlk resmi maç golü atıldı!", goals >= 1),
        ("5_gol", "🔥 5 Gol", "5 resmi maç golüne ulaşıldı!", goals >= 5),
        ("10_gol", "💥 10 Gol", "10 gol şampiyonu!", goals >= 10),
        ("ilk_asist", "🎯 İlk Asist", "İlk asisti verildi!", assists >= 1),
        ("5_asist", "🅰️ 5 Asist", "5 asiste ulaşıldı!", assists >= 5),
        ("ilk_mac", "🏟️ İlk Maç", "İlk resmi maça çıkıldı!", matches >= 1),
        ("10_mac", "⭐ 10 Maç", "10 resmi maç oynandı!", matches >= 10),
        ("devam_10", "✅ Devam Şampiyonu", "10 antrenmanı peş peşe tamamladı!", attended >= 10),
        ("devam_30", "🏆 30 Antrenman", "30 antrenmanı tamamlayan yıldız!", attended >= 30),
    ]

    for badge_type, title, description, condition in BADGE_RULES:
        if condition:
            aid = f"ach-{player_id}-{badge_type}"
            add_achievement(aid, player_id, badge_type, title, description, today, is_auto=True)


# ═══════════════════════════════════════════════════════════════════
# ATTENDANCE ANALYSIS
# ═══════════════════════════════════════════════════════════════════
def get_attendance_analysis(team_id):
    """Return per-player attendance summary for the given team."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM players WHERE team_id = ?", (team_id,))
    players = cursor.fetchall()

    cursor.execute("SELECT DISTINCT date FROM attendance a JOIN players p ON a.player_id = p.id WHERE p.team_id = ?", (team_id,))
    total_days = len(cursor.fetchall())

    result = []
    for p in players:
        cursor.execute("SELECT status, COUNT(*) as cnt FROM attendance WHERE player_id = ? GROUP BY status", (p["id"],))
        rows = cursor.fetchall()
        counts = {r["status"]: r["cnt"] for r in rows}
        attended = counts.get("Katıldı", 0)
        absent = counts.get("Katılmadı", 0)
        excused = counts.get("İzinli", 0)
        rate = round((attended / total_days * 100), 1) if total_days > 0 else 0
        result.append({"player_id": p["id"], "name": p["name"], "attended": attended,
                        "absent": absent, "excused": excused, "total_days": total_days, "rate": rate})
    result.sort(key=lambda x: x["rate"])
    conn.close()
    return result


# ═══════════════════════════════════════════════════════════════════
# MEDIA & ARCHIVE CRUD FUNCTIONS
# ═══════════════════════════════════════════════════════════════════
def add_player_image(img_id, player_id, file_path, upload_date):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO player_images (id, player_id, file_path, upload_date) VALUES (?, ?, ?, ?)",
                   (img_id, player_id, file_path, upload_date))
    conn.commit()
    conn.close()

def get_player_images(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM player_images WHERE player_id = ? ORDER BY upload_date DESC", (player_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_player_image(img_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM player_images WHERE id = ?", (img_id,))
    row = cursor.fetchone()
    if row:
        try:
            full_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", row["file_path"].lstrip("/"))
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as e:
            print("Error deleting image file:", e)
    cursor.execute("DELETE FROM player_images WHERE id = ?", (img_id,))
    conn.commit()
    conn.close()

def add_player_archive(item_id, player_id, file_path, file_type, file_name, description, upload_date):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO player_archives (id, player_id, file_path, file_type, file_name, description, upload_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (item_id, player_id, file_path, file_type, file_name, description, upload_date))
    conn.commit()
    conn.close()

def get_player_archives(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM player_archives WHERE player_id = ? ORDER BY upload_date DESC", (player_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_player_archive(item_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM player_archives WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    if row:
        try:
            full_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", row["file_path"].lstrip("/"))
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as e:
            print("Error deleting archive file:", e)
    cursor.execute("DELETE FROM player_archives WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()

def add_team_archive(item_id, team_id, file_path, file_type, file_name, description, upload_date):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO team_archives (id, team_id, file_path, file_type, file_name, description, upload_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (item_id, team_id, file_path, file_type, file_name, description, upload_date))
    conn.commit()
    conn.close()

def get_team_archives(team_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM team_archives WHERE team_id = ? ORDER BY upload_date DESC", (team_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_team_archive(item_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM team_archives WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    if row:
        try:
            full_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", row["file_path"].lstrip("/"))
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as e:
            print("Error deleting team archive file:", e)
    cursor.execute("DELETE FROM team_archives WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()

def get_player_attendance_stats(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM attendance WHERE player_id = ?", (player_id,))
    total = cursor.fetchone()["total"] or 0
    cursor.execute("SELECT COUNT(*) as attended FROM attendance WHERE player_id = ? AND status = 'Katıldı'", (player_id,))
    attended = cursor.fetchone()["attended"] or 0
    cursor.execute("SELECT COUNT(*) as sick_injured FROM attendance WHERE player_id = ? AND status IN ('İzinli', 'Sakat')", (player_id,))
    sick_injured = cursor.fetchone()["sick_injured"] or 0
    
    rate = round((attended / total * 100)) if total > 0 else 100
    conn.close()
    return {"total": total, "attended": attended, "sick_injured": sick_injured, "rate": rate}

def get_finance_chart_data(team_id=None):
    import datetime
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get current month info (dues collected)
    finance_summary = get_finance_summary(team_id)
    current_dues_income = finance_summary["total_paid"]
    
    months = []
    income_trend = []
    expense_trend = []
    
    today = datetime.date.today()
    for i in range(5, -1, -1):
        # Calculate date for i months ago
        d = today - datetime.timedelta(days=i*30)
        month_str = d.strftime("%Y-%m")
        months.append(month_str)
        
        # Expenses for this month
        cursor.execute("SELECT SUM(amount) as total FROM expenses WHERE substr(date, 1, 7) = ? AND (type = 'Gider' OR type IS NULL)", (month_str,))
        exp_val = cursor.fetchone()["total"] or 0.0
        
        # Incomes (external) for this month
        cursor.execute("SELECT SUM(amount) as total FROM expenses WHERE substr(date, 1, 7) = ? AND type = 'Gelir'", (month_str,))
        inc_val = cursor.fetchone()["total"] or 0.0
        
        if i == 0:
            expense_trend.append(exp_val)
            income_trend.append(current_dues_income + inc_val)
        else:
            # Historical dues income estimation + actual external income
            est_dues = current_dues_income * (0.9 - (i * 0.02)) if current_dues_income > 0 else 0.0
            income_trend.append(round(est_dues + inc_val, 2))
            expense_trend.append(exp_val)
            
    conn.close()
    return {
        "labels": months,
        "income": income_trend,
        "expenses": expense_trend
    }

def get_attributes_history(player_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT date, attributes FROM attributes_history WHERE player_id = ? ORDER BY date ASC", (player_id,))
    rows = cursor.fetchall()
    history = []
    for r in rows:
        history.append({
            "date": r["date"],
            "attributes": json.loads(r["attributes"])
        })
    conn.close()
    return history

# ── Audit Log ────────────────────────────────────────────────────────────────
def add_audit_log(action, detail="", entity_type="", entity_name=""):
    import time as _time
    from datetime import datetime as _dt
    conn = get_connection()
    cursor = conn.cursor()
    log_id = f"log-{int(_time.time()*1000)}"
    timestamp = _dt.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "INSERT INTO audit_log (id, timestamp, action, detail, entity_type, entity_name) VALUES (?,?,?,?,?,?)",
        (log_id, timestamp, action, detail, entity_type, entity_name)
    )
    conn.commit()
    conn.close()

def get_audit_log(limit=100):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    result = [dict(r) for r in rows]
    conn.close()
    return result

# ── Global Search ─────────────────────────────────────────────────────────────
def search_all(query):
    conn = get_connection()
    cursor = conn.cursor()
    q = f"%{query}%"
    results = []

    cursor.execute("SELECT id, name, 'team' as type FROM teams WHERE name LIKE ? AND (is_archived IS NULL OR is_archived=0) LIMIT 5", (q,))
    for r in cursor.fetchall():
        results.append({"type": "team", "id": r["id"], "label": r["name"], "sub": "Takım"})

    cursor.execute("""SELECT p.id, p.name, p.primary_position, t.name as team_name
        FROM players p LEFT JOIN teams t ON p.team_id=t.id
        WHERE p.name LIKE ? LIMIT 10""", (q,))
    for r in cursor.fetchall():
        results.append({"type": "player", "id": r["id"], "label": r["name"],
                        "sub": f"{r['primary_position']} — {r['team_name'] or ''}"})

    cursor.execute("SELECT id, opponent, date, our_score, opponent_score FROM matches WHERE opponent LIKE ? LIMIT 5", (q,))
    for r in cursor.fetchall():
        results.append({"type": "match", "id": r["id"],
                        "label": f"vs {r['opponent']}",
                        "sub": f"{r['date']}  {r['our_score']}-{r['opponent_score']}"})

    conn.close()
    return results

# ── Financial KPI ─────────────────────────────────────────────────────────────
def get_finance_kpi(team_id=None):
    conn = get_connection()
    cursor = conn.cursor()

    # Total income from fees (paid players)
    if team_id:
        cursor.execute("""
            SELECT COUNT(*) as total, SUM(CASE WHEN fee_status='Ödendi' THEN 1 ELSE 0 END) as paid
            FROM players WHERE team_id=?""", (team_id,))
    else:
        cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN fee_status='Ödendi' THEN 1 ELSE 0 END) as paid FROM players")
    fee_row = cursor.fetchone()
    total_players = fee_row["total"] or 0
    paid_players = fee_row["paid"] or 0
    fee_rate = round((paid_players / total_players * 100) if total_players > 0 else 0, 1)

    # Calculate collected dues
    cursor.execute("SELECT monthly_fee FROM admin_settings WHERE id = 1")
    setting_row = cursor.fetchone()
    STANDARD_FEE = setting_row["monthly_fee"] if (setting_row and setting_row["monthly_fee"]) else 500

    if team_id:
        cursor.execute("SELECT fee_amount FROM players WHERE team_id = ? AND fee_status = 'Ödendi'", (team_id,))
    else:
        cursor.execute("SELECT fee_amount FROM players WHERE fee_status = 'Ödendi'")
    
    dues_collected = 0
    dues_rows = cursor.fetchall()
    for r in dues_rows:
        custom_fee = r["fee_amount"]
        try:
            effective_fee = int(custom_fee) if (custom_fee is not None and custom_fee != '') else STANDARD_FEE
        except (TypeError, ValueError):
            effective_fee = STANDARD_FEE
        dues_collected += effective_fee

    import datetime
    current_month_str = datetime.date.today().strftime("%Y-%m")

    # Current month's external income (type='Gelir')
    cursor.execute("SELECT SUM(amount) as total FROM expenses WHERE type='Gelir' AND substr(date, 1, 7) = ?", (current_month_str,))
    income_row = cursor.fetchone()
    external_income = income_row["total"] or 0

    # Current month's total income
    total_income = dues_collected + external_income

    # Current month's expenses
    cursor.execute("SELECT SUM(amount) as total FROM expenses WHERE (type='Gider' OR type IS NULL) AND substr(date, 1, 7) = ?", (current_month_str,))
    expense_row = cursor.fetchone()
    total_expense = expense_row["total"] or 0

    # Net balance / Cash register (all time dues collected + all time external income - all time expenses)
    cursor.execute("SELECT SUM(amount) as total FROM expenses WHERE type='Gelir'")
    all_external_income = cursor.fetchone()["total"] or 0
    cursor.execute("SELECT SUM(amount) as total FROM expenses WHERE type='Gider' OR type IS NULL")
    all_expenses = cursor.fetchone()["total"] or 0
    net_cash_balance = dues_collected + all_external_income - all_expenses

    # Top category
    cursor.execute("""SELECT category, SUM(amount) as cat_total FROM expenses WHERE (type='Gider' OR type IS NULL)
        GROUP BY category ORDER BY cat_total DESC LIMIT 1""")
    top_cat_row = cursor.fetchone()
    top_category = {"name": top_cat_row["category"], "amount": top_cat_row["cat_total"]} if top_cat_row else {"name": "-", "amount": 0}

    conn.close()
    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "balance": round(net_cash_balance, 2),
        "fee_rate": fee_rate,
        "paid_players": paid_players,
        "total_players": total_players,
        "top_expense_category": top_category
    }

# ── Training Load ─────────────────────────────────────────────────────────────
def get_training_load(team_id):
    """Returns per-player attendance count over last 4 weeks and risk level."""
    from datetime import datetime as _dt, timedelta as _td
    conn = get_connection()
    cursor = conn.cursor()

    four_weeks_ago = (_dt.now() - _td(weeks=4)).strftime("%Y-%m-%d")

    cursor.execute("""SELECT p.id, p.name, p.primary_position,
        COUNT(a.id) as sessions_attended
        FROM players p
        LEFT JOIN attendance a ON a.player_id=p.id AND a.date >= ? AND a.status='Katıldı'
        WHERE p.team_id=?
        GROUP BY p.id ORDER BY sessions_attended DESC""", (four_weeks_ago, team_id))

    rows = cursor.fetchall()

    # Count total sessions in last 4 weeks
    cursor.execute("SELECT COUNT(DISTINCT date) as total FROM attendance WHERE date >= ?", (four_weeks_ago,))
    total_sessions = cursor.fetchone()["total"] or 1

    result = []
    for r in rows:
        sessions = r["sessions_attended"] or 0
        load_pct = round(sessions / total_sessions * 100) if total_sessions else 0
        if load_pct >= 85:
            risk = "high"
        elif load_pct >= 50:
            risk = "normal"
        else:
            risk = "low"
        result.append({
            "id": r["id"],
            "name": r["name"],
            "position": r["primary_position"],
            "sessions": sessions,
            "total": total_sessions,
            "load_pct": load_pct,
            "risk": risk
        })
    conn.close()
    return result

# ── Season Comparison ─────────────────────────────────────────────────────────
def get_season_comparison(team_id):
    """Compare aggregate player stats between the two most recent seasons."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM seasons WHERE team_id=? ORDER BY start_date DESC LIMIT 2", (team_id,))
    seasons = cursor.fetchall()

    if len(seasons) < 2:
        conn.close()
        return {"available": False, "message": "Karşılaştırma için en az 2 sezon gereklidir."}

    this_season = dict(seasons[0])
    last_season = dict(seasons[1])

    def get_match_stats_in_range(start, end):
        cursor.execute("""
            SELECT SUM(mps.goals) as goals, SUM(mps.assists) as assists,
                   SUM(mps.yellow_cards) as yellows, SUM(mps.red_cards) as reds,
                   AVG(mps.rating) as avg_rating, COUNT(DISTINCT m.id) as matches
            FROM match_player_stats mps
            JOIN matches m ON m.id=mps.match_id
            WHERE m.team_id=? AND m.date >= ? AND m.date <= ?""", (team_id, start, end))
        row = cursor.fetchone()
        return {
            "goals": row["goals"] or 0,
            "assists": row["assists"] or 0,
            "yellows": row["yellows"] or 0,
            "reds": row["reds"] or 0,
            "avg_rating": round(row["avg_rating"] or 0, 2),
            "matches": row["matches"] or 0
        }

    this_stats = get_match_stats_in_range(this_season["start_date"], this_season["end_date"] or "9999-12-31")
    last_stats = get_match_stats_in_range(last_season["start_date"], last_season["end_date"] or "9999-12-31")

    conn.close()
    return {
        "available": True,
        "this_season": {"name": this_season["name"], **this_stats},
        "last_season": {"name": last_season["name"], **last_stats}
    }
