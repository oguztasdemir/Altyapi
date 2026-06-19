import { state } from "./state.js";
import { showToast } from "./utils.js";

// Initialize Transfers View options and history table
export async function initTransfersView() {
    populateInternalPlayerSelect();
    populateTargetTeamSelects();
    renderTransfersHistory();
    
    const internalBtn = document.getElementById("tab-transfer-internal");
    const externalBtn = document.getElementById("tab-transfer-external");
    const historyBtn = document.getElementById("tab-transfer-history");
    
    if (internalBtn && !internalBtn.getAttribute("data-listening")) {
        internalBtn.setAttribute("data-listening", "true");
        internalBtn.addEventListener("click", () => switchTransferSubtab("internal"));
    }
    if (externalBtn && !externalBtn.getAttribute("data-listening")) {
        externalBtn.setAttribute("data-listening", "true");
        externalBtn.addEventListener("click", () => switchTransferSubtab("external"));
    }
    if (historyBtn && !historyBtn.getAttribute("data-listening")) {
        historyBtn.setAttribute("data-listening", "true");
        historyBtn.addEventListener("click", () => switchTransferSubtab("history"));
    }
}

export function switchTransferSubtab(tabName) {
    const internalBtn = document.getElementById("tab-transfer-internal");
    const externalBtn = document.getElementById("tab-transfer-external");
    const historyBtn = document.getElementById("tab-transfer-history");
    
    const internalCont = document.getElementById("transfer-internal-container");
    const externalCont = document.getElementById("transfer-external-container");
    const historyCont = document.getElementById("transfer-history-container");
    
    if (!internalBtn || !externalBtn || !historyBtn) return;
    
    [internalBtn, externalBtn, historyBtn].forEach(btn => {
        btn.className = "btn-secondary";
        btn.style.background = "transparent";
        btn.style.color = "var(--text-primary)";
    });
    
    if (internalCont) internalCont.style.display = "none";
    if (externalCont) externalCont.style.display = "none";
    if (historyCont) historyCont.style.display = "none";
    
    if (tabName === "internal") {
        internalBtn.className = "btn-primary";
        internalBtn.style.background = "var(--accent-color)";
        internalBtn.style.color = "#000";
        if (internalCont) internalCont.style.display = "block";
    } else if (tabName === "external") {
        externalBtn.className = "btn-primary";
        externalBtn.style.background = "var(--accent-color)";
        externalBtn.style.color = "#000";
        if (externalCont) externalCont.style.display = "block";
    } else if (tabName === "history") {
        historyBtn.className = "btn-primary";
        historyBtn.style.background = "var(--accent-color)";
        historyBtn.style.color = "#000";
        if (historyCont) historyCont.style.display = "block";
    }
}

// Populate players dropdown for internal transfers
export function populateInternalPlayerSelect() {
    const playerSelect = document.getElementById("internal-transfer-player");
    if (!playerSelect) return;
    playerSelect.innerHTML = "";

    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || !activeTeam.players || activeTeam.players.length === 0) {
        playerSelect.innerHTML = `<option value="">-- Kadroda Oyuncu Yok --</option>`;
        return;
    }

    activeTeam.players.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.innerText = p.name;
        playerSelect.appendChild(opt);
    });
}

// Populate target team selectors for both internal and external forms
export function populateTargetTeamSelects() {
    const internalTeamSelect = document.getElementById("internal-transfer-target-team");
    const externalTeamSelect = document.getElementById("ext-transfer-target-team");

    if (internalTeamSelect) {
        internalTeamSelect.innerHTML = "";
        state.teams.forEach(t => {
            if (t.id !== state.activeTeamId) {
                const opt = document.createElement("option");
                opt.value = t.id;
                opt.innerText = t.name;
                internalTeamSelect.appendChild(opt);
            }
        });
        if (internalTeamSelect.children.length === 0) {
            internalTeamSelect.innerHTML = `<option value="">-- Başka Takım Bulunmuyor --</option>`;
        }
    }

    if (externalTeamSelect) {
        externalTeamSelect.innerHTML = "";
        state.teams.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.innerText = t.name;
            externalTeamSelect.appendChild(opt);
        });
        if (externalTeamSelect.children.length === 0) {
            externalTeamSelect.innerHTML = `<option value="">-- Takım Bulunmuyor --</option>`;
        }
    }
}

// Render transfer history logs table
export async function renderTransfersHistory() {
    const tbody = document.getElementById("transfers-view-list-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!state.activeTeamId) return;

    try {
        const res = await fetch(`/api/transfers?team_id=${state.activeTeamId}`);
        if (!res.ok) throw new Error();
        const transfersList = await res.json();

        if (transfersList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Transfer kaydı bulunmuyor.</td></tr>`;
            return;
        }

        transfersList.forEach(tr => {
            const row = document.createElement("tr");
            const dateStr = tr.date ? new Date(tr.date).toLocaleDateString("tr-TR") : "-";
            const feeStr = tr.fee > 0 ? `${tr.fee.toLocaleString("tr-TR")} TL` : "Bedelsiz";
            
            row.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${tr.player_name || "Bilinmeyen Oyuncu"}</strong></td>
                <td><span style="font-size: 0.75rem; font-weight: bold; background: var(--border-color); padding: 2px 6px; border-radius: 4px;">${tr.transfer_type}</span></td>
                <td>${tr.from_team || "-"}</td>
                <td>${tr.to_team || "-"}</td>
                <td>${feeStr}</td>
                <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${tr.notes || ""}</span></td>
                <td>
                    <button class="btn-secondary" style="border-color: var(--attr-poor); color: var(--attr-poor); padding: 2px 6px; font-size: 0.7rem;" onclick="window.deleteTransferLog('${tr.id}')">Sil</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--attr-poor);">Geçmiş yüklenirken hata oluştu.</td></tr>`;
    }
}
