import { state } from "./state.js";
import { showToast } from "./utils.js";
import { openModal, closeModal } from "./ui.js";
import { loadData } from "./api.js";

// Tactical Pitch Formations Definition
export const FORMATIONS = {
    "4-4-2": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "58%", left: "15%", pos: "LM" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "58%", left: "85%", pos: "RM" },
        { bottom: "88%", left: "38%", pos: "ST" },
        { bottom: "88%", left: "62%", pos: "ST" }
    ],
    "4-3-3-holding": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "48%", left: "50%", pos: "DM" },
        { bottom: "62%", left: "32%", pos: "CM" },
        { bottom: "62%", left: "68%", pos: "CM" },
        { bottom: "82%", left: "15%", pos: "LM" },
        { bottom: "82%", left: "84%", pos: "RM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "4-3-3-attack": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "55%", left: "32%", pos: "CM" },
        { bottom: "55%", left: "68%", pos: "CM" },
        { bottom: "74%", left: "50%", pos: "AM" },
        { bottom: "82%", left: "15%", pos: "LM" },
        { bottom: "82%", left: "84%", pos: "RM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "4-2-3-1-wide": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "48%", left: "35%", pos: "DM" },
        { bottom: "48%", left: "65%", pos: "DM" },
        { bottom: "80%", left: "15%", pos: "LM" },
        { bottom: "72%", left: "50%", pos: "AM" },
        { bottom: "80%", left: "85%", pos: "RM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "4-2-3-1-narrow": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "48%", left: "35%", pos: "DM" },
        { bottom: "48%", left: "65%", pos: "DM" },
        { bottom: "70%", left: "30%", pos: "AM" },
        { bottom: "74%", left: "50%", pos: "AM" },
        { bottom: "70%", left: "70%", pos: "AM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "3-5-2": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "25%", left: "25%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "75%", pos: "CB" },
        { bottom: "48%", left: "15%", pos: "LM" },
        { bottom: "48%", left: "38%", pos: "DM" },
        { bottom: "48%", left: "62%", pos: "DM" },
        { bottom: "48%", left: "85%", pos: "RM" },
        { bottom: "68%", left: "50%", pos: "AM" },
        { bottom: "88%", left: "38%", pos: "ST" },
        { bottom: "88%", left: "62%", pos: "ST" }
    ],
    "3-4-3": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "25%", left: "25%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "75%", pos: "CB" },
        { bottom: "55%", left: "15%", pos: "LM" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "55%", left: "85%", pos: "RM" },
        { bottom: "82%", left: "20%", pos: "LM" },
        { bottom: "82%", left: "80%", pos: "RM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "5-3-2": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "32%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "32%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "68%", pos: "CB" },
        { bottom: "32%", left: "85%", pos: "RB" },
        { bottom: "55%", left: "30%", pos: "CM" },
        { bottom: "50%", left: "50%", pos: "DM" },
        { bottom: "55%", left: "70%", pos: "CM" },
        { bottom: "88%", left: "38%", pos: "ST" },
        { bottom: "88%", left: "62%", pos: "ST" }
    ],
    "5-4-1": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "32%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "32%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "68%", pos: "CB" },
        { bottom: "32%", left: "85%", pos: "RB" },
        { bottom: "58%", left: "15%", pos: "LM" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "58%", left: "85%", pos: "RM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "4-1-4-1": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "45%", left: "50%", pos: "DM" },
        { bottom: "65%", left: "15%", pos: "LM" },
        { bottom: "62%", left: "35%", pos: "CM" },
        { bottom: "62%", left: "65%", pos: "CM" },
        { bottom: "65%", left: "85%", pos: "RM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "4-5-1": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "58%", left: "15%", pos: "LM" },
        { bottom: "55%", left: "32%", pos: "CM" },
        { bottom: "48%", left: "50%", pos: "DM" },
        { bottom: "55%", left: "68%", pos: "CM" },
        { bottom: "58%", left: "85%", pos: "RM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "4-4-1-1": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "58%", left: "15%", pos: "LM" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "58%", left: "85%", pos: "RM" },
        { bottom: "76%", left: "50%", pos: "AM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "4-3-2-1": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "55%", left: "25%", pos: "CM" },
        { bottom: "52%", left: "50%", pos: "CM" },
        { bottom: "55%", left: "75%", pos: "CM" },
        { bottom: "74%", left: "35%", pos: "AM" },
        { bottom: "74%", left: "65%", pos: "AM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "3-4-1-2": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "25%", left: "25%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "75%", pos: "CB" },
        { bottom: "55%", left: "15%", pos: "LM" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "55%", left: "85%", pos: "RM" },
        { bottom: "72%", left: "50%", pos: "AM" },
        { bottom: "88%", left: "38%", pos: "ST" },
        { bottom: "88%", left: "62%", pos: "ST" }
    ],
    "3-4-2-1": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "25%", left: "25%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "75%", pos: "CB" },
        { bottom: "55%", left: "15%", pos: "LM" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "55%", left: "85%", pos: "RM" },
        { bottom: "74%", left: "35%", pos: "AM" },
        { bottom: "74%", left: "65%", pos: "AM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "5-2-1-2": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "32%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "32%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "68%", pos: "CB" },
        { bottom: "32%", left: "85%", pos: "RB" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "72%", left: "50%", pos: "AM" },
        { bottom: "88%", left: "38%", pos: "ST" },
        { bottom: "88%", left: "62%", pos: "ST" }
    ],
    "5-2-2-1": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "32%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "32%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "68%", pos: "CB" },
        { bottom: "32%", left: "85%", pos: "RB" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "74%", left: "35%", pos: "AM" },
        { bottom: "74%", left: "65%", pos: "AM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ],
    "4-1-3-2": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "46%", left: "50%", pos: "DM" },
        { bottom: "64%", left: "15%", pos: "LM" },
        { bottom: "60%", left: "50%", pos: "CM" },
        { bottom: "64%", left: "85%", pos: "RM" },
        { bottom: "88%", left: "38%", pos: "ST" },
        { bottom: "88%", left: "62%", pos: "ST" }
    ],
    "4-2-2-2": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "48%", left: "35%", pos: "DM" },
        { bottom: "48%", left: "65%", pos: "DM" },
        { bottom: "72%", left: "30%", pos: "AM" },
        { bottom: "72%", left: "70%", pos: "AM" },
        { bottom: "88%", left: "38%", pos: "ST" },
        { bottom: "88%", left: "62%", pos: "ST" }
    ],
    "4-2-4": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "28%", left: "15%", pos: "LB" },
        { bottom: "25%", left: "38%", pos: "CB" },
        { bottom: "25%", left: "62%", pos: "CB" },
        { bottom: "28%", left: "85%", pos: "RB" },
        { bottom: "55%", left: "38%", pos: "CM" },
        { bottom: "55%", left: "62%", pos: "CM" },
        { bottom: "85%", left: "15%", pos: "LM" },
        { bottom: "85%", left: "85%", pos: "RM" },
        { bottom: "88%", left: "38%", pos: "ST" },
        { bottom: "88%", left: "62%", pos: "ST" }
    ],
    "3-3-3-1": [
        { bottom: "8%", left: "50%", pos: "GK" },
        { bottom: "25%", left: "25%", pos: "CB" },
        { bottom: "23%", left: "50%", pos: "CB" },
        { bottom: "25%", left: "75%", pos: "CB" },
        { bottom: "48%", left: "30%", pos: "DM" },
        { bottom: "46%", left: "50%", pos: "DM" },
        { bottom: "48%", left: "70%", pos: "DM" },
        { bottom: "70%", left: "30%", pos: "AM" },
        { bottom: "74%", left: "50%", pos: "AM" },
        { bottom: "70%", left: "70%", pos: "AM" },
        { bottom: "90%", left: "50%", pos: "ST" }
    ]
};

