with open(r"c:\Users\User\Desktop\Altyapı Manager\backend\db.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

unused = ["update_admin_password", "add_verification_code", "get_verification_code", "set_email_verified"]

for idx, line in enumerate(lines, 1):
    for f_name in unused:
        if f"def {f_name}" in line:
            print(f"Line {idx}: {line.strip()}")
            # print surrounding lines
            for j in range(idx, min(idx + 15, len(lines))):
                print(f"  {j+1}: {lines[j].strip()}")
