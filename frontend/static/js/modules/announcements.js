import { state } from "./state.js";
import { showToast } from "./utils.js";
import { openModal, closeModal } from "./ui.js";

let activeSubTab = "bulletin"; // bulletin or templates

export async function loadAnnouncementsData() {
    if (!state.activeTeamId) return;

    // Set active tab styling
    const btnBulletin = document.getElementById("tab-ann-bulletin");
    const btnTemplates = document.getElementById("tab-ann-templates");
    const containerBulletin = document.getElementById("ann-bulletin-container");
    const containerTemplates = document.getElementById("ann-templates-container");

    if (activeSubTab === "bulletin") {
        btnBulletin.className = "btn-primary";
        btnTemplates.className = "btn-secondary";
        containerBulletin.style.display = "flex";
        containerTemplates.style.display = "none";
        
        // Fetch announcements
        try {
            const res = await fetch(`/api/announcements?team_id=${state.activeTeamId}`);
            if (!res.ok) throw new Error();
            const list = await res.json();
            renderAnnouncements(list);
        } catch (err) {
            console.error(err);
            showToast("Duyurular yüklenemedi.", "error");
        }
    } else {
        btnBulletin.className = "btn-secondary";
        btnTemplates.className = "btn-primary";
        containerBulletin.style.display = "none";
        containerTemplates.style.display = "block";
        
        populateTemplatesForm();
    }
}

export function setSubTab(subTab) {
    activeSubTab = subTab;
    loadAnnouncementsData();
}

