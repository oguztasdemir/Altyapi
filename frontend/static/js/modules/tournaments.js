import { state } from "./state.js";
import { showToast } from "./utils.js";
import { openModal, closeModal } from "./ui.js";

let selectedTournamentId = null;

export async function loadTournamentsData() {
    if (!state.activeTeamId) return;

    try {
        const res = await fetch(`/api/tournaments?team_id=${state.activeTeamId}`);
        if (!res.ok) throw new Error("Turnuvalar yüklenemedi");
        const tournaments = await res.json();
        
        renderTournamentsList(tournaments);
        
        if (selectedTournamentId) {
            const selected = tournaments.find(t => t.id === selectedTournamentId);
            if (selected) {
                renderTournamentDetails(selected);
            } else {
                showEmptyDetail();
            }
        } else {
            showEmptyDetail();
        }
    } catch (err) {
        console.error(err);
        showToast("Turnuvalar yüklenemedi.", "error");
    }
}

function showEmptyDetail() {
    document.getElementById("tournament-detail-container").style.display = "none";
    document.getElementById("tournament-empty-detail").style.display = "block";
}

function renderTournamentsList(tournaments) {
    const list = document.getElementById("tournaments-list-sidebar");
    if (!list) return;
    list.innerHTML = "";

    if (tournaments.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px 0;">Kayıtlı turnuva bulunamadı.</div>`;
        return;
    }

    tournaments.forEach(tourn => {
        const btn = document.createElement("button");
        btn.className = `list-item ${selectedTournamentId === tourn.id ? 'active' : ''}`;
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.style.background = selectedTournamentId === tourn.id ? "rgba(0, 255, 136, 0.1)" : "var(--bg-subpanel)";
        btn.style.border = selectedTournamentId === tourn.id ? "1px solid var(--accent-color)" : "1px solid var(--border-color)";
        btn.style.padding = "10px";
        btn.style.borderRadius = "var(--border-radius)";
        btn.style.cursor = "pointer";
        btn.style.display = "flex";
        btn.style.flexDirection = "column";
        btn.style.gap = "4px";

        btn.innerHTML = `
            <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${tourn.name}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); display: flex; justify-content: space-between; width: 100%;">
                <span>${tourn.type}</span>
                <span>${tourn.start_date}</span>
            </div>
        `;

        btn.addEventListener("click", () => {
            selectedTournamentId = tourn.id;
            // Update active state in sidebar list
            list.querySelectorAll(".list-item").forEach(item => {
                item.classList.remove("active");
                item.style.background = "var(--bg-subpanel)";
                item.style.border = "1px solid var(--border-color)";
            });
            btn.classList.add("active");
            btn.style.background = "rgba(0, 255, 136, 0.1)";
            btn.style.border = "1px solid var(--accent-color)";
            renderTournamentDetails(tourn);
        });

        list.appendChild(btn);
    });
}

async function renderTournamentDetails(tourn) {
    document.getElementById("tournament-empty-detail").style.display = "none";
    const container = document.getElementById("tournament-detail-container");
    container.style.display = "block";

    // Set Meta
    document.getElementById("tournament-detail-name").innerText = tourn.name;
    document.getElementById("tournament-detail-meta").innerText = `${tourn.type} · Başlangıç: ${tourn.start_date} ${tourn.end_date ? `· Bitiş: ${tourn.end_date}` : ""}`;

    // Stats
    const stats = tourn.stats;
    document.getElementById("tourn-stat-matches").innerText = stats.total;
    document.getElementById("tourn-stat-w-d-l").innerText = `${stats.wins} G / ${stats.draws} B / ${stats.losses} M`;
    document.getElementById("tourn-stat-goals").innerText = `${stats.gf} / ${stats.ga}`;
    const avg = stats.total > 0 ? (stats.gf / stats.total).toFixed(1) : "0.0";
    document.getElementById("tourn-stat-avg-goals").innerText = avg;

    // Load matches
    try {
        const res = await fetch(`/api/matches?team_id=${state.activeTeamId}`);
        if (!res.ok) throw new Error();
        const allMatches = await res.json();
        
        // Filter matches linked to this tournament
        const linkedMatches = allMatches.filter(m => m.tournament_id === tourn.id);
        const unlinkedMatches = allMatches.filter(m => !m.tournament_id);

        renderTournamentMatches(linkedMatches, unlinkedMatches, tourn.id);
    } catch (err) {
        console.error(err);
        showToast("Maçlar listelenemedi.", "error");
    }

    // Set delete listener
    document.getElementById("btn-delete-tournament").onclick = async () => {
        if (confirm("Bu turnuvayı silmek istediğinize emin misiniz? Maçlar silinmez, sadece turnuva bağı kopar.")) {
            await deleteTournament(tourn.id);
        }
    };
}

