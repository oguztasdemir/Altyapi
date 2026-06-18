import { state } from "./state.js";
import { openModal, closeModal, switchTab, selectPlayer } from "./ui.js";
import { showToast } from "./utils.js";
import { FORMATIONS } from "./player_tactical.js";

// Global variables for multiple lineups management
let teamLineups = []; // Array of lineups: [{ id, name, formation, positions, bench }]
let activeLineupId = null; // ID of the currently selected lineup
let activeLineup = {
    formation: "4-3-3-holding",
    positions: {}, // e.g. { "GK_0": "player-1", ... }
    bench: {} // e.g. { "SUB_1": "player-5", ... }
};

let currentTargetSlot = null; // Stores { type: 'pitch' | 'bench', key: string }

// Helper to determine if a player is compatible with a position code (e.g. GK, CB, ST)
function isPlayerCompatibleWithPosition(player, posCode) {
    if (!player) return true;
    
    const target = posCode.trim().toUpperCase();
    
    // Extract position codes from player's primaryPosition (e.g., "Santrafor (ST)" -> "ST")
    // Or it might be just "ST". Let's handle both.
    const extractCodes = (str) => {
        if (!str) return [];
        const matches = str.match(/\(([^)]+)\)/g);
        if (matches) {
            return matches.map(m => m.replace(/[()]/g, '').trim().toUpperCase());
        }
        return str.split(/[\s,()]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    };

    const primaryCodes = extractCodes(player.primaryPosition);
    const secondaryCodes = extractCodes(player.secondaryPositions);
    
    const allCompatibleCodes = [...primaryCodes, ...secondaryCodes];
    return allCompatibleCodes.includes(target);
}

// Load all lineups for the active team and render the page
export function loadAndRenderTacticsPage() {
    if (!state.activeTeamId) return;
    
    // Load lineups list from localStorage
    const savedLineups = localStorage.getItem(`fm_lineups_${state.activeTeamId}`);
    if (savedLineups) {
        try {
            teamLineups = JSON.parse(savedLineups);
        } catch(e) {
            teamLineups = [];
        }
    } else {
        teamLineups = [];
    }
    
    // If empty list, create a default lineup
    if (teamLineups.length === 0) {
        const defaultLineup = {
            id: "lineup_" + Date.now(),
            name: "Varsayılan Kadro (4-3-3)",
            formation: "4-3-3-holding",
            positions: {},
            bench: {}
        };
        // Migrate old single lineup if present
        const oldSaved = localStorage.getItem(`fm_lineup_${state.activeTeamId}`);
        if (oldSaved) {
            try {
                const oldObj = JSON.parse(oldSaved);
                defaultLineup.formation = oldObj.formation || "4-3-3-holding";
                defaultLineup.positions = oldObj.positions || {};
                defaultLineup.bench = oldObj.bench || {};
            } catch(e) {}
        }
        teamLineups.push(defaultLineup);
        localStorage.setItem(`fm_lineups_${state.activeTeamId}`, JSON.stringify(teamLineups));
    }
    
    // Set active lineup ID
    const savedActiveId = localStorage.getItem(`fm_active_lineup_id_${state.activeTeamId}`);
    const activeExists = teamLineups.find(l => l.id === savedActiveId);
    if (activeExists) {
        activeLineupId = savedActiveId;
    } else {
        activeLineupId = teamLineups[0].id;
    }
    
    // Set current activeLineup object reference
    const found = teamLineups.find(l => l.id === activeLineupId);
    activeLineup = found || teamLineups[0];
    
    // Populate the lineup select dropdown
    populateLineupSelector();
    
    // Populate form elements
    const formationSelect = document.getElementById("team-formation-select");
    if (formationSelect) {
        formationSelect.value = activeLineup.formation || "4-3-3-holding";
    }
    
    renderTeamLineupPitch();
    renderTeamLineupBench();
    renderTeamLineupPool();
}

// Populate the dropdown list of lineups
function populateLineupSelector() {
    const select = document.getElementById("tactic-lineup-select");
    if (!select) return;
    
    select.innerHTML = "";
    teamLineups.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.id;
        opt.innerText = l.name;
        if (l.id === activeLineupId) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
}

// Switch between lineups
export function selectTacticLineup(lineupId) {
    const found = teamLineups.find(l => l.id === lineupId);
    if (!found) return;
    
    activeLineupId = lineupId;
    activeLineup = found;
    localStorage.setItem(`fm_active_lineup_id_${state.activeTeamId}`, lineupId);
    
    const formationSelect = document.getElementById("team-formation-select");
    if (formationSelect) {
        formationSelect.value = activeLineup.formation || "4-3-3-holding";
    }
    
    renderTeamLineupPitch();
    renderTeamLineupBench();
    renderTeamLineupPool();
}

