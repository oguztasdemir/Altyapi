import http.server
import json
import os
import time
from urllib.parse import urlparse, parse_qs
from backend import db, backup


FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

class ApiHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def trigger_auto_backup(self, path, method):
        # Auto-backup disabled per user request
        return

        desc = "Veri değişikliği"
        if method == "POST":
            descriptions = {
                "/api/players": "Oyuncu eklendi/güncellendi",
                "/api/players/import": "CSV ile toplu oyuncu aktarıldı",
                "/api/teams": "Yeni takım eklendi",
                "/api/teams/update": "Takım adı güncellendi",
                "/api/coaches": "Antrenör eklendi/güncellendi",
                "/api/attendance": "Yoklama kaydı güncellendi",
                "/api/injuries": "Sakatlık kaydı eklendi",
                "/api/injuries/rehab": "Rehabilitasyon süreci güncellendi",
                "/api/finance/expenses": "Finansal işlem eklendi",
                "/api/kits": "Malzeme/Kit kaydı güncellendi",
                "/api/finance/bulk-fee": "Toplu aidat güncellendi",
                "/api/players/fee-settings": "Oyuncu aidat ayarı güncellendi",
                "/api/training": "Antrenman programı güncellendi",
                "/api/seasons": "Sezon kaydı güncellendi",
                "/api/seasons/activate": "Aktif sezon değiştirildi",
                "/api/tournaments": "Turnuva eklendi",
                "/api/tournaments/link-match": "Maç turnuvaya bağlandı",
                "/api/player-goals": "Oyuncu hedefi güncellendi",
                "/api/player-goals/progress": "Oyuncu hedef ilerlemesi güncellendi",
                "/api/announcements": "Duyuru güncellendi",
                "/api/transfers": "Transfer kaydı güncellendi",
                "/api/evaluations": "Oyuncu değerlendirmesi güncellendi",
                "/api/achievements": "Başarı kaydı eklendi/güncellendi",
                "/api/players/gallery": "Galeriye resim eklendi",
                "/api/players/archive": "Oyuncu arşivine dosya eklendi",
                "/api/teams/archive": "Takım arşivine dosya eklendi",
                "/api/matches": "Maç kaydı eklendi/güncellendi"
            }
            desc = descriptions.get(path, "Veri eklendi/güncellendi")
        elif method == "DELETE":
            descriptions = {
                "/api/players": "Oyuncu silindi",
                "/api/teams": "Takım silindi",
                "/api/matches": "Maç silindi",
                "/api/coaches": "Antrenör silindi",
                "/api/injuries": "Sakatlık kaydı silindi",
                "/api/finance/expenses": "Finansal işlem silindi",
                "/api/kits": "Malzeme/Kit kaydı silindi",
                "/api/training": "Antrenman programı silindi",
                "/api/seasons": "Sezon silindi",
                "/api/tournaments": "Turnuva silindi",
                "/api/player-goals": "Oyuncu hedefi silindi",
                "/api/announcements": "Duyuru silindi",
                "/api/transfers": "Transfer kaydı silindi",
                "/api/evaluations": "Oyuncu değerlendirmesi silindi",
                "/api/achievements": "Başarı kaydı silindi",
                "/api/players/gallery": "Galeri resmi silindi",
                "/api/players/archive": "Oyuncu arşiv dosyası silindi",
                "/api/teams/archive": "Takım arşiv dosyası silindi"
            }
            desc = descriptions.get(path, "Veri silindi")
            
        backup.create_backup(desc)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query = parse_qs(parsed_path.query)

        if path == "/api/backups":
            self.send_json_response(200, backup.get_backups_log())
            return
        elif path == "/api/backups/download":
            query = parse_qs(parsed_path.query)
            filename = query.get("filename", [None])[0]
            if not filename:
                self.send_json_response(400, {"status": "error", "message": "Missing filename"})
                return
            safe_filename = os.path.basename(filename)
            file_path = os.path.join(backup.BACKUP_DIR, safe_filename)
            if not os.path.exists(file_path):
                self.send_json_response(404, {"status": "error", "message": "File not found"})
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Disposition", f"attachment; filename=\"{safe_filename}\"")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
            return

        elif path == "/api/search":
            q = query.get("q", [None])[0]
            if q and len(q) >= 2:
                self.send_json_response(200, db.search_all(q))
            else:
                self.send_json_response(200, [])
            return

        elif path == "/api/audit-log":
            limit = int(query.get("limit", ["100"])[0])
            self.send_json_response(200, db.get_audit_log(limit))
            return

        elif path == "/api/players/report":
            player_id = query.get("player_id", [None])[0]
            if not player_id:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
                return
            teams = db.get_teams(include_archived=True)
            player_data = None
            for t in teams:
                for p in t["players"]:
                    if p["id"] == player_id:
                        player_data = p
                        player_data["team_name"] = t["name"]
                        break
            if not player_data:
                self.send_json_response(404, {"status": "error", "message": "Player not found"})
                return
            report = {
                "player": player_data,
                "attendance_stats": db.get_player_attendance_stats(player_id),
                "injuries": db.get_injuries(player_id),
                "attributes_history": db.get_attributes_history(player_id),
                "match_stats": db.get_player_match_stats(player_id),
                "rating_history": db.get_rating_history(player_id),
            }
            self.send_json_response(200, report)
            return

        elif path == "/api/finance/kpi":
            team_id = query.get("team_id", [None])[0]
            self.send_json_response(200, db.get_finance_kpi(team_id))
            return

        elif path == "/api/training/load":
            team_id = query.get("team_id", [None])[0]
            if not team_id:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
                return
            self.send_json_response(200, db.get_training_load(team_id))
            return

        elif path == "/api/seasons/compare":
            team_id = query.get("team_id", [None])[0]
            if not team_id:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
                return
            self.send_json_response(200, db.get_season_comparison(team_id))
            return

        elif path == "/api/teams":
            query = parse_qs(parsed_path.query)
            include_archived = query.get("include_archived", ["false"])[0].lower() == "true"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            teams = db.get_teams(include_archived=include_archived)
            self.wfile.write(json.dumps(teams).encode("utf-8"))
            return
            
        elif path == "/api/attendance":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            date = query.get("date", [None])[0]
            if team_id:
                if date:
                    self.send_json_response(200, db.get_attendance(team_id, date))
                else:
                    self.send_json_response(200, db.get_all_attendance(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/injuries":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_injuries(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/players/history":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_rating_history(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/players/attributes-history":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_attributes_history(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/players/export":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if not team_id:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
                return
            
            teams = db.get_teams(include_archived=True)
            active_team = next((t for t in teams if t["id"] == team_id), None)
            if not active_team:
                self.send_json_response(404, {"status": "error", "message": "Team not found"})
                return
            
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            writer.writerow([
                "İsim", "Yaş", "Uyruk", "Tercih Ayak", "Ana Mevki", "Yan Mevkiler", 
                "Kadro Rolü", "Boy (cm)", "Kilo (kg)", "Kan Grubu", "Veli Adı", "Veli Telefon", 
                "Hız", "Bitiricilik", "Kafa Vuruşu", "Top Sürme", "Pas", "Şut", "Serbest Vuruş", 
                "Penaltı", "Vole", "Uzaktan Şut", "Köşe Vuruşu", "İlk Temas", "Teknik", 
                "Markaj", "Karar Verme", "Vizyon", "Kararlılık", "Takım Çalışması", "Güç"
            ])
            
            for p in active_team["players"]:
                attrs = p["attributes"]
                writer.writerow([
                    p["name"], p["age"], p["nationality"], p["foot"], p["primaryPosition"], p["secondaryPositions"],
                    p["squadRole"], p["height"], p["weight"], p["bloodType"], p["parentName"], p["parentPhone"],
                    attrs.get("pace", 50), attrs.get("finishing", 50), attrs.get("heading", 50), 
                    attrs.get("dribbling", 50), attrs.get("passing", 50), attrs.get("shooting", 50), 
                    attrs.get("freekick", 50), attrs.get("penalty", 50), attrs.get("volley", 50), 
                    attrs.get("longshots", 50), attrs.get("corner", 50), attrs.get("firsttouch", 50), 
                    attrs.get("technique", 50), attrs.get("marking", 50), attrs.get("decision", 50), 
                    attrs.get("vision", 50), attrs.get("determination", 50), attrs.get("teamwork", 50), 
                    attrs.get("strength", 50)
                ])
            
            csv_data = output.getvalue().encode("utf-8-sig")
            
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", f"attachment; filename=\"{active_team['name']}_kadro.csv\"")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(csv_data)
            return

        elif path == "/api/players/match-stats":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_player_match_stats(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return


        elif path == "/api/admin/status":
            settings = db.get_admin_settings()
            if settings:
                self.send_json_response(200, {
                    "is_initialized": settings["is_initialized"],
                    "email": settings["email"],
                    "email_verified": settings["email_verified"],
                    "monthly_fee": settings["monthly_fee"]
                })
            else:
                self.send_json_response(404, {"status": "error", "message": "Settings not found"})
            return

        elif path == "/api/matches":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_matches(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/finance":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            self.send_json_response(200, db.get_finance_summary(team_id))
            return

        elif path == "/api/finance/expenses":
            self.send_json_response(200, db.get_expenses())
            return

        elif path == "/api/players/attendance-stats":
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_player_attendance_stats(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/finance/chart-data":
            team_id = query.get("team_id", [None])[0]
            self.send_json_response(200, db.get_finance_chart_data(team_id))
            return

        elif path == "/api/kits":
            self.send_json_response(200, db.get_kits())
            return

        elif path == "/api/training":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            date_from = query.get("from", [None])[0]
            date_to = query.get("to", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_training_sessions(team_id, date_from, date_to))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/seasons":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_seasons(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/tournaments":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_tournaments(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/calendar-events":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_calendar_events(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/player-goals":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_player_goals(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/announcements":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_announcements(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/transfers":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_transfers(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/evaluations":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_evaluations(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/achievements":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                db.check_and_award_achievements(player_id)
                self.send_json_response(200, db.get_achievements(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/attendance/analysis":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_attendance_analysis(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        elif path == "/api/players/gallery":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_player_images(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/players/archive":
            query = parse_qs(parsed_path.query)
            player_id = query.get("player_id", [None])[0]
            if player_id:
                self.send_json_response(200, db.get_player_archives(player_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return

        elif path == "/api/teams/archive":
            query = parse_qs(parsed_path.query)
            team_id = query.get("team_id", [None])[0]
            if team_id:
                self.send_json_response(200, db.get_team_archives(team_id))
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id"})
            return

        return super().do_GET()


    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        self.trigger_auto_backup(path, "POST")

        if path == "/api/backups/import":
            import base64
            import re
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            file_name = data.get("fileName")
            base64_data = data.get("base64Data")
            
            if file_name and base64_data:
                if not file_name.lower().endswith(".zip"):
                    self.send_json_response(400, {"status": "error", "message": "Sadece .zip uzantılı yedek dosyaları yükleyebilirsiniz."})
                    return
                    
                match = re.match(r"^data:[^;]+;base64,(.*)$", base64_data)
                if match:
                    clean_data = match.group(1)
                else:
                    clean_data = base64_data
                    
                decoded = base64.b64decode(clean_data)
                backup.init_backup_system()
                
                safe_filename = f"imported_{int(time.time())}_{os.path.basename(file_name)}"
                file_path = os.path.join(backup.BACKUP_DIR, safe_filename)
                
                with open(file_path, "wb") as f:
                    f.write(decoded)
                
                from datetime import datetime
                log_entry = {
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "action": f"İçeri Aktarılan Yedek: {file_name}",
                    "filename": safe_filename
                }
                
                try:
                    with open(backup.LOG_PATH, "r", encoding="utf-8") as lf:
                        raw_log = json.load(lf)
                except:
                    raw_log = []
                
                raw_log.insert(0, log_entry)
                with open(backup.LOG_PATH, "w", encoding="utf-8") as lf:
                    json.dump(raw_log, lf, ensure_ascii=False, indent=2)
                
                db.add_audit_log("Yedek İthal Edildi", f"Dosya: {safe_filename}", "backup", "Veritabanı")
                self.send_json_response(200, {"status": "success", "message": "Yedek başarıyla içeri aktarıldı", "filename": safe_filename})
            else:
                self.send_json_response(400, {"status": "error", "message": "Eksik dosya verisi"})
            return

        elif path == "/api/backups":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            action = data.get("action", "Manuel Yedek")
            filename = backup.create_backup(action)
            if filename:
                db.add_audit_log("Manuel Yedek Alındı", f"Dosya: {filename}", "backup", "Veritabanı")
                self.send_json_response(200, {"status": "success", "message": "Yedek başarıyla oluşturuldu", "filename": filename})
            else:
                self.send_json_response(500, {"status": "error", "message": "Yedek oluşturulamadı"})
            return

        elif path == "/api/chatbot":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            message = data.get("message", "")
            team_id = data.get("team_id", "team-1")
            confirm_action = data.get("confirm_action")
            day = data.get("day")
            
            from backend import chatbot
            reply = chatbot.generate_reply(message, team_id, confirm_action=confirm_action, day=day)
            self.send_json_response(200, {"status": "success", "reply": reply})
            return

        elif path == "/api/audit-log":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            db.add_audit_log(
                data.get("action", "İşlem"),
                data.get("detail", ""),
                data.get("entity_type", ""),
                data.get("entity_name", "")
            )
            self.send_json_response(200, {"status": "success"})
            return

        elif path == "/api/backups/restore":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            filename = data.get("filename")
            if not filename:
                self.send_json_response(400, {"status": "error", "message": "filename parametresi eksik"})
                return
            success = backup.restore_backup(filename)
            if success:
                db.vacuum_db()
                self.send_json_response(200, {"status": "success", "message": "Yedek başarıyla geri yüklendi"})
            else:
                self.send_json_response(500, {"status": "error", "message": "Geri yükleme başarısız"})
            return


        elif path == "/api/players/import":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            import csv
            import io
            import uuid
            
            data = json.loads(post_data.decode('utf-8'))
            team_id = data.get("team_id")
            csv_text = data.get("csv")
            
            if not team_id or not csv_text:
                self.send_json_response(400, {"status": "error", "message": "Missing team_id or csv content"})
                return
            
            f = io.StringIO(csv_text)
            reader = csv.reader(f)
            header = next(reader, None)
            
            imported_count = 0
            for row in reader:
                if not row or len(row) < 5:
                    continue
                
                try:
                    name = row[0]
                    age = int(row[1])
                    nationality = row[2]
                    foot = row[3]
                    primary_pos = row[4]
                    secondary_pos = row[5] if len(row) > 5 else ""
                    squad_role = row[6] if len(row) > 6 else "Rotasyon"
                    height = int(row[7]) if len(row) > 7 and row[7] else 175
                    weight = int(row[8]) if len(row) > 8 and row[8] else 70
                    blood_type = row[9] if len(row) > 9 else "Bilinmiyor"
                    parent_name = row[10] if len(row) > 10 else ""
                    parent_phone = row[11] if len(row) > 11 else ""
                    
                    attrs = {
                        "pace": int(row[12]) if len(row) > 12 and row[12] else 50,
                        "acceleration": int(row[12]) if len(row) > 12 and row[12] else 50,
                        "agility": int(row[12]) if len(row) > 12 and row[12] else 50,
                        "finishing": int(row[13]) if len(row) > 13 and row[13] else 50,
                        "heading": int(row[14]) if len(row) > 14 and row[14] else 50,
                        "dribbling": int(row[15]) if len(row) > 15 and row[15] else 50,
                        "passing": int(row[16]) if len(row) > 16 and row[16] else 50,
                        "shooting": int(row[17]) if len(row) > 17 and row[17] else 50,
                        "freekick": int(row[18]) if len(row) > 18 and row[18] else 50,
                        "penalty": int(row[19]) if len(row) > 19 and row[19] else 50,
                        "volley": int(row[20]) if len(row) > 20 and row[20] else 50,
                        "longshots": int(row[21]) if len(row) > 21 and row[21] else 50,
                        "corner": int(row[22]) if len(row) > 22 and row[22] else 50,
                        "firsttouch": int(row[23]) if len(row) > 23 and row[23] else 50,
                        "technique": int(row[24]) if len(row) > 24 and row[24] else 50,
                        "marking": int(row[25]) if len(row) > 25 and row[25] else 50,
                        "decision": int(row[26]) if len(row) > 26 and row[26] else 50,
                        "vision": int(row[27]) if len(row) > 27 and row[27] else 50,
                        "determination": int(row[28]) if len(row) > 28 and row[28] else 50,
                        "teamwork": int(row[29]) if len(row) > 29 and row[29] else 50,
                        "strength": int(row[30]) if len(row) > 30 and row[30] else 50
                    }
                    
                    pid = f"player-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}"
                    db.add_player(
                        pid, team_id, name, age, nationality, foot, primary_pos, secondary_pos,
                        None, attrs, squad_role, height, weight, "Sağlıklı", "",
                        0, 0, 0, 0, 0, 6.0, parent_name, parent_phone, "Ödenmedi", 3, 4,
                        "[]", blood_type, "", "", ""
                    )
                    imported_count += 1
                except Exception as ex:
                    print("Import row error:", ex)
                    continue
            
            self.send_json_response(200, {"status": "success", "imported": imported_count})
            return


        elif path == "/api/admin/update-settings":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            email = data.get("email", "")
            monthly_fee = int(data.get("monthly_fee", 500))
            db.update_admin_settings(email, monthly_fee)
            self.send_json_response(200, {"status": "success", "message": "Settings updated"})
            return

        elif path == "/api/teams/archive":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            team_id = data.get("id")
            is_archived = int(data.get("is_archived", 0))
            if team_id:
                db.archive_team(team_id, is_archived)
                self.send_json_response(200, {"status": "success", "message": "Team archive status updated"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/matches":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            match_id = data.get("id") or f"match-{int(time.time())}"
            team_id = data.get("team_id")
            opponent = data.get("opponent")
            date = data.get("date")
            our_score = int(data.get("our_score", 0))
            opponent_score = int(data.get("opponent_score", 0))
            player_stats = data.get("player_stats", [])
            
            if team_id and opponent and date:
                db.add_match(match_id, team_id, opponent, date, our_score, opponent_score, player_stats)
                self.send_json_response(200, {"status": "success", "message": "Match record saved"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing required match details"})
            return



        elif path == "/api/teams":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            team_id = data.get("id")
            name = data.get("name")
            
            if team_id and name:
                db.add_team(team_id, name)
                self.send_json_response(201, {"status": "success", "message": "Team created"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/teams/update":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            team_id = data.get("id")
            name = data.get("name")
            
            if team_id and name:
                db.update_team_name(team_id, name)
                self.send_json_response(200, {"status": "success", "message": "Team updated"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/players":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            player_id = data.get("id")
            team_id = data.get("team_id")
            name = data.get("name")
            age = data.get("age")
            nationality = data.get("nationality")
            foot = data.get("foot")
            primary_pos = data.get("primaryPosition")
            secondary_pos = data.get("secondaryPositions")
            photo = data.get("photo")
            attributes = data.get("attributes")
            squad_role = data.get("squadRole", "Rotasyon")
            height = data.get("height", 175)
            weight = data.get("weight", 70)
            injury_status = data.get("injuryStatus", "Sağlıklı")
            coach_notes = data.get("coachNotes", "")
            
            matches_played = data.get("matchesPlayed", 0)
            goals = data.get("goals", 0)
            assists = data.get("assists", 0)
            yellow_cards = data.get("yellowCards", 0)
            red_cards = data.get("redCards", 0)
            match_rating = data.get("matchRating", 6.0)
            
            parent_name = data.get("parentName", "")
            parent_phone = data.get("parentPhone", "")
            fee_status = data.get("feeStatus", "Ödenmedi")
            current_ability = data.get("currentAbility", 3)
            potential_ability = data.get("potentialAbility", 4)
            growth_history = data.get("growthHistory") or data.get("growth_history", [])
            
            blood_type = data.get("bloodType", "Bilinmiyor")
            chronic_illnesses = data.get("chronicIllnesses", "")
            allergies = data.get("allergies", "")
            medications = data.get("medications", "")
            
            if player_id and team_id and name:
                db.add_player(
                    player_id, team_id, name, age, nationality, foot,
                    primary_pos, secondary_pos, photo, attributes, squad_role,
                    height, weight, injury_status, coach_notes,
                    matches_played, goals, assists, yellow_cards, red_cards, match_rating,
                    parent_name, parent_phone, fee_status, current_ability, potential_ability,
                    growth_history, blood_type, chronic_illnesses, allergies, medications
                )
                self.send_json_response(201, {"status": "success", "message": "Player added"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/coaches":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            coach_id = data.get("id")
            team_id = data.get("team_id")
            name = data.get("name")
            role = data.get("role")
            
            if coach_id and team_id and name:
                db.add_coach(coach_id, team_id, name, role)
                self.send_json_response(201, {"status": "success", "message": "Coach added"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/attendance":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            records = json.loads(post_data.decode('utf-8'))
            db.save_attendance(records)
            self.send_json_response(200, {"status": "success", "message": "Attendance saved"})
            return

        elif path == "/api/injuries":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            injury_id = data.get("id")
            player_id = data.get("player_id")
            injury_type = data.get("injury_type")
            start_date = data.get("start_date")
            end_date = data.get("end_date")
            notes = data.get("notes", "")
            rehab_stage = data.get("rehab_stage", "Dinlenme")
            rehab_progress = data.get("rehab_progress", 0)
            
            if injury_id and player_id and injury_type and start_date:
                db.add_injury(injury_id, player_id, injury_type, start_date, end_date, notes, rehab_stage, rehab_progress)
                self.send_json_response(201, {"status": "success", "message": "Injury logged"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/injuries/rehab":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            injury_id = data.get("injury_id")
            stage = data.get("rehab_stage")
            progress = data.get("rehab_progress")
            
            if injury_id and stage and progress is not None:
                db.update_injury_rehab(injury_id, stage, progress)
                self.send_json_response(200, {"status": "success", "message": "Rehabilitation progress updated"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/finance/expenses":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            expense_id = data.get("id") or f"exp-{int(time.time()*1000)}"
            description = data.get("description")
            category = data.get("category")
            amount = data.get("amount")
            date = data.get("date")
            expense_type = data.get("type", "Gider")
            
            if description and category and amount and date:
                db.add_expense(expense_id, description, category, amount, date, expense_type)
                self.send_json_response(201, {"status": "success", "message": "Expense logged"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/kits":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            kit_id = data.get("id") or f"kit-{int(time.time()*1000)}"
            player_id = data.get("player_id")
            size = data.get("size")
            number = data.get("number")
            status = data.get("status")
            notes = data.get("notes")
            payment_status = data.get("payment_status", "Ödenmedi")
            
            if size and status:
                db.add_kit(kit_id, player_id, size, number, status, notes, payment_status)
                self.send_json_response(201, {"status": "success", "message": "Kit logged"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return


        elif path == "/api/finance/bulk-fee":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            team_id = data.get("team_id")
            new_amount = data.get("new_amount")
            if team_id and new_amount is not None:
                db.bulk_update_fees(team_id, int(new_amount))
                self.send_json_response(200, {"status": "success", "message": "Toplu aidat güncellendi"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/players/fee-settings":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            player_id = data.get("player_id")
            fee_amount = data.get("fee_amount")  # None or int
            fee_discount_locked = data.get("fee_discount_locked", False)
            if player_id:
                db.update_player_fee_settings(player_id, fee_amount, fee_discount_locked)
                self.send_json_response(200, {"status": "success", "message": "Oyuncu aidat ayarı güncellendi"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing player_id"})
            return


        elif path == "/api/training":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            sid = data.get("id") or f"ts-{int(__import__('time').time()*1000)}"
            db.add_training_session(sid, data["team_id"], data["title"], data["date"],
                                    data.get("start_time","16:00"), data.get("end_time","18:00"),
                                    data.get("location",""), data.get("notes",""), data.get("color","#00ff88"))
            self.send_json_response(201, {"status": "success", "id": sid})
            return

        elif path == "/api/seasons":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            sid = data.get("id") or f"season-{int(__import__('time').time()*1000)}"
            db.add_season(sid, data["team_id"], data["name"], data["start_date"], data["end_date"], data.get("is_active", False))
            self.send_json_response(201, {"status": "success", "id": sid})
            return

        elif path == "/api/seasons/activate":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            db.set_active_season(data["id"], data["team_id"])
            self.send_json_response(200, {"status": "success"})
            return

        elif path == "/api/tournaments":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            tid = data.get("id") or f"tourn-{int(__import__('time').time()*1000)}"
            db.add_tournament(tid, data["team_id"], data["name"], data.get("type","Lig"),
                              data["start_date"], data.get("end_date"), data.get("notes",""))
            self.send_json_response(201, {"status": "success", "id": tid})
            return

        elif path == "/api/calendar-events":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            eid = data.get("id") or f"evt-{int(__import__('time').time()*1000)}"
            db.add_calendar_event(
                eid, data["team_id"], data["title"], data["date"],
                data.get("time", "12:00"), data.get("color", "#4facfe"),
                data.get("event_type", "Özel"),
                data.get("description", ""),
                data.get("recurrence", "none"),
                data.get("cancelled_dates", []),
                data.get("linked_id")
            )
            self.send_json_response(201, {"status": "success", "id": eid})
            return

        elif path == "/api/calendar-events/cancel":
            # Cancel one occurrence of a recurring event
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            eid = data.get("id")
            date_to_cancel = data.get("date")
            if eid and date_to_cancel:
                db.cancel_calendar_occurrence(eid, date_to_cancel)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id or date"})
            return

        elif path == "/api/calendar-events/update":
            # Update an existing calendar event
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            eid = data.get("id")
            if eid:
                db.update_calendar_event(
                    eid,
                    data.get("title", ""),
                    data.get("time", "12:00"),
                    data.get("color", "#4facfe"),
                    data.get("event_type", "Özel"),
                    data.get("description", ""),
                    data.get("recurrence", "none")
                )
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/tournaments/link-match":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            db.link_match_to_tournament(data["match_id"], data.get("tournament_id"))
            self.send_json_response(200, {"status": "success"})
            return

        elif path == "/api/player-goals":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            gid = data.get("id") or f"goal-{int(__import__('time').time()*1000)}"
            db.add_player_goal(gid, data["player_id"], data["title"], data["target_value"],
                               data.get("current_value", 0), data.get("unit",""),
                               data.get("deadline"), data.get("status","Aktif"),
                               data.get("goal_type","Manuel"), data.get("stat_key",""))
            self.send_json_response(201, {"status": "success", "id": gid})
            return

        elif path == "/api/player-goals/progress":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            db.update_player_goal_progress(data["id"], data["current_value"], data.get("status","Aktif"))
            self.send_json_response(200, {"status": "success"})
            return

        elif path == "/api/announcements":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            import datetime as _dt
            aid = data.get("id") or f"ann-{int(__import__('time').time()*1000)}"
            created_at = data.get("created_at") or _dt.datetime.now().isoformat()
            db.add_announcement(aid, data["team_id"], data["title"], data["content"],
                                data.get("priority","Normal"), data.get("is_pinned", False), created_at)
            self.send_json_response(201, {"status": "success", "id": aid})
            return

        elif path == "/api/transfers":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            tid = data.get("id") or f"tr-{int(__import__('time').time()*1000)}"
            db.add_transfer(tid, data["player_id"], data["team_id"], data["transfer_type"],
                            data.get("from_team",""), data.get("to_team",""), data["date"],
                            data.get("fee", 0), data.get("notes",""))
            self.send_json_response(201, {"status": "success", "id": tid})
            return

        elif path == "/api/evaluations":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            eid = data.get("id") or f"eval-{int(__import__('time').time()*1000)}"
            db.add_evaluation(eid, data["player_id"], data["week_date"],
                              int(data.get("attitude",3)), int(data.get("effort",3)),
                              int(data.get("technical",3)), int(data.get("tactical",3)),
                              int(data.get("physical",3)), data.get("notes",""))
            self.send_json_response(201, {"status": "success", "id": eid})
            return

        elif path == "/api/achievements":
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            import datetime as _dt2
            aid = data.get("id") or f"ach-{int(__import__('time').time()*1000)}"
            earned_date = data.get("earned_date") or _dt2.date.today().isoformat()
            db.add_achievement(aid, data["player_id"], data["badge_type"], data["title"],
                               data.get("description",""), earned_date, False)
            self.send_json_response(201, {"status": "success", "id": aid})
            return

        elif path == "/api/upload":
            import base64
            import re
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            file_name = data.get("fileName")
            base64_data = data.get("base64Data")
            
            if file_name and base64_data:
                match = re.match(r"^data:[^;]+;base64,(.*)$", base64_data)
                if match:
                    clean_data = match.group(1)
                else:
                    clean_data = base64_data
                    
                decoded = base64.b64decode(clean_data)
                uploads_dir = os.path.join(FRONTEND_DIR, "uploads")
                os.makedirs(uploads_dir, exist_ok=True)
                
                safe_filename = f"{int(time.time())}_{re.sub(r'[^a-zA-Z0-9_.-]', '', file_name)}"
                file_path = os.path.join(uploads_dir, safe_filename)
                
                with open(file_path, "wb") as f:
                    f.write(decoded)
                    
                url_path = f"/uploads/{safe_filename}"
                self.send_json_response(200, {"status": "success", "filePath": url_path})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing file details"})
            return

        elif path == "/api/players/gallery":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            img_id = data.get("id") or f"img-{int(time.time()*1000)}"
            player_id = data.get("player_id")
            file_path = data.get("file_path")
            upload_date = data.get("upload_date") or time.strftime("%Y-%m-%d %H:%M:%S")
            
            if player_id and file_path:
                db.add_player_image(img_id, player_id, file_path, upload_date)
                self.send_json_response(201, {"status": "success", "id": img_id})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/players/archive":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            item_id = data.get("id") or f"arch-{int(time.time()*1000)}"
            player_id = data.get("player_id")
            file_path = data.get("file_path")
            file_type = data.get("file_type")
            file_name = data.get("file_name")
            description = data.get("description", "")
            upload_date = data.get("upload_date") or time.strftime("%Y-%m-%d %H:%M:%S")
            
            if player_id and file_path and file_type and file_name:
                db.add_player_archive(item_id, player_id, file_path, file_type, file_name, description, upload_date)
                self.send_json_response(201, {"status": "success", "id": item_id})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        elif path == "/api/teams/archive":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            item_id = data.get("id") or f"team-arch-{int(time.time()*1000)}"
            team_id = data.get("team_id")
            file_path = data.get("file_path")
            file_type = data.get("file_type")
            file_name = data.get("file_name")
            description = data.get("description", "")
            upload_date = data.get("upload_date") or time.strftime("%Y-%m-%d %H:%M:%S")
            
            if team_id and file_path and file_type and file_name:
                db.add_team_archive(item_id, team_id, file_path, file_type, file_name, description, upload_date)
                self.send_json_response(201, {"status": "success", "id": item_id})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing fields"})
            return

        self.send_json_response(404, {"status": "error", "message": "Not Found"})


    def do_DELETE(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query = parse_qs(parsed_path.query)
        
        self.trigger_auto_backup(path, "DELETE")
        
        if path == "/api/backups":
            filename = query.get("filename", [None])[0]
            if filename:
                success = backup.delete_backup(filename)
                if success:
                    db.add_audit_log("Yedek Silindi", f"Dosya: {filename}", "backup", "Veritabanı")
                    self.send_json_response(200, {"status": "success", "message": "Yedek silindi"})
                else:
                    self.send_json_response(500, {"status": "error", "message": "Yedek silinemedi"})
            else:
                self.send_json_response(400, {"status": "error", "message": "filename parametresi eksik"})
            return

        elif path == "/api/teams":
            team_id = query.get("id", [None])[0]
            if team_id:
                db.delete_team(team_id)
                self.send_json_response(200, {"status": "success", "message": "Team deleted"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/matches":
            match_id = query.get("id", [None])[0]
            if match_id:
                db.delete_match(match_id)
                self.send_json_response(200, {"status": "success", "message": "Match deleted"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return
            
        elif path == "/api/players":
            player_id = query.get("id", [None])[0]
            if player_id:
                db.delete_player(player_id)
                self.send_json_response(200, {"status": "success", "message": "Player deleted"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/coaches":
            coach_id = query.get("id", [None])[0]
            if coach_id:
                db.delete_coach(coach_id)
                self.send_json_response(200, {"status": "success", "message": "Coach deleted"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/injuries":
            injury_id = query.get("id", [None])[0]
            if injury_id:
                db.delete_injury(injury_id)
                self.send_json_response(200, {"status": "success", "message": "Injury log deleted"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/finance/expenses":
            expense_id = query.get("id", [None])[0]
            if expense_id:
                db.delete_expense(expense_id)
                self.send_json_response(200, {"status": "success", "message": "Expense deleted"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/kits":
            kit_id = query.get("id", [None])[0]
            if kit_id:
                db.delete_kit(kit_id)
                self.send_json_response(200, {"status": "success", "message": "Kit deleted"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/training":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_training_session(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/seasons":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_season(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/tournaments":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_tournament(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/calendar-events":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_calendar_event(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/player-goals":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_player_goal(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/announcements":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_announcement(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/transfers":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_transfer(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/evaluations":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_evaluation(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/achievements":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_achievement(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/players/gallery":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_player_image(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/players/archive":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_player_archive(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        elif path == "/api/teams/archive":
            item_id = query.get("id", [None])[0]
            if item_id:
                db.delete_team_archive(item_id)
                self.send_json_response(200, {"status": "success"})
            else:
                self.send_json_response(400, {"status": "error", "message": "Missing id"})
            return

        self.send_json_response(404, {"status": "error", "message": "Not Found"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))
