import os

html_path = os.path.join("frontend", "index.html")
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update paragraph description
target_p = """                                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">
                                        Sistemdeki her veri değişikliği öncesinde otomatik olarak yedek alınır. Bir hata durumunda geçmiş listesinden istediğiniz bir ana geri dönebilirsiniz.
                                    </p>"""

replacement_p = """                                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">
                                        Otomatik günlük yedekler ve manuel olarak aldığınız yedekler burada listelenir. Bir veri kaybı veya hata durumunda istediğiniz bir yedeğe geri dönebilirsiniz.
                                    </p>"""

# 2. Add Boyut column header
target_header = """                                                    <th style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Dosya</th>
                                                    <th style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-align: right;">Aksiyon</th>"""

replacement_header = """                                                    <th style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Dosya</th>
                                                    <th style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Boyut</th>
                                                    <th style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-align: right;">Aksiyon</th>"""

# 3. Update loading colspan
target_colspan = """                                                    <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">Yedek listesi yükleniyor...</td>"""
replacement_colspan = """                                                    <td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">Yedek listesi yükleniyor...</td>"""

# 4. Add import button next to manual backup button
target_buttons = """                                    <h3>Veritabanı Yedekleme & Geri Yükleme</h3>
                                    <button class="btn-primary" id="btn-create-manual-backup" style="padding: 8px 16px;">Yeni Manuel Yedek Oluştur</button>"""

replacement_buttons = """                                    <h3>Veritabanı Yedekleme & Geri Yükleme</h3>
                                    <div style="display: flex; gap: 10px; align-items: center;">
                                        <button class="btn-primary" id="btn-create-manual-backup" style="padding: 8px 16px;">Yeni Manuel Yedek Oluştur</button>
                                        <button class="btn-secondary" id="btn-import-backup" style="padding: 8px 16px; border-color: var(--accent-color); color: var(--accent-color); font-weight: bold; position: relative;">
                                            📥 Yedek Yükle (İçeri Aktar)
                                            <input type="file" id="input-import-backup" accept=".zip" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;" />
                                        </button>
                                    </div>"""

def apply_replacement(c, tar, rep):
    if tar in c:
        return c.replace(tar, rep)
    tar_crlf = tar.replace("\n", "\r\n")
    rep_crlf = rep.replace("\n", "\r\n")
    if tar_crlf in c:
        return c.replace(tar_crlf, rep_crlf)
    print(f"FAILED TO REPLACE: {tar[:60]}...")
    return c

content = apply_replacement(content, target_p, replacement_p)
content = apply_replacement(content, target_header, replacement_header)
content = apply_replacement(content, target_colspan, replacement_colspan)
content = apply_replacement(content, target_buttons, replacement_buttons)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("HTML PATCH COMPLETED")
