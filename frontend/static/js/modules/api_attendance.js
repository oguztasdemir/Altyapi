import { state } from "./state.js";
import { showToast } from "./utils.js";

// Attendance Management Helpers
export async function loadAttendanceData() {
    if (!state.activeTeamId) return;
    
    const container = document.getElementById("attendance-days-list");
    if (!container) return;
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>`;
    
    try {
        const res = await fetch(`/api/attendance?team_id=${state.activeTeamId}`);
        if (!res.ok) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--attr-poor);">Yoklama verileri yüklenemedi.</div>`;
            return;
        }
        
        const days = await res.json();
        container.innerHTML = "";
        
        if (days.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Henüz yoklama kaydı bulunmuyor. Yukarıdan yeni gün ekleyebilirsiniz.</div>`;
            return;
        }
        
        const formatDateNice = (dateStr) => {
            if (!dateStr) return "";
            const parts = dateStr.split("-");
            if (parts.length === 3) {
                const d = new Date(parts[0], parts[1]-1, parts[2]);
                return d.toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
            }
            return dateStr;
        };

        days.forEach((day, idx) => {
            const dayCard = document.createElement("div");
            dayCard.className = "card accordion-card";
            dayCard.style.marginBottom = "8px";
            
            let katildiCount = 0;
            let katilmadiCount = 0;
            let izinliCount = 0;
            
            day.players.forEach(p => {
                const s = p.status || "Katıldı";
                if (s === "Katıldı") katildiCount++;
                else if (s === "Katılmadı") katilmadiCount++;
                else if (s === "İzinli") izinliCount++;
            });
            
            dayCard.innerHTML = `
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; padding: 15px 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-panel); gap: 10px; cursor: pointer; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="accordion-arrow" style="font-size: 0.75rem; color: var(--text-muted); transition: transform 0.2s;">▶</span>
                        <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--accent-color);">${formatDateNice(day.date)}</h4>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; font-size: 0.8rem; font-weight: 600; flex-wrap: wrap;">
                        <span style="color: var(--text-secondary); background: var(--bg-subpanel); padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border-color);">Kayıtlı: ${day.players.length}</span>
                        <span style="color: var(--accent-color); background: rgba(0, 255, 136, 0.08); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(0, 255, 136, 0.2);">Katıldı: <strong class="stat-katildi">${katildiCount}</strong></span>
                        <span style="color: var(--attr-poor); background: rgba(255, 68, 68, 0.08); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(255, 68, 68, 0.2);">Katılmadı: <strong class="stat-katilmadi">${katilmadiCount}</strong></span>
                        <span style="color: var(--attr-average); background: rgba(255, 153, 0, 0.08); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(255, 153, 0, 0.2);">İzinli: <strong class="stat-izinli">${izinliCount}</strong></span>
                    </div>
                </div>
                <div class="card-body" style="padding: 0; display: none;">
                    <div class="squad-table-container">
                        <table class="squad-table" style="margin: 0;">
                            <thead>
                                <tr>
                                    <th style="padding-left: 20px; text-align: left;">Futbolcu Adı</th>
                                    <th style="text-align: center; padding-right: 20px; width: 300px;">Durum Seçimi</th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            const header = dayCard.querySelector(".card-header");
            const body = dayCard.querySelector(".card-body");
            const arrow = dayCard.querySelector(".accordion-arrow");
            
            header.addEventListener("click", (e) => {
                if (e.target.closest(".attendance-pills") || e.target.closest(".att-pill")) return;
                
                const isHidden = body.style.display === "none";
                body.style.display = isHidden ? "block" : "none";
                arrow.style.transform = isHidden ? "rotate(90deg)" : "rotate(0deg)";
            });
 
            const tbody = dayCard.querySelector("tbody");
            day.players.forEach(p => {
                const tr = document.createElement("tr");
                const currentStatus = p.status || "Katıldı";
                
                tr.innerHTML = `
                    <td style="padding-left: 20px; text-align: left;"><strong>${p.name}</strong></td>
                    <td style="text-align: center; padding-right: 20px;">
                        <div class="attendance-pills" data-player-id="${p.player_id}">
                            <div class="att-pill katildi ${currentStatus === 'Katıldı' ? 'active' : ''}">Katıldı</div>
                            <div class="att-pill katilmadi ${currentStatus === 'Katılmadı' ? 'active' : ''}">Katılmadı</div>
                            <div class="att-pill izinli ${currentStatus === 'İzinli' ? 'active' : ''}">İzinli</div>
                        </div>
                    </td>
                `;
                
                const pills = tr.querySelectorAll(".att-pill");
                pills.forEach(pill => {
                    pill.addEventListener("click", async () => {
                        if (pill.classList.contains("active")) return;
                        
                        pills.forEach(pl => pl.classList.remove("active"));
                        pill.classList.add("active");
                        
                        let statusText = "Katıldı";
                        if (pill.classList.contains("katilmadi")) statusText = "Katılmadı";
                        else if (pill.classList.contains("izinli")) statusText = "İzinli";
                        
                        let newKatildi = 0;
                        let newKatilmadi = 0;
                        let newIzinli = 0;
                        
                        dayCard.querySelectorAll(".attendance-pills").forEach(el => {
                            const active = el.querySelector(".att-pill.active");
                            if (active) {
                                if (active.classList.contains("katildi")) newKatildi++;
                                else if (active.classList.contains("katilmadi")) newKatilmadi++;
                                else if (active.classList.contains("izinli")) newIzinli++;
                            }
                        });
                        
                        dayCard.querySelector(".stat-katildi").innerText = newKatildi;
                        dayCard.querySelector(".stat-katilmadi").innerText = newKatilmadi;
                        dayCard.querySelector(".stat-izinli").innerText = newIzinli;
                        
                        const payload = [{
                            player_id: p.player_id,
                            date: day.date,
                            status: statusText
                        }];
                        
                        try {
                            const saveRes = await fetch("/api/attendance", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload)
                            });
                            if (!saveRes.ok) {
                                showToast("Yoklama kaydedilemedi.", "error");
                            }
                        } catch (err) {
                            console.error(err);
                            showToast("Bağlantı hatası.", "error");
                        }
                    });
                });
                
                tbody.appendChild(tr);
            });
            
            container.appendChild(dayCard);
        });
    } catch (e) {
        console.error("Yoklama verisi yüklenemedi", e);
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--attr-poor);">Bağlantı hatası.</div>`;
    }
}

