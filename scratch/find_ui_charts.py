with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js\modules\ui.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if "performance-chart" in line or "progress-chart" in line:
        print(f"Line {idx}: {line.strip()}")