// Create a new empty lineup
export function addNewLineup() {
    if (!state.activeTeamId) return;
    
    const name = prompt("Yeni kadro için bir isim girin:", "Alternatif Kadro");
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
        showToast("Lütfen geçerli bir kadro ismi girin.", "error");
        return;
    }
    
    const newLineup = {
        id: "lineup_" + Date.now(),
        name: trimmed,
        formation: "4-3-3-holding",
        positions: {},
        bench: {}
    };
    
    teamLineups.push(newLineup);
    localStorage.setItem(`fm_lineups_${state.activeTeamId}`, JSON.stringify(teamLineups));
    
    showToast(`"${trimmed}" kadrosu oluşturuldu.`, "success");
    populateLineupSelector();
    selectTacticLineup(newLineup.id);
}

// Rename the currently active lineup
export function renameLineup() {
    if (!state.activeTeamId || !activeLineup) return;
    
    const newName = prompt("Kadro ismini düzenleyin:", activeLineup.name);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) {
        showToast("Lütfen geçerli bir isim girin.", "error");
        return;
    }
    
    activeLineup.name = trimmed;
    localStorage.setItem(`fm_lineups_${state.activeTeamId}`, JSON.stringify(teamLineups));
    
    showToast("Kadro adı güncellendi.", "success");
    populateLineupSelector();
}

