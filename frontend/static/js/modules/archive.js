import { state } from "./state.js";
import { openModal, closeModal } from "./ui.js";
import { showToast } from "./utils.js";

// Helper to convert file to base64 and upload to server
async function uploadFileHelper(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const response = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: file.name,
                        base64Data: reader.result
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    resolve(data.filePath);
                } else {
                    reject(new Error("Dosya yüklenemedi"));
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (error) => reject(error);
    });
}

// ═══════════════════════════════════════════════════════════════════
// PLAYER GALLERY (MULTIPLE PHOTOS)
// ═══════════════════════════════════════════════════════════════════

export async function loadPlayerGallery(playerId) {
    const container = document.getElementById("player-gallery-container");
    const emptyEl = document.getElementById("player-gallery-empty");
    if (!container) return;
    
    container.innerHTML = "";
    
    try {
        const res = await fetch(`/api/players/gallery?player_id=${playerId}`);
        if (!res.ok) throw new Error("Galeri yüklenemedi");
        
        const images = await res.json();
        
        if (images.length === 0) {
            if (emptyEl) emptyEl.style.display = "block";
            return;
        }
        
        if (emptyEl) emptyEl.style.display = "none";
        
        images.forEach(img => {
            const item = document.createElement("div");
            item.style.position = "relative";
            item.style.border = "1px solid var(--border-color)";
            item.style.borderRadius = "var(--border-radius)";
            item.style.overflow = "hidden";
            item.style.aspectRatio = "1";
            item.style.background = "var(--bg-dark)";
            
            item.innerHTML = `
                <img src="${img.file_path}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="window.open('${img.file_path}', '_blank')">
                <button class="btn-delete-img" style="position: absolute; top: 5px; right: 5px; background: rgba(255, 69, 58, 0.85); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; cursor: pointer; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">✕</button>
            `;
            
            item.querySelector(".btn-delete-img").addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm("Bu fotoğrafı galeriden silmek istediğinize emin misiniz?")) {
                    await deletePlayerGalleryPhoto(img.id, playerId);
                }
            });
            
            container.appendChild(item);
        });
    } catch (err) {
        console.error(err);
        showToast("Galeri yüklenirken hata oluştu", "error");
    }
}

