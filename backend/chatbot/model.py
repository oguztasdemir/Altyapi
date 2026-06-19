import sqlite3
import re
import datetime
import random
import os
import json
import numpy as np
import sqlite3
import re
import datetime
import random
import os
import json
import numpy as np

# scikit-learn modules for NLP similarity matching
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "responses.json")

def load_responses():
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("Failed to load responses.json:", e)
        return {"TACTICAL_DB": {}, "TRAINING_DB": {}, "MENTAL_DB": {}, "RULES_DB": {}}

# Turkish lowercasing and normalization map
TURKISH_MAP = {
    'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c',
    'İ': 'i', 'Ş': 's', 'Ğ': 'g', 'Ü': 'u', 'Ö': 'o', 'Ç': 'c'
}

def clean_input(text):
    text = text.lower()
    for k, v in TURKISH_MAP.items():
        text = text.replace(k, v)
    # Remove punctuation but keep alphanumeric and spaces
    text = re.sub(r'[^\w\s]', ' ', text)
    # Normalize whitespaces
    return " ".join(text.split())

def get_all_teams():
    from backend import db
    conn = db.get_connection()
    try:
        rows = conn.execute("SELECT id, name FROM teams").fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
    finally:
        conn.close()

def get_all_players():
    from backend import db
    conn = db.get_connection()
    try:
        rows = conn.execute("SELECT id, name, team_id, primary_position, age, squad_role, injury_status, goals, assists, matches_played, fee_status, blood_type, height, weight, parent_name, parent_phone, match_rating, attributes, current_ability, potential_ability FROM players").fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
    finally:
        conn.close()

def get_all_matches():
    from backend import db
    conn = db.get_connection()
    try:
        rows = conn.execute("SELECT opponent, our_score, opponent_score, date, time FROM matches").fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
    finally:
        conn.close()

def get_finance_stats():
    from backend import db
    conn = db.get_connection()
    try:
        inc = conn.execute("SELECT SUM(amount) FROM finances WHERE type='income'").fetchone()[0] or 0
        exp = conn.execute("SELECT SUM(amount) FROM finances WHERE type='expense'").fetchone()[0] or 0
        return inc, exp
    except Exception as e:
        return 0, 0
    finally:
        conn.close()

def get_calendar_plans(team_id):
    from backend import db
    conn = db.get_connection()
    try:
        rows = conn.execute("SELECT id, title, date, time, event_type, description, recurrence FROM calendar_events WHERE team_id=?", (team_id,)).fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
    finally:
        conn.close()

def get_nlp_response(user_message, res_data):
    """
    Finds the best matching response from TACTICAL_DB, TRAINING_DB, MENTAL_DB, RULES_DB
    using TF-IDF vectorization and cosine similarity.
    """
    cleaned_query = clean_input(user_message)
    if not cleaned_query:
        return None

    # Flatten DB structures into search targets
    targets = []
    # targets holds elements as: (reply_data, cleaned_pattern_str)
    
    for db_name in ["TACTICAL_DB", "TRAINING_DB", "MENTAL_DB", "RULES_DB"]:
        database = res_data.get(db_name, {})
        for key, item in database.items():
            patterns = item.get("patterns", [])
            reply = item.get("reply", "")
            for pat in patterns:
                cleaned_pat = clean_input(pat)
                if cleaned_pat:
                    targets.append((reply, cleaned_pat))

    if not targets:
        return None

    # Build corpus: [user_query, pat1, pat2, ...]
    corpus = [cleaned_query] + [t[1] for t in targets]

    try:
        vectorizer = TfidfVectorizer().fit_transform(corpus)
        vectors = vectorizer.toarray()
        
        # Calculate cosine similarity of query (index 0) against all pattern vectors
        query_vector = vectors[0].reshape(1, -1)
        pattern_vectors = vectors[1:]
        
        similarities = cosine_similarity(query_vector, pattern_vectors)[0]
        best_idx = np.argmax(similarities)
        best_score = similarities[best_idx]

        # Prevent short keyword false positives (like query containing 'var' matching the rule 'var')
        # by checking word presence overlap for very high weight.
        matched_pattern = targets[best_idx][1]
        pattern_words = set(matched_pattern.split())
        query_words = set(cleaned_query.split())
        
        # If the matched pattern is a single short word, demand strict overlap
        if len(pattern_words) == 1 and list(pattern_words)[0] in ["var", "sut", "pas", "hiz", "kose"]:
            if list(pattern_words)[0] not in query_words:
                best_score = 0.0

        # Use an appropriate similarity threshold (e.g. 0.35) to accept a fuzzy match
        if best_score > 0.35:
            reply = targets[best_idx][0]
            if isinstance(reply, list):
                return random.choice(reply)
            return reply
    except Exception as e:
        print("NLP Match failed, falling back to pattern matching:", e)
        # Fallback to simple sub-string checks if vectorizer fails
        for reply, pat in targets:
            if pat in cleaned_query or cleaned_query in pat:
                if isinstance(reply, list):
                    return random.choice(reply)
                return reply
                
    return None

# Global cache for pending actions from the chatbot
PENDING_ACTIONS = {}

def get_next_weekday_date(day_name):
    import datetime
    days_map = {
        "pazartesi": 0,
        "sali": 1,
        "carsamba": 2,
        "persembe": 3,
        "cuma": 4,
        "cumartesi": 5,
        "pazar": 6
    }
    target_weekday = days_map.get(day_name)
    if target_weekday is None:
        return None
    today = datetime.date.today()
    # Find next occurrence of the day
    days_ahead = target_weekday - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    return (today + datetime.timedelta(days=days_ahead)).isoformat()

def generate_development_suggestions(player_name, position, attributes_json):
    try:
        attrs = json.loads(attributes_json) if isinstance(attributes_json, str) else attributes_json
    except:
        attrs = {}
    
    # Identify the lowest attributes (value < 70)
    low_attrs = []
    for k, v in attrs.items():
        if isinstance(v, (int, float)) and v < 70 and k not in ["gk_handling", "gk_kicking", "gk_reflexes", "gk_oneonones", "gk_aerial"]:
            low_attrs.append((k, v))
            
    attr_names_tr = {
        "crossing": "Orta Yapma (Kanatlardan isabetli orta açma çalışmaları)",
        "finishing": "Bitiricilik (Ceza sahası içi şut ve gol vuruşu tekrarları)",
        "heading": "Kafa Vuruşu (Kafa şutu ve hava topu karşılama çalışmaları)",
        "dribbling": "Top Sürme (Dar alanda top sürme, çalım ve slalom egzersizleri)",
        "passing": "Pas Yeteneği (Kısa pas, tek pas ve isabetli pas istasyonları)",
        "shooting": "Şut Kalitesi (Ceza sahası dışından şut ve teknik vuruş egzersizleri)",
        "freekick": "Serbest Vuruş (Duran top ve frikik teknik çalışmaları)",
        "penalty": "Penaltı (Penaltı vuruşu ve soğukkanlılık egzersizleri)",
        "volley": "Vole (Havadan gelen topa vuruş ve koordinasyon çalışmaları)",
        "longshots": "Uzaktan Şut (Uzun mesafeli şut ve doğru şut açısı bulma çalışmaları)",
        "corner": "Köşe Vuruşu (Korner organizasyonları ve isabetli orta açma)",
        "firsttouch": "İlk Temas (Gelen topu yumuşatma, kontrol ve yön verme egzersizleri)",
        "technique": "Teknik (Genel top kontrolü ve bireysel teknik beceri çalışmaları)",
        "tackling": "Ayakta Müdahale (Savunma hamlesi ve doğru zamanda top çalma)",
        "marking": "Markaj (Bire bir savunma ve rakibi gölgeleme)",
        "sliding": "Kayarak Müdahale (Kayarak top kesme ve savunma müdahaleleri)",
        "longpassing": "Uzun Pas (Uzun metrajlı diyagonal paslar ve oyun yönünü değiştirme)",
        "curve": "Falso (Kavisli şut ve orta açma teknikleri)",
        "decision": "Karar Verme (Dar alanda hızlı karar alma oyunları ve çift kale maç simülasyonları)",
        "vision": "Oyun Görüşü (Geniş alan oyunları ve pas opsiyonları arama)",
        "determination": "Kararlılık (Mental antrenmanlar ve yüksek tempolu mücadeleler)",
        "teamwork": "Takım Çalışması (Kolektif oyun ve istasyon pas çalışmaları)",
        "positioning": "Pozisyon Alma (Taktiksel yerleşim ve savunma/hücum hattı kayma egzersizleri)",
        "pace": "Hız (Patlayıcı güç ve sürat koşuları)",
        "acceleration": "Hızlanma (Kısa mesafe deparlar ve ani ivmelenme)",
        "stamina": "Kondisyon / Dayanıklılık (Kardiyo yüklemeleri ve interval koşular)",
        "strength": "Fiziksel Güç (Ağırlık ve direnç antrenmanları, ikili mücadele)",
        "agility": "Çeviklik (Koordinasyon merdiveni ve yön değiştirme parkurları)",
        "balance": "Denge (Vücut dengesi ve core bölgesi güçlendirme)",
        "naturalfitness": "Doğal Zindelik (Beslenme, dinlenme ve genel fitness)",
        "flair": "Yaratıcılık (Bire bir hücum özgürlüğü ve yaratıcı dripling)"
    }
    
    low_attrs.sort(key=lambda x: x[1])
    
    suggestions = []
    if low_attrs:
        suggestions.append(f"🔍 **{player_name}** için yapılan nitelik analizine göre öncelikli gelişim alanları şunlardır:")
        for attr, val in low_attrs[:3]:
            tr_desc = attr_names_tr.get(attr, attr.capitalize())
            suggestions.append(f"- **{tr_desc}** (Mevcut Puan: {val}/100)")
    else:
        suggestions.append(f"⭐ **{player_name}** teknik ve fiziksel özellik olarak dengeli bir düzeye sahip. Mevcut formunu koruması için taktiksel çalışmalara ağırlık verilebilir.")
        
    pos_clean = position.upper()
    if any(pos in pos_clean for pos in ["SNT", "OOS", "ST", "AM"]):
        suggestions.append("\n*Hücum oyuncusu tavsiyesi:* Ceza sahası çevresi şut varyasyonları ve hücum yönelimi çalışmaları yapması önerilir.")
    elif any(pos in pos_clean for pos in ["OS", "DOS", "SLK", "SĞK", "CM", "DM", "LM", "RM"]):
        suggestions.append("\n*Orta saha oyuncusu tavsiyesi:* Geçiş oyunları, yön değiştirme pasları ve çevre kontrolü egzersizlerine odaklanmalıdır.")
    elif any(pos in pos_clean for pos in ["STP", "SLB", "SĞB", "CB", "LB", "RB"]):
        suggestions.append("\n*Savunma oyuncusu tavsiyesi:* Bire bir markaj ve kademeye girme koordinasyonu çalışılmalıdır.")
        
    return "\n".join(suggestions)