// Delete the currently active lineup
export function deleteLineup() {
    if (!state.activeTeamId || !activeLineup) return;
    
    if (teamLineups.length <= 1) {
        showToast("En az bir kadro planı bulunmalıdır. Son kadroyu silemezsiniz.", "error");
        return;
    }
    
    const confirmed = confirm(`"${activeLineup.name}" kadrosunu silmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    
    const deletedId = activeLineup.id;
    teamLineups = teamLineups.filter(l => l.id !== deletedId);
    localStorage.setItem(`fm_lineups_${state.activeTeamId}`, JSON.stringify(teamLineups));
    
    showToast("Kadro silindi.", "success");
    
    // Switch to first remaining lineup
    selectTacticLineup(teamLineups[0].id);
    populateLineupSelector();
}

// Save the active lineup and write back to storage
export function saveTeamLineup() {
    if (!state.activeTeamId || !activeLineup) return;
    
    const formationSelect = document.getElementById("team-formation-select");
    if (formationSelect) {
        activeLineup.formation = formationSelect.value;
    }
    
    localStorage.setItem(`fm_lineups_${state.activeTeamId}`, JSON.stringify(teamLineups));
    showToast("Taktik kadro kaydedildi.", "success");
    
    renderTeamLineupPitch();
    renderTeamLineupBench();
    renderTeamLineupPool();
}

// Backward compatibility helper
export function selectTeamLineupBoard() {
    loadAndRenderTacticsPage();
}

// Render Starting 11 players on the tactical pitch
export function renderTeamLineupPitch() {
    const pitchField = document.getElementById("team-tactic-pitch-field");
    if (!pitchField) return;
    
    // Remove existing players/nodes (leave background lines)
    pitchField.querySelectorAll(".lineup-pitch-node").forEach(node => node.remove());
    
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    
    const formation = activeLineup.formation || "4-3-3-holding";
    const nodes = FORMATIONS[formation] || FORMATIONS["4-3-3-holding"];
    
    nodes.forEach((node, index) => {
        const slotKey = `${node.pos}_${index}`;
        const assignedPlayerId = activeLineup.positions[slotKey];
        const player = assignedPlayerId ? activeTeam.players.find(p => p.id === assignedPlayerId) : null;
        
        // Check position compatibility
        const isCompatible = isPlayerCompatibleWithPosition(player, node.pos);
        const compatibilityWarning = player && !isCompatible 
            ? `<span title="Oyuncu bu mevkide oynamıyor!" style="color: #ff9100; font-size: 0.8rem; line-height: 1;">⚠️</span>` 
            : "";
        
        const div = document.createElement("div");
        div.className = "lineup-pitch-node";
        div.style.position = "absolute";
        div.style.bottom = node.bottom;
        div.style.left = node.left;
        div.style.transform = "translate(-50%, 50%)";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.alignItems = "center";
        div.style.cursor = "pointer";
        div.style.zIndex = "10";
        
        div.innerHTML = `
            <div class="lineup-shirt ${player ? 'assigned' : 'empty'}" style="width: 42px; height: 42px; border-radius: 50%; background: ${player ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}; color: ${player ? '#000' : '#fff'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; border: 2.5px solid ${player ? '#fff' : 'rgba(255,255,255,0.4)'}; box-shadow: 0 4px 8px rgba(0,0,0,0.3); transition: all 0.2s;">
                ${player ? (player.name.charAt(0) + (player.name.split(" ")[1]?.charAt(0) || "")) : node.pos}
            </div>
            <div class="lineup-label" style="background: rgba(0,0,0,0.85); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; margin-top: 5px; border: 1px solid rgba(255,255,255,0.15); max-width: 115px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: center; display: flex; align-items: center; justify-content: center; gap: 4px;">
                ${player ? player.name.split(" ").pop() : "BOŞ"} ${compatibilityWarning}
                ${player ? `<span class="lineup-detail-view-btn" style="color: var(--accent-color); font-size: 0.65rem; cursor: pointer; font-weight: bold; text-decoration: underline; margin-left: 2px;">Detay</span>` : ""}
            </div>
            ${player ? `<div class="lineup-remove-btn" style="position: absolute; top: -5px; right: -5px; background: var(--attr-poor); color: #fff; width: 14px; height: 14px; border-radius: 50%; font-size: 0.55rem; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">✕</div>` : ""}
        `;
        
        // Remove button click listener
        const removeBtn = div.querySelector(".lineup-remove-btn");
        if (removeBtn) {
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                delete activeLineup.positions[slotKey];
                renderTeamLineupPitch();
                renderTeamLineupPool();
            });
        }
        
        // Detail view button click listener
        const detBtn = div.querySelector(".lineup-detail-view-btn");
        if (detBtn) {
            detBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                switchTab("nav-teams");
                selectPlayer(player.id);
            });
        }
        
        // Slot assignment trigger
        div.addEventListener("click", () => {
            openAssignPlayerModal('pitch', slotKey);
        });
        
        pitchField.appendChild(div);
    });
}

// Render Bench players list (7 slots)
export function renderTeamLineupBench() {
    const container = document.getElementById("team-tactic-bench-container");
    if (!container) return;
    container.innerHTML = "";
    
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    
    for (let i = 1; i <= 7; i++) {
        const slotKey = `SUB_${i}`;
        const assignedPlayerId = activeLineup.bench[slotKey];
        const player = assignedPlayerId ? activeTeam.players.find(p => p.id === assignedPlayerId) : null;
        
        const slotDiv = document.createElement("div");
        slotDiv.style.background = "var(--bg-dark)";
        slotDiv.style.border = "1px solid var(--border-color)";
        slotDiv.style.borderRadius = "var(--border-radius)";
        slotDiv.style.padding = "8px 12px";
        slotDiv.style.display = "flex";
        slotDiv.style.justifyContent = "space-between";
        slotDiv.style.alignItems = "center";
        slotDiv.style.cursor = "pointer";
        slotDiv.style.transition = "background 0.2s";
        slotDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap: 10px; flex: 1; min-width: 0;">
                <span style="font-size:0.7rem; font-weight:bold; color:var(--text-muted); width: 45px;">Yedek ${i}</span>
                <div style="display:flex; align-items:center; gap: 6px; flex: 1; min-width: 0;">
                    <span style="font-size: 0.8rem; font-weight: bold; color: ${player ? 'var(--text-primary)' : 'var(--text-muted)'}; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${player ? player.name : "— Boş Koltuk —"}
                    </span>
                    ${player ? `<button class="bench-detail-view-btn" style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.2); color: var(--accent-color); font-size: 0.7rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='var(--accent-color)'; this.style.color='#000'" onmouseout="this.style.background='rgba(0, 255, 136, 0.1)'; this.style.color='var(--accent-color)'" title="Oyuncu Detayı">Detay</button>` : ""}
                </div>
            </div>
            ${player ? `
                <div style="display:flex; align-items:center; gap: 8px;">
                    <span style="font-size:0.7rem; color: var(--accent-color); font-weight:700;">${player.primaryPosition}</span>
                    <button class="btn-delete-growth btn-remove-sub" style="color:var(--attr-poor); background:none; border:none; padding:2px; cursor:pointer;">✕</button>
                </div>
            ` : ""}
        `;
        
        // Remove button click listener
        const removeBtn = slotDiv.querySelector(".btn-remove-sub");
        if (removeBtn) {
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                delete activeLineup.bench[slotKey];
                renderTeamLineupBench();
                renderTeamLineupPool();
            });
        }
        
        // Detail view button click listener
        const detBtn = slotDiv.querySelector(".bench-detail-view-btn");
        if (detBtn) {
            detBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                switchTab("nav-teams");
                selectPlayer(player.id);
            });
        }
        // Slot assignment trigger
        slotDiv.addEventListener("click", () => {
            openAssignPlayerModal('bench', slotKey);
        });
        
        container.appendChild(slotDiv);
    }
}

// Render unassigned squad pool
export function renderTeamLineupPool() {
    const container = document.getElementById("team-tactic-pool-container");
    if (!container) return;
    container.innerHTML = "";
    
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    
    const assignedIds = new Set([
        ...Object.values(activeLineup.positions),
        ...Object.values(activeLineup.bench)
    ]);
    
    const unassigned = activeTeam.players.filter(p => !assignedIds.has(p.id));
    
    if (unassigned.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:10px 0;">Tüm oyuncular kadroya yerleştirildi.</div>`;
        return;
    }
    
    unassigned.forEach(p => {
        const item = document.createElement("div");
        item.style.background = "rgba(255,255,255,0.02)";
        item.style.border = "1px solid rgba(255,255,255,0.05)";
        item.style.borderRadius = "4px";
        item.style.padding = "6px 10px";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <strong>${p.name}</strong>
                <button class="pool-detail-view-btn" style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.2); color: var(--accent-color); font-size: 0.7rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='var(--accent-color)'; this.style.color='#000'" onmouseout="this.style.background='rgba(0, 255, 136, 0.1)'; this.style.color='var(--accent-color)'" title="Oyuncu Detayı">Detay</button>
            </div>
            <span style="color:var(--accent-color); font-weight:700;">${p.primaryPosition}</span>
        `;
        
        const detBtn = item.querySelector(".pool-detail-view-btn");
        if (detBtn) {
            detBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                switchTab("nav-teams");
                selectPlayer(p.id);
            });
        }
        
        container.appendChild(item);
    });
}

// Open assignment modal to assign a player to slot
export function openAssignPlayerModal(slotType, slotKey) {
    currentTargetSlot = { type: slotType, key: slotKey };
    
    const modalTitle = document.getElementById("assign-player-modal-title");
    if (modalTitle) {
        modalTitle.innerText = slotType === 'pitch' 
            ? `Pozisyona Oyuncu Seç - ${slotKey.split("_")[0]}`
            : `Yedek Kulübesine Oyuncu Seç - Yedek ${slotKey.split("_")[1]}`;
    }
    
    const listContainer = document.getElementById("assign-player-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";
    
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    
    activeTeam.players.forEach(p => {
        let currentAssigned = "";
        for (const [pk, val] of Object.entries(activeLineup.positions)) {
            if (val === p.id) currentAssigned = `İlk 11 (${pk.split("_")[0]})`;
        }
        for (const [bk, val] of Object.entries(activeLineup.bench)) {
            if (val === p.id) currentAssigned = `Yedek (${bk.split("_")[1]})`;
        }
        
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "10px";
        row.style.background = "var(--bg-subpanel)";
        row.style.border = "1px solid var(--border-color)";
        row.style.borderRadius = "var(--border-radius)";
        row.style.cursor = "pointer";
        row.style.transition = "background 0.2s";
        
        row.innerHTML = `
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <strong style="color:var(--text-primary); font-size:0.85rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.name}</strong>
                    <button class="modal-detail-view-btn" style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.2); color: var(--accent-color); font-size: 0.7rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='var(--accent-color)'; this.style.color='#000'" onmouseout="this.style.background='rgba(0, 255, 136, 0.1)'; this.style.color='var(--accent-color)'" title="Oyuncu Detayı">Detay</button>
                </div>
                <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">Mevki: ${p.primaryPosition} ${currentAssigned ? ` | Durum: <strong style="color:var(--accent-color);">${currentAssigned}</strong>` : ''}</div>
            </div>
            <button class="btn-primary btn-assign" style="padding:4px 8px; font-size:0.7rem;">Ata</button>
        `;
        
        // Detail button click
        const detBtn = row.querySelector(".modal-detail-view-btn");
        if (detBtn) {
            detBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                closeModal("modal-assign-player");
                switchTab("nav-teams");
                selectPlayer(p.id);
            });
        }
        
        // Assign button click
        const assignBtn = row.querySelector(".btn-assign");
        if (assignBtn) {
            assignBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                assignPlayerToSlot(p.id);
            });
        }
        
        row.addEventListener("click", () => {
            assignPlayerToSlot(p.id);
        });
        
        listContainer.appendChild(row);
    });
    
    openModal("modal-assign-player");
}

// Assign selected player to slot
function assignPlayerToSlot(playerId) {
    if (!currentTargetSlot) return;
    
    // Clear player from any previous slot they occupied in lineup
    for (const [pk, val] of Object.entries(activeLineup.positions)) {
        if (val === playerId) delete activeLineup.positions[pk];
    }
    for (const [bk, val] of Object.entries(activeLineup.bench)) {
        if (val === playerId) delete activeLineup.bench[bk];
    }
    
    // Assign to new slot
    if (currentTargetSlot.type === 'pitch') {
        activeLineup.positions[currentTargetSlot.key] = playerId;
    } else {
        activeLineup.bench[currentTargetSlot.key] = playerId;
    }
    
    closeModal("modal-assign-player");
    currentTargetSlot = null;
    
    renderTeamLineupPitch();
    renderTeamLineupBench();
    renderTeamLineupPool();
}

// Display player quick view modal
export function openPlayerQuickView(playerId) {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    const player = activeTeam.players.find(p => p.id === playerId);
    if (!player) return;
    
    const nameEl = document.getElementById("quick-view-player-name");
    if (nameEl) nameEl.innerText = player.name;
    
    const bodyEl = document.getElementById("quick-view-player-body");
    if (!bodyEl) return;
    
    // Star icons helper
    const stars = "⭐".repeat(player.currentAbility || 3) + "☆".repeat(Math.max(0, 5 - (player.currentAbility || 3)));
    const potStars = "⭐".repeat(player.potentialAbility || 4) + "☆".repeat(Math.max(0, 5 - (player.potentialAbility || 4)));
    
    bodyEl.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
            <div style="width: 55px; height: 55px; border-radius: 50%; background: var(--bg-dark); border: 2px solid var(--accent-color); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: #fff;">
                👤
            </div>
            <div>
                <div style="font-size: 0.95rem; font-weight: 800; color: #fff;">${player.name}</div>
                <div style="color: var(--accent-color); font-weight: 700; font-size: 0.78rem; margin-top: 2px;">
                    ${player.primaryPosition} ${player.secondaryPositions ? ` / ${player.secondaryPositions}` : ''}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                    Mevcut Yetenek: <span style="color: #ffb300;">${stars}</span> | Potansiyel: <span style="color: #ffb300;">${potStars}</span>
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 15px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: var(--border-radius); border: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem; color: var(--text-primary);">
            <div><strong>Yaş:</strong> ${player.age || '-'}</div>
            <div><strong>Tercih Ayak:</strong> ${player.foot || '-'}</div>
            <div><strong>Boy:</strong> ${player.height ? player.height + ' cm' : '-'}</div>
            <div><strong>Kilo:</strong> ${player.weight ? player.weight + ' kg' : '-'}</div>
            <div><strong>Kadro Rolü:</strong> ${player.squadRole || '-'}</div>
            <div><strong>Durum:</strong> <span style="color: ${player.injuryStatus === 'Sağlıklı' ? 'var(--attr-excellent)' : 'var(--attr-poor)'}; font-weight: bold;">${player.injuryStatus || 'Sağlıklı'}</span></div>
        </div>
        
        <div style="margin-top: 5px;">
            <h4 style="margin: 0 0 6px 0; color: var(--accent-color); font-size: 0.82rem; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">💡 Koç Notları</h4>
            <p style="margin: 0; font-style: italic; color: var(--text-secondary); line-height: 1.4; font-size: 0.78rem; max-height: 90px; overflow-y: auto;">
                ${player.coachNotes ? player.coachNotes : 'Kayıtlı not bulunmuyor.'}
            </p>
        </div>
    `;
    
    openModal("modal-player-quick-view");
}

export function duplicateLineup() {
    if (!state.activeTeamId || !activeLineup) {
        showToast("Kopyalanacak aktif bir kadro bulunamadı.", "error");
        return;
    }
    
    const defaultName = `${activeLineup.name} - Kopya`;
    const name = prompt("Kopyalanacak kadro için yeni bir isim girin:", defaultName);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
        showToast("Lütfen geçerli bir kadro ismi girin.", "error");
        return;
    }
    
    // Deep copy lineup details
    const duplicated = {
        id: "lineup_" + Date.now(),
        name: trimmed,
        formation: activeLineup.formation || "4-3-3-holding",
        positions: JSON.parse(JSON.stringify(activeLineup.positions || {})),
        bench: JSON.parse(JSON.stringify(activeLineup.bench || {}))
    };
    
    teamLineups.push(duplicated);
    localStorage.setItem(`fm_lineups_${state.activeTeamId}`, JSON.stringify(teamLineups));
    
    showToast(`"${activeLineup.name}" kadrosu "${trimmed}" ismiyle kopyalandı.`, "success");
    populateLineupSelector();
    selectTacticLineup(duplicated.id);
}
