with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

unused = ["admin-setup-panel", "admin-login-panel", "modal-forgot-password"]

for idx, line in enumerate(lines, 1):
    for id_name in unused:
        if id_name in line:
            print(f"Line {idx}: {line.strip()}")
