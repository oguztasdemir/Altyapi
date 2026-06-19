import { state } from "./state.js";
import { showToast } from "./utils.js";
import { openModal, closeModal } from "./ui.js";
import { loadData } from "./api.js";

// Tactical Pitch Formations Definition
export const FORMATIONS = {
    "4-4-2": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "58%", left: "15%", pos: "SLK" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "58%", left: "85%", pos: "SĞK" },
        { bottom: "88%", left: "38%", pos: "SNT" },
        { bottom: "88%", left: "62%", pos: "SNT" }
    ],
    "4-3-3-holding": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "48%", left: "50%", pos: "DOS" },
        { bottom: "62%", left: "32%", pos: "OS" },
        { bottom: "62%", left: "68%", pos: "OS" },
        { bottom: "82%", left: "15%", pos: "SLK" },
        { bottom: "82%", left: "84%", pos: "SĞK" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "4-3-3-attack": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "55%", left: "32%", pos: "OS" },
        { bottom: "55%", left: "68%", pos: "OS" },
        { bottom: "74%", left: "50%", pos: "OOS" },
        { bottom: "82%", left: "15%", pos: "SLK" },
        { bottom: "82%", left: "84%", pos: "SĞK" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "4-2-3-1-wide": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "48%", left: "35%", pos: "DOS" },
        { bottom: "48%", left: "65%", pos: "DOS" },
        { bottom: "80%", left: "15%", pos: "SLK" },
        { bottom: "72%", left: "50%", pos: "OOS" },
        { bottom: "80%", left: "85%", pos: "SĞK" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "4-2-3-1-narrow": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "48%", left: "35%", pos: "DOS" },
        { bottom: "48%", left: "65%", pos: "DOS" },
        { bottom: "70%", left: "30%", pos: "OOS" },
        { bottom: "74%", left: "50%", pos: "OOS" },
        { bottom: "70%", left: "70%", pos: "OOS" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "3-5-2": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "25%", left: "25%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "75%", pos: "STP" },
        { bottom: "48%", left: "15%", pos: "SLK" },
        { bottom: "48%", left: "38%", pos: "DOS" },
        { bottom: "48%", left: "62%", pos: "DOS" },
        { bottom: "48%", left: "85%", pos: "SĞK" },
        { bottom: "68%", left: "50%", pos: "OOS" },
        { bottom: "88%", left: "38%", pos: "SNT" },
        { bottom: "88%", left: "62%", pos: "SNT" }
    ],
    "3-4-3": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "25%", left: "25%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "75%", pos: "STP" },
        { bottom: "55%", left: "15%", pos: "SLK" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "55%", left: "85%", pos: "SĞK" },
        { bottom: "82%", left: "20%", pos: "SLK" },
        { bottom: "82%", left: "80%", pos: "SĞK" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "5-3-2": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "32%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "32%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "68%", pos: "STP" },
        { bottom: "32%", left: "85%", pos: "SĞB" },
        { bottom: "55%", left: "30%", pos: "OS" },
        { bottom: "50%", left: "50%", pos: "DOS" },
        { bottom: "55%", left: "70%", pos: "OS" },
        { bottom: "88%", left: "38%", pos: "SNT" },
        { bottom: "88%", left: "62%", pos: "SNT" }
    ],
    "5-4-1": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "32%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "32%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "68%", pos: "STP" },
        { bottom: "32%", left: "85%", pos: "SĞB" },
        { bottom: "58%", left: "15%", pos: "SLK" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "58%", left: "85%", pos: "SĞK" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "4-1-4-1": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "45%", left: "50%", pos: "DOS" },
        { bottom: "65%", left: "15%", pos: "SLK" },
        { bottom: "62%", left: "35%", pos: "OS" },
        { bottom: "62%", left: "65%", pos: "OS" },
        { bottom: "65%", left: "85%", pos: "SĞK" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "4-5-1": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "58%", left: "15%", pos: "SLK" },
        { bottom: "55%", left: "32%", pos: "OS" },
        { bottom: "48%", left: "50%", pos: "DOS" },
        { bottom: "55%", left: "68%", pos: "OS" },
        { bottom: "58%", left: "85%", pos: "SĞK" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "4-4-1-1": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "58%", left: "15%", pos: "SLK" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "58%", left: "85%", pos: "SĞK" },
        { bottom: "76%", left: "50%", pos: "OOS" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "4-3-2-1": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "55%", left: "25%", pos: "OS" },
        { bottom: "52%", left: "50%", pos: "OS" },
        { bottom: "55%", left: "75%", pos: "OS" },
        { bottom: "74%", left: "35%", pos: "OOS" },
        { bottom: "74%", left: "65%", pos: "OOS" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "3-4-1-2": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "25%", left: "25%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "75%", pos: "STP" },
        { bottom: "55%", left: "15%", pos: "SLK" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "55%", left: "85%", pos: "SĞK" },
        { bottom: "72%", left: "50%", pos: "OOS" },
        { bottom: "88%", left: "38%", pos: "SNT" },
        { bottom: "88%", left: "62%", pos: "SNT" }
    ],
    "3-4-2-1": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "25%", left: "25%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "75%", pos: "STP" },
        { bottom: "55%", left: "15%", pos: "SLK" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "55%", left: "85%", pos: "SĞK" },
        { bottom: "74%", left: "35%", pos: "OOS" },
        { bottom: "74%", left: "65%", pos: "OOS" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "5-2-1-2": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "32%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "32%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "68%", pos: "STP" },
        { bottom: "32%", left: "85%", pos: "SĞB" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "72%", left: "50%", pos: "OOS" },
        { bottom: "88%", left: "38%", pos: "SNT" },
        { bottom: "88%", left: "62%", pos: "SNT" }
    ],
    "5-2-2-1": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "32%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "32%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "68%", pos: "STP" },
        { bottom: "32%", left: "85%", pos: "SĞB" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "74%", left: "35%", pos: "OOS" },
        { bottom: "74%", left: "65%", pos: "OOS" },
        { bottom: "90%", left: "50%", pos: "SNT" }
    ],
    "4-1-3-2": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "46%", left: "50%", pos: "DOS" },
        { bottom: "64%", left: "15%", pos: "SLK" },
        { bottom: "60%", left: "50%", pos: "OS" },
        { bottom: "64%", left: "85%", pos: "SĞK" },
        { bottom: "88%", left: "38%", pos: "SNT" },
        { bottom: "88%", left: "62%", pos: "SNT" }
    ],
    "4-2-2-2": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "48%", left: "35%", pos: "DOS" },
        { bottom: "48%", left: "65%", pos: "DOS" },
        { bottom: "72%", left: "30%", pos: "OOS" },
        { bottom: "72%", left: "70%", pos: "OOS" },
        { bottom: "88%", left: "38%", pos: "SNT" },
        { bottom: "88%", left: "62%", pos: "SNT" }
    ],
    "4-2-4": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "28%", left: "15%", pos: "SLB" },
        { bottom: "25%", left: "38%", pos: "STP" },
        { bottom: "25%", left: "62%", pos: "STP" },
        { bottom: "28%", left: "85%", pos: "SĞB" },
        { bottom: "55%", left: "38%", pos: "OS" },
        { bottom: "55%", left: "62%", pos: "OS" },
        { bottom: "85%", left: "15%", pos: "SLK" },
        { bottom: "85%", left: "85%", pos: "SĞK" },
        { bottom: "88%", left: "38%", pos: "SNT" },
        { bottom: "88%", left: "62%", pos: "SNT" }
    ],
    "3-3-3-1": [
        { bottom: "8%", left: "50%", pos: "KL" },
        { bottom: "25%", left: "25%", pos: "STP" },
        { bottom: "23%", left: "50%", pos: "STP" },
        { bottom: "25%", left: "75%", pos: "STP" },
        { bottom: "48%", left: "30%", pos: "DOS" },
        { bottom: "46%", left: "50%", pos: "DOS" },
        { bottom: "48%", left: "70%", pos: "DOS" },
        { bottom: "70%", left: "30%", pos: "OOS" },
        { bottom: "74%", left: "50%", pos: "OOS" },
        { bottom: "70%", left: "70%", pos: "OOS" },
        { bottom: "90%", left: "50%", pos: "SNT" }
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
