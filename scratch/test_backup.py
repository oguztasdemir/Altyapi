import sys
import os

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import db, backup

def test():
    print("Testing backup system...")
    db.init_db()
    
    # Check daily backup
    backup.check_and_create_daily_backup()
    
    # Get backups
    logs = backup.get_backups_log()
    print("Backups logs:")
    for log in logs:
        print(f"- {log.get('timestamp')}: {log.get('action')} ({log.get('filename')}) -> Size: {log.get('size')}")
        
    # Manual backup
    print("Creating manual backup...")
    fn = backup.create_backup("Test Manuel Backup")
    print(f"Created manual backup: {fn}")
    
    # Check again
    logs = backup.get_backups_log()
    print(f"Total backups: {len(logs)}")
    
    # Clean up test backups
    if fn:
        print(f"Deleting test backup: {fn}")
        backup.delete_backup(fn)
        
    print("Tests complete.")

if __name__ == "__main__":
    test()
