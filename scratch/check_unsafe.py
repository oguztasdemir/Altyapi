import re
import os

html_path = r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html"
js_dir = r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js"

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html_content))

# Look for patterns of direct dereferencing without check
# e.g., document.getElementById("something").addEventListener
# or document.getElementById("something").value
# or document.getElementById("something").style
unsafe_calls = []

pattern = re.compile(r'document\.getElementById\([\'"]([^\'"]+)[\'"]\)\.(addEventListener|value|style|click|classList|innerHTML|innerText|querySelector|appendChild|removeAttribute|setAttribute|checked)')

for root, dirs, files in os.walk(js_dir):
    for file in files:
        if file.endswith(".js"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                for line_no, line in enumerate(f, 1):
                    matches = pattern.findall(line)
                    for gid, prop in matches:
                        if gid not in html_ids:
                            unsafe_calls.append((gid, file, line_no, line.strip()))

print("--- UNSAFE DE-REFERENCES (No null check and ID missing in HTML) ---")
for gid, file, line_no, line in unsafe_calls:
    print(f"File: {file}:{line_no} | ID: {gid} | Line: {line}")
