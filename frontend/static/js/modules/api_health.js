import { closeModal, selectPlayer } from "./ui.js";
import { formatDateText, showToast, showConfirm } from "./utils.js";

// Injury History Helpers
export async function loadInjuriesHistory(playerId) {
    try {
        const res = await fetch(`/api/injuries?player_id=${playerId}`);
        if (res.ok) {
            const data = await res.json();
            
            const activeInjury = data.find(item => !item.end_date);
            const badgeEl = document.getElementById("active-injury-status-badge");
            const textEl = document.getElementById("active-injury-details-text");
            const actionEl = document.getElementById("active-injury-action-container");
            
            if (activeInjury) {
                if (badgeEl) {
                    badgeEl.innerText = "SAKAT";
                    badgeEl.className = "badge-injury-active";
                }
                if (textEl) {
                    textEl.innerHTML = `<strong>${activeInjury.injury_type}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${formatDateText(activeInjury.start_date)} tarihinden beri.</span>${activeInjury.notes ? `<br><i style="font-size:0.75rem;">"${activeInjury.notes}"</i>` : ""}`;
                }
                if (actionEl) {
                    actionEl.innerHTML = `<button class="btn-primary" style="padding: 5px 12px; font-size:0.75rem;" onclick="handleResolveInjury('${activeInjury.id}', '${activeInjury.player_id}', '${activeInjury.injury_type}', '${activeInjury.start_date}', '${activeInjury.notes}')">İyileşti Olarak İşaretle</button>`;
                }
                
                const rehabCard = document.getElementById("injury-rehab-card");
                if (rehabCard) {
                    rehabCard.style.display = "block";
                    const badge = document.getElementById("rehab-percent-badge");
                    if (badge) badge.innerText = `%${activeInjury.rehab_progress || 0}`;
                    
                    const slider = document.getElementById("rehab-progress-slider");
                    if (slider) slider.value = activeInjury.rehab_progress || 0;
                    
                    const activeStage = activeInjury.rehab_stage || "Dinlenme";
                    document.querySelectorAll(".rehab-stage-btn").forEach(btn => {
                        if (btn.getAttribute("data-stage") === activeStage) {
                            btn.className = "btn-primary rehab-stage-btn";
                            btn.style.boxShadow = "0 0 10px var(--accent-color)";
                        } else {
                            btn.className = "btn-secondary rehab-stage-btn";
                            btn.style.boxShadow = "none";
                        }
                    });
                    
                    setupRehabListeners(activeInjury.id, activeInjury.player_id);
                }
            } else {
                if (badgeEl) {
                    badgeEl.innerText = "SAĞLIKLI";
                    badgeEl.className = "badge-injury-resolved";
                }
                if (textEl) {
                    textEl.innerText = "Oyuncu şu anda sağlıklı ve antrenmana hazır.";
                }
                if (actionEl) {
                    actionEl.innerHTML = "";
                }
                
                const rehabCard = document.getElementById("injury-rehab-card");
                if (rehabCard) rehabCard.style.display = "none";
            }
            
            const resolvedInjuries = data.filter(item => item.end_date);
            const tbody = document.getElementById("injury-list-tbody");
            if (tbody) {
                tbody.innerHTML = "";
                
                if (resolvedInjuries.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:15px;">Kayıtlı sakatlık geçmişi bulunmuyor.</td></tr>`;
                    return;
                }
                
                resolvedInjuries.forEach(item => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${item.injury_type}</strong></td>
                        <td>${formatDateText(item.start_date)}</td>
                        <td><span class="badge-injury-resolved">${formatDateText(item.end_date)}</span></td>
                        <td style="font-size:0.75rem; color:var(--text-secondary); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.notes}">${item.notes || "-"}</td>
                        <td>
                            <button class="btn-secondary" style="padding: 3px 8px; font-size:0.7rem; border-color:var(--attr-poor); color:var(--attr-poor);" onclick="handleDeleteInjury('${item.id}')">Sil</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.error("Sakatlık geçmişi yüklenemedi", e);
    }
}

export async function handleSaveInjurySubmit() {
    const modal = document.getElementById("modal-log-injury");
    if (!modal) return;
    const playerId = modal.getAttribute("data-player-id");
    const existingInjuryId = modal.getAttribute("data-injury-id");
    const type = document.getElementById("injury-input-type").value.trim();
    const start = document.getElementById("injury-input-start").value;
    const end = document.getElementById("injury-input-end").value;
    const notes = document.getElementById("injury-input-notes").value.trim();
    
    if (!type || !start || !playerId) {
        showToast("Lütfen sakatlık türünü ve başlangıç tarihini girin.", "error");
        return;
    }
    
    const payload = {
        id: existingInjuryId || ("inj-" + Date.now()),
        player_id: playerId,
        injury_type: type,
        start_date: start,
        end_date: end || null,
        notes: notes
    };
    
    try {
        const res = await fetch("/api/injuries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal("modal-log-injury");
            const { loadData } = await import("./api.js");
            await loadData();
            selectPlayer(playerId);
        }
    } catch (e) {
        console.error("Sakatlık kaydedilemedi", e);
    }
}

export async function handleResolveInjury(injuryId, playerId, type, start, notes) {
    const today = new Date().toISOString().split('T')[0];
    const confirmed = await showConfirm("Oyuncunun bugün itibarıyla iyileştiğini onaylıyor musunuz?");
    if (!confirmed) return;
    
    const payload = {
        id: injuryId,
        player_id: playerId,
        injury_type: type,
        start_date: start,
        end_date: today,
        notes: notes
    };
    
    try {
        const res = await fetch("/api/injuries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const { loadData } = await import("./api.js");
            await loadData();
            selectPlayer(playerId);
            showToast("Oyuncu iyileşti olarak işaretlendi.", "success");
        }
    } catch (e) {
        console.error("Sakatlık kapatılamadı", e);
        showToast("İyileşme kaydedilirken hata oluştu.", "error");
    }
}

export async function handleDeleteInjury(injuryId) {
    const confirmed = await showConfirm("Sakatlık kaydını silmek istediğinize emin misiniz?");
    if (!confirmed) return;
    
    try {
        const res = await fetch(`/api/injuries?id=${injuryId}`, { method: "DELETE" });
        if (res.ok) {
            const { loadData } = await import("./api.js");
            await loadData();
            showToast("Sakatlık kaydı silindi.", "success");
            const { state } = await import("./state.js");
            if (state.activePlayerId) {
                selectPlayer(state.activePlayerId);
            }
        }
    } catch (e) {
        console.error("Sakatlık silinemedi", e);
        showToast("Sakatlık silinirken hata oluştu.", "error");
    }
}

function setupRehabListeners(injuryId, playerId) {
    const slider = document.getElementById("rehab-progress-slider");
    const badge = document.getElementById("rehab-percent-badge");
    const saveBtn = document.getElementById("btn-save-rehab");
    
    if (slider && badge) {
        slider.oninput = () => {
            badge.innerText = `%${slider.value}`;
        };
    }
    
    let selectedStage = null;
    const stageBtns = document.querySelectorAll(".rehab-stage-btn");
    stageBtns.forEach(btn => {
        if (btn.classList.contains("btn-primary")) {
            selectedStage = btn.getAttribute("data-stage");
        }
        
        btn.onclick = () => {
            stageBtns.forEach(b => {
                b.className = "btn-secondary rehab-stage-btn";
                b.style.boxShadow = "none";
            });
            btn.className = "btn-primary rehab-stage-btn";
            btn.style.boxShadow = "0 0 10px var(--accent-color)";
            selectedStage = btn.getAttribute("data-stage");
        };
    });
    
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const progress = slider ? parseInt(slider.value) : 0;
            const stage = selectedStage || "Dinlenme";
            
            try {
                const res = await fetch("/api/injuries/rehab", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        injury_id: injuryId,
                        rehab_stage: stage,
                        rehab_progress: progress
                    })
                });
                if (res.ok) {
                    showToast("Rehabilitasyon ilerlemesi kaydedildi.", "success");
                    loadInjuriesHistory(playerId);
                } else {
                    showToast("Kaydedilirken hata oluştu.", "error");
                }
            } catch (e) {
                console.error(e);
                showToast("Kaydedilirken hata oluştu.", "error");
            }
        };
    }
}
