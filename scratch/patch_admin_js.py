import os

js_path = os.path.join("frontend", "static", "js", "modules", "admin.js")
with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """    input.addEventListener("change", (e) => {

        showToast("Yedek yükleniyor...", "info");"""

replacement = """    input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith(".zip")) {
            showToast("Sadece .zip uzantılı yedek dosyaları yükleyebilirsiniz.", "error");
            input.value = "";
            return;
        }
        
        showToast("Yedek yükleniyor...", "info");"""

if target in content:
    content = content.replace(target, replacement)
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS")
else:
    # Try with CRLF
    target_crlf = target.replace("\n", "\r\n")
    replacement_crlf = replacement.replace("\n", "\r\n")
    if target_crlf in content:
        content = content.replace(target_crlf, replacement_crlf)
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("SUCCESS CRLF")
    else:
        # Also, check if there is the "fileName: file.name" line which needs "file" to be defined.
        # Yes, let's fix it by rewriting setupImportBackupListener completely
        target_func = """function setupImportBackupListener() {
    const input = document.getElementById("input-import-backup");
    if (!input || input.getAttribute("data-listening") === "true") return;
    
    input.setAttribute("data-listening", "true");
    input.addEventListener("change", (e) => {

        showToast("Yedek yükleniyor...", "info");
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = event.target.result;
            try {
                const res = await fetch("/api/backups/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: file.name,
                        base64Data: base64Data
                    })
                });"""
                
        replacement_func = """function setupImportBackupListener() {
    const input = document.getElementById("input-import-backup");
    if (!input || input.getAttribute("data-listening") === "true") return;
    
    input.setAttribute("data-listening", "true");
    input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith(".zip")) {
            showToast("Sadece .zip uzantılı yedek dosyaları yükleyebilirsiniz.", "error");
            input.value = "";
            return;
        }
        
        showToast("Yedek yükleniyor...", "info");
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = event.target.result;
            try {
                const res = await fetch("/api/backups/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: file.name,
                        base64Data: base64Data
                    })
                });"""
        
        # Test target_func
        if target_func in content:
            content = content.replace(target_func, replacement_func)
            with open(js_path, "w", encoding="utf-8") as f:
                f.write(content)
            print("SUCCESS FUNC")
        else:
            target_func_crlf = target_func.replace("\n", "\r\n")
            replacement_func_crlf = replacement_func.replace("\n", "\r\n")
            if target_func_crlf in content:
                content = content.replace(target_func_crlf, replacement_func_crlf)
                with open(js_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print("SUCCESS FUNC CRLF")
            else:
                print("TARGET NOT FOUND AT ALL")
