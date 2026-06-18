import os

js_dir = r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js"
for root, dirs, files in os.walk(js_dir):
    for file in files:
        if file.endswith(".js"):
            with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                content = f.read()
                if "loadMatchPerformance" in content:
                    print(f"File: {file} has loadMatchPerformance")
