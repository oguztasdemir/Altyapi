import os
import shutil
import time
import json
import zipfile
from datetime import datetime

# Reference paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DB_PATH = os.path.join(PROJECT_DIR, "data", "database.db")
BACKUP_DIR = os.path.join(PROJECT_DIR, "data", "backups")
LOG_PATH = os.path.join(BACKUP_DIR, "log.json")

def init_backup_system():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    if not os.path.exists(LOG_PATH):
        with open(LOG_PATH, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)

def get_backups_log():
    init_backup_system()
    try:
        with open(LOG_PATH, "r", encoding="utf-8") as f:
            log_data = json.load(f)
            
        updated_log = []
        for entry in log_data:
            filename = entry.get("filename")
            size_str = "Bilinmiyor"
            if filename:
                file_path = os.path.join(BACKUP_DIR, filename)
                if os.path.exists(file_path):
                    size_bytes = os.path.getsize(file_path)
                    if size_bytes >= 1024 * 1024:
                        size_str = f"{size_bytes / (1024 * 1024):.2f} MB"
                    else:
                        size_str = f"{size_bytes / 1024:.1f} KB"
                else:
                    size_str = "Dosya Yok"
            # Prevent altering the original log if we mutate entry directly
            new_entry = dict(entry)
            new_entry["size"] = size_str
            updated_log.append(new_entry)
        return updated_log
    except Exception as e:
        print("Error reading backups log:", e)
        return []

def save_backups_log(log_data):
    init_backup_system()
    try:
        # Strip the dynamically added size field before saving
        clean_log = []
        for entry in log_data:
            clean_entry = dict(entry)
            if "size" in clean_entry:
                del clean_entry["size"]
            clean_log.append(clean_entry)
            
        with open(LOG_PATH, "w", encoding="utf-8") as f:
            json.dump(clean_log, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error writing backups log:", e)

def enforce_retention_policy():
    log_data = get_backups_log()
    if len(log_data) <= 30:
        return
    
    # Keep the last 30 backups, prune older ones
    keep_log = log_data[:30]
    prune_log = log_data[30:]
    
    for entry in prune_log:
        filename = entry.get("filename")
        if filename:
            file_path = os.path.join(BACKUP_DIR, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"Pruned old backup archive: {filename}")
                except Exception as e:
                    print(f"Error pruning archive {filename}:", e)
                    
    save_backups_log(keep_log)

def create_backup(action_description):
    init_backup_system()
    if not os.path.exists(DB_PATH):
        print("Database file does not exist, cannot backup.")
        return None

    # Generate timestamp and filename (.zip)
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"database_{timestamp_str}.zip"
    backup_file_path = os.path.join(BACKUP_DIR, backup_filename)

    try:
        # Create ZIP archive containing database.db
        with zipfile.ZipFile(backup_file_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(DB_PATH, arcname="database.db")
        
        # Log the backup
        log_entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "action": action_description,
            "filename": backup_filename
        }
        
        log_data = get_backups_log()
        log_data.insert(0, log_entry)  # Add new backup at the top
        save_backups_log(log_data)
        
        print(f"Compressed backup created successfully: {backup_filename} - {action_description}")
        
        # Prune older backups
        enforce_retention_policy()
        
        return backup_filename
    except Exception as e:
        print("Error creating compressed backup:", e)
        return None

def restore_backup(backup_filename):
    init_backup_system()
    backup_file_path = os.path.join(BACKUP_DIR, backup_filename)
    
    if not os.path.exists(backup_file_path):
        print(f"Backup archive not found: {backup_filename}")
        return False

    try:
        # Create an automatic backup of the current database state first (safely zipped)
        create_backup(f"Geri yükleme öncesi otomatik yedek ({backup_filename})")
        
        # Extract the database.db from ZIP archive over DB_PATH
        with zipfile.ZipFile(backup_file_path, "r") as zipf:
            zipf.extract("database.db", path=os.path.join(PROJECT_DIR, "data"))
        
        # Log the restore action
        log_entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "action": f"Yedekten geri yükleme yapıldı: {backup_filename}",
            "filename": backup_filename
        }
        log_data = get_backups_log()
        log_data.insert(0, log_entry)
        save_backups_log(log_data)
        
        print(f"Database successfully restored from ZIP: {backup_filename}")
        return True
    except Exception as e:
        print("Error restoring backup from ZIP:", e)
        return False

def delete_backup(backup_filename):
    init_backup_system()
    safe_filename = os.path.basename(backup_filename)
    backup_file_path = os.path.join(BACKUP_DIR, safe_filename)
    
    if not os.path.exists(backup_file_path):
        print(f"Backup file not found to delete: {safe_filename}")
        return False
        
    try:
        os.remove(backup_file_path)
        
        # Remove from log
        log_data = get_backups_log()
        updated_log = [entry for entry in log_data if entry.get("filename") != safe_filename]
        save_backups_log(updated_log)
        
        print(f"Backup file deleted successfully: {safe_filename}")
        return True
    except Exception as e:
        print(f"Error deleting backup file {safe_filename}:", e)
        return False

def check_and_create_daily_backup():
    init_backup_system()
    log_data = get_backups_log()
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    has_today_auto = False
    for entry in log_data:
        timestamp = entry.get("timestamp", "")
        action = entry.get("action", "")
        if timestamp.startswith(today_str) and "Otomatik Günlük Yedek" in action:
            has_today_auto = True
            break
            
    if not has_today_auto:
        print("[+] Günün ilk açılışı: Otomatik günlük yedek oluşturuluyor...")
        create_backup("Otomatik Günlük Yedek")
    else:
        print("[+] Bugün için otomatik günlük yedek zaten mevcut.")
