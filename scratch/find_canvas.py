import re

html_path = r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

for match in re.finditer(r"<canvas", content, re.IGNORECASE):
    start = max(0, match.start() - 150)
    end = min(len(content), match.end() + 250)
    print(f"Canvas found at position {match.start()}:\n{content[start:end]}\n" + "="*50)
