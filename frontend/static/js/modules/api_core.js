import { state } from "./state.js";
import { 
    renderTeams, selectTeam, showEmptyState, 
    populateTeamManagement, closeModal, selectPlayer 
} from "./ui.js";
import { showToast, showConfirm } from "./utils.js";

// Load Data from Backend
export async function loadData() {
    try {
        const showArchivedCheckbox = document.getElementById("show-archived-teams");
        const includeArchived = showArchivedCheckbox ? showArchivedCheckbox.checked : false;
        const res = await fetch(`/api/teams?include_archived=${includeArchived}`);
        if (res.ok) {
            const data = await res.json();
            state.teams = data;
            
            // Sync active team
            const savedActiveTeamId = localStorage.getItem("fm_active_team_id");
            if (savedActiveTeamId && state.teams.some(t => t.id === savedActiveTeamId)) {
                state.activeTeamId = savedActiveTeamId;
            } else if (state.teams.length > 0) {
                state.activeTeamId = state.teams[0].id;
            }
            
            renderTeams();
            if (state.activeTeamId) {
                selectTeam(state.activeTeamId);
            }
        }
    } catch (e) {
        console.error("API connection failed", e);
    }
}

// Create Team
export async function handleCreateTeam() {
    const input = document.getElementById("input-team-name");
    const name = input.value.trim();
    if (!name) return;
    
    const newTeam = {
        id: "team-" + Date.now(),
        name: name
    };
    
    try {
        const res = await fetch("/api/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTeam)
        });
        if (res.ok) {
            await loadData();
            selectTeam(newTeam.id);
        }
    } catch (e) {
        console.error(e);
    }
    input.value = "";
    closeModal("modal-new-team");
}

// Update Team Name
export async function handleUpdateTeamName() {
    const input = document.getElementById("edit-team-name");
    const name = input.value.trim();
    if (!name || !state.activeTeamId) return;

    try {
        const res = await fetch("/api/teams/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: state.activeTeamId, name: name })
        });
        if (res.ok) {
            await loadData();
            showToast("Takım adı başarıyla güncellendi.", "success");
        }
    } catch (e) {
        console.error(e);
        showToast("Takım adı güncellenirken hata oluştu.", "error");
    }
}

// Delete Team
export async function deleteTeam(id) {
    const confirmed = await showConfirm("Bu takımı silmek istediğinize emin misiniz?");
    if (confirmed) {
        try {
            const res = await fetch(`/api/teams?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                if (state.activeTeamId === id) {
                    state.activeTeamId = null;
                    state.activePlayerId = null;
                }
                await loadData();
                showToast("Takım silindi.", "success");
                if (state.teams.length > 0) {
                    selectTeam(state.teams[0].id);
                } else {
                    showEmptyState();
                }
            }
        } catch (e) {
            console.error(e);
            showToast("Takım silinirken hata oluştu.", "error");
        }
    }
}

// Delete Player
export async function deletePlayer(id) {
    const confirmed = await showConfirm("Bu oyuncuyu silmek istediğinize emin misiniz?");
    if (confirmed) {
        try {
            const res = await fetch(`/api/players?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                state.activePlayerId = null;
                await loadData();
                showToast("Oyuncu silindi.", "success");
            }
        } catch (e) {
            console.error(e);
            showToast("Oyuncu silinirken hata oluştu.", "error");
        }
    }
}

