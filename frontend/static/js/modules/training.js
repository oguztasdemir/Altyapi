import { state } from "./state.js";
import { showToast } from "./utils.js";
import { openModal, closeModal } from "./ui.js";

let currentWeekStart = getMonday(new Date());

function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

export async function loadTrainingData() {
    if (!state.activeTeamId) return;

    const fromDate = currentWeekStart.toISOString().split("T")[0];
    const toDate = new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Update week label
    const weekDisplay = document.getElementById("training-current-week-display");
    if (weekDisplay) {
        const options = { day: 'numeric', month: 'short' };
        const startStr = currentWeekStart.toLocaleDateString("tr-TR", options);
        const endStr = new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR", options);
        weekDisplay.innerText = `${startStr} - ${endStr} (${currentWeekStart.getFullYear()})`;
    }

    try {
        const res = await fetch(`/api/training?team_id=${state.activeTeamId}&from=${fromDate}&to=${toDate}`);
        if (!res.ok) throw new Error("Veri yüklenemedi");
        const sessions = await res.json();
        renderWeeklyGrid(sessions);
    } catch (err) {
        console.error(err);
        showToast("Antrenman takvimi yüklenemedi.", "error");
    }
}

function renderWeeklyGrid(sessions) {
    const grid = document.getElementById("training-weekly-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const daysOfWeek = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    
    // Create 7 columns
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(currentWeekStart.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = dayDate.toISOString().split("T")[0];
        const dayName = daysOfWeek[i];
        
        // Filter sessions for this day
        const daySessions = sessions.filter(s => s.date === dateStr);
        
        const col = document.createElement("div");
        col.className = "card";
        col.style.background = "var(--bg-subpanel)";
        col.style.border = "1px solid var(--border-color)";
        col.style.minHeight = "350px";
        col.style.padding = "10px";
        col.style.display = "flex";
        col.style.flexDirection = "column";
        col.style.gap = "8px";
        
        const isToday = new Date().toISOString().split("T")[0] === dateStr;
        
        col.innerHTML = `
            <div style="border-bottom: 2px solid ${isToday ? 'var(--accent-color)' : 'var(--border-color)'}; padding-bottom: 6px; margin-bottom: 4px; text-align: center;">
                <div style="font-weight: 800; font-size: 0.85rem; color: ${isToday ? 'var(--accent-color)' : 'var(--text-primary)'};">${dayName}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${dayDate.getDate()} ${dayDate.toLocaleDateString("tr-TR", { month: "short" })}</div>
            </div>
            <div class="day-sessions-container" style="flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
                <!-- Sessions listed here -->
            </div>
        `;
        
        const sessionsContainer = col.querySelector(".day-sessions-container");
        
        if (daySessions.length === 0) {
            sessionsContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 20px 0; border: 1px dashed var(--border-color); border-radius: var(--border-radius); flex: 1; display: flex; align-items: center; justify-content: center;">
                    Plan yok
                </div>
            `;
        } else {
            daySessions.forEach(session => {
                const item = document.createElement("div");
                item.style.background = "var(--bg-panel)";
                item.style.borderLeft = `3px solid ${session.color || 'var(--accent-color)'}`;
                item.style.borderRadius = "4px";
                item.style.padding = "8px";
                item.style.cursor = "pointer";
                item.style.transition = "transform 0.15s";
                item.className = "training-item-card";
                
                item.innerHTML = `
                    <div style="font-weight: 700; font-size: 0.8rem; margin-bottom: 3px; color: var(--text-primary);">${session.title}</div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <span>${session.start_time} - ${session.end_time}</span>
                    </div>
                    ${session.location ? `
                    <div style="font-size: 0.65rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>${session.location}</span>
                    </div>` : ""}
                    <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
                        <button class="btn-start-att-session" style="background:none; border:none; color: var(--accent-color); font-size: 0.65rem; cursor:pointer; font-weight: bold;">Yoklama Başlat</button>
                        <button class="btn-edit-tr-session" style="background:none; border:none; color: var(--text-secondary); font-size: 0.65rem; cursor:pointer;">Düzelt</button>
                        <button class="btn-delete-tr-session" style="background:none; border:none; color: var(--attr-poor); font-size: 0.65rem; cursor:pointer;">Sil</button>
                    </div>
                `;
                
                // Start Attendance, Edit, Delete Listeners
                item.querySelector(".btn-start-att-session").addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
                    if (!activeTeam || activeTeam.players.length === 0) {
                        showToast("Takımda oyuncu yok.", "error");
                        return;
                    }
                    
                    const initialRecords = activeTeam.players.map(p => ({
                        player_id: p.id,
                        date: session.date,
                        status: "Katıldı"
                    }));
                    
                    try {
                        const res = await fetch("/api/attendance", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(initialRecords)
                        });
                        if (res.ok) {
                            showToast("Yoklama oturumu başlatıldı.", "success");
                        }
                        const { switchTab, loadAttendanceData } = await import("./ui.js");
                        switchTab("nav-attendance");
                        loadAttendanceData();
                    } catch (err) {
                        console.error(err);
                        showToast("Bağlantı hatası.", "error");
                    }
                });
                
                item.querySelector(".btn-edit-tr-session").addEventListener("click", (e) => {
                    e.stopPropagation();
                    openEditTrainingModal(session);
                });
                
                item.querySelector(".btn-delete-tr-session").addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (confirm("Bu antrenman planını silmek istediğinize emin misiniz?")) {
                        await deleteTrainingSession(session.id);
                    }
                });
                
                sessionsContainer.appendChild(item);
            });
        }
        
        grid.appendChild(col);
    }
}

export function openAddTrainingModal() {
    document.getElementById("modal-training-title").innerText = "Yeni Antrenman Planla";
    document.getElementById("training-id-hidden").value = "";
    document.getElementById("training-input-title").value = "";
    document.getElementById("training-input-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("training-input-start").value = "16:00";
    document.getElementById("training-input-end").value = "18:00";
    document.getElementById("training-input-location").value = "";
    document.getElementById("training-input-notes").value = "";
    document.getElementById("training-input-color").value = "#00ff88";
    openModal("modal-add-training");
}

function openEditTrainingModal(session) {
    document.getElementById("modal-training-title").innerText = "Antrenmanı Düzenle";
    document.getElementById("training-id-hidden").value = session.id;
    document.getElementById("training-input-title").value = session.title;
    document.getElementById("training-input-date").value = session.date;
    document.getElementById("training-input-start").value = session.start_time;
    document.getElementById("training-input-end").value = session.end_time;
    document.getElementById("training-input-location").value = session.location || "";
    document.getElementById("training-input-notes").value = session.notes || "";
    document.getElementById("training-input-color").value = session.color || "#00ff88";
    openModal("modal-add-training");
}

export async function handleSaveTrainingSubmit() {
    if (!state.activeTeamId) return;
    
    const id = document.getElementById("training-id-hidden").value;
    const title = document.getElementById("training-input-title").value.trim();
    const date = document.getElementById("training-input-date").value;
    const start_time = document.getElementById("training-input-start").value;
    const end_time = document.getElementById("training-input-end").value;
    const location = document.getElementById("training-input-location").value.trim();
    const notes = document.getElementById("training-input-notes").value.trim();
    const color = document.getElementById("training-input-color").value;
    const repeat = document.getElementById("training-input-repeat").value;

    if (!title || !date) {
        showToast("Lütfen başlık ve tarih alanlarını doldurun.", "error");
        return;
    }

    try {
        // If repeat is weekly, we will insert multiple sessions or let the backend do it.
        // For simplicity, let's create 4 sessions (once a week for 4 weeks) if repeat is weekly
        const datesToSave = [date];
        if (repeat === "weekly" && !id) {
            const startD = new Date(date);
            for (let i = 1; i <= 3; i++) {
                const nextD = new Date(startD.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                datesToSave.push(nextD.toISOString().split("T")[0]);
            }
        }

        for (const d of datesToSave) {
            const bodyData = {
                team_id: state.activeTeamId,
                title,
                date: d,
                start_time,
                end_time,
                location,
                notes,
                color
            };
            if (id && datesToSave.length === 1) {
                bodyData.id = id;
            }
            
            const res = await fetch("/api/training", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });
            if (!res.ok) throw new Error("Hata oluştu");
        }

        showToast("Antrenman planı başarıyla kaydedildi.", "success");
        closeModal("modal-add-training");
        loadTrainingData();
    } catch (err) {
        console.error(err);
        showToast("Antrenman kaydedilemedi.", "error");
    }
}

async function deleteTrainingSession(id) {
    try {
        const res = await fetch(`/api/training?id=${id}`, {
            method: "DELETE"
        });
        if (res.ok) {
            showToast("Antrenman planı silindi.", "success");
            loadTrainingData();
        } else {
            showToast("Antrenman planı silinemedi.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Bağlantı hatası.", "error");
    }
}

export function navigateWeek(direction) {
    const offset = direction * 7 * 24 * 60 * 60 * 1000;
    currentWeekStart = new Date(currentWeekStart.getTime() + offset);
    loadTrainingData();
}
