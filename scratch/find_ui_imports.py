with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js\modules\ui.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if "handleAdminSetupSubmit" in line or "handleAdminLoginSubmit" in line:
        print(f"Line {idx}: {line.strip()}")
        # print surrounding lines
        for j in range(max(0, idx - 5), min(idx + 10, len(lines))):
            print(f"  {j+1}: {lines[j].strip()}")
