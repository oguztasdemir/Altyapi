import { state } from "./state.js";
import { showToast } from "./utils.js";

const REPORT_ATTRS = [
    ["pace", "Hız"], ["finishing", "Bitiricilik"], ["dribbling", "Top Sürme"],
    ["passing", "Pas"], ["shooting", "Şut"], ["heading", "Kafa"],
    ["marking", "Markaj"], ["vision", "Vizyon"], ["decision", "Karar Verme"],
    ["teamwork", "Takım Çalışması"], ["strength", "Güç"], ["technique", "Teknik"]
];

export async function openPlayerReport(playerId) {
    const modal = document.getElementById("modal-player-report");
    if (!modal) return;
    modal.style.display = "flex";
    document.getElementById("report-name").textContent = "Yükleniyor...";
    document.getElementById("report-date").textContent = new Date().toLocaleDateString("tr-TR", {year:"numeric",month:"long",day:"numeric"});

    try {
        const res = await fetch(`/api/players/report?player_id=${encodeURIComponent(playerId)}`);
        if (!res.ok) throw new Error("Veri alınamadı");
        const data = await res.json();
        renderReport(data);
    } catch(e) {
        showToast("Karne yüklenemedi: " + e.message, "error");
    }
}

function renderReport(data) {
    const p = data.player;
    const stats = data.attendance_stats || {};
    const matchStats = data.match_stats || {};

    // Photo
    const photoEl = document.getElementById("report-photo");
    if (p.photo) {
        photoEl.innerHTML = `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;"/>`;
    } else {
        photoEl.textContent = "👤";
    }

    // Header
    document.getElementById("report-name").textContent = p.name || "—";
    document.getElementById("report-position-badge").textContent = p.primaryPosition || "—";
    document.getElementById("report-team-badge").textContent = p.team_name || "—";

    // Overall
    const overall = Math.round(p.overallRating || calculateSimpleOverall(p.attributes || {}));
    const overallEl = document.getElementById("report-overall");
    overallEl.textContent = overall;
    const color = overall >= 80 ? "#00ff88" : overall >= 65 ? "#f7971e" : "#ff6b6b";
    overallEl.style.color = color;
    overallEl.style.borderColor = color;

    // Bio
    document.getElementById("report-age").textContent = p.age || "—";
    document.getElementById("report-height").textContent = p.height || "—";
    document.getElementById("report-weight").textContent = p.weight || "—";
    document.getElementById("report-foot").textContent = (p.foot || "—").substring(0,3);
    document.getElementById("report-nationality").textContent = p.nationality || "—";

    // Match Stats
    document.getElementById("report-matches").textContent = p.matchesPlayed || 0;
    document.getElementById("report-goals").textContent = p.goals || 0;
    document.getElementById("report-assists").textContent = p.assists || 0;
    document.getElementById("report-rating").textContent = (p.matchRating || 6.0).toFixed(1);
    document.getElementById("report-yellows").textContent = p.yellowCards || 0;
    document.getElementById("report-reds").textContent = p.redCards || 0;

    // Attendance donut
    const attEl = document.getElementById("report-attendance-donut");
    const total = stats.total || 0;
    const attended = stats.attended || 0;
    const pct = total > 0 ? Math.round(attended/total*100) : 0;
    const pctColor = pct >= 80 ? "#00ff88" : pct >= 50 ? "#f7971e" : "#ff6b6b";
    attEl.innerHTML = `
        <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="35" fill="none" stroke="var(--border-color)" stroke-width="10"/>
            <circle cx="45" cy="45" r="35" fill="none" stroke="${pctColor}" stroke-width="10"
                stroke-dasharray="${2*Math.PI*35}" stroke-dashoffset="${2*Math.PI*35*(1-pct/100)}"
                stroke-linecap="round" transform="rotate(-90 45 45)"/>
            <text x="45" y="50" text-anchor="middle" fill="${pctColor}" font-size="18" font-weight="800">${pct}%</text>
        </svg>
        <div style="font-size:0.78rem; color:var(--text-secondary); text-align:center;">${attended}/${total} Antrenman<br><span style="color:var(--text-muted); font-size:0.72rem;">Son kayıtlara göre</span></div>
    `;

    // Attribute bars
    const attrsEl = document.getElementById("report-attributes-bars");
    const attrs = p.attributes || {};
    attrsEl.innerHTML = REPORT_ATTRS.map(([key, label]) => {
        const val = attrs[key] || 50;
        const barColor = val >= 80 ? "#00ff88" : val >= 65 ? "#f7971e" : val >= 50 ? "#4facfe" : "#ff6b6b";
        return `<div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span style="font-size:0.75rem; color:var(--text-secondary);">${label}</span>
                <span style="font-size:0.75rem; font-weight:700; color:${barColor};">${val}</span>
            </div>
            <div style="height:6px; background:var(--border-color); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${val}%; background:${barColor}; border-radius:3px; transition:width 0.6s ease;"></div>
            </div>
        </div>`;
    }).join("");

    // Coach notes & parent
    document.getElementById("report-coach-notes").textContent = p.coachNotes || "Koç notu bulunmuyor.";
    document.getElementById("report-parent-name").textContent = p.parentName ? `👤 ${p.parentName}` : "Veli adı girilmemiş";
    document.getElementById("report-parent-phone").textContent = p.parentPhone ? `📞 ${p.parentPhone}` : "Telefon girilmemiş";
}

function calculateSimpleOverall(attrs) {
    const vals = Object.values(attrs).filter(v => typeof v === "number");
    return vals.length ? Math.round(vals.reduce((a,b) => a+b, 0)/vals.length) : 50;
}

export function printPlayerReport() {
    window.print();
}
