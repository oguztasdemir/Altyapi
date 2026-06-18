import { state } from "./state.js";
import { openModal, closeModal } from "./ui.js";
import { showToast } from "./utils.js";

// ─────────────────────────────────────────────────────────────────────
// GOALS & PERFORMANCE WIDGETS
// ─────────────────────────────────────────────────────────────────────
export async function loadPlayerGoals(playerId) {
    const container = document.getElementById("player-goals-list-container");
    if (!container) return;
    container.innerHTML = "";
    
    try {
        const res = await fetch(`/api/player-goals?player_id=${playerId}`);
        if (!res.ok) throw new Error();
        const goals = await res.json();
        
        if (goals.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px 0;">Kayıtlı hedef bulunmuyor.</div>`;
            return;
        }
        
        goals.forEach(goal => {
            const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
            
            const card = document.createElement("div");
            card.style.background = "var(--bg-subpanel)";
            card.style.border = "1px solid var(--border-color)";
            card.style.borderRadius = "var(--border-radius)";
            card.style.padding = "12px 15px";
            
            let badgeStyle = "background: var(--bg-dark); color: var(--text-muted);";
            if (goal.status === "Tamamlandı") {
                badgeStyle = "background: rgba(0, 255, 136, 0.15); color: var(--accent-color);";
            } else if (goal.status === "Başarısız") {
                badgeStyle = "background: rgba(255, 68, 68, 0.15); color: var(--attr-poor);";
            }
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                        <strong style="font-size:0.85rem; color:var(--text-primary);">${goal.title}</strong>
                        <div style="font-size:0.7rem; color:var(--text-muted);">Termin: ${goal.deadline || 'Süresiz'} · Tür: ${goal.goal_type}</div>
                    </div>
                    <span style="font-size: 0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; ${badgeStyle}">${goal.status}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="flex:1; background:var(--bg-dark); border:1px solid var(--border-color); height:8px; border-radius:4px; overflow:hidden;">
                        <div style="background:var(--accent-color); height:100%; width:${pct}%;"></div>
                    </div>
                    <span style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); min-width:45px; text-align:right;">${goal.current_value} / ${goal.target_value} ${goal.unit}</span>
                </div>
                ${goal.status === 'Aktif' ? `
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px;">
                    <input type="number" class="goal-inc-val" value="${goal.current_value}" style="width:50px; text-align:center; font-size:0.75rem; background:var(--bg-dark); border:1px solid var(--border-color); color:var(--text-primary); border-radius:4px; padding:2px 0;">
                    <button class="btn-secondary btn-update-goal-pct" style="padding: 2px 6px; font-size: 0.7rem; cursor:pointer;">Güncelle</button>
                    <button class="btn-secondary btn-del-goal" style="border-color: var(--attr-poor); color: var(--attr-poor); padding: 2px 6px; font-size: 0.7rem; cursor:pointer;">Sil</button>
                </div>` : `
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px;">
                    <button class="btn-secondary btn-del-goal" style="border-color: var(--attr-poor); color: var(--attr-poor); padding: 2px 6px; font-size: 0.7rem; cursor:pointer;">Sil</button>
                </div>`}
            `;
            
            if (goal.status === 'Aktif') {
                const btnUpdate = card.querySelector(".btn-update-goal-pct");
                const inputInc = card.querySelector(".goal-inc-val");
                btnUpdate.onclick = async () => {
                    const val = parseFloat(inputInc.value);
                    if (!isNaN(val)) {
                        await updateGoalProgress(goal.id, val, goal.target_value);
                    }
                };
            }
            card.querySelector(".btn-del-goal").onclick = async () => {
                if (confirm("Bu hedefi silmek istediğinize emin misiniz?")) {
                    await deleteGoal(goal.id);
                }
            };
            
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:var(--attr-poor); font-size:0.8rem;">Yükleme hatası.</div>`;
    }
}

export function openPlayerAddGoalModal() {
    if (!state.activePlayerId) {
        showToast("Lütfen önce bir oyuncu seçin.", "error");
        return;
    }
    document.getElementById("goal-input-title").value = "";
    document.getElementById("goal-input-type").value = "Manuel";
    document.getElementById("goal-input-stat-key").value = "";
    document.getElementById("goal-input-stat-key").disabled = true;
    document.getElementById("goal-input-target").value = "5";
    document.getElementById("goal-input-unit").value = "Gol";
    document.getElementById("goal-input-deadline").value = "";
    
    const typeSelect = document.getElementById("goal-input-type");
    const statSelect = document.getElementById("goal-input-stat-key");
    typeSelect.onchange = () => {
        statSelect.disabled = typeSelect.value !== "İstatistik";
        if (typeSelect.value !== "İstatistik") statSelect.value = "";
    };
    
    openModal("modal-add-goal");
}

export async function handleSaveGoalSubmit() {
    if (!state.activePlayerId) return;

    const title = document.getElementById("goal-input-title").value.trim();
    const type = document.getElementById("goal-input-type").value;
    const stat_key = document.getElementById("goal-input-stat-key").value;
    const target = parseFloat(document.getElementById("goal-input-target").value);
    const unit = document.getElementById("goal-input-unit").value.trim();
    const deadline = document.getElementById("goal-input-deadline").value;

    if (!title || isNaN(target)) {
        showToast("Lütfen başlık ve geçerli bir hedef değeri girin.", "error");
        return;
    }

    try {
        const res = await fetch("/api/player-goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                player_id: state.activePlayerId,
                title,
                goal_type: type,
                stat_key,
                target_value: target,
                current_value: 0,
                unit,
                deadline: deadline || null,
                status: "Aktif"
            })
        });
        if (!res.ok) throw new Error();

        showToast("Hedef tanımlandı.", "success");
        closeModal("modal-add-goal");
        loadPlayerGoals(state.activePlayerId);
    } catch (err) {
        console.error(err);
        showToast("Hedef kaydedilemedi.", "error");
    }
}

