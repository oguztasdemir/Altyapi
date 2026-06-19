with open("frontend/static/js/modules/ui.js", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f, 1):
        if "function populateteammanagement" in line.lower():
            print(f"Line {idx}: {line.strip()}")
