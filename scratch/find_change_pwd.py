with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = re.finditer(r"Şifre Değiştir|admin-change-current", content)
for m in matches:
    start = max(0, m.start() - 100)
    end = min(len(content), m.end() + 200)
    print(content[start:end])
    print("="*50)
