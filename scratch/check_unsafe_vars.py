import re
import os

html_path = r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html"
js_dir = r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js"

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html_content))

unsafe_vars = []

# Regex to find: const/let/var x = document.getElementById("...")
assign_pattern = re.compile(r'\b(const|let|var)\s+(\w+)\s*=\s*document\.getElementById\([\'"]([^\'"]+)[\'"]\)')

for root, dirs, files in os.walk(js_dir):
    for file in files:
        if file.endswith(".js"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
                # Find all assignments
                assignments = assign_pattern.findall(content)
                for decl, var_name, gid in assignments:
                    if gid not in html_ids:
                        # Find if there is an if (var_name) check
                        # A simple heuristic: check if `if (var_name)` or `if(var_name)` exists in the content
                        check_pattern1 = f"if\\s*\\(\\s*{var_name}\\s*\\)"
                        check_pattern2 = f"{var_name}\\s*\\?\\."
                        
                        has_check = re.search(check_pattern1, content) or re.search(check_pattern2, content)
                        if not has_check:
                            unsafe_vars.append((gid, var_name, file))

print("--- UNSAFE VARIABLES FROM MISSING IDS ---")
for gid, var, file in unsafe_vars:
    print(f"File: {file} | Var: {var} | Missing ID: {gid}")
