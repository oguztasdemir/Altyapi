html_path = r"c:\Users\User\Desktop\Altyapı Manager\frontend\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

print(content[110000:117000])
