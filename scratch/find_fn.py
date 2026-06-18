with open(r"c:\Users\User\Desktop\Altyapı Manager\backend\db.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if "def get_finance_summary" in line or "def get_finance_kpi" in line:
        print(f"Line {idx}: {line.strip()}")
        # print next 30 lines
        for j in range(idx, min(idx + 50, len(lines))):
            print(f"  {j+1}: {lines[j].strip()}")