async function updateGoalProgress(id, current_value, target_value) {
    const status = current_value >= target_value ? "Tamamlandı" : "Aktif";
    try {
        const res = await fetch("/api/player-goals/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, current_value, status })
        });
        if (res.ok) {
            showToast("Hedef ilerlemesi güncellendi.", "success");
            loadPlayerGoals(state.activePlayerId);
        }
    } catch (err) {
        console.error(err);
        showToast("Güncelleme hatası.", "error");
    }
}

async function deleteGoal(id) {
    try {
        const res = await fetch(`/api/player-goals?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Hedef silindi.", "success");
            loadPlayerGoals(state.activePlayerId);
        }
    } catch (err) {
        console.error(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// EVALUATIONS WIDGETS
// ─────────────────────────────────────────────────────────────────────
export async function loadPlayerEvaluations(playerId) {
    const container = document.getElementById("player-evaluations-list");
    if (!container) return;
    container.innerHTML = "";
    
    try {
        const res = await fetch(`/api/evaluations?player_id=${playerId}`);
        if (!res.ok) throw new Error();
        const evals = await res.json();
        
        if (evals.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px 0;">Kayıtlı koç değerlendirmesi bulunmuyor.</div>`;
            return;
        }
        
        evals.forEach(ev => {
            const card = document.createElement("div");
            card.style.background = "var(--bg-subpanel)";
            card.style.border = "1px solid var(--border-color)";
            card.style.borderRadius = "var(--border-radius)";
            card.style.padding = "15px";
            
            const starStr = "★".repeat(Math.round(ev.overall)) + "☆".repeat(5 - Math.round(ev.overall));
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:8px;">
                    <div>
                        <strong style="font-size:0.85rem; color:var(--text-primary);">Hafta: ${ev.week_date}</strong>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="color: var(--accent-color); font-weight:700; font-size:0.9rem;">${starStr} (${ev.overall})</span>
                        <button class="btn-secondary btn-del-eval" style="border-color:var(--attr-poor); color:var(--attr-poor); padding:2px 6px; font-size:0.7rem; cursor:pointer;">Sil</button>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; margin-bottom:8px; font-size:0.7rem; text-align:center;">
                    <div style="background:var(--bg-dark); padding:4px; border-radius:4px;">Davranış: <strong>${ev.attitude}</strong></div>
                    <div style="background:var(--bg-dark); padding:4px; border-radius:4px;">Efor: <strong>${ev.effort}</strong></div>
                    <div style="background:var(--bg-dark); padding:4px; border-radius:4px;">Teknik: <strong>${ev.technical}</strong></div>
                    <div style="background:var(--bg-dark); padding:4px; border-radius:4px;">Taktik: <strong>${ev.tactical}</strong></div>
                    <div style="background:var(--bg-dark); padding:4px; border-radius:4px;">Fizik: <strong>${ev.physical}</strong></div>
                </div>
                ${ev.notes ? `<p style="font-size:0.75rem; color:var(--text-secondary); font-style:italic; line-height:1.4; margin:0;">Not: ${ev.notes}</p>` : ""}
            `;
            
            card.querySelector(".btn-del-eval").onclick = async () => {
                if (confirm("Bu değerlendirmeyi silmek istediğinize emin misiniz?")) {
                    await deleteEvaluation(ev.id);
                }
            };
            
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:var(--attr-poor); font-size:0.8rem;">Yükleme hatası.</div>`;
    }
}

export function openPlayerAddEvaluationModal() {
    if (!state.activePlayerId) {
        showToast("Lütfen önce bir oyuncu seçin.", "error");
        return;
    }
    document.getElementById("eval-input-week").value = new Date().toISOString().split("T")[0];
    document.getElementById("eval-input-attitude").value = "3";
    document.getElementById("eval-input-effort").value = "3";
    document.getElementById("eval-input-technical").value = "3";
    document.getElementById("eval-input-tactical").value = "3";
    document.getElementById("eval-input-physical").value = "3";
    document.getElementById("eval-input-notes").value = "";
    
    openModal("modal-add-evaluation");
}

export async function handleSaveEvaluationSubmit() {
    if (!state.activePlayerId) return;

    const week_date = document.getElementById("eval-input-week").value;
    const attitude = parseInt(document.getElementById("eval-input-attitude").value);
    const effort = parseInt(document.getElementById("eval-input-effort").value);
    const technical = parseInt(document.getElementById("eval-input-technical").value);
    const tactical = parseInt(document.getElementById("eval-input-tactical").value);
    const physical = parseInt(document.getElementById("eval-input-physical").value);
    const notes = document.getElementById("eval-input-notes").value.trim();

    if (!week_date) {
        showToast("Lütfen değerlendirme haftasını seçin.", "error");
        return;
    }

    try {
        const res = await fetch("/api/evaluations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                player_id: state.activePlayerId,
                week_date,
                attitude,
                effort,
                technical,
                tactical,
                physical,
                notes
            })
        });
        if (!res.ok) throw new Error();

        showToast("Koç değerlendirmesi kaydedildi.", "success");
        closeModal("modal-add-evaluation");
        loadPlayerEvaluations(state.activePlayerId);
    } catch (err) {
        console.error(err);
        showToast("Değerlendirme kaydedilemedi.", "error");
    }
}

