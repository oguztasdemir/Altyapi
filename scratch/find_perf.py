import re

html_path = r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's print around the word performance
for match in re.finditer(r"performance", content, re.IGNORECASE):
    start = max(0, match.start() - 200)
    end = min(len(content), match.end() + 200)
    print(f"Match found at position {match.start()}:\n{content[start:end]}\n" + "="*50)