def detect_player_intent(cleaned_message):
    """
    A scoring system to decide what detail of the player the user is asking about.
    """
    scores = {
        "age": sum(1 for w in ["yas", "dogum", "dogdu", "sene", "kacinda"] if w in cleaned_message),
        "physical": sum(1 for w in ["boy", "kilo", "fizik", "agirlik", "uzun", "boyu", "kilosu", "fit"] if w in cleaned_message),
        "position": sum(1 for w in ["mevki", "pozisyon", "nerede", "rol", "squad", "gorev", "oynar", "oynuyor"] if w in cleaned_message),
        "injury": sum(1 for w in ["sakat", "saglik", "durum", "revir", "iyilesti", "hasta", "tedavi", "rapor"] if w in cleaned_message),
        "stats": sum(1 for w in ["gol", "asist", "skor", "katki", "istatistik", "mac", "performans", "reyting", "puan", "sezon", "verimli"] if w in cleaned_message),
        "parent": sum(1 for w in ["veli", "aile", "anne", "baba", "iletisim", "telefon", "no", "numara", "ulasim"] if w in cleaned_message),
        "payment": sum(1 for w in ["aidat", "borc", "para", "odeme", "ucret", "finans", "para", "makbuz"] if w in cleaned_message),
        "blood": sum(1 for w in ["kan", "grup", "rh", "kan grubu"] if w in cleaned_message),
        "develop": sum(1 for w in ["gelisim", "gelistir", "calismali", "ne yapmali", "nasil gelisir", "zayif", "guclendir", "oneri", "tavsiye"] if w in cleaned_message),
        "summary": sum(1 for w in ["hakkinda", "kimdir", "kim", "profil", "tanit", "kart", "ozet", "detay"] if w in cleaned_message)
    }
    
    best_intent = max(scores, key=scores.get)
    if scores[best_intent] > 0:
        return best_intent
    return "summary"

