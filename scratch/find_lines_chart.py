html_path = r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

count = 0
for idx, line in enumerate(lines, 1):
    if 'id="progress-chart-canvas"' in line:
        count += 1
        print(f"Match {count} on Line {idx}: {line.strip()}")