export let selectedPickerPosition = "ST";

export function renderPickerNodes(formation, primaryPos, secondaryPosText) {
    const field = document.getElementById("tactical-pitch-picker-field");
    if (!field) return;
    
    field.querySelectorAll(".pitch-node").forEach(node => node.remove());
    
    const primaryList = (primaryPos || "").split(",")
        .map(s => s.trim().toUpperCase())
        .filter(s => s !== "");

    const secondaryList = (secondaryPosText || "").split(",")
        .map(s => s.trim().toUpperCase())
        .filter(s => s !== "");
        
    const nodes = FORMATIONS[formation] || FORMATIONS["4-3-3-holding"];
    
    nodes.forEach(node => {
        const div = document.createElement("div");
        div.className = "pitch-node";
        div.style.bottom = node.bottom;
        div.style.left = node.left;
        div.style.width = "28px";
        div.style.height = "28px";
        div.style.fontSize = "0.75rem";
        div.style.cursor = "pointer";
        div.setAttribute("data-pos", node.pos);
        div.innerText = node.pos;
        
        if (primaryList.includes(node.pos)) {
            div.classList.add("primary");
        } else if (secondaryList.includes(node.pos)) {
            div.classList.add("secondary");
        } else {
            div.classList.add("inactive");
        }
        
        field.appendChild(div);
    });
}

export function openTacticalPitchPicker() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || !state.activePlayerId) return;
    
    const player = activeTeam.players.find(p => p.id === state.activePlayerId);
    if (!player) return;
    
    selectedPickerPosition = player.primaryPosition || "ST";
    document.getElementById("picker-secondary-positions").value = player.secondaryPositions || "";
    
    const currentFormation = localStorage.getItem("fm_active_formation") || "4-3-3-holding";
    const select = document.getElementById("picker-formation-select");
    if (select) {
        select.value = currentFormation;
    }
    
    renderPickerNodes(currentFormation, selectedPickerPosition, player.secondaryPositions || "");
    openModal("modal-tactical-pitch-picker");
}

