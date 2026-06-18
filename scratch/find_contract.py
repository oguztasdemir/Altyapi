with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = re.findall(r"sözleşme", content, re.IGNORECASE)
print(f"Occurrences of sözleşme: {len(matches)}")