export async function uploadPlayerGalleryPhoto(playerId) {
    const fileInput = document.getElementById("player-gallery-file-input");
    if (!fileInput || !fileInput.files[0]) {
        showToast("Lütfen bir resim dosyası seçin", "error");
        return;
    }
    
    const file = fileInput.files[0];
    if (!file.type.startsWith("image/")) {
        showToast("Yalnızca resim yükleyebilirsiniz", "error");
        return;
    }
    
    try {
        showToast("Fotoğraf yükleniyor...", "info");
        const filePath = await uploadFileHelper(file);
        
        const payload = {
            player_id: playerId,
            file_path: filePath,
            upload_date: new Date().toISOString().slice(0, 19).replace("T", " ")
        };
        
        const res = await fetch("/api/players/gallery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            showToast("Fotoğraf başarıyla eklendi", "success");
            closeModal("modal-add-player-gallery");
            fileInput.value = "";
            loadPlayerGallery(playerId);
        } else {
            showToast("Fotoğraf kaydedilemedi", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Yükleme sırasında hata oluştu", "error");
    }
}

export async function deletePlayerGalleryPhoto(photoId, playerId) {
    try {
        const res = await fetch(`/api/players/gallery?id=${photoId}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Fotoğraf silindi", "success");
            loadPlayerGallery(playerId);
        } else {
            showToast("Fotoğraf silinemedi", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Silme hatası", "error");
    }
}

// ═══════════════════════════════════════════════════════════════════
// PLAYER ARCHIVE (VIDEOS & FILES)
// ═══════════════════════════════════════════════════════════════════

export async function loadPlayerArchive(playerId) {
    const tbody = document.getElementById("player-archive-list-tbody");
    const emptyEl = document.getElementById("player-archive-empty");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    try {
        const res = await fetch(`/api/players/archive?player_id=${playerId}`);
        if (!res.ok) throw new Error("Arşiv yüklenemedi");
        
        const items = await res.json();
        
        if (items.length === 0) {
            if (emptyEl) emptyEl.style.display = "block";
            return;
        }
        
        if (emptyEl) emptyEl.style.display = "none";
        
        items.forEach(item => {
            const tr = document.createElement("tr");
            
            // Show preview button or download button depending on type
            const isVideo = item.file_type.startsWith("video/");
            const isImage = item.file_type.startsWith("image/");
            
            let actionBtn = "";
            if (isVideo) {
                actionBtn = `<button class="btn-primary" onclick="window.open('${item.file_path}', '_blank')" style="padding: 3px 8px; font-size: 0.7rem;">▶️ İzle</button>`;
            } else if (isImage) {
                actionBtn = `<button class="btn-primary" onclick="window.open('${item.file_path}', '_blank')" style="padding: 3px 8px; font-size: 0.7rem;">👁️ Göster</button>`;
            } else {
                actionBtn = `<a href="${item.file_path}" download="${item.file_name}" class="btn-primary" style="padding: 3px 8px; font-size: 0.7rem; text-decoration: none; display: inline-block;">📥 İndir</a>`;
            }
            
            const dateStr = item.upload_date.split(" ")[0].split("-").reverse().join("/");
            
            tr.innerHTML = `
                <td><strong>${item.file_name}</strong></td>
                <td><span style="font-size:0.7rem; font-weight:700; color:var(--accent-color);">${item.file_type.split("/")[0].toUpperCase()}</span></td>
                <td>${item.description || '-'}</td>
                <td>${dateStr}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        ${actionBtn}
                        <button class="btn-secondary btn-delete-archive" style="padding: 3px 8px; font-size: 0.7rem; border-color: var(--attr-poor); color: var(--attr-poor);">Sil</button>
                    </div>
                </td>
            `;
            
            tr.querySelector(".btn-delete-archive").addEventListener("click", async () => {
                if (confirm("Bu arşiv öğesini silmek istediğinize emin misiniz?")) {
                    await deletePlayerArchiveItem(item.id, playerId);
                }
            });
            
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        showToast("Arşiv yüklenirken hata oluştu", "error");
    }
}

export async function uploadPlayerArchiveItem(playerId) {
    const fileInput = document.getElementById("player-archive-file-input");
    const descInput = document.getElementById("player-archive-description-input");
    
    if (!fileInput || !fileInput.files[0]) {
        showToast("Lütfen bir dosya seçin", "error");
        return;
    }
    
    const file = fileInput.files[0];
    const desc = descInput ? descInput.value.trim() : "";
    
    try {
        showToast("Dosya yükleniyor...", "info");
        const filePath = await uploadFileHelper(file);
        
        const payload = {
            player_id: playerId,
            file_path: filePath,
            file_type: file.type || "application/octet-stream",
            file_name: file.name,
            description: desc,
            upload_date: new Date().toISOString().slice(0, 19).replace("T", " ")
        };
        
        const res = await fetch("/api/players/archive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            showToast("Dosya başarıyla arşive eklendi", "success");
            closeModal("modal-add-player-archive");
            fileInput.value = "";
            if (descInput) descInput.value = "";
            loadPlayerArchive(playerId);
        } else {
            showToast("Dosya kaydedilemedi", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Yükleme sırasında hata oluştu", "error");
    }
}

export async function deletePlayerArchiveItem(itemId, playerId) {
    try {
        const res = await fetch(`/api/players/archive?id=${itemId}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Dosya arşivden silindi", "success");
            loadPlayerArchive(playerId);
        } else {
            showToast("Dosya silinemedi", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Silme hatası", "error");
    }
}

// ═══════════════════════════════════════════════════════════════════
// TEAM ARCHIVE (PHOTOS & VIDEOS)
// ═══════════════════════════════════════════════════════════════════

export async function loadTeamArchive(teamId) {
    const container = document.getElementById("team-archive-container");
    const emptyEl = document.getElementById("team-archive-empty");
    if (!container) return;
    
    container.innerHTML = "";
    
    try {
        const res = await fetch(`/api/teams/archive?team_id=${teamId}`);
        if (!res.ok) throw new Error("Takım arşivi yüklenemedi");
        
        const items = await res.json();
        
        if (items.length === 0) {
            if (emptyEl) emptyEl.style.display = "block";
            return;
        }
        
        if (emptyEl) emptyEl.style.display = "none";
        
        items.forEach(item => {
            const isImage = item.file_type.startsWith("image/");
            const isVideo = item.file_type.startsWith("video/");
            
            const card = document.createElement("div");
            card.className = "card";
            card.style.background = "var(--bg-dark)";
            card.style.border = "1px solid var(--border-color)";
            card.style.padding = "10px";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "8px";
            card.style.position = "relative";
            
            let previewEl = "";
            if (isImage) {
                previewEl = `<img src="${item.file_path}" style="width:100%; height:120px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.open('${item.file_path}', '_blank')">`;
            } else if (isVideo) {
                previewEl = `
                    <video style="width:100%; height:120px; object-fit:cover; border-radius:4px;" controls>
                        <source src="${item.file_path}" type="${item.file_type}">
                        Tarayıcınız videoyu desteklemiyor.
                    </video>
                `;
            } else {
                previewEl = `
                    <div style="width:100%; height:120px; background:var(--bg-subpanel); border-radius:4px; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:6px;">
                        <span style="font-size:1.8rem;">📂</span>
                        <a href="${item.file_path}" download="${item.file_name}" style="font-size:0.7rem; color:var(--accent-color); font-weight:bold; text-align:center; padding:0 6px; word-break:break-all; text-decoration:none;">${item.file_name}</a>
                    </div>
                `;
            }
            
            const dateStr = item.upload_date.split(" ")[0].split("-").reverse().join("/");
            
            card.innerHTML = `
                ${previewEl}
                <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between; min-height:45px;">
                    <div style="font-size:0.8rem; font-weight:bold; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${item.file_name}">${item.file_name}</div>
                    <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:2px; line-height:1.2;">${item.description || '-'}</div>
                    <div style="font-size:0.65rem; color:var(--text-muted); margin-top:5px; text-align:right;">📅 ${dateStr}</div>
                </div>
                <button class="btn-delete-team-arch" style="position: absolute; top: 5px; right: 5px; background: rgba(255, 69, 58, 0.85); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; cursor: pointer; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">✕</button>
            `;
            
            card.querySelector(".btn-delete-team-arch").addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm("Bu dosyayı takım arşivinden silmek istediğinize emin misiniz?")) {
                    await deleteTeamArchiveItem(item.id, teamId);
                }
            });
            
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        showToast("Takım arşivi yüklenirken hata oluştu", "error");
    }
}

export async function uploadTeamArchiveItem(teamId) {
    const fileInput = document.getElementById("team-archive-file-input");
    const descInput = document.getElementById("team-archive-description-input");
    
    if (!fileInput || !fileInput.files[0]) {
        showToast("Lütfen bir dosya seçin", "error");
        return;
    }
    
    const file = fileInput.files[0];
    const desc = descInput ? descInput.value.trim() : "";
    
    try {
        showToast("Dosya yükleniyor...", "info");
        const filePath = await uploadFileHelper(file);
        
        const payload = {
            team_id: teamId,
            file_path: filePath,
            file_type: file.type || "application/octet-stream",
            file_name: file.name,
            description: desc,
            upload_date: new Date().toISOString().slice(0, 19).replace("T", " ")
        };
        
        const res = await fetch("/api/teams/archive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            showToast("Dosya başarıyla takım arşivine eklendi", "success");
            closeModal("modal-add-team-archive");
            fileInput.value = "";
            if (descInput) descInput.value = "";
            loadTeamArchive(teamId);
        } else {
            showToast("Dosya kaydedilemedi", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Yükleme sırasında hata oluştu", "error");
    }
}

export async function deleteTeamArchiveItem(itemId, teamId) {
    try {
        const res = await fetch(`/api/teams/archive?id=${itemId}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Dosya takım arşivinden silindi", "success");
            loadTeamArchive(teamId);
        } else {
            showToast("Dosya silinemedi", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Silme hatası", "error");
    }
}
