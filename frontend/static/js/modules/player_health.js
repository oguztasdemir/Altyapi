import { state } from "./state.js";
import { openModal } from "./ui.js";
import { showToast } from "./utils.js";
import { selectPlayer } from "./player.js";

export function handleAddInjuryClick() {
    if (!state.activePlayerId) return;
    
    document.getElementById("injury-input-type").value = "";
    document.getElementById("injury-input-start").value = new Date().toISOString().split('T')[0];
    document.getElementById("injury-input-end").value = "";
    document.getElementById("injury-input-notes").value = "";
    
    const logModal = document.getElementById("modal-log-injury");
    if (logModal) {
        logModal.setAttribute("data-player-id", state.activePlayerId);
        logModal.removeAttribute("data-injury-id");
    }
    
    openModal("modal-log-injury");
}

export function populateGrowthHistory(player) {
    const tbody = document.getElementById("growth-history-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const history = player.growth_history || [];
    
    // Sort descending for listing in table
    const sortedDesc = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sortedDesc.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 10px 0;">Kayıtlı fiziksel ölçüm bulunmuyor.</td></tr>`;
        return;
    }
    
    sortedDesc.forEach((record) => {
        const tr = document.createElement("tr");
        const h = parseFloat(record.height) || 0;
        const w = parseFloat(record.weight) || 0;
        
        let bmi = "-";
        if (h > 0 && w > 0) {
            bmi = (w / ((h / 100) ** 2)).toFixed(1);
        }
        
        let displayDate = record.date;
        try {
            const d = new Date(record.date);
            displayDate = d.toLocaleDateString("tr-TR");
        } catch(e) {}
        
        tr.innerHTML = `
            <td>${displayDate}</td>
            <td><strong>${h} cm</strong></td>
            <td><strong>${w} kg</strong></td>
            <td><span class="badge" style="background: rgba(179, 136, 255, 0.15); color: #b388ff; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${bmi}</span></td>
            <td>
                <button class="btn-delete-growth" style="color: var(--attr-poor); opacity: 0.8; cursor: pointer; background:none; border:none; padding: 2px 5px;" title="Sil">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px; pointer-events: none;">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </td>
        `;
        
        const originalIndex = history.indexOf(record);
        tr.querySelector(".btn-delete-growth").addEventListener("click", () => {
            if (confirm("Bu ölçüm kaydını silmek istiyor musunuz?")) {
                deleteGrowthRecord(player, originalIndex);
            }
        });
        
        tbody.appendChild(tr);
    });
}

export async function deleteGrowthRecord(player, index) {
    const history = player.growth_history || [];
    history.splice(index, 1);
    
    const updatedPlayer = {
        ...player,
        growthHistory: history
    };
    
    try {
        const res = await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPlayer)
        });
        if (res.ok) {
            const { loadData } = await import("./api.js");
            await loadData();
            
            // Refresh detail
            const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
            const freshPlayer = activeTeam.players.find(p => p.id === player.id);
            selectPlayer(freshPlayer.id);
            showToast("Ölçüm kaydı silindi.", "success");
        } else {
            showToast("Ölçüm silinirken hata oluştu.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Ölçüm silinirken hata oluştu.", "error");
    }
}

export function renderGrowthChart(player) {
    const canvas = document.getElementById("growthChart");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const parent = canvas.parentNode;
    const rect = parent.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height || 220;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const history = player.growth_history || [];
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (sorted.length < 2) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "12px Outfit, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Gelişimi çizmek için en az 2 ölçüm kaydı bulunmalıdır.", width / 2, height / 2);
        return;
    }
    
    const padding = { top: 25, right: 35, bottom: 25, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const heights = sorted.map(d => parseFloat(d.height) || 170);
    const weights = sorted.map(d => parseFloat(d.weight) || 70);
    
    const minH = Math.min(...heights) - 3;
    const maxH = Math.max(...heights) + 3;
    const minW = Math.min(...weights) - 3;
    const maxW = Math.max(...weights) + 3;
    
    const pointsCount = sorted.length;
    const getX = (i) => padding.left + (i / (pointsCount - 1)) * chartWidth;
    
    const getY = (val, min, max) => {
        const range = max - min || 1;
        return padding.top + chartHeight - ((val - min) / range) * chartHeight;
    };
    
    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }
    
    // Draw height line
    ctx.strokeStyle = "#b388ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    sorted.forEach((record, idx) => {
        const x = getX(idx);
        const y = getY(record.height, minH, maxH);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw weight line
    ctx.strokeStyle = "#5dade2";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    sorted.forEach((record, idx) => {
        const x = getX(idx);
        const y = getY(record.weight, minW, maxW);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw points and labels
    sorted.forEach((record, idx) => {
        const x = getX(idx);
        const yH = getY(record.height, minH, maxH);
        const yW = getY(record.weight, minW, maxW);
        
        // Height point
        ctx.fillStyle = "#b388ff";
        ctx.beginPath();
        ctx.arc(x, yH, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Weight point
        ctx.fillStyle = "#5dade2";
        ctx.beginPath();
        ctx.arc(x, yW, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Values text
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        
        ctx.fillText(`${record.height}`, x, yH - 8);
        ctx.fillText(`${record.weight}`, x, yW + 12);
        
        // Date text
        let labelDate = record.date;
        try {
            const d = new Date(record.date);
            labelDate = `${d.getDate()}/${d.getMonth()+1}`;
        } catch(e) {}
        
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "9px sans-serif";
        ctx.fillText(labelDate, x, height - 6);
    });
}
