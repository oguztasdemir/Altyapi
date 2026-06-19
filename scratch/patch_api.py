import os

api_path = os.path.join("backend", "api.py")
with open(api_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """    def trigger_auto_backup(self, path, method):
        if any(skip in path for skip in ["/api/admin/login", "/api/admin/status", "/api/admin/send-otp", "/api/admin/verify-otp", "/api/backups"]):
            return"""

replacement = """    def trigger_auto_backup(self, path, method):
        # Auto-backup disabled per user request
        return"""

if target in content:
    content = content.replace(target, replacement)
    with open(api_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS")
else:
    # Try with CRLF line endings
    target_crlf = target.replace("\n", "\r\n")
    replacement_crlf = replacement.replace("\n", "\r\n")
    if target_crlf in content:
        content = content.replace(target_crlf, replacement_crlf)
        with open(api_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("SUCCESS CRLF")
    else:
        print("TARGET NOT FOUND")
