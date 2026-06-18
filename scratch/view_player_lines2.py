with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js\modules\player.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines 140 to 170 ---")
for idx in range(139, min(170, len(lines))):
    print(f"{idx+1}: {lines[idx].strip()}")

print("\n--- Lines 360 to 390 ---")
for idx in range(359, min(390, len(lines))):
    print(f"{idx+1}: {lines[idx].strip()}")