export function setupPitchPickerListeners() {
    const field = document.getElementById("tactical-pitch-picker-field");
    if (!field) return;
    
    if (field.dataset.pickerListenersBound) return;
    field.dataset.pickerListenersBound = "true";
    
    field.addEventListener("click", (e) => {
        const node = e.target.closest(".pitch-node");
        if (!node) return;
        
        if (node.classList.contains("inactive")) {
            node.classList.remove("inactive");
            node.classList.add("primary");
        } else if (node.classList.contains("primary")) {
            node.classList.remove("primary");
            node.classList.add("secondary");
        } else if (node.classList.contains("secondary")) {
            node.classList.remove("secondary");
            node.classList.add("inactive");
        }
        
        const primaryPositions = [];
        const secondaryPositions = [];
        
        field.querySelectorAll(".pitch-node").forEach(n => {
            const pos = n.getAttribute("data-pos");
            if (n.classList.contains("primary")) {
                if (!primaryPositions.includes(pos)) primaryPositions.push(pos);
            } else if (n.classList.contains("secondary")) {
                if (!secondaryPositions.includes(pos)) secondaryPositions.push(pos);
            }
        });
        
        selectedPickerPosition = primaryPositions.join(", ");
        
        const secInput = document.getElementById("picker-secondary-positions");
        if (secInput) {
            secInput.value = secondaryPositions.join(", ");
        }
    });
    
    const formationSelect = document.getElementById("picker-formation-select");
    if (formationSelect) {
        formationSelect.addEventListener("change", (e) => {
            const newFormation = e.target.value;
            localStorage.setItem("fm_active_formation", newFormation);
            
            const secPosText = document.getElementById("picker-secondary-positions").value;
            renderPickerNodes(newFormation, selectedPickerPosition, secPosText);
            renderTacticalPitch();
        });
    }
    
    const saveBtn = document.getElementById("btn-save-picker-positions");
    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            if (!state.activePlayerId) return;
            const secPosText = document.getElementById("picker-secondary-positions").value.trim();
            const secondaryList = secPosText.split(",").map(s => s.trim().toUpperCase()).filter(s => s !== "");
            
            await updatePlayerPositions(state.activePlayerId, selectedPickerPosition, secondaryList);
            closeModal("modal-tactical-pitch-picker");
        });
    }
}

export function renderTacticalPitch() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || !state.activePlayerId) return;
    
    const player = activeTeam.players.find(p => p.id === state.activePlayerId);
    if (!player) return;

    const primaryList = (player.primaryPosition || "").split(",")
        .map(s => s.trim().toUpperCase())
        .filter(s => s !== "");

    const secondaryList = (player.secondaryPositions || "").split(",")
        .map(s => s.trim().toUpperCase())
        .filter(s => s !== "");

    const pitch = document.getElementById("tactical-pitch");
    if (!pitch) return;
    pitch.innerHTML = "";

    const container = document.getElementById("fm-pitch-container");
    if (container && !container.dataset.pickerTriggerBound) {
        container.dataset.pickerTriggerBound = "true";
        container.addEventListener("click", (e) => {
            openTacticalPitchPicker();
        });
    }

    const currentFormation = localStorage.getItem("fm_active_formation") || "4-3-3-holding";
    const nodes = FORMATIONS[currentFormation] || FORMATIONS["4-3-3-holding"];

    let renderedPositions = {};

    nodes.forEach(node => {
        const div = document.createElement("div");
        div.className = "pitch-node";
        div.style.bottom = node.bottom;
        div.style.left = node.left;
        div.innerText = node.pos;

        if (primaryList.includes(node.pos)) {
            div.classList.add("primary");
            renderedPositions[node.pos] = "primary";
        } else if (secondaryList.includes(node.pos) && renderedPositions[node.pos] !== "primary") {
            div.classList.add("secondary");
            renderedPositions[node.pos] = "secondary";
        } else {
            div.classList.add("inactive");
        }

        pitch.appendChild(div);
    });
}

async function updatePlayerPositions(playerId, primaryPos, secondaryPositions) {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    const player = activeTeam.players.find(p => p.id === playerId);
    if (!player) return;

    const updatedPlayer = {
        ...player,
        primaryPosition: primaryPos,
        secondaryPositions: secondaryPositions.join(", ")
    };

    try {
        const res = await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPlayer)
        });
        if (res.ok) {
            await loadData();
            const { selectPlayer } = await import("./player.js");
            selectPlayer(playerId);
            showToast("Oyuncu mevkileri güncellendi.", "success");
        }
    } catch (e) {
        console.error("Failed to update player positions", e);
        showToast("Mevkiler güncellenirken hata oluştu.", "error");
    }
}
