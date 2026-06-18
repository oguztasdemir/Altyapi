with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js\modules\ui.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in range(45, min(95, len(lines))):
    print(f"{idx+1}: {lines[idx].strip()}")
