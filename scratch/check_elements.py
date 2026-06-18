import re
import os

html_path = r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html"
js_dir = r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js"

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

# Find all ids in HTML
html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html_content))
print(f"Total IDs in HTML: {len(html_ids)}")

# Find all getElementById in JS files
get_ids = set()
for root, dirs, files in os.walk(js_dir):
    for file in files:
        if file.endswith(".js"):
            with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                content = f.read()
                # Find getElementById('...') or getElementById("...")
                ids = re.findall(r'getElementById\(["\']([^"\']+)["\']\)', content)
                for i in ids:
                    get_ids.add((i, file))

print(f"Total unique IDs fetched in JS: {len(get_ids)}")

missing_ids = []
for gid, file in sorted(get_ids):
    if gid not in html_ids:
        missing_ids.append((gid, file))

print("\n--- Missing IDs (referenced in JS but not in HTML) ---")
for gid, file in missing_ids:
    print(f"ID: {gid:<30} File: {file}")