def detect_general_intent(cleaned_message):
    scores = {
        # plans: "bu hafta bir plan var mı", "antrenman planları", "idman günleri", "en yakın antrenman hangi gün"
        "show_plans": sum(1.5 for w in ["plan", "idman", "antrenman", "calisma", "program", "takvim", "etkinlik", "hali saha"] if w in cleaned_message) +
                      sum(0.8 for w in ["ne zaman", "hangi gun", "var mi", "gunu", "gunleri", "hafta", "yakin", "en yakin"] if w in cleaned_message),
        
        # add_plan: "yarına bir antrenman ekle", "antrenman koy", "antrenman planla"
        "add_plan": sum(1.5 for w in ["ekle", "koy", "planla", "yaz", "olustur", "tanimla"] if w in cleaned_message) +
                    sum(1.5 for w in ["antrenman", "idman", "calisma", "etkinlik", "plan"] if w in cleaned_message) +
                    sum(0.5 for w in ["yarin", "bugun", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"] if w in cleaned_message),
        
        # match_scores: "son maç sonucu", "skorlar", "kaç kaç bitti"
        "match_scores": sum(1.5 for w in ["mac", "skor", "katki", "sonuc", "karsi", "rakip"] if w in cleaned_message) +
                        sum(0.8 for w in ["kac kac", "bitti", "son", "sonuc", "oynadi", "oynanan"] if w in cleaned_message),

        # squads: "kaç kadro var", "takım sayısı", "kadrolar"
        "squads": sum(1.5 for w in ["kadro", "takim", "squad"] if w in cleaned_message) +
                  sum(0.8 for w in ["kac", "adet", "sayisi", "kac tane", "kadrolarim"] if w in cleaned_message),
                  
        # player_count: "kaç oyuncu var", "toplam futbolcu"
        "player_count": sum(1.5 for w in ["oyuncu", "futbolcu", "kisi", "toplam"] if w in cleaned_message) +
                        sum(0.8 for w in ["kac", "adet", "sayisi", "kac tane", "kayitli"] if w in cleaned_message),
                        
        # injured_list: "kimler sakat", "sakatlar", "sakat durumu"
        "injured_list": sum(1.5 for w in ["sakat", "revir", "tedavi", "rapor"] if w in cleaned_message) +
                        sum(0.8 for w in ["kimler", "oyuncular", "durumu", "listesi"] if w in cleaned_message),
                        
        # finances: "bütçe ne kadar", "kasa", "gelir gider"
        "finances": sum(1.5 for w in ["butce", "kasa", "gelir", "gider", "para", "finans"] if w in cleaned_message) +
                    sum(0.8 for w in ["ne kadar", "durumu", "analiz", "tl", "hesap"] if w in cleaned_message),
                    
        # top_scorers: "en golcü", "gol kralı"
        "top_scorers": sum(1.5 for w in ["golcu", "kral", "skorer"] if w in cleaned_message) +
                       sum(0.8 for w in ["en", "gol", "asist", "zirve", "siralam"] if w in cleaned_message),
                       
        # team_training_days: "hangi takım hangi güne antrenman"
        "team_training_days": sum(1.5 for w in ["hangi takim", "takimlarin", "takimlarina"] if w in cleaned_message) +
                             sum(1.5 for w in ["hangi gune", "antrenman gun", "idman gun"] if w in cleaned_message),
    }
    
    best_intent = max(scores, key=scores.get)
    if scores[best_intent] >= 1.5: # Lower threshold to increase flexibility
        return best_intent
    return None

def parse_turkish_date(query):
    import datetime
    months_tr = {
        "ocak": 1, "subat": 2, "mart": 3, "nisan": 4, "mayis": 5, "haziran": 6,
        "temmuz": 7, "agustos": 8, "eylul": 9, "ekim": 10, "kasim": 11, "aralik": 12
    }
    cleaned_query = clean_input(query)
    match = re.search(r'\b(\d{1,2})\s*([a-zıışğüöç]+)\b', cleaned_query)
    if match:
        day = int(match.group(1))
        month_name = match.group(2)
        for m in months_tr:
            if month_name.startswith(m):
                month = months_tr[m]
                year = datetime.date.today().year
                try:
                    return datetime.date(year, month, day).isoformat()
                except ValueError:
                    pass
    return None

def get_date_from_relative_or_absolute(cleaned_query):
    import datetime
    if "bugun" in cleaned_query:
        return datetime.date.today().isoformat()
    if "yarin" in cleaned_query:
        return (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    
    parsed = parse_turkish_date(cleaned_query)
    if parsed:
        return parsed
        
    tr_days = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"]
    for d in tr_days:
        if d in cleaned_query:
            return get_next_weekday_date(d)
            
    return None

def extract_time_from_query(cleaned_query):
    import re
    m1 = re.search(r'\b(\d{1,2})[:.](\d{2})\b', cleaned_query)
    if m1:
        return f"{int(m1.group(1)):02d}:{int(m1.group(2)):02d}"
    
    m2 = re.search(r'sabah\s+(\d{1,2})', cleaned_query)
    if m2:
        val = int(m2.group(1))
        if val <= 12:
            return f"{val:02d}:00"
            
    m3 = re.search(r'(?:aksam|gece)\s+(\d{1,2})', cleaned_query)
    if m3:
        val = int(m3.group(1))
        if val < 12:
            return f"{val+12:02d}:00"
        elif val <= 24:
            return f"{val:02d}:00"
            
    m4 = re.search(r'oglen\s+(\d{1,2})', cleaned_query)
    if m4:
        val = int(m4.group(1))
        if val < 12 and val > 0:
            return f"{val+12:02d}:00"
        elif val == 12:
            return "12:00"

    m5 = re.search(r'(?:saat\s+)?\b(\d{1,2})\s*(?:de|da|te|ta|e|a|de|da|te|ta|e|a|\'de|\'da|\'te|\'ta|\'e|\'a)\b', cleaned_query)
    if m5:
        val = int(m5.group(1))
        return f"{val:02d}:00"
        
    m6 = re.search(r'saat\s+(\d{1,2})\b', cleaned_query)
    if m6:
        return f"{int(m6.group(1)):02d}:00"
        
    return "16:00"

def match_attribute(cleaned_query):
    attr_map = {
        "crossing": ["orta", "crossing"],
        "finishing": ["bitiricilik", "gol vurusu", "finishing"],
        "heading": ["kafa", "heading"],
        "dribbling": ["calim", "dribling", "top surme", "dribbling"],
        "passing": ["pas", "passing"],
        "shooting": ["sut", "shooting", "uzaktan sut"],
        "freekick": ["frikik", "serbest vurus", "freekick"],
        "penalty": ["penalti", "penalty"],
        "volley": ["volley", "vole"],
        "longshots": ["uzaktan sut", "longshots"],
        "corner": ["korner", "kose vurusu", "corner"],
        "firsttouch": ["ilk temas", "firsttouch", "top kontrolu"],
        "technique": ["teknik", "technique"],
        "tackling": ["mudahale", "ayakta mudahale", "tackling"],
        "sliding": ["kayarak mudahale", "sliding"],
        "longpassing": ["uzun pas", "longpassing"],
        "curve": ["falso", "kavis", "curve"],
        "decision": ["karar", "karar verme", "decision"],
        "vision": ["vizyon", "gorus", "oyun gorus", "vision"],
        "determination": ["kararlilik", "determination"],
        "teamwork": ["takim calismasi", "teamwork"],
        "positioning": ["pozisyon alma", "yerlesim", "positioning"],
        "pace": ["hiz", "pace"],
        "acceleration": ["hizlanma", "depar", "acceleration"],
        "stamina": ["kondisyon", "dayaniklilik", "stamina"],
        "strength": ["fiziksel guc", "fiziki guc", "guc dayanimi", "strength"],
        "agility": ["ceviklik", "agility"],
        "balance": ["denge", "balance"],
        "naturalfitness": ["doal zindelik", "zindelik", "naturalfitness"],
        "flair": ["yaraticilik", "flair"]
    }
    for key, words in attr_map.items():
        for w in words:
            # check word boundary or clean substring
            if w in cleaned_query:
                return key
    return None

def match_team(cleaned_query, teams):
    for t in teams:
        t_clean = clean_input(t["name"])
        if t_clean in cleaned_query:
            return t
        # Fuzzy check for barcelona / barceclona
        if "barcelona" in cleaned_query and "barceclona" in t_clean:
            return t
        parts = t_clean.split()
        for part in parts:
            if len(part) > 3 and part in cleaned_query:
                return t
    return None

def predict_response(message, team_id, confirm_action=None, day=None):
    import datetime, uuid, json
    cleaned = clean_input(message)
    words = cleaned.split()

    # Dynamic Data Fetching
    players = get_all_players()
    matches = get_all_matches()
    teams = get_all_teams()
    incomes, expenses = get_finance_stats()
    calendar_events = get_calendar_plans(team_id)

    # Load JSON responses dynamically
    res_data = load_responses()

    # A. Check for direct Action Confirmation Call
    if confirm_action == "update_player_attribute":
        from backend import db
        pending = PENDING_ACTIONS.get(team_id, {})
        player_id = pending.get("player_id")
        player_name = pending.get("player_name")
        attribute = pending.get("attribute")
        attr_tr = pending.get("attr_tr", attribute)
        new_val = pending.get("value")
        old_val = pending.get("old_value")
        
        if player_id and attribute and new_val is not None:
            conn = db.get_connection()
            row = conn.execute("SELECT attributes FROM players WHERE id = ?", (player_id,)).fetchone()
            if row:
                try:
                    attrs = json.loads(row["attributes"])
                except:
                    attrs = {}
                attrs[attribute] = new_val
                conn.execute("UPDATE players SET attributes = ? WHERE id = ?", (json.dumps(attrs), player_id))
                conn.commit()
            conn.close()
            
            db.add_audit_log(
                action="Sohbet Robotu Yetenek Güncelledi",
                detail=f"{player_name} yeteneği {attr_tr} {old_val} -> {new_val} olarak güncellendi.",
                entity_type="player",
                entity_name=player_name
            )
            if team_id in PENDING_ACTIONS:
                PENDING_ACTIONS.pop(team_id)
            return f"✅ **{player_name}** oyuncusunun **{attr_tr}** özelliği başarıyla güncellendi. Önceden: **{old_val}** | Şuan: **{new_val}**."

    if confirm_action == "update_player_status":
        from backend import db
        pending = PENDING_ACTIONS.get(team_id, {})
        player_id = pending.get("player_id")
        player_name = pending.get("player_name")
        new_status = pending.get("value")
        old_status = pending.get("old_value")
        
        if player_id and new_status:
            conn = db.get_connection()
            conn.execute("UPDATE players SET injury_status = ? WHERE id = ?", (new_status, player_id))
            conn.commit()
            conn.close()
            
            db.add_audit_log(
                action="Sohbet Robotu Durum Güncelledi",
                detail=f"{player_name} durumu {old_status} -> {new_status} olarak güncellendi.",
                entity_type="player",
                entity_name=player_name
            )
            if team_id in PENDING_ACTIONS:
                PENDING_ACTIONS.pop(team_id)
            return f"✅ **{player_name}** oyuncusunun sağlık/izin durumu başarıyla güncellendi. Önceden: **{old_status}** | Şuan: **{new_status}**."

    if confirm_action == "add_recurring_training" and day:
        next_date = get_next_weekday_date(day.lower())
        if next_date:
            from backend import db
            t_name = "Kadro"
            active_team = next((t for t in teams if t["id"] == team_id), None)
            if active_team:
                t_name = active_team["name"]
            
            pending = PENDING_ACTIONS.get(team_id, {})
            time_val = pending.get("time", "16:00")
                
            eid = f"event-{int(datetime.datetime.now().timestamp()*1000)}-{uuid.uuid4().hex[:6]}"
            db.add_calendar_event(
                eid=eid,
                team_id=team_id,
                title="Haftalık Rutin Antrenman",
                date=next_date,
                time=time_val,
                color="#00ff88",
                event_type="Antrenman",
                description="Sohbet robotu tarafından otomatik olarak planlanan tekrarlı antrenman.",
                recurrence="weekly"
            )
            db.add_audit_log(
                action="Sohbet Robotu Antrenman Ekledi",
                detail=f"{t_name} için her hafta {day.capitalize()} gününe antrenman eklendi.",
                entity_type="calendar",
                entity_name=t_name
            )
            if team_id in PENDING_ACTIONS:
                PENDING_ACTIONS.pop(team_id)
            return f"✅ **{day.capitalize()}** günleri için her hafta tekrarlanacak antrenman programı başarıyla kaydedildi ve takvime işlendi."

    if confirm_action == "add_one_time_event" and day:
        from backend import db
        t_name = "Kadro"
        active_team = next((t for t in teams if t["id"] == team_id), None)
        if active_team:
            t_name = active_team["name"]
            
        pending = PENDING_ACTIONS.get(team_id, {})
        time_val = pending.get("time", "16:00")
            
        eid = f"event-{int(datetime.datetime.now().timestamp()*1000)}-{uuid.uuid4().hex[:6]}"
        db.add_calendar_event(
            eid=eid,
            team_id=team_id,
            title="Antrenman",
            date=day,
            time=time_val,
            color="#00ff88",
            event_type="Antrenman",
            description="Sohbet robotu tarafından otomatik olarak planlanan tek seferlik antrenman.",
            recurrence="none"
        )
        db.add_audit_log(
            action="Sohbet Robotu Antrenman Ekledi",
            detail=f"{t_name} için {day} tarihine tek seferlik antrenman eklendi.",
            entity_type="calendar",
            entity_name=t_name
        )
        if team_id in PENDING_ACTIONS:
            PENDING_ACTIONS.pop(team_id)
        return f"✅ **{day}** tarihine tek seferlik antrenman programı başarıyla kaydedildi."

    if confirm_action == "compound_plan_change":
        from backend import db
        pending = PENDING_ACTIONS.get(team_id, {})
        t_name = "Kadro"
        active_team = next((t for t in teams if t["id"] == team_id), None)
        if active_team:
            t_name = active_team["name"]
        
        del_info = pending.get("delete")
        del_status = ""
        if del_info:
            target_date = del_info.get("date")
            reason = del_info.get("reason", "İptal")
            conn = db.get_connection()
            rows = conn.execute("SELECT id, title, recurrence FROM calendar_events WHERE team_id = ? AND date = ?", (team_id, target_date)).fetchall()
            conn.close()
            
            for row in rows:
                if row["recurrence"] == "weekly":
                    db.cancel_calendar_occurrence(row["id"], target_date)
                else:
                    db.delete_calendar_event(row["id"])
            
            db.add_audit_log(
                action="Sohbet Robotu Antrenman İptal Etti",
                detail=f"{t_name} için {target_date} tarihli antrenman iptal edildi. Gerekçe: {reason}",
                entity_type="calendar",
                entity_name=t_name
            )
            del_status = f" | 🗑️ {target_date} tarihli antrenman kaldırıldı ({reason})"

        add_info = pending.get("add")
        add_status = ""
        if add_info:
            target_date = add_info.get("date")
            time_val = add_info.get("time", "16:00")
            title = add_info.get("title", "Antrenman")
            eid = f"event-{int(datetime.datetime.now().timestamp()*1000)}-{uuid.uuid4().hex[:6]}"
            db.add_calendar_event(
                eid=eid,
                team_id=team_id,
                title=title,
                date=target_date,
                time=time_val,
                color="#00ff88",
                event_type="Antrenman",
                description="Sohbet robotu tarafından otomatik olarak planlanan antrenman.",
                recurrence="none"
            )
            db.add_audit_log(
                action="Sohbet Robotu Antrenman Ekledi",
                detail=f"{t_name} için {target_date} tarihine {title} eklendi.",
                entity_type="calendar",
                entity_name=t_name
            )
            add_status = f" | 📅 {target_date} {time_val} tarihine '{title}' eklendi"

        if team_id in PENDING_ACTIONS:
            PENDING_ACTIONS.pop(team_id)
        return f"✅ **Plan Güncellemesi Başarılı:**{add_status}{del_status}"

    if confirm_action == "delete_event":
        from backend import db
        pending = PENDING_ACTIONS.get(team_id, {})
        t_name = "Kadro"
        active_team = next((t for t in teams if t["id"] == team_id), None)
        if active_team:
            t_name = active_team["name"]
        
        target_date = pending.get("date")
        reason = pending.get("reason", "İptal")
        
        conn = db.get_connection()
        rows = conn.execute("SELECT id, title, recurrence FROM calendar_events WHERE team_id = ? AND date = ?", (team_id, target_date)).fetchall()
        conn.close()
        
        deleted_any = False
        for row in rows:
            deleted_any = True
            if row["recurrence"] == "weekly":
                db.cancel_calendar_occurrence(row["id"], target_date)
            else:
                db.delete_calendar_event(row["id"])
        
        if deleted_any:
            db.add_audit_log(
                action="Sohbet Robotu Antrenman İptal Etti",
                detail=f"{t_name} için {target_date} tarihli antrenman iptal edildi. Gerekçe: {reason}",
                entity_type="calendar",
                entity_name=t_name
            )
            msg = f"✅ **{target_date}** tarihli antrenman başarıyla kaldırıldı (Gerekçe: {reason})."
        else:
            msg = f"⚠️ **{target_date}** tarihinde kaldırılacak herhangi bir antrenman bulunamadı."
            
        if team_id in PENDING_ACTIONS:
            PENDING_ACTIONS.pop(team_id)
        return msg

    if confirm_action == "bulk_update_players":
        from backend import db
        pending = PENDING_ACTIONS.get(team_id, {})
        target_positions = pending.get("positions")
        pos_name_tr = pending.get("pos_name_tr", "Oyuncular")
        attribute = pending.get("attribute")
        val_change = pending.get("value")
        is_relative = pending.get("is_relative", False)
        is_decrease = pending.get("is_decrease", False)
        
        if target_positions and attribute and val_change is not None:
            conn = db.get_connection()
            rows = conn.execute("SELECT id, name, primary_position, attributes FROM players WHERE team_id = ?", (team_id,)).fetchall()
            updated_count = 0
            
            for row in rows:
                p_pos = row["primary_position"] or ""
                def extract_codes(str_pos):
                    if not str_pos: return []
                    matches = re.findall(r'\(([^)]+)\)', str_pos)
                    if matches:
                        return [m.strip().upper() for m in matches]
                    return [s.strip().upper() for s in re.split(r'[\s,()]+', str_pos) if s.strip()]
                
                player_codes = extract_codes(p_pos)
                is_match = any(code in target_positions for code in player_codes)
                
                if is_match:
                    try:
                        attrs = json.loads(row["attributes"])
                    except:
                        attrs = {}
                    
                    old_val = attrs.get(attribute, 50)
                    if is_relative:
                        if is_decrease:
                            new_val = max(0, old_val - val_change)
                        else:
                            new_val = min(100, old_val + val_change)
                    else:
                        new_val = val_change
                        
                    attrs[attribute] = new_val
                    conn.execute("UPDATE players SET attributes = ? WHERE id = ?", (json.dumps(attrs), row["id"]))
                    updated_count += 1
            
            conn.commit()
            conn.close()
            
            attr_names_tr = {
                "crossing": "Orta Yapma", "finishing": "Bitiricilik", "heading": "Kafa Vuruşu",
                "dribbling": "Top Sürme", "passing": "Pas Yeteneği", "shooting": "Şut",
                "freekick": "Serbest Vuruş", "penalty": "Penaltı", "volley": "Vole",
                "longshots": "Uzaktan Şut", "corner": "Köşe Vuruşu", "firsttouch": "İlk Temas",
                "technique": "Teknik", "tackling": "Ayakta Müdahale", "marking": "Markaj",
                "sliding": "Kayarak Müdahale", "longpassing": "Uzun Pas", "curve": "Falso",
                "decision": "Karar Verme", "vision": "Oyun Görüşü", "determination": "Kararlılık",
                "teamwork": "Takım Çalışması", "positioning": "Pozisyon Alma", "pace": "Hız",
                "acceleration": "Hızlanma", "stamina": "Kondisyon", "strength": "Fiziksel Güç",
                "agility": "Çeviklik", "balance": "Denge", "naturalfitness": "Doğal Zindelik",
                "flair": "Yaratıcılık", "gk_reflexes": "Kaleci Refleksleri", "gk_handling": "Kaleci Elle Oynama",
                "gk_kicking": "Kaleci Degaj/Ayak Yeteneği", "gk_oneonones": "Kaleci Bire Bir Karşı Karşıya",
                "gk_aerial": "Kaleci Hava Topu Çıkışları"
            }
            attr_tr = attr_names_tr.get(attribute, attribute.capitalize())
            
            db.add_audit_log(
                action="Sohbet Robotu Toplu Güncelleme",
                detail=f"{pos_name_tr} oyuncularının {attr_tr} özelliği toplu güncellendi ({updated_count} oyuncu).",
                entity_type="player",
                entity_name=pos_name_tr
            )
            
            if team_id in PENDING_ACTIONS:
                PENDING_ACTIONS.pop(team_id)
            return f"✅ Başarıyla **{updated_count}** {pos_name_tr} oyuncusunun **{attr_tr}** özelliği güncellendi."

    if confirm_action == "add_training_package":
        from backend import db
        pending = PENDING_ACTIONS.get(team_id, {})
        package_name = pending.get("package_name", "Antrenman Paketi")
        events = pending.get("events", [])
        
        t_name = "Kadro"
        active_team = next((t for t in teams if t["id"] == team_id), None)
        if active_team:
            t_name = active_team["name"]
            
        added_count = 0
        for ev in events:
            next_date = get_next_weekday_date(ev["day"])
            if next_date:
                eid = f"event-{int(datetime.datetime.now().timestamp()*1000)}-{uuid.uuid4().hex[:6]}"
                db.add_calendar_event(
                    eid=eid,
                    team_id=team_id,
                    title=ev["title"],
                    date=next_date,
                    time="16:00",
                    color="#00ff88",
                    event_type="Antrenman",
                    description=ev["desc"],
                    recurrence="none"
                )
                added_count += 1
                
        db.add_audit_log(
            action="Sohbet Robotu Paket Ekledi",
            detail=f"{t_name} için {package_name} planlandı ({added_count} antrenman).",
            entity_type="calendar",
            entity_name=t_name
        )
        
        if team_id in PENDING_ACTIONS:
            PENDING_ACTIONS.pop(team_id)
        return f"✅ **{package_name}** başarıyla planlandı. **{added_count}** adet antrenman önümüzdeki haftaya eklendi."

    if confirm_action == "cancel":
        if team_id in PENDING_ACTIONS:
            PENDING_ACTIONS.pop(team_id)
        return "❌ İşlem iptal edildi."

    # B. Check if user typed confirmation in text (e.g., "evet", "onayla", "kaydet")
    if any(w in cleaned for w in ["evet", "onayla", "kaydet", "onay"]) and team_id in PENDING_ACTIONS:
        pending = PENDING_ACTIONS[team_id]
        if pending.get("action") == "add_recurring_training":
            return predict_response("", team_id, confirm_action="add_recurring_training", day=pending.get("day"))
        elif pending.get("action") == "add_one_time_event":
            return predict_response("", team_id, confirm_action="add_one_time_event", day=pending.get("date"))
        elif pending.get("action") == "compound_plan_change":
            return predict_response("", team_id, confirm_action="compound_plan_change")
        elif pending.get("action") == "delete_event":
            return predict_response("", team_id, confirm_action="delete_event")
        elif pending.get("action") == "update_player_attribute":
            return predict_response("", team_id, confirm_action="update_player_attribute")
        elif pending.get("action") == "update_player_status":
            return predict_response("", team_id, confirm_action="update_player_status")
        elif pending.get("action") == "bulk_update_players":
            return predict_response("", team_id, confirm_action="bulk_update_players")
        elif pending.get("action") == "add_training_package":
            return predict_response("", team_id, confirm_action="add_training_package")

    # C. Check if user typed cancellation in text
    if any(w in cleaned for w in ["iptal", "hayir", "vazgec"]) and team_id in PENDING_ACTIONS:
        PENDING_ACTIONS.pop(team_id)
        return "❌ İşlem iptal edildi."

    # D. Training Package and Bulk Update logic
    if any(w in cleaned for w in ["paket", "paketi"]) and any(w in cleaned for w in ["planla", "ekle", "yaz", "olustur"]):
        package_type = None
        package_name = ""
        events_to_add = []
        
        if "hucum" in cleaned:
            package_type = "hucum"
            package_name = "Hücum Antrenman Paketi"
            events_to_add = [
                {"day": "pazartesi", "title": "Şut ve Bitiricilik Çalışması", "desc": "Hücum paketi kapsamında şut ve ceza sahası içi bitiricilik çalışması."},
                {"day": "carsamba", "title": "Kanat Organizasyonları", "desc": "Hücum paketi kapsamında kanatlardan oyun kurma ve orta çalışması."},
                {"day": "cuma", "title": "Set Hücumları ve Taktik", "desc": "Hücum paketi kapsamında hücum setleri ve taktiksel yerleşim çalışması."}
            ]
        elif any(w in cleaned for w in ["savunma", "defans"]):
            package_type = "savunma"
            package_name = "Savunma Antrenman Paketi"
            events_to_add = [
                {"day": "pazartesi", "title": "Bire Bir Savunma ve Kademe", "desc": "Savunma paketi kapsamında bire bir savunma ve kademeye girme koordinasyonu."},
                {"day": "carsamba", "title": "Alan Savunması ve Kaymalar", "desc": "Savunma paketi kapsamında bloklar arası mesafe ve hat kaymaları."},
                {"day": "cuma", "title": "Duran Top Savunması", "desc": "Savunma paketi kapsamında korner ve yan top savunması organizasyonları."}
            ]
        elif any(w in cleaned for w in ["kondisyon", "fizik", "dayaniklilik"]):
            package_type = "kondisyon"
            package_name = "Kondisyon & Dayanıklılık Paketi"
            events_to_add = [
                {"day": "pazartesi", "title": "Interval Koşular", "desc": "Kondisyon paketi kapsamında yüksek tempolu interval koşular ve kardiyo."},
                {"day": "carsamba", "title": "Çeviklik ve Reaksiyon Parkuru", "desc": "Kondisyon paketi kapsamında koordinasyon merdiveni ve yön değiştirme."},
                {"day": "cuma", "title": "Kuvvet ve Core Stabilizasyon", "desc": "Kondisyon paketi kapsamında vücut ağırlığı ile kuvvet ve core bölgesi güçlendirme."}
            ]
            
        if package_type:
            PENDING_ACTIONS[team_id] = {
                "action": "add_training_package",
                "package_type": package_type,
                "package_name": package_name,
                "events": events_to_add
            }
            
            events_preview = "\n".join([f"- **{e['day'].capitalize()} 16:00**: {e['title']}" for e in events_to_add])
            return (
                f"🏋️ **{package_name}** planlamak istediğinizi anladım. Önümüzdeki hafta için şu antrenmanlar takviminize eklenecektir:\n\n"
                f"{events_preview}\n\n"
                f"**Onaylıyorsanız bu paketi planlayıp takvime işliyorum:**\n\n"
                f'<div class="chatbot-confirm-box" style="margin-top: 10px; display: flex; gap: 8px;">'
                f'  <button onclick="window.confirmChatbotAction(\'add_training_package\', \'\')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: var(--accent-color); color: #000;">Evet, Planla</button>'
                f'  <button onclick="window.confirmChatbotAction(\'cancel\', \'\')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">İptal Et</button>'
                f'</div>'
            )

    # Bulk player update check: e.g. "tüm forvetlerin bitiriciliğini 75 yap"
    if "tum" in cleaned and any(w in cleaned for w in ["yap", "guncelle", "degistir", "ayarla", "set", "artir", "arttir", "ekle", "dusur", "azalt"]):
        target_positions = None
        pos_name_tr = ""
        if any(w in cleaned for w in ["forvet", "hucum", "snt", "slk", "sgk", "oos"]):
            target_positions = ["SNT", "SLK", "SĞK", "OOS", "ST", "AM"]
            pos_name_tr = "Forvet"
        elif any(w in cleaned for w in ["defans", "savunma", "stp", "slb", "sgb", "cb", "lb", "rb", "bek"]):
            target_positions = ["STP", "SLB", "SĞB", "CB", "LB", "RB"]
            pos_name_tr = "Savunma"
        elif any(w in cleaned for w in ["orta saha", "os", "dos", "cm", "dm"]):
            target_positions = ["OS", "DOS", "CM", "DM"]
            pos_name_tr = "Orta Saha"
        elif any(w in cleaned for w in ["kaleci", "kl", "gk"]):
            target_positions = ["KL", "GK"]
            pos_name_tr = "Kaleci"
            
        if target_positions:
            matched_attr = None
            if "refleks" in cleaned:
                matched_attr = "gk_reflexes"
            elif any(w in cleaned for w in ["elle oynama", "handling", "top tutma"]):
                matched_attr = "gk_handling"
            elif any(w in cleaned for w in ["degaj", "kicking", "ayakla oynama"]):
                matched_attr = "gk_kicking"
            elif any(w in cleaned for w in ["bire bir", "kar karsiya", "oneonones"]):
                matched_attr = "gk_oneonones"
            elif any(w in cleaned for w in ["hava topu", "aerial", "havadan"]):
                matched_attr = "gk_aerial"
            else:
                matched_attr = match_attribute(cleaned)
                
            if matched_attr:
                num_matches = re.findall(r'\b(\d{1,3})\b', message)
                if num_matches:
                    val_change = int(num_matches[0])
                    is_relative = any(w in cleaned for w in ["artir", "arttir", "ekle", "dusur", "azalt"])
                    is_decrease = any(w in cleaned for w in ["dusur", "azalt"])
                    
                    PENDING_ACTIONS[team_id] = {
                        "action": "bulk_update_players",
                        "positions": target_positions,
                        "pos_name_tr": pos_name_tr,
                        "attribute": matched_attr,
                        "value": val_change,
                        "is_relative": is_relative,
                        "is_decrease": is_decrease
                    }
                    
                    attr_names_tr = {
                        "crossing": "Orta Yapma", "finishing": "Bitiricilik", "heading": "Kafa Vuruşu",
                        "dribbling": "Top Sürme", "passing": "Pas Yeteneği", "shooting": "Şut",
                        "freekick": "Serbest Vuruş", "penalty": "Penaltı", "volley": "Vole",
                        "longshots": "Uzaktan Şut", "corner": "Köşe Vuruşu", "firsttouch": "İlk Temas",
                        "technique": "Teknik", "tackling": "Ayakta Müdahale", "marking": "Markaj",
                        "sliding": "Kayarak Müdahale", "longpassing": "Uzun Pas", "curve": "Falso",
                        "decision": "Karar Verme", "vision": "Oyun Görüşü", "determination": "Kararlılık",
                        "teamwork": "Takım Çalışması", "positioning": "Pozisyon Alma", "pace": "Hız",
                        "acceleration": "Hızlanma", "stamina": "Kondisyon", "strength": "Fiziksel Güç",
                        "agility": "Çeviklik", "balance": "Denge", "naturalfitness": "Doğal Zindelik",
                        "flair": "Yaratıcılık", "gk_reflexes": "Kaleci Refleksleri", "gk_handling": "Kaleci Elle Oynama",
                        "gk_kicking": "Kaleci Degaj/Ayak Yeteneği", "gk_oneonones": "Kaleci Bire Bir Karşı Karşıya",
                        "gk_aerial": "Kaleci Hava Topu Çıkışları"
                    }
                    attr_tr = attr_names_tr.get(matched_attr, matched_attr.capitalize())
                    
                    op_desc = f"{val_change} artırmak" if (is_relative and not is_decrease) else (f"{val_change} azaltmak" if is_decrease else f"{val_change} olarak eşitlemek")
                    
                    return (
                        f"⚙️ Tüm **{pos_name_tr}** oyuncularının **{attr_tr}** özelliğini "
                        f"**{op_desc}** istediğinizi anladım.\n\n"
                        f"**Onaylıyorsanız toplu güncellemeyi gerçekleştiriyorum:**\n\n"
                        f'<div class="chatbot-confirm-box" style="margin-top: 10px; display: flex; gap: 8px;">'
                        f'  <button onclick="window.confirmChatbotAction(\'bulk_update_players\', \'\')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: var(--accent-color); color: #000;">Evet, Onayla ve Güncelle</button>'
                        f'  <button onclick="window.confirmChatbotAction(\'cancel\', \'\')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">İptal Et</button>'
                        f'</div>'
                    )

    # Antrenman Ekleme/Silme/Güncelleme komutları
    is_add = any(w in cleaned for w in ["ekle", "koy", "planla", "olustur", "tanimla"])
    is_delete = any(w in cleaned for w in ["sil", "iptal", "kaldir", "kaldır", "vazgec"])
    
    if (is_add or is_delete) and any(w in cleaned for w in ["antrenman", "idman", "calisma", "plan", "program"]):
        target_team_id = team_id
        matched_t = match_team(cleaned, teams)
        if matched_t:
            target_team_id = matched_t["id"]
        active_team = next((t for t in teams if t["id"] == target_team_id), None)
        t_name = f"**{active_team['name']}**" if active_team else "Kadro"

        if is_add and is_delete:
            parts = re.split(r'[.!?]|\bve\b', message)
            add_query = ""
            del_query = ""
            for p_part in parts:
                p_clean = clean_input(p_part)
                if any(w in p_clean for w in ["ekle", "koy", "planla", "olustur"]):
                    add_query = p_part
                elif any(w in p_clean for w in ["sil", "iptal", "kaldir", "kaldır"]):
                    del_query = p_part
                    
            add_date = get_date_from_relative_or_absolute(clean_input(add_query)) if add_query else None
            del_date = get_date_from_relative_or_absolute(clean_input(del_query)) if del_query else None
            
            # Fallback multiple date extraction
            months_tr = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"]
            all_dates = []
            matches_iter = re.finditer(r'\b(\d{1,2})\s*([a-zıışğüöç]+)\b', cleaned)
            for m in matches_iter:
                day_val = int(m.group(1))
                m_name = m.group(2)
                for month_idx, month_tr_name in enumerate(months_tr):
                    if m_name.startswith(month_tr_name):
                        all_dates.append(datetime.date(datetime.date.today().year, month_idx+1, day_val).isoformat())
                        
            if not add_date and len(all_dates) >= 1:
                add_date = all_dates[0]
            if not del_date and len(all_dates) >= 2:
                del_date = all_dates[1]
                
            if add_date or del_date:
                parsed_time = extract_time_from_query(clean_input(add_query or message))
                
                reason_match = re.search(r'(?:gerekce|sebep|neden)\s*(?:olarak)?\s*([^.!?]+)', cleaned)
                reason = reason_match.group(1).strip() if reason_match else "İptal"
                reason = reason.replace("yaz", "").replace("olsun", "").strip().capitalize()
                
                title = "Antrenman"
                titles = re.findall(r'([a-zıışğüöç]+)\s+antrenman', cleaned)
                valid_titles = [t for t in titles if t.lower() not in ["icin", "bir", "bu", "her", "haftalik", "rutin", "olan", "gunu", "günü", "gun"]]
                if valid_titles:
                    title = f"{valid_titles[-1].capitalize()} Antrenmanı"
                    
                PENDING_ACTIONS[team_id] = {
                    "action": "compound_plan_change",
                    "add": {
                        "date": add_date,
                        "time": parsed_time,
                        "title": title
                    } if add_date else None,
                    "delete": {
                        "date": del_date,
                        "reason": reason
                    } if del_date else None
                }
                
                msg = f"📅 {t_name} için plan güncellemelerini anladım:\n"
                if add_date:
                    msg += f"- **Eklenecek:** {add_date} tarihinde saat **{parsed_time}** için **'{title}'**\n"
                if del_date:
                    msg += f"- **Kaldırılacak:** {del_date} tarihli antrenman (Gerekçe: **{reason}**)\n"
                msg += f"\n**Onaylıyorsanız planı güncelliyorum:**\n\n"
                msg += (f'<div class="chatbot-confirm-box" style="margin-top: 10px; display: flex; gap: 8px;">'
                        f'  <button onclick="window.confirmChatbotAction(\'compound_plan_change\', \'\')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: var(--accent-color); color: #000;">Evet, Güncelle</button>'
                        f'  <button onclick="window.confirmChatbotAction(\'cancel\', \'\')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">İptal Et</button>'
                        f'</div>')
                return msg

        if is_delete:
            del_date = get_date_from_relative_or_absolute(cleaned)
            if del_date:
                reason_match = re.search(r'(?:gerekce|sebep|neden)\s*(?:olarak)?\s*([^.!?]+)', cleaned)
                reason = reason_match.group(1).strip() if reason_match else "İptal"
                reason = reason.replace("yaz", "").replace("olsun", "").strip().capitalize()
                
                PENDING_ACTIONS[team_id] = {
                    "action": "delete_event",
                    "date": del_date,
                    "reason": reason
                }
                
                return (
                    f"📅 {t_name} için **{del_date}** tarihli antrenmanı kaldırmak istediğinizi anladım (Gerekçe: **{reason}**).\n\n"
                    f"**Onaylıyorsanız kaldırıyorum:**\n\n"
                    f'<div class="chatbot-confirm-box" style="margin-top: 10px; display: flex; gap: 8px;">'
                    f'  <button onclick="window.confirmChatbotAction(\'delete_event\', \'\')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: var(--accent-color); color: #000;">Evet, Kaldır</button>'
                    f'  <button onclick="window.confirmChatbotAction(\'cancel\', \'\')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">İptal Et</button>'
                    f'</div>'
                )

    # 1. Player check with conversational context cache
    matched_player = None
    for p in players:
        p_clean = clean_input(p['name'])
        parts = p_clean.split()
        if p_clean in cleaned or (len(parts) > 1 and parts[-1] in cleaned and len(parts[-1]) > 3):
            matched_player = p
            PENDING_ACTIONS[f"last_player_{team_id}"] = p
            break
            
    is_player_query = any(w in cleaned for w in ["kimdir", "yas", "boy", "kilo", "fizik", "sakat", "gol", "asist", "skor", "veli", "telefon", "aidat", "borc", "kan", "grup", "gelisim", "nasil", "sut", "pas", "hiz", "oneri", "puan", "reyting", "guc", "gucu", "yetenek", "gelmedi", "yoklama", "katilmadi", "devamsiz"])
    is_collective = any(w in cleaned for w in ["odemeyenler", "sakatlar", "kimler", "listesi", "en iyi", "en degerli", "kralligi"])
    if not matched_player and is_player_query and not is_collective:
        matched_player = PENDING_ACTIONS.get(f"last_player_{team_id}")

    # Detect attribute or status modification intents
    if matched_player:
        # 1. Attribute edit detection: e.g. "Arda Güler'in şutunu 85 yap"
        is_attr_edit = any(w in cleaned for w in ["yap", "guncelle", "degistir", "ayarla", "set", "artir", "dusur"])
        matched_attr = match_attribute(cleaned)
        if matched_attr and is_attr_edit:
            num_matches = re.findall(r'\b(\d{1,3})\b', message)
            if num_matches:
                new_val = int(num_matches[0])
                if 0 <= new_val <= 100:
                    try:
                        p_attrs = json.loads(matched_player.get("attributes", "{}"))
                    except:
                        p_attrs = {}
                    old_val = p_attrs.get(matched_attr, 50)
                    
                    attr_names_tr = {
                        "crossing": "Orta Yapma", "finishing": "Bitiricilik", "heading": "Kafa Vuruşu",
                        "dribbling": "Top Sürme", "passing": "Pas Yeteneği", "shooting": "Şut",
                        "freekick": "Serbest Vuruş", "penalty": "Penaltı", "volley": "Vole",
                        "longshots": "Uzaktan Şut", "corner": "Köşe Vuruşu", "firsttouch": "İlk Temas",
                        "technique": "Teknik", "tackling": "Ayakta Müdahale", "marking": "Markaj",
                        "sliding": "Kayarak Müdahale", "longpassing": "Uzun Pas", "curve": "Falso",
                        "decision": "Karar Verme", "vision": "Oyun Görüşü", "determination": "Kararlılık",
                        "teamwork": "Takım Çalışması", "positioning": "Pozisyon Alma", "pace": "Hız",
                        "acceleration": "Hızlanma", "stamina": "Kondisyon", "strength": "Fiziksel Güç",
                        "agility": "Çeviklik", "balance": "Denge", "naturalfitness": "Doğal Zindelik",
                        "flair": "Yaratıcılık"
                    }
                    attr_tr = attr_names_tr.get(matched_attr, matched_attr.capitalize())
                    
                    PENDING_ACTIONS[team_id] = {
                        "action": "update_player_attribute",
                        "player_id": matched_player["id"],
                        "player_name": matched_player["name"],
                        "attribute": matched_attr,
                        "attr_tr": attr_tr,
                        "value": new_val,
                        "old_value": old_val
                    }
                    
                    return (
                        f"🔧 **{matched_player['name']}** oyuncusunun **{attr_tr}** özelliğini "
                        f"**{old_val}** ➡️ **{new_val}** olarak güncellemek istediğinizi anladım.\n\n"
                        f"**Onaylıyorsanız kaydediyorum:**\n\n"
                        f'<div class="chatbot-confirm-box" style="margin-top: 10px; display: flex; gap: 8px;">'
                        f'  <button onclick="window.confirmChatbotAction(\'update_player_attribute\', \'\')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: var(--accent-color); color: #000;">Evet, Kaydet</button>'
                        f'  <button onclick="window.confirmChatbotAction(\'cancel\', \'\')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">İptal Et</button>'
                        f'</div>'
                    )

        # 2. Injury / Leave status edit detection: e.g. "Arda Güler'i sakat yap"
        is_status_edit = any(w in cleaned for w in ["yap", "guncelle", "degistir", "ayarla", "set", "isaretle", "durumu"])
        has_status_keyword = any(w in cleaned for w in ["sakat", "izin", "saglik", "iyiles", "duzel", "izinli"])
        if (is_status_edit or has_status_keyword) and not matched_attr:
            new_status = None
            status_tr = None
            
            if any(w in cleaned for w in ["sakat", "yaralan"]):
                new_status = "Sakat"
                status_tr = "Sakat"
            elif any(w in cleaned for w in ["izin", "izinli"]):
                new_status = "İzinli"
                status_tr = "İzinli"
            elif any(w in cleaned for w in ["saglik", "saglikli", "iyiles", "duzel", "aktif"]):
                new_status = "Sağlıklı"
                status_tr = "Sağlıklı"
                
            if new_status:
                old_status = matched_player.get("injury_status", "Sağlıklı")
                if old_status != new_status:
                    PENDING_ACTIONS[team_id] = {
                        "action": "update_player_status",
                        "player_id": matched_player["id"],
                        "player_name": matched_player["name"],
                        "value": new_status,
                        "old_value": old_status
                    }
                    
                    return (
                        f"🏥 **{matched_player['name']}** oyuncusunun durumunu "
                        f"**{old_status}** ➡️ **{status_tr}** olarak güncellemek istediğinizi anladım.\n\n"
                        f"**Onaylıyorsanız kaydediyorum:**\n\n"
                        f'<div class="chatbot-confirm-box" style="margin-top: 10px; display: flex; gap: 8px;">'
                        f'  <button onclick="window.confirmChatbotAction(\'update_player_status\', \'\')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: var(--accent-color); color: #000;">Evet, Kaydet</button>'
                        f'  <button onclick="window.confirmChatbotAction(\'cancel\', \'\')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">İptal Et</button>'
                        f'</div>'
                    )

    if matched_player:
        p = matched_player
        name = p['name']
        pos = p['primary_position']
        age = p['age']
        role = p['squad_role']
        injury = p['injury_status']
        goals = p['goals']
        assists = p['assists']
        matches_count = p['matches_played']
        fee = p['fee_status']
        blood = p['blood_type']
        h = p['height']
        w = p['weight']
        parent = p['parent_name']
        parent_phone = p['parent_phone']
        rating = p['match_rating']

        # Check for screen reflection command
        is_screen_reflection = any(w in cleaned for w in ["ekrana getir", "yansit", "goster", "ekranda"])
        suffix = ""
        if is_screen_reflection:
            suffix = f"\n\n<img src=\"x\" onerror=\"window.selectPlayerFromChat && window.selectPlayerFromChat('{p['id']}'); this.remove();\" style=\"display:none;\">"

        # Check for attendance check
        if any(w in cleaned for w in ["gelmedi", "yoklama", "katilmadi", "devamsiz"]):
            from backend import db
            conn = db.get_connection()
            absences = conn.execute("SELECT date FROM attendance WHERE player_id = ? AND status = 'Katılmadı' ORDER BY date DESC", (p["id"],)).fetchall()
            conn.close()
            if absences:
                dates_str = ", ".join([r["date"] for r in absences])
                return f"📋 **{name}** şu tarihlerdeki idmanlara/yoklamalara katılmadı: **{dates_str}**."
            else:
                return f"✅ **{name}** tüm antrenmanlara katılmıştır, hiç devamsızlığı bulunmuyor."

        # Check for specific attribute lookup
        specific_attr = match_attribute(cleaned)
        if specific_attr:
            try:
                attrs = json.loads(p['attributes']) if isinstance(p['attributes'], str) else p['attributes']
            except:
                attrs = {}
            val = attrs.get(specific_attr, "Bilinmiyor")
            attr_tr = {
                "crossing": "Orta Yapma", "finishing": "Bitiricilik", "heading": "Kafa Vuruşu", "dribbling": "Top Sürme",
                "passing": "Pas Yeteneği", "shooting": "Şut Kalitesi/Gücü", "freekick": "Serbest Vuruş", "penalty": "Penaltı",
                "volley": "Vole", "longshots": "Uzaktan Şut", "corner": "Köşe Vuruşu", "firsttouch": "İlk Temas",
                "technique": "Teknik", "tackling": "Ayakta Müdahale", "sliding": "Kayarak Müdahale", "longpassing": "Uzun Pas",
                "curve": "Falso", "decision": "Karar Verme", "vision": "Oyun Görüşü", "determination": "Kararlılık",
                "teamwork": "Takım Çalışması", "positioning": "Pozisyon Alma", "pace": "Hız", "acceleration": "Hızlanma",
                "stamina": "Kondisyon/Dayanıklılık", "strength": "Fiziksel Güç", "agility": "Çeviklik", "balance": "Denge",
                "naturalfitness": "Doğal Zindelik", "flair": "Yaratıcılık"
            }.get(specific_attr, specific_attr.capitalize())
            
            return f"**{name}** adlı futbolcunun **{attr_tr}** puanı: **{val}/100**."

        elif any(w in cleaned for w in ["guc", "gucu", "yetenek", "reyting"]):
            ability_cur = p.get('current_ability', 3)
            ability_pot = p.get('potential_ability', 4)
            return (f"**{name}** Genel Performans ve Yetenek Durumu:\n"
                    f"- Ortalama Reyting: **{rating:.2f}/10**\n"
                    f"- Mevcut Yetenek: **{ability_cur}/5**\n"
                    f"- Potansiyel Yetenek: **{ability_pot}/5**{suffix}")

        intent = detect_player_intent(cleaned)

        if intent == "age":
            return f"**{name}**, **{age}** yaşındadır.{suffix}"
        elif intent == "physical":
            return f"**{name}** fiziksel özellikleri: Boy: **{h} cm**, Kilo: **{w} kg**.{suffix}"
        elif intent == "position":
            return f"**{name}** birincil olarak **{pos}** mevkisinde oynamaktadır. Takımdaki rolü: **{role}**.{suffix}"
        elif intent == "injury":
            return f"**{name}** sağlık/sakatlık durumu: **{injury}**.{suffix}"
        elif intent == "stats":
            return f"**{name}** bu sezon **{matches_count}** maçta görev aldı, **{goals} gol** attı, **{assists} asist** yaptı. Reytingi: **{rating:.2f}**.{suffix}"
        elif intent == "parent":
            return f"**{name}** velisi: **{parent}** | Tel: **{parent_phone if parent_phone else 'Kayıtlı değil'}**.{suffix}"
        elif intent == "payment":
            return f"**{name}** aidat ödeme durumu: **{fee}**.{suffix}"
        elif intent == "blood":
            return f"**{name}** kan grubu: **{blood}**.{suffix}"
        elif intent == "develop":
            return generate_development_suggestions(name, pos, p['attributes']) + suffix
        else: # summary
            return (f"**{name} ({pos})** Profil Özeti:\n"
                    f"- Yaş: {age} | Boy: {h}cm | Kilo: {w}kg\n"
                    f"- Gol/Asist: {goals} gol, {assists} asist | Maç: {matches_count} | Reyting: {rating:.2f}\n"
                    f"- Sağlık: {injury} | Aidat: {fee}\n"
                    f"- Veli: {parent} (Tlf: {parent_phone if parent_phone else 'Kayıt yok'}){suffix}")

    # 2. Check for general conversation, greetings or specific database lists
    if any(w in cleaned for w in ["merhaba", "selam", "hey", "selamlar"]):
        return "Merhaba! Altyapı Akıllı Asistanına hoş geldiniz. Kadro durumları, oyuncu profilleri, bütçe raporları, yoklamalar veya taktikler hakkında neyi analiz etmek istersiniz? ⚽"
        
    if any(w in cleaned for w in ["nasilsin", "ne haber", "naber"]):
        return "Harikayım, teşekkürler! Kulübün altyapı işlerini koordine etmek ve size yardımcı olmak için her zaman hazırım. Siz nasılsınız?"
        
    if any(w in cleaned for w in ["gunlerden ne", "tarih ne", "ayin kaci", "tarihi nedir"]):
        now = datetime.datetime.now()
        day_names_tr = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
        day_name = day_names_tr[now.weekday()]
        return f"📅 Bugün **{now.strftime('%d.%m.%Y')}** ({day_name})."

    # En değerli oyuncu sorgusu
    if any(w in cleaned for w in ["en degerli", "en yuksek yetenekli", "en potansiyelli", "en yetenekli", "en iyi", "yildiz oyuncu"]):
        if players:
            sorted_by_rating = sorted(players, key=lambda x: x.get('match_rating', 6.0), reverse=True)
            sorted_by_potential = sorted(players, key=lambda x: x.get('potential_ability', 4), reverse=True)
            
            top_p = sorted_by_rating[0]
            top_pot = sorted_by_potential[0]
            
            msg = f"⭐ **Kadronuzun En Formda ve Yetenekli Oyuncuları:**\n"
            msg += f"- **En Yüksek Reytingli:** {top_p['name']} (Reyting: **{top_p['match_rating']:.2f}**, Mevki: {top_p['primary_position']})\n"
            msg += f"- **En Yüksek Potansiyelli:** {top_pot['name']} (Potansiyel: **{top_pot['potential_ability']}/5**, Mevki: {top_pot['primary_position']})"
            return msg
        return "Kadroda kayıtlı oyuncu bulunmuyor."

    # Aidat ödemeyenler sorgusu
    if any(w in cleaned for w in ["aidat odemeyenler", "borcu olanlar", "ucretini odemeyenler", "para odemeyenler", "odeme yapmayanlar"]):
        unpaid = [p['name'] for p in players if p['fee_status'] == 'Ödenmedi']
        if unpaid:
            return f"💰 **Bu Ay Aidat Ödemesi Yapmayan Oyuncular:**\n" + "\n".join([f"- {name}" for name in unpaid])
        return "✅ Harika! Bu aya ait aidat ödemesini yapmayan oyuncumuz bulunmuyor."



    general_intent = detect_general_intent(cleaned)
    
    if general_intent == "show_plans":
        upcoming_plans = [e for e in calendar_events if e['event_type'] in ["Antrenman", "Maç", "Toplantı"]]
        if upcoming_plans:
            plan_lines = [f"- **{e['date']}** ({e['time'] or 'Belirsiz'}): {e['title']} [{e['event_type']}]" for e in upcoming_plans[:5]]
            return "🗓️ **Yakın Zamandaki Kulüp Planları / Antrenmanlar:**\n" + "\n".join(plan_lines)
        return "Takvim planlayıcıda yakın zamana ait kayıtlı antrenman veya plan bulunamadı."
        
    elif general_intent == "add_plan":
        is_recurring = any(w in cleaned for w in ["her hafta", "haftalik", "rutin"])
        tr_days = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"]
        matched_day = None
        for d in tr_days:
            if d in cleaned:
                matched_day = d
                break
                
        target_team_id = team_id
        matched_t = match_team(cleaned, teams)
        if matched_t:
            target_team_id = matched_t["id"]
            
        t_name = "aktif takım"
        active_team = next((t for t in teams if t["id"] == target_team_id), None)
        if active_team:
            t_name = f"**{active_team['name']}**"

        parsed_time = extract_time_from_query(cleaned)

        if is_recurring and matched_day:
            PENDING_ACTIONS[team_id] = {
                "action": "add_recurring_training",
                "day": matched_day,
                "time": parsed_time
            }
            day_cap = matched_day.capitalize()
            return (
                f"📅 {t_name} için her hafta **{day_cap}** gününe tekrarlanacak bir **Antrenman** planlamak istediğinizi anladım.\n"
                f"Saat: **{parsed_time}**, Renk Etiketi: **Yeşil** olarak planlama yapacağım.\n\n"
                f"**Onaylıyorsanız kaydediyorum:**\n\n"
                f'<div class="chatbot-confirm-box" style="margin-top: 10px; display: flex; gap: 8px;">'
                f'  <button onclick="window.confirmChatbotAction(\'add_recurring_training\', \'{day_cap}\')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: var(--accent-color); color: #000;">Evet, Kaydet</button>'
                f'  <button onclick="window.confirmChatbotAction(\'cancel\', \'\')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">İptal Et</button>'
                f'</div>'
            )
        else:
            target_date = None
            date_label = "Yarın"
            if "bugun" in cleaned:
                target_date = datetime.date.today().isoformat()
                date_label = "Bugün"
            elif "yarin" in cleaned:
                target_date = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
                date_label = "Yarın"
            elif matched_day:
                target_date = get_next_weekday_date(matched_day)
                date_label = matched_day.capitalize()
            else:
                parsed_abs = parse_turkish_date(cleaned)
                if parsed_abs:
                    target_date = parsed_abs
                    date_label = parsed_abs
                else:
                    target_date = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
                    date_label = "Yarın"
                
            PENDING_ACTIONS[team_id] = {
                "action": "add_one_time_event",
                "date": target_date,
                "time": parsed_time
            }
            return (
                f"📅 {t_name} için **{date_label}** tarihine tek seferlik bir **Antrenman** planlamak istediğinizi anladım.\n"
                f"Saat: **{parsed_time}**, Renk Etiketi: **Yeşil** olarak planlama yapacağım.\n\n"
                f"**Onaylıyorsanız kaydediyorum:**\n\n"
                f'<div class="chatbot-confirm-box" style="margin-top: 10px; display: flex; gap: 8px;">'
                f'  <button onclick="window.confirmChatbotAction(\'add_one_time_event\', \'{target_date}\')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: var(--accent-color); color: #000;">Evet, Kaydet</button>'
                f'  <button onclick="window.confirmChatbotAction(\'cancel\', \'\')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; font-weight: bold; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">İptal Et</button>'
                f'</div>'
            )
            
    elif general_intent == "match_scores":
        if matches:
            sorted_m = sorted(matches, key=lambda x: x['date'], reverse=True)
            last_m = sorted_m[0]
            reply = f"⚽ **Son Oynanan Maç Sonucu:**\n- Tarih: **{last_m['date']}**\n- Rakip: **vs {last_m['opponent']}**\n- Skor: **{last_m['our_score']} - {last_m['opponent_score']}**\n\n"
            if len(sorted_m) > 1:
                reply += "**Diğer Son Maçlar:**\n"
                for m in sorted_m[1:4]:
                    reply += f"- {m['date']}: vs {m['opponent']} | **{m['our_score']}-{m['opponent_score']}**\n"
            return reply
        return "Sistemde henüz oynanmış bir maç kaydı bulunmuyor."
        
    elif general_intent == "squads":
        if teams:
            t_names = ", ".join([f"**{t['name']}**" for t in teams])
            return f"Şu anda sistemde kayıtlı toplam **{len(teams)}** adet kadronuz var. Kadrolarınız: {t_names}."
        return "Sistemde henüz oluşturulmuş bir kadro bulunmuyor."
        
    elif general_intent == "player_count":
        return f"Aktif kadrolarınızda kayıtlı toplam **{len(players)}** adet oyuncu bulunmaktadır."
        
    elif general_intent == "injured_list":
        injured = [f"- {p['name']} ({p['injury_status']})" for p in players if p['injury_status'] != "Sağlıklı"]
        if injured:
            return "📋 **Sakatlığı Bulunan Oyuncularımız:**\n" + "\n".join(injured)
        return "✅ Takımda şu an sakat veya sakatlıktan yeni dönen tedavisi süren oyuncu bulunmuyor."
        
    elif general_intent == "finances":
        balance = incomes - expenses
        return (f"📊 **Kulüp Bütçe Analizi:**\n"
                f"- Toplam Gelir: **{incomes:,} TL**\n"
                f"- Toplam Gider: **{expenses:,} TL**\n"
                f"- Net Kasa Durumu: **{balance:,} TL**")
                
    elif general_intent == "top_scorers":
        sorted_p = sorted(players, key=lambda x: x['goals'], reverse=True)[:3]
        lines = [f"- {p['name']}: **{p['goals']} Gol**" for p in sorted_p if p['goals'] > 0]
        if lines:
            return "⚽ **Altyapı Gol Krallığı (İlk 3):**\n" + "\n".join(lines)
        return "Resmi maçlarda henüz gol atan oyuncumuz bulunmuyor."
        
    elif general_intent == "team_training_days":
        lines = []
        for t in teams:
            t_events = get_calendar_plans(t["id"])
            trains = [e for e in t_events if e['event_type'] == "Antrenman"]
            if trains:
                grouped_days = []
                for tr in trains:
                    try:
                        dt = datetime.datetime.strptime(tr['date'], "%Y-%m-%d")
                        day_names_tr = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
                        day_name = day_names_tr[dt.weekday()]
                        if tr['recurrence'] == 'weekly':
                            day_name += " (Haftalık)"
                        grouped_days.append(f"{day_name} {tr['time']}")
                    except:
                        grouped_days.append(tr['date'])
                lines.append(f"- **{t['name']}**: {', '.join(set(grouped_days))}")
            else:
                lines.append(f"- **{t['name']}**: Kayıtlı antrenman yok.")
        if lines:
            return "🏋️ **Takımlara Göre Antrenman Günleri:**\n" + "\n".join(lines)
        return "Sistemde kayıtlı takım veya antrenman planı bulunmuyor."

    # 3. Fallback on NLP response file matching
    nlp_reply = get_nlp_response(message, res_data)
    if nlp_reply:
        return nlp_reply

    # Generative / Reasoning response builder using logic tags
    has_tactical = any(w in ["taktik", "sistem", "dizilis", "formasyon", "oyun"] for w in words)
    has_youth = any(w in ["genc", "altyapi", "gelisim", "akademi", "cocuk", "oyuncu"] for w in words)
    has_fitness = any(w in ["kondisyon", "hiz", "hizlanma", "guc", "dayaniklilik", "ceviklik"] for w in words)
    has_mental = any(w in ["karar", "vizyon", "kararlilik", "liderlik", "konsantrasyon"] for w in words)

    if has_tactical and has_youth:
        return "Genç oyuncuların taktiksel olgunluğa erişmesi zaman alır. Bu yüzden karmaşık taktik roller yerine 4-3-3 veya 4-4-2 gibi dengeli formasyonlarda temel pas ve yerleşme becerilerini çalıştırmanız gelişim açısından daha mantıklıdır."
    if has_youth and has_fitness:
        return "Altyapıda fiziksel yükleme yaparken büyüme kıkırdaklarını korumak için aşırı ağırlıklardan kaçınılmalıdır. Bunun yerine reaksiyon hızı, çeviklik ve dayanıklılık odaklı eğlenceli parkurlar tasarlanmalıdır."
    if has_mental and has_youth:
        return "Karar alma ve saha içi konsantrasyon ancak yüksek tekrarlı oyun simülasyonlarıyla gelişir. Antrenmanlarınızı dar alan çift kale maçlar ve geçiş hücumları ile şekillendirmelisiniz."

    # General Fallback
    return ("Sorunuzu altyapı çerçevesinde analiz ettim. Şu detayları sorgulayabilirsiniz:\n"
            "- **Kadro Bilgileri:** 'Kaç kadrom var?', 'Kadroda kaç oyuncu var?', 'Sakatlar kimler?'\n"
            "- **Oyuncu Ayrıntıları:** '[Oyuncu İsmi] kimdir?', '[Oyuncu İsmi] sakat mı?', '[Oyuncu İsmi] kaç gol attı?', '[Oyuncu İsmi] veli numarası', '[Oyuncu İsmi] aidat durumu', '[Oyuncu İsmi] nasıl geliştirilir?'\n"
            "- **Finansal & Plan:** 'Bütçe ne kadar?', 'Antrenman planları/idman günleri', 'Son maç skoru'\n"
            "- **Futbol Kuralları & Taktik:** 'Ofsayt nedir?', 'Penaltı nedir?', 'Kural 679 nedir?', '4-3-3 nasıl oynanmalı?'")
