with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js\modules\player.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if "detail-card-achievements-badges" in line or "detail-contract-" in line:
        print(f"Line {idx}: {line.strip()}")
