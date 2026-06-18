import os
import re

js_dir = r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js"

for root, dirs, files in os.walk(js_dir):
    for file in files:
        if file.endswith(".js"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
                # Check for isAdminLoggedIn
                matches = re.findall(r'\bisAdminLoggedIn\b', content)
                if matches:
                    print(f"File: {file} contains isAdminLoggedIn: {len(matches)}")