function renderTournamentMatches(linked, unlinked, tournamentId) {
    const list = document.getElementById("tournament-matches-list");
    if (!list) return;
    list.innerHTML = "";

    // Header bar to link new match
    const linkBar = document.createElement("div");
    linkBar.style.background = "var(--bg-subpanel)";
    linkBar.style.border = "1px solid var(--border-color)";
    linkBar.style.borderRadius = "var(--border-radius)";
    linkBar.style.padding = "10px 15px";
    linkBar.style.marginBottom = "15px";
    linkBar.style.display = "flex";
    linkBar.style.justifyContent = "space-between";
    linkBar.style.alignItems = "center";
    linkBar.style.flexWrap = "wrap";
    linkBar.style.gap = "10px";

    if (unlinked.length === 0) {
        linkBar.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">Turnuvaya eklenebilecek bağımsız maç bulunmuyor.</span>`;
    } else {
        linkBar.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex: 1;">
                <label for="link-match-select" style="font-size: 0.8rem; color: var(--text-secondary); white-space:nowrap;">Maç Ekle:</label>
                <select id="link-match-select" class="form-control" style="font-size:0.8rem; height:32px; padding:4px 8px;">
                    ${unlinked.map(m => `<option value="${m.id}">${m.opponent} (${m.date}) - [${m.our_score}-${m.opponent_score}]</option>`).join("")}
                </select>
            </div>
            <button class="btn-primary" id="btn-link-match-submit" style="padding: 5px 12px; font-size: 0.8rem;">Turnuvaya Bağla</button>
        `;
        
        linkBar.querySelector("#btn-link-match-submit").onclick = async () => {
            const select = linkBar.querySelector("#link-match-select");
            const matchId = select.value;
            if (matchId) {
                await linkMatchToTournament(matchId, tournamentId);
            }
        };
    }
    list.appendChild(linkBar);

    if (linked.length === 0) {
        const empty = document.createElement("div");
        empty.style.textAlign = "center";
        empty.style.color = "var(--text-muted)";
        empty.style.fontSize = "0.8rem";
        empty.style.padding = "30px 0";
        empty.innerText = "Bu turnuvaya henüz maç eklenmemiş.";
        list.appendChild(empty);
        return;
    }

    linked.forEach(match => {
        const item = document.createElement("div");
        item.style.background = "var(--bg-subpanel)";
        item.style.border = "1px solid var(--border-color)";
        item.style.borderRadius = "var(--border-radius)";
        item.style.padding = "10px 15px";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";

        const isWin = match.our_score > match.opponent_score;
        const isLoss = match.our_score < match.opponent_score;
        let outcomeBadge = '<span style="background: var(--bg-dark); color: var(--text-muted); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight:700;">B</span>';
        if (isWin) {
            outcomeBadge = '<span style="background: rgba(0, 255, 136, 0.15); color: var(--accent-color); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight:700;">G</span>';
        } else if (isLoss) {
            outcomeBadge = '<span style="background: rgba(255, 68, 68, 0.15); color: var(--attr-poor); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight:700;">M</span>';
        }

        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                ${outcomeBadge}
                <div>
                    <strong style="font-size:0.85rem; color:var(--text-primary);">${state.teams.find(t=>t.id===state.activeTeamId)?.name} ${match.our_score} - ${match.opponent_score} ${match.opponent}</strong>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${match.date}</div>
                </div>
            </div>
            <button class="btn-secondary" style="border-color: var(--attr-poor); color: var(--attr-poor); padding: 3px 6px; font-size: 0.7rem;" id="btn-unlink-${match.id}">Çıkar</button>
        `;

        item.querySelector(`#btn-unlink-${match.id}`).onclick = async () => {
            if (confirm("Bu maçı turnuvadan çıkarmak istiyor musunuz?")) {
                await linkMatchToTournament(match.id, null);
            }
        };

        list.appendChild(item);
    });
}

export function openAddTournamentModal() {
    document.getElementById("tournament-input-name").value = "";
    document.getElementById("tournament-input-type").value = "Lig";
    document.getElementById("tournament-input-start").value = new Date().toISOString().split("T")[0];
    document.getElementById("tournament-input-end").value = "";
    document.getElementById("tournament-input-notes").value = "";
    openModal("modal-add-tournament");
}

export async function handleSaveTournamentSubmit() {
    if (!state.activeTeamId) return;

    const name = document.getElementById("tournament-input-name").value.trim();
    const type = document.getElementById("tournament-input-type").value;
    const start_date = document.getElementById("tournament-input-start").value;
    const end_date = document.getElementById("tournament-input-end").value;
    const notes = document.getElementById("tournament-input-notes").value.trim();

    if (!name || !start_date) {
        showToast("Lütfen isim ve başlangıç tarihi alanlarını doldurun.", "error");
        return;
    }

    try {
        const res = await fetch("/api/tournaments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                team_id: state.activeTeamId,
                name,
                type,
                start_date,
                end_date: end_date || null,
                notes
            })
        });
        if (!res.ok) throw new Error();
        
        const data = await res.json();
        selectedTournamentId = data.id;

        showToast("Turnuva kaydı başarıyla oluşturuldu.", "success");
        closeModal("modal-add-tournament");
        loadTournamentsData();
    } catch (err) {
        console.error(err);
        showToast("Turnuva kaydedilemedi.", "error");
    }
}

async function linkMatchToTournament(matchId, tournamentId) {
    try {
        const res = await fetch("/api/tournaments/link-match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ match_id: matchId, tournament_id: tournamentId })
        });
        if (res.ok) {
            showToast("Maç bağlantısı güncellendi.", "success");
            loadTournamentsData();
        } else {
            showToast("Maç bağlanamadı.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Bağlantı hatası.", "error");
    }
}

async function deleteTournament(id) {
    try {
        const res = await fetch(`/api/tournaments?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Turnuva silindi.", "success");
            selectedTournamentId = null;
            loadTournamentsData();
        } else {
            showToast("Turnuva silinemedi.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Bağlantı hatası.", "error");
    }
}
