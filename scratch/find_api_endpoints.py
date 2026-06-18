with open(r"c:\Users\User\Desktop\Altyapı Manager\backend\api.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

endpoints = ["/api/admin/setup", "/api/admin/login", "/api/admin/change-password", "/api/admin/send-otp", "/api/admin/verify-otp"]

for idx, line in enumerate(lines, 1):
    for ep in endpoints:
        if ep in line:
            print(f"Line {idx}: {line.strip()}")
