import { state } from "./state.js";
import { showToast, formatDateText } from "./utils.js";
import { fetchMatches, saveMatchAction, deleteMatchAction } from "./api.js";
import { openModal, closeModal } from "./ui.js";

// Matches Management UI Rendering
export async function loadMatchesData() {
    if (!state.activeTeamId) return;

    const grid = document.getElementById("matches-list-grid");
    if (!grid) return;
    grid.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 20px;">Yükleniyor...</div>';

    const matches = await fetchMatches(state.activeTeamId);
    grid.innerHTML = "";

    if (matches.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 30px;">Kayıtlı maç bulunmuyor.</div>';
        return;
    }

    matches.forEach(match => {
        const card = document.createElement("div");
        card.className = "match-card";

        let resultClass = "match-result-draw";
        let resultText = "Beraberlik";
        if (match.our_score > match.opponent_score) {
            resultClass = "match-result-win";
            resultText = "Galibiyet";
        } else if (match.our_score < match.opponent_score) {
            resultClass = "match-result-loss";
            resultText = "Mağlubiyet";
        }

        let playerStatsHtml = "";
        if (match.player_stats && match.player_stats.length > 0) {
            playerStatsHtml = `
                <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 5px;">Oyuncu İstatistikleri:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${match.player_stats.map(ps => `
                            <span style="font-size: 0.7rem; background: var(--bg-subpanel); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px;">
                                <strong>${ps.player_name}</strong>: ${ps.rating.toFixed(1)} ${ps.goals > 0 ? `⚽x${ps.goals}` : ''} ${ps.assists > 0 ? `🅰️x${ps.assists}` : ''}
                            </span>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="match-header">
                <div>
                    <span class="match-opponent">${match.opponent}</span>
                    <span class="match-date" style="margin-left: 10px;">${formatDateText(match.date)}</span>
                </div>
                <button class="modal-close" style="color: var(--attr-poor); opacity: 0.8;" onclick="event.stopPropagation(); window.handleDeleteMatch('${match.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="match-score-row">
                <span class="match-score">${match.our_score} - ${match.opponent_score}</span>
                <span class="match-result-badge ${resultClass}">${resultText}</span>
            </div>
            ${playerStatsHtml}
        `;
        grid.appendChild(card);
    });
}

export function openAddMatchModal() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) {
        showToast("Lütfen bir takım seçin.", "error");
        return;
    }

    document.getElementById("match-input-opponent").value = "";
    document.getElementById("match-input-date").value = new Date().toISOString().split('T')[0];
    document.getElementById("match-input-our-score").value = "0";
    document.getElementById("match-input-opp-score").value = "0";

    const tbody = document.getElementById("match-players-tbody");
    tbody.innerHTML = "";

    if (activeTeam.players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">Takımda oyuncu bulunmuyor.</td></tr>';
    } else {
        activeTeam.players.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${p.name}</strong> <span style="font-size:0.7rem; color:var(--text-muted);">${p.primaryPosition}</span></td>
                <td><input type="number" class="form-control match-p-goals" data-player-id="${p.id}" min="0" value="0" style="padding:4px; font-size:0.75rem; text-align:center;"></td>
                <td><input type="number" class="form-control match-p-assists" data-player-id="${p.id}" min="0" value="0" style="padding:4px; font-size:0.75rem; text-align:center;"></td>
                <td><input type="number" class="form-control match-p-yellow" data-player-id="${p.id}" min="0" max="2" value="0" style="padding:4px; font-size:0.75rem; text-align:center;"></td>
                <td><input type="number" class="form-control match-p-red" data-player-id="${p.id}" min="0" max="1" value="0" style="padding:4px; font-size:0.75rem; text-align:center;"></td>
                <td><input type="number" class="form-control match-p-rating" data-player-id="${p.id}" min="1.0" max="10.0" step="0.1" value="6.0" style="padding:4px; font-size:0.75rem; text-align:center; font-weight:700;"></td>
            `;
            tbody.appendChild(tr);
        });
    }

    openModal("modal-add-match");
}

export async function handleSaveMatchSubmit() {
    const opponent = document.getElementById("match-input-opponent").value.trim();
    const date = document.getElementById("match-input-date").value;
    const ourScore = parseInt(document.getElementById("match-input-our-score").value) || 0;
    const oppScore = parseInt(document.getElementById("match-input-opp-score").value) || 0;

    if (!opponent || !date) {
        showToast("Lütfen rakip takım adı ve tarihi girin.", "error");
        return;
    }

    const playerStats = [];
    const tbody = document.getElementById("match-players-tbody");
    const goalInputs = tbody.querySelectorAll(".match-p-goals");

    goalInputs.forEach(input => {
        const playerId = input.getAttribute("data-player-id");
        const goals = parseInt(input.value) || 0;
        const assists = parseInt(tbody.querySelector(`.match-p-assists[data-player-id="${playerId}"]`).value) || 0;
        const yellow = parseInt(tbody.querySelector(`.match-p-yellow[data-player-id="${playerId}"]`).value) || 0;
        const red = parseInt(tbody.querySelector(`.match-p-red[data-player-id="${playerId}"]`).value) || 0;
        const rating = parseFloat(tbody.querySelector(`.match-p-rating[data-player-id="${playerId}"]`).value) || 6.0;

        playerStats.push({
            player_id: playerId,
            goals,
            assists,
            yellow_cards: yellow,
            red_cards: red,
            rating
        });
    });

    const payload = {
        team_id: state.activeTeamId,
        opponent,
        date,
        our_score: ourScore,
        opponent_score: oppScore,
        player_stats: playerStats
    };

    const ok = await saveMatchAction(payload);
    if (ok) {
        closeModal("modal-add-match");
        loadMatchesData();
    }
}

export async function handleDeleteMatch(matchId) {
    const ok = await deleteMatchAction(matchId);
    if (ok) {
        loadMatchesData();
    }
}
