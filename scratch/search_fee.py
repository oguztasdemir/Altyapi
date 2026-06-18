with open('frontend/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if 'admin-setting-fee' in line:
        print(f"Line {i}: {repr(line)}")
        for j in range(max(0, i-5), min(len(lines), i+5)):
            print(f"{j+1}: {repr(lines[j])}")