export async function loadAttendanceAnalysis() {
    if (!state.activeTeamId) return;
    const tbody = document.getElementById("attendance-report-tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">Yükleniyor...</td></tr>`;

    try {
        const res = await fetch(`/api/attendance/analysis?team_id=${state.activeTeamId}`);
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--attr-poor);">Veriler yüklenemedi.</td></tr>`;
            return;
        }

        const data = await res.json();
        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">Oyuncu bulunmuyor.</td></tr>`;
            return;
        }

        let totalAttended = 0;
        let totalExcused = 0;
        let totalAbsent = 0;

        data.forEach(p => {
            totalAttended += p.attended || 0;
            totalExcused += p.excused || 0;
            totalAbsent += p.absent || 0;

            const tr = document.createElement("tr");
            
            let textColor = "var(--attr-average)";
            if (p.rate >= 85) {
                textColor = "var(--attr-excellent)";
            } else if (p.rate < 60) {
                textColor = "var(--attr-poor)";
            }
            
            let statusText = "Düzenli";
            if (p.rate < 60) statusText = "Devamsız";
            else if (p.rate < 85) statusText = "İstikrarsız";

            tr.innerHTML = `
                <td style="padding-left: 20px;"><strong>${p.name}</strong></td>
                <td style="text-align: center; color: var(--attr-excellent); font-weight: 600;">${p.attended}</td>
                <td style="text-align: center; color: var(--attr-average); font-weight: 600;">${p.excused}</td>
                <td style="text-align: center; color: var(--attr-poor); font-weight: 600;">${p.absent}</td>
                <td style="text-align: center;">
                    <div style="font-weight: 800; color: ${textColor};">%${p.rate}</div>
                </td>
                <td style="text-align: center;">
                    <span style="font-size: 0.7rem; font-weight: 700; color: ${textColor}; background: rgba(255,255,255,0.03); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                        ${statusText}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });

        drawAttendancePieChart(totalAttended, totalExcused, totalAbsent);

    } catch (e) {
        console.error("Attendance analysis load failed:", e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--attr-poor);">Bağlantı hatası.</td></tr>`;
    }
}

export function drawAttendancePieChart(attended, excused, absent) {
    const container = document.getElementById("attendance-pie-chart-container");
    const legend = document.getElementById("attendance-pie-chart-legend");
    if (!container || !legend) return;

    const total = attended + excused + absent;
    if (total === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Yoklama verisi yok</div>`;
        legend.innerHTML = "";
        return;
    }

    const pAttended = (attended / total) * 100;
    const pExcused = (excused / total) * 100;
    const pAbsent = (absent / total) * 100;

    const r = 45;
    const c = 2 * Math.PI * r; // ~282.74

    const dashAttended = (pAttended / 100) * c;
    const dashExcused = (pExcused / 100) * c;
    const dashAbsent = (pAbsent / 100) * c;

    container.innerHTML = `
        <svg width="170" height="170" viewBox="0 0 120 120" style="transform: rotate(-90deg); filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.3));">
            <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--bg-dark)" stroke-width="12"></circle>
            <!-- Katildi Circle -->
            <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--accent-color)" stroke-width="12"
                stroke-dasharray="${dashAttended} ${c - dashAttended}" stroke-dashoffset="0" stroke-linecap="round"></circle>
            <!-- Izinli Circle -->
            <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--attr-average)" stroke-width="12"
                stroke-dasharray="${dashExcused} ${c - dashExcused}" stroke-dashoffset="-${dashAttended}" stroke-linecap="round"></circle>
            <!-- Katilmadi Circle -->
            <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--attr-poor)" stroke-width="12"
                stroke-dasharray="${dashAbsent} ${c - dashAbsent}" stroke-dashoffset="-${dashAttended + dashExcused}" stroke-linecap="round"></circle>
        </svg>
    `;

    legend.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px;">
            <span style="display: flex; align-items: center; gap: 6px; font-weight: 500;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-color);"></span>Katıldı</span>
            <strong>${attended} (%${Math.round(pAttended)})</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px;">
            <span style="display: flex; align-items: center; gap: 6px; font-weight: 500;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--attr-average);"></span>İzinli / Sakat</span>
            <strong>${excused} (%${Math.round(pExcused)})</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="display: flex; align-items: center; gap: 6px; font-weight: 500;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--attr-poor);"></span>Katılmadı</span>
            <strong>${absent} (%${Math.round(pAbsent)})</strong>
        </div>
    `;
}

export async function handleSaveAttendance() {
    // Deprecated
}
