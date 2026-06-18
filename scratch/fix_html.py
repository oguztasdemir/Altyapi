import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                                <div class="card-body" style="display: flex; flex-direction: column; gap: 15px; padding: 20px;">
                                    <div class="form-group">
                                        <label for="admin-setting-fee">Aylık Standart Veli Aidatı (TL)</label>
                                        <input type="number" id="admin-setting-fee" class="form-control" placeholder="Örn. 500" value="500">
                                </div>
                            </div>"""

replacement = """                                <div class="card-body" style="display: flex; flex-direction: column; gap: 15px; padding: 20px;">
                                    <div class="form-group">
                                        <label for="admin-setting-fee">Aylık Standart Veli Aidatı (TL)</label>
                                        <input type="number" id="admin-setting-fee" class="form-control" placeholder="Örn. 500" value="500">
                                    </div>
                                </div>
                            </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('frontend/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
