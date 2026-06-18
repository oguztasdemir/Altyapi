with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if "admin-change-current" in line:
        print(f"Match found around Line {idx}")
        # print surrounding lines
        for j in range(max(0, idx - 15), min(idx + 25, len(lines))):
            print(f"  {j+1}: {lines[j].strip()}")
