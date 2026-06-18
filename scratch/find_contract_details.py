with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html", "r", encoding="utf-8") as f:
    content = f.read()

import re
match = re.search(r"sözleşme", content, re.IGNORECASE)
if match:
    start = max(0, match.start() - 200)
    end = min(len(content), match.end() + 200)
    print(content[start:end])
