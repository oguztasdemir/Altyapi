import os
import re

js_dir = r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js"

with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js\modules\announcements.js", "r", encoding="utf-8") as f:
    ann = f.read()

# Let's search for parent_name or parent_phone across all js files
for root, dirs, files in os.walk(js_dir):
    for file in files:
        if file.endswith(".js"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
                # Check for parent_name
                matches_name = re.findall(r'\bparent_name\b', content)
                matches_phone = re.findall(r'\bparent_phone\b', content)
                
                if matches_name:
                    print(f"File: {file} contains parent_name count: {len(matches_name)}")
                if matches_phone:
                    print(f"File: {file} contains parent_phone count: {len(matches_phone)}")
