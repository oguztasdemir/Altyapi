import os

api_path = os.path.join("backend", "api.py")
with open(api_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Disable trigger_auto_backup
target_backup = """    def trigger_auto_backup(self, path, method):
        if any(skip in path for skip in ["/api/admin/login", "/api/admin/status", "/api/admin/send-otp", "/api/admin/verify-otp", "/api/backups"]):
            return"""

replacement_backup = """    def trigger_auto_backup(self, path, method):
        # Auto-backup disabled per user request
        return"""

if target_backup in content:
    content = content.replace(target_backup, replacement_backup)
else:
    target_backup_crlf = target_backup.replace("\n", "\r\n")
    replacement_backup_crlf = replacement_backup.replace("\n", "\r\n")
    if target_backup_crlf in content:
        content = content.replace(target_backup_crlf, replacement_backup_crlf)

# 2. Add DELETE /api/backups handler
target_delete = """        if path == "/api/teams":
            team_id = query.get("id", [None])[0]"""

replacement_delete = """        if path == "/api/backups":
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
            team_id = query.get("id", [None])[0]"""

if target_delete in content:
    content = content.replace(target_delete, replacement_delete)
else:
    target_delete_crlf = target_delete.replace("\n", "\r\n")
    replacement_delete_crlf = replacement_delete.replace("\n", "\r\n")
    if target_delete_crlf in content:
        content = content.replace(target_delete_crlf, replacement_delete_crlf)

# 3. Add POST /api/backups/import handler
target_post = """        if path == "/api/backups":
            content_length = int(self.headers.get('Content-Length', 0))"""

replacement_post = """        if path == "/api/backups/import":
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
            content_length = int(self.headers.get('Content-Length', 0))"""

if target_post in content:
    content = content.replace(target_post, replacement_post)
else:
    target_post_crlf = target_post.replace("\n", "\r\n")
    replacement_post_crlf = replacement_post.replace("\n", "\r\n")
    if target_post_crlf in content:
        content = content.replace(target_post_crlf, replacement_post_crlf)

with open(api_path, "w", encoding="utf-8") as f:
    f.write(content)

print("PATCH APPLIED SUCCESSFULLY")