// Create/Update Player Action
export async function handleCreatePlayer() {
    const name = document.getElementById("player-name").value.trim();
    const age = parseInt(document.getElementById("player-age").value) || 18;
    const nationality = document.getElementById("player-nationality").value.trim() || "TÜRKİYE";
    const foot = document.getElementById("player-foot").value;
    const primaryPos = document.getElementById("player-primary-pos").value;
    const secondaryPos = document.getElementById("player-secondary-pos").value.trim();
    const squadRole = document.getElementById("player-squad-role").value;
    
    const height = parseInt(document.getElementById("player-height").value) || 175;
    const weight = parseInt(document.getElementById("player-weight").value) || 70;
    const injuryStatus = document.getElementById("player-injury-status").value;
    const coachNotes = document.getElementById("player-coach-notes").value.trim();

    const bloodType = document.getElementById("player-blood-type").value;
    const chronicIllnesses = document.getElementById("player-chronic-illnesses").value.trim();
    const allergies = document.getElementById("player-allergies").value.trim();
    const medications = document.getElementById("player-medications").value.trim();

    const matchesPlayed = parseInt(document.getElementById("player-matches").value) || 0;
    const goals = parseInt(document.getElementById("player-goals").value) || 0;
    const assists = parseInt(document.getElementById("player-assists").value) || 0;
    const yellowCards = parseInt(document.getElementById("player-yellow").value) || 0;
    const redCards = parseInt(document.getElementById("player-red").value) || 0;
    const matchRating = parseFloat(document.getElementById("player-match-rating").value) || 6.0;

    if (!name) {
        showToast("Lütfen oyuncu ismini girin.", "error");
        return;
    }

    const attributes = {
        crossing: parseInt(document.getElementById("input-crossing").value),
        finishing: parseInt(document.getElementById("input-finishing").value),
        heading: parseInt(document.getElementById("input-heading").value),
        dribbling: parseInt(document.getElementById("input-dribbling").value),
        passing: parseInt(document.getElementById("input-passing").value),
        shooting: parseInt(document.getElementById("input-shooting").value),
        marking: parseInt(document.getElementById("input-marking").value),
        decision: parseInt(document.getElementById("input-decision").value),
        vision: parseInt(document.getElementById("input-vision").value),
        positioning: parseInt(document.getElementById("input-positioning").value),
        determination: parseInt(document.getElementById("input-determination").value),
        teamwork: parseInt(document.getElementById("input-teamwork").value),
        pace: parseInt(document.getElementById("input-pace").value),
        acceleration: parseInt(document.getElementById("input-acceleration").value),
        stamina: parseInt(document.getElementById("input-stamina").value),
        strength: parseInt(document.getElementById("input-strength").value),
        agility: parseInt(document.getElementById("input-agility").value)
    };

    const isEdit = state.editingPlayerId !== null;
    const playerId = isEdit ? state.editingPlayerId : ("player-" + Date.now());

    const newPlayer = {
        id: playerId,
        team_id: state.activeTeamId,
        name: name,
        age: age,
        nationality: nationality.toUpperCase(),
        foot: foot,
        primaryPosition: primaryPos,
        secondaryPositions: secondaryPos,
        squadRole: squadRole,
        photo: state.currentUploadedPhoto,
        attributes: attributes,
        height: height,
        weight: weight,
        injuryStatus: injuryStatus,
        coachNotes: coachNotes,
        matchesPlayed: matchesPlayed,
        goals: goals,
        assists: assists,
        yellowCards: yellowCards,
        redCards: redCards,
        matchRating: matchRating,
        parentName: document.getElementById("player-parent-name").value.trim(),
        parentPhone: document.getElementById("player-parent-phone").value.trim(),
        feeStatus: document.getElementById("player-fee-status").value,
        currentAbility: parseInt(document.getElementById("player-current-ability").value) || 3,
        potentialAbility: parseInt(document.getElementById("player-potential-ability").value) || 4,
        bloodType: bloodType,
        chronicIllnesses: chronicIllnesses,
        allergies: allergies,
        medications: medications
    };

    try {
        const res = await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newPlayer)
        });
        if (res.ok) {
            closeModal("modal-add-player");
            state.editingPlayerId = null;
            await loadData();
            selectPlayer(newPlayer.id);
        }
    } catch (e) {
        console.error(e);
    }
}

// Create Coach
export async function handleCreateCoach() {
    const nameInput = document.getElementById("input-coach-name");
    const roleInput = document.getElementById("input-coach-role");
    
    const name = nameInput.value.trim();
    const role = roleInput.value;
    
    if (!name || !state.activeTeamId) return;

    const newCoach = {
        id: "coach-" + Date.now(),
        team_id: state.activeTeamId,
        name: name,
        role: role
    };

    try {
        const res = await fetch("/api/coaches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCoach)
        });
        if (res.ok) {
            closeModal("modal-add-coach");
            await loadData();
            populateTeamManagement();
        }
    } catch (e) {
        console.error(e);
    }
    
    nameInput.value = "";
}

// Delete Coach
export async function deleteCoach(id) {
    const confirmed = await showConfirm("Antrenörü silmek istediğinize emin misiniz?");
    if (confirmed) {
        try {
            const res = await fetch(`/api/coaches?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                await loadData();
                populateTeamManagement();
                showToast("Antrenör silindi.", "success");
            }
        } catch (e) {
            console.error(e);
            showToast("Antrenör silinirken hata oluştu.", "error");
        }
    }
}

// Team Archiving Action
export async function archiveTeamAction(teamId, isArchived) {
    try {
        const res = await fetch("/api/teams/archive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: teamId, is_archived: isArchived ? 1 : 0 })
        });
        if (res.ok) {
            await loadData();
            showToast(isArchived ? "Takım arşivlendi." : "Takım arşivden çıkarıldı.", "success");
            return true;
        }
    } catch (e) {
        console.error("Takım arşivlenemedi", e);
        showToast("Arşivleme işlemi başarısız.", "error");
    }
    return false;
}
