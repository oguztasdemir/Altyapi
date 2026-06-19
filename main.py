import http.server
import threading
import time
import os
import sys

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend import db, api, backup

PORT = 8080

def start_server():
    # Utilize our custom API Handler with multi-threading
    server_address = ("", PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, api.ApiHandler)
    print(f"\n[+] Altyapı Manager Sunucusu Başlatıldı!")
    print(f"[+] Local URL: http://localhost:{PORT}")
    print(f"[+] Kapatmak için terminalde Ctrl+C tuşlarına basın.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[-] Sunucu kapatılıyor...")
        sys.exit(0)

if __name__ == "__main__":
    print("=" * 50)
    print("           ALTYAPI MANAGER (SQLITE BACKEND)           ")
    print("=" * 50)
    
    # Initialize sqlite database tables
    print("[+] Veritabanı kontrol ediliyor...")
    db.init_db()
    print("[+] Veritabanı hazır.")
    
    # Check and run daily automatic backup on startup
    try:
        backup.check_and_create_daily_backup()
    except Exception as e:
        print("[-] Otomatik günlük yedekleme başlatılamadı:", e)
    
    # Start server thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Automatically open the site in the browser
    time.sleep(0.5)
    import webbrowser
    webbrowser.open(f"http://localhost:{PORT}")
    
    # Stay active
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[-] Uygulama sonlandırıldı.")
        sys.exit(0)