function renderAnnouncements(list) {
    const container = document.getElementById("announcements-cards-list");
    if (!container) return;
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px 0;">Yayınlanmış duyuru bulunmuyor.</div>`;
        return;
    }

    list.forEach(ann => {
        const card = document.createElement("div");
        card.className = "card";
        
        // Priority styling
        let borderGlow = "1px solid var(--border-color)";
        let badgeColor = "var(--text-muted)";
        if (ann.priority === "Acil") {
            borderGlow = "1px solid var(--attr-poor)";
            badgeColor = "var(--attr-poor)";
        } else if (ann.priority === "Önemli") {
            borderGlow = "1px solid var(--attr-average)";
            badgeColor = "var(--attr-average)";
        }
        
        card.style.border = borderGlow;
        card.style.padding = "20px";
        card.style.position = "relative";
        
        const dateStr = new Date(ann.created_at).toLocaleString("tr-TR");

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${ann.is_pinned ? `<span style="font-size: 1.1rem;" title="Sabitlendi">📌</span>` : ""}
                    <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">${ann.title}</h3>
                    <span style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px;">${ann.priority}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</span>
                    <button class="btn-secondary btn-delete-ann" style="border-color: var(--attr-poor); color: var(--attr-poor); padding: 2px 6px; font-size: 0.7rem;">Sil</button>
                </div>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap; margin: 0;">${ann.content}</p>
        `;
        
        card.querySelector(".btn-delete-ann").onclick = async () => {
            if (confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) {
                await deleteAnnouncement(ann.id);
            }
        };

        container.appendChild(card);
    });
}

export function openAddAnnouncementModal() {
    document.getElementById("announcement-input-title").value = "";
    document.getElementById("announcement-input-priority").value = "Normal";
    document.getElementById("announcement-input-pin").checked = false;
    document.getElementById("announcement-input-content").value = "";
    openModal("modal-add-announcement");
}

export async function handleSaveAnnouncementSubmit() {
    if (!state.activeTeamId) return;

    const title = document.getElementById("announcement-input-title").value.trim();
    const priority = document.getElementById("announcement-input-priority").value;
    const is_pinned = document.getElementById("announcement-input-pin").checked;
    const content = document.getElementById("announcement-input-content").value.trim();

    if (!title || !content) {
        showToast("Lütfen başlık ve içerik alanlarını doldurun.", "error");
        return;
    }

    try {
        const res = await fetch("/api/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                team_id: state.activeTeamId,
                title,
                priority,
                is_pinned,
                content
            })
        });
        if (!res.ok) throw new Error();

        showToast("Duyuru yayınlandı.", "success");
        closeModal("modal-add-announcement");
        loadAnnouncementsData();
    } catch (err) {
        console.error(err);
        showToast("Duyuru kaydedilemedi.", "error");
    }
}

async function deleteAnnouncement(id) {
    try {
        const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Duyuru silindi.", "success");
            loadAnnouncementsData();
        } else {
            showToast("Duyuru silinemedi.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Bağlantı hatası.", "error");
    }
}

// ─────────────────────────────────────────────────────────────────────
// VELİ MESAJ ŞABLONLARI
// ─────────────────────────────────────────────────────────────────────
function populateTemplatesForm() {
    const playerSelect = document.getElementById("template-player-select");
    if (!playerSelect) return;
    playerSelect.innerHTML = "";

    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || activeTeam.players.length === 0) {
        playerSelect.innerHTML = `<option value="">-- Takımda Oyuncu Yok --</option>`;
        updateTemplatePreview();
        return;
    }

    activeTeam.players.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.innerText = p.name;
        playerSelect.appendChild(opt);
    });

    // Populate custom fields container depending on template
    const selectType = document.getElementById("template-select");
    selectType.onchange = () => {
        renderCustomFields();
        updateTemplatePreview();
    };
    playerSelect.onchange = () => {
        updateTemplatePreview();
    };

    renderCustomFields();
    updateTemplatePreview();
}

function renderCustomFields() {
    const container = document.getElementById("template-custom-fields");
    if (!container) return;
    container.innerHTML = "";

    const type = document.getElementById("template-select").value;
    
    if (type === "iptal") {
        container.innerHTML = `
            <div class="form-group">
                <label for="fld-iptal-tarih">İptal Edilen Tarih</label>
                <input type="date" id="fld-iptal-tarih" class="form-control" value="${new Date().toISOString().split("T")[0]}">
            </div>
            <div class="form-group">
                <label for="fld-iptal-sebep">İptal Sebebi</label>
                <input type="text" id="fld-iptal-sebep" class="form-control" value="Hava muhalefeti ve saha zemin bakımı">
            </div>
        `;
    } else if (type === "turnuva") {
        container.innerHTML = `
            <div class="form-group">
                <label for="fld-trn-tarih">Maç Tarihi</label>
                <input type="date" id="fld-trn-tarih" class="form-control" value="${new Date().toISOString().split("T")[0]}">
            </div>
            <div class="form-group">
                <label for="fld-trn-saat">Maç Saati</label>
                <input type="time" id="fld-trn-saat" class="form-control" value="14:00">
            </div>
            <div class="form-group">
                <label for="fld-trn-rakip">Rakip Takım</label>
                <input type="text" id="fld-trn-rakip" class="form-control" placeholder="Örn. Galatasaray Altyapı">
            </div>
            <div class="form-group">
                <label for="fld-trn-konum">Saha / Konum</label>
                <input type="text" id="fld-trn-konum" class="form-control" value="Akademi Tesisleri Ana Saha">
            </div>
        `;
    } else if (type === "genel") {
        container.innerHTML = `
            <div class="form-group">
                <label for="fld-genel-konu">Duyuru Konusu</label>
                <input type="text" id="fld-genel-konu" class="form-control" value="Hafta sonu yapılacak veli toplantısı">
            </div>
            <div class="form-group">
                <label for="fld-genel-detay">Mesaj Detayı</label>
                <textarea id="fld-genel-detay" class="form-control" rows="3">Cumartesi günü saat 11:00'de tesislerimizde veli toplantısı düzenlenecektir. Katılımınızı rica ederiz.</textarea>
            </div>
        `;
    }

    // Add event listeners to redraw template preview on field edit
    container.querySelectorAll("input, textarea, select").forEach(el => {
        el.addEventListener("input", updateTemplatePreview);
    });
}

function updateTemplatePreview() {
    const preview = document.getElementById("template-preview-text");
    if (!preview) return;

    const type = document.getElementById("template-select").value;
    const playerId = document.getElementById("template-player-select").value;
    
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || !playerId) {
        preview.value = "Şablon oluşturmak için takımda kayıtlı bir futbolcu seçilmelidir.";
        return;
    }

    const player = activeTeam.players.find(p => p.id === playerId);
    if (!player) return;

    const veliName = player.parentName || "[Veli Adı Soyadı]";
    const oyuncuName = player.name;
    const feeAmount = player.feeAmount || state.adminMonthlyFee || 500;

    let msg = "";

    if (type === "aidat") {
        msg = `Sayın ${veliName},\n\n${oyuncuName} isimli sporcumuzun bu ayki akademi aidat tutarı olan ${feeAmount} TL ödemesini yapmanızı rica ederiz.\n\n*Altyapı Akademisi Yönetimi*`;
    } else if (type === "iptal") {
        const trhVal = document.getElementById("fld-iptal-tarih")?.value || "";
        const sebepVal = document.getElementById("fld-iptal-sebep")?.value || "";
        
        let formattedDate = trhVal;
        if (trhVal) {
            const d = new Date(trhVal);
            formattedDate = d.toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' });
        }
        
        msg = `Sayın Velimiz (${veliName}),\n\n${oyuncuName} sporcumuzun da katılacağı ${formattedDate} tarihindeki antrenmanımız, ${sebepVal} sebebiyle iptal edilmiştir.\n\nTelafi idmanı bilgisi ayrıca paylaşılacaktır. Anlayışınız için teşekkür ederiz.\n\n*Altyapı Akademisi Yönetimi*`;
    } else if (type === "turnuva") {
        const trhVal = document.getElementById("fld-trn-tarih")?.value || "";
        const saatVal = document.getElementById("fld-trn-saat")?.value || "";
        const rakipVal = document.getElementById("fld-trn-rakip")?.value || "[Rakip]";
        const konumVal = document.getElementById("fld-trn-konum")?.value || "";

        let formattedDate = trhVal;
        if (trhVal) {
            const d = new Date(trhVal);
            formattedDate = d.toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
        }

        msg = `Değerli Velimiz (${veliName}),\n\nSporcumuz ${oyuncuName} kadroda yer alacağı turnuva maçı detayları aşağıdadır:\n\n🏆 *Rakip:* ${rakipVal}\n📅 *Tarih:* ${formattedDate}\n⏰ *Saat:* ${saatVal}\n📍 *Saha:* ${konumVal}\n\nSporcumuzun maç saatinden yarım saat önce hazır bulunması rica olunur.\n\n*Altyapı Akademisi Yönetimi*`;
    } else if (type === "genel") {
        const konuVal = document.getElementById("fld-genel-konu")?.value || "";
        const detayVal = document.getElementById("fld-genel-detay")?.value || "";

        msg = `Sayın Velimiz (${veliName}),\n\n📢 *Konu:* ${konuVal}\n\n${detayVal}\n\nİyi günler dileriz.\n\n*Altyapı Akademisi Yönetimi*`;
    }

    preview.value = msg;
}

export function copyTemplateToClipboard() {
    const text = document.getElementById("template-preview-text").value;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Mesaj panoya kopyalandı!", "success");
    }).catch(err => {
        console.error(err);
        showToast("Kopyalanamadı.", "error");
    });
}