async function deleteEvaluation(id) {
    try {
        const res = await fetch(`/api/evaluations?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Değerlendirme silindi.", "success");
            loadPlayerEvaluations(state.activePlayerId);
        }
    } catch (err) {
        console.error(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// ACHIEVEMENTS WIDGETS
// ─────────────────────────────────────────────────────────────────────
export async function loadPlayerAchievements(playerId) {
    const container = document.getElementById("player-achievements-grid");
    if (!container) return;
    container.innerHTML = "";
    
    try {
        const res = await fetch(`/api/achievements?player_id=${playerId}`);
        if (!res.ok) throw new Error();
        const achs = await res.json();
        
        if (achs.length === 0) {
            container.innerHTML = `<div style="grid-column: span 10; text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px 0;">Henüz rozet kazanılmamış.</div>`;
            return;
        }
        
        const badgeIcons = {
            "star": "⭐",
            "fire": "🔥",
            "target": "🎯",
            "trophy": "🏆",
            "shield": "🛡️",
            "zap": "⚡",
            "ilk_gol": "⚽",
            "5_gol": "🔥",
            "10_gol": "💥",
            "ilk_asist": "🎯",
            "5_asist": "🅰️",
            "ilk_mac": "🏟️",
            "10_mac": "⭐",
            "devam_10": "✅",
            "devam_30": "🏆"
        };
        
        achs.forEach(ac => {
            const icon = badgeIcons[ac.badge_type] || "🏅";
            const box = document.createElement("div");
            box.style.background = "var(--bg-subpanel)";
            box.style.border = "1px solid var(--border-color)";
            box.style.borderRadius = "var(--border-radius)";
            box.style.padding = "10px";
            box.style.display = "flex";
            box.style.flexDirection = "column";
            box.style.alignItems = "center";
            box.style.gap = "4px";
            box.style.position = "relative";
            box.className = "achievement-badge-card";
            
            box.innerHTML = `
                <div style="font-size: 1.8rem; margin-bottom:4px;">${icon}</div>
                <div style="font-weight: 700; font-size: 0.75rem; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; width:100%;">${ac.title}</div>
                <div style="font-size: 0.6rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; width:100%;" title="${ac.description}">${ac.description}</div>
                <button class="btn-del-ach" style="position:absolute; top:2px; right:2px; background:none; border:none; color:var(--attr-poor); font-size:0.6rem; cursor:pointer; opacity:0; transition:opacity 0.2s;">✕</button>
            `;
            
            box.querySelector(".btn-del-ach").onclick = async (e) => {
                e.stopPropagation();
                if (confirm("Bu rozeti silmek istiyor musunuz?")) {
                    await deleteAchievement(ac.id);
                }
            };
            
            box.onmouseenter = () => { box.querySelector(".btn-del-ach").style.opacity = "1"; };
            box.onmouseleave = () => { box.querySelector(".btn-del-ach").style.opacity = "0"; };
            
            container.appendChild(box);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:var(--attr-poor); font-size:0.8rem; grid-column: span 10;">Yükleme hatası.</div>`;
    }
}

export function openPlayerAddAchievementModal() {
    if (!state.activePlayerId) {
        showToast("Lütfen önce bir oyuncu seçin.", "error");
        return;
    }
    document.getElementById("ach-input-title").value = "";
    document.getElementById("ach-input-type").value = "star";
    document.getElementById("ach-input-desc").value = "";
    
    openModal("modal-add-achievement");
}

export async function handleSaveAchievementSubmit() {
    if (!state.activePlayerId) return;

    const title = document.getElementById("ach-input-title").value.trim();
    const badge_type = document.getElementById("ach-input-type").value;
    const description = document.getElementById("ach-input-desc").value.trim();

    if (!title) {
        showToast("Lütfen rozet başlığı girin.", "error");
        return;
    }

    try {
        const res = await fetch("/api/achievements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                player_id: state.activePlayerId,
                badge_type,
                title,
                description
            })
        });
        if (!res.ok) throw new Error();

        showToast("Başarı rozeti verildi.", "success");
        closeModal("modal-add-achievement");
        loadPlayerAchievements(state.activePlayerId);
    } catch (err) {
        console.error(err);
        showToast("Rozet verilemedi.", "error");
    }
}

async function deleteAchievement(id) {
    try {
        const res = await fetch(`/api/achievements?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Rozet silindi.", "success");
            loadPlayerAchievements(state.activePlayerId);
        }
    } catch (err) {
        console.error(err);
    }
}
