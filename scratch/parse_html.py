import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if 'btn-view-player-report' in line:
        print(f"Line {i}")
        for j in range(max(0, i-5), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j]}", end="")
