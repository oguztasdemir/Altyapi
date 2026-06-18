import sqlite3
import re
import datetime
import random
import os
import json
from backend import db

JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "responses.json")

def load_responses():
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("Failed to load responses.json:", e)
        return {"TACTICAL_DB": {}, "TRAINING_DB": {}, "MENTAL_DB": {}}

def clean_input(text):
    text = text.lower()
    replacements = {
        'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c',
        'İ': 'i', 'Ş': 's', 'Ğ': 'g', 'Ü': 'u', 'Ö': 'o', 'Ç': 'c'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text

def get_all_teams():
    conn = db.get_connection()
    try:
        rows = conn.execute("SELECT id, name FROM teams").fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
    finally:
        conn.close()

def get_all_players():
    conn = db.get_connection()
    try:
        rows = conn.execute("SELECT id, name, team_id, primary_position, age, squad_role, injury_status, goals, assists, matches_played, fee_status, blood_type, height, weight, parent_name, parent_phone, match_rating FROM players").fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
    finally:
        conn.close()

def get_all_matches():
    conn = db.get_connection()
    try:
        rows = conn.execute("SELECT opponent, our_score, opponent_score, date, time FROM matches").fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
    finally:
        conn.close()

def get_finance_stats():
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
    conn = db.get_connection()
    try:
        rows = conn.execute("SELECT id, title, date, time, event_type, description, recurrence FROM calendar_events WHERE team_id=?", (team_id,)).fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
    finally:
        conn.close()

def predict_response(message, team_id):
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
    TACTICAL_DB = res_data.get("TACTICAL_DB", {})
    TRAINING_DB = res_data.get("TRAINING_DB", {})
    MENTAL_DB = res_data.get("MENTAL_DB", {})

    # 1. Check if a player name is in the message
    for p in players:
        p_clean = clean_input(p['name'])
        parts = p_clean.split()
        if p_clean in cleaned or (len(parts) > 1 and parts[-1] in cleaned and len(parts[-1]) > 3):
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

            if any(x in cleaned for x in ["yas", "kac yasinda"]):
                return f"**{name}**, **{age}** yaşındadır."
            if any(x in cleaned for x in ["boy", "kilo", "fizik"]):
                return f"**{name}** fiziksel özellikleri: Boy: **{h} cm**, Kilo: **{w} kg**."
            if any(x in cleaned for x in ["mevki", "nerede oynuyor", "pozisyon", "rol"]):
                return f"**{name}** birincil olarak **{pos}** mevkisinde oynamaktadır. Takımdaki rolü: **{role}**."
            if any(x in cleaned for x in ["sakat", "saglik", "durum"]):
                return f"**{name}** sağlık/sakatlık durumu: **{injury}**."
            if any(x in cleaned for x in ["gol", "asist", "skor", "katki", "istatistik"]):
                return f"**{name}** bu sezon **{matches_count}** maçta görev aldı, **{goals} gol** attı, **{assists} asist** yaptı. Reytingi: **{rating:.2f}**."
            if any(x in cleaned for x in ["veli", "aile", "anne", "baba", "iletisim"]):
                return f"**{name}** velisi: **{parent}** | Tel: **{parent_phone if parent_phone else 'Kayıtlı değil'}**."
            if any(x in cleaned for x in ["aidat", "borc", "para", "odeme"]):
                return f"**{name}** aidat ödeme durumu: **{fee}**."
            if any(x in cleaned for x in ["kan", "grub"]):
                return f"**{name}** kan grubu: **{blood}**."
            
            return (f"**{name} ({pos})** Profil Özeti:\n"
                    f"- Yaş: {age} | Boy: {h}cm | Kilo: {w}kg\n"
                    f"- Gol/Asist: {goals} gol, {assists} asist | Maç: {matches_count} | Reyting: {rating:.2f}\n"
                    f"- Sağlık: {injury} | Aidat: {fee}\n"
                    f"- Veli: {parent} (Tlf: {parent_phone if parent_phone else 'Kayıt yok'})")

    # 2. Check for active squads (Kadro / Takım) queries
    if any(x in cleaned for x in ["kac kadro", "kac adet kadro", "kac takim", "takim sayisi", "kadrolarim"]):
        if teams:
            t_names = ", ".join([f"**{t['name']}**" for t in teams])
            return f"Şu anda sistemde kayıtlı toplam **{len(teams)}** adet kadronuz var. Kadrolarınız: {t_names}."
        return "Sistemde henüz oluşturulmuş bir kadro bulunmuyor."

    # 3. Check for specific calendar details / training plans
    if any(x in cleaned for x in ["idman gun", "idman ne zaman", "antrenman gun", "calisma ne zaman", "planlar"]):
        upcoming_plans = [e for e in calendar_events if e['event_type'] in ["Antrenman", "Maç", "Toplantı"]]
        if upcoming_plans:
            plan_lines = [f"- **{e['date']}** ({e['time'] or 'Belirsiz'}): {e['title']} [{e['event_type']}]" for e in upcoming_plans[:5]]
            return "🗓️ **Yakın Zamandaki Kulüp Planları / Antrenmanlar:**\n" + "\n".join(plan_lines)
        return "Takvim planlayıcıda yakın zamana ait kayıtlı antrenman veya plan bulunamadı."

    # 4. Global statistics
    if any(x in cleaned for x in ["kac oyuncu", "kac kisi", "toplam oyuncu"]):
        return f"Aktif kadrolarınızda kayıtlı toplam **{len(players)}** adet oyuncu bulunmaktadır."

    if any(x in cleaned for x in ["sakatlar", "kimler sakat", "sakat oyuncular"]):
        injured = [f"- {p['name']} ({p['injury_status']})" for p in players if p['injury_status'] != "Sağlıklı"]
        if injured:
            return "📋 **Sakatlığı Bulunan Oyuncularımız:**\n" + "\n".join(injured)
        return "✅ Takımda şu an sakat veya sakatlıktan yeni dönen tedavisi süren oyuncu bulunmuyor."

    if any(x in cleaned for x in ["gelir", "gider", "butce", "para", "kasa"]):
        balance = incomes - expenses
        return (f"📊 **Kulüp Bütçe Analizi:**\n"
                f"- Toplam Gelir: **{incomes:,} TL**\n"
                f"- Toplam Gider: **{expenses:,} TL**\n"
                f"- Net Kasa Durumu: **{balance:,} TL**")

    if any(x in cleaned for x in ["en golcu", "gol krali"]):
        sorted_p = sorted(players, key=lambda x: x['goals'], reverse=True)[:3]
        lines = [f"- {p['name']}: **{p['goals']} Gol**" for p in sorted_p if p['goals'] > 0]
        if lines:
            return "⚽ **Altyapı Gol Krallığı (İlk 3):**\n" + "\n".join(lines)
        return "Resmi maçlarda henüz gol atan oyuncumuz bulunmuyor."

    # 5. Check TACTICAL_DB
    for key, data in TACTICAL_DB.items():
        if any(pat in cleaned for pat in data.get("patterns", [])):
            return data.get("reply", "")

    # 6. Check TRAINING_DB
    for key, data in TRAINING_DB.items():
        if any(pat in cleaned for pat in data.get("patterns", [])):
            return data.get("reply", "")

    # 7. Check MENTAL_DB
    for key, data in MENTAL_DB.items():
        if any(pat in cleaned for pat in data.get("patterns", [])):
            reply = data.get("reply", "")
            if isinstance(reply, list):
                return random.choice(reply)
            return reply

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
            "- **Oyuncu Ayrıntıları:** '[Oyuncu İsmi] kimdir?', '[Oyuncu İsmi] sakat mı?', '[Oyuncu İsmi] kaç gol attı?'\n"
            "- **Finansal & Plan:** 'Bütçe ne kadar?', 'Antrenman planları/idman günleri'\n"
            "- **Taktik & Eğitim:** '4-3-3 nasıl oynanmalı?', 'Pas gelişimi nasıl olmalı?'")
