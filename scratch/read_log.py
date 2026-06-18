import os

log_path = r"C:\Users\User\.gemini\antigravity-ide\brain\d7e44299-c5f1-48cc-a151-4965c1a944f2\.system_generated\tasks\task-36.log"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        print(f.read())
else:
    print("Log file does not exist.")
