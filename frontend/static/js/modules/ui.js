import { state } from "./state.js";
import { showConfirm, calculateWeightedRating, getAttributeColor } from "./utils.js";
import { 
    loadData, deleteTeam, deleteCoach, 
    loadAttendanceData, archiveTeamAction
} from "./api.js";
import { updateSplittersVisibility } from "./drag.js";

// Re-export Modular Sub-Scripts to keep single imports in other files
export {
    renderPlayersList, selectPlayer, updatePitchMarker,
    openPlayerComparison, handleComparisonSelect, handlePhotoUpload,
    resetPlayerForm, handleEditPlayerClick, switchDetailTab,
    updateAttributeDetailCard, renderTacticalPitch, handleAddInjuryClick,
    saveInlineEdit, cancelInlineEdit, setupPitchPickerListeners
} from "./player.js";

export {
    updateAdminUI, renderAdminView, handleAdminSaveSettings
} from "./admin.js";

export {
    loadMatchesData, openAddMatchModal, handleSaveMatchSubmit,
    handleDeleteMatch
} from "./matches.js";

// Modals
export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("active");
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
}

// Switch Sidebar Tabs
export function switchTab(tabId) {
    state.activeTab = tabId;
    localStorage.setItem("fm_active_tab", tabId);
    if (window.location.hash !== "#" + tabId) {
        window.location.hash = tabId;
    }
    
    document.querySelectorAll(".sidebar .nav-item").forEach(item => item.classList.remove("active"));
    let activeNavId = tabId;
    if (tabId === "nav-expenses" || tabId === "nav-incomes" || tabId === "nav-finance-analysis" || tabId === "nav-kits") {
        activeNavId = "nav-finance";
    }
    const activeNav = document.getElementById(activeNavId);
    if (activeNav) activeNav.classList.add("active");

    // Hide all view views
    const dbView = document.getElementById("dashboard-view");
    if (dbView) dbView.style.display = "none";
    const compView = document.getElementById("compare-view");
    if (compView) compView.style.display = "none";
    const calView = document.getElementById("calendar-view");
    if (calView) calView.style.display = "none";
    document.getElementById("team-management-view").style.display = "none";
    document.getElementById("players-panel").style.display = "none";
    document.getElementById("player-detail-panel").style.display = "none";
    const tacticPanel = document.getElementById("team-tactic-board-panel");
    if (tacticPanel) tacticPanel.style.display = "none";
    const tacticsView = document.getElementById("tactics-view");
    if (tacticsView) tacticsView.style.display = "none";
    const simView = document.getElementById("simulation-view");
    if (simView) simView.style.display = "none";
    document.getElementById("empty-state-view").style.display = "none";
    document.getElementById("attendance-view").style.display = "none";
    document.getElementById("finance-view").style.display = "none";
    document.getElementById("expenses-view").style.display = "none";
    document.getElementById("incomes-view").style.display = "none";
    document.getElementById("finance-analysis-view").style.display = "none";
    document.getElementById("kits-view").style.display = "none";
    document.getElementById("admin-view").style.display = "none";
    document.getElementById("matches-view").style.display = "none";
    document.getElementById("training-view").style.display = "none";
    document.getElementById("tournaments-view").style.display = "none";
    document.getElementById("announcements-view").style.display = "none";
    document.getElementById("transfers-view").style.display = "none";

    const notSelectedEl = document.getElementById("player-not-selected-view");
    if (notSelectedEl) notSelectedEl.style.display = "none";

    // Dynamic import to prevent circular issues at load time
    import("./player.js").then(playerMod => {
        import("./admin.js").then(adminMod => {
            import("./matches.js").then(matchesMod => {
                
                if (tabId === "nav-dashboard") {
                    document.getElementById("teams-panel").style.display = "none";
                    if (dbView) dbView.style.display = "flex";
                    if (state.activeTeamId) {
                        populateDashboard();
                    }
                } else if (tabId === "nav-tactics") {
                    document.getElementById("teams-panel").style.display = "none";
                    if (tacticsView) tacticsView.style.display = "flex";
                    
                    const btnBoard = document.getElementById("btn-tactic-mode-board");
                    if (btnBoard) {
                        btnBoard.click();
                    }
                    
                    if (state.activeTeamId) {
                        import("./lineup.js").then(lineupMod => {
                            lineupMod.loadAndRenderTacticsPage();
                        });
                    } else {
                        showEmptyState();
                    }
                } else if (tabId === "nav-compare-hub") {
                    document.getElementById("teams-panel").style.display = "none";
                    if (compView) compView.style.display = "block";
                    if (state.activeTeamId) {
                        initCompareHub();
                    } else {
                        showEmptyState();
                    }
                } else if (tabId === "nav-calendar") {
                    document.getElementById("teams-panel").style.display = "none";
                    if (calView) calView.style.display = "block";
                    if (state.activeTeamId) {
                        initCalendarHub();
                    } else {
                        showEmptyState();
                    }
                } else if (tabId === "nav-teams") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("players-panel").style.display = "flex";
                    updateDynamicPanel();
                    
                    if (state.activeTeamId) {
                        selectTeam(state.activeTeamId);
                        const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
                        const playerExists = activeTeam && activeTeam.players.find(p => p.id === state.activePlayerId);
                        if (playerExists) {
                            playerMod.selectPlayer(state.activePlayerId);
                        } else {
                            state.activePlayerId = null;
                            document.getElementById("player-detail-panel").style.display = "none";
                            const placeholder = document.getElementById("player-not-selected-view");
                            if (placeholder) placeholder.style.display = "flex";
                        }
                    } else {
                        showEmptyState();
                    }
                } else if (tabId === "nav-management") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("team-management-view").style.display = "block";
                    
                    if (state.activeTeamId) {
                        populateTeamManagement();
                    }
                } else if (tabId === "nav-attendance") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("attendance-view").style.display = "block";
                    
                    const dateInput = document.getElementById("new-attendance-date");
                    if (dateInput && !dateInput.value) {
                        dateInput.value = new Date().toISOString().split('T')[0];
                    }
                    
                    if (state.activeTeamId) {
                        loadAttendanceData();
                    }
                } else if (tabId === "nav-matches") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("matches-view").style.display = "block";
                    
                    if (state.activeTeamId) {
                        matchesMod.loadMatchesData();
                    }
                } else if (tabId === "nav-finance") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("finance-view").style.display = "block";
                    
                    if (state.activeTeamId) {
                        import("./api.js").then(apiMod => apiMod.loadFinanceData());
                    }
                } else if (tabId === "nav-expenses") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("expenses-view").style.display = "block";
                    
                    import("./api.js").then(apiMod => apiMod.loadExpensesData());
                } else if (tabId === "nav-incomes") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("incomes-view").style.display = "block";
                    
                    import("./api_finance.js").then(apiMod => apiMod.loadIncomesData());
                } else if (tabId === "nav-finance-analysis") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("finance-analysis-view").style.display = "block";
                    
                    if (state.activeTeamId) {
                        import("./charts.js").then(chartMod => chartMod.loadFinanceTrendChart(state.activeTeamId));
                    }
                } else if (tabId === "nav-kits") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("kits-view").style.display = "block";
                    
                    import("./api.js").then(apiMod => apiMod.loadKitsData());
                } else if (tabId === "nav-training") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("training-view").style.display = "block";
                    
                    if (state.activeTeamId) {
                        import("./training.js").then(mod => mod.loadTrainingData());
                    }
                } else if (tabId === "nav-tournaments") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("tournaments-view").style.display = "block";
                    
                    if (state.activeTeamId) {
                        import("./tournaments.js").then(mod => mod.loadTournamentsData());
                    }
                } else if (tabId === "nav-announcements") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("announcements-view").style.display = "block";
                    
                    if (state.activeTeamId) {
                        import("./announcements.js").then(mod => mod.loadAnnouncementsData());
                    }
                } else if (tabId === "nav-transfers") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("transfers-view").style.display = "flex";
                    
                    import("./transfers.js").then(mod => mod.initTransfersView());
                } else if (tabId === "nav-admin") {
                    document.getElementById("teams-panel").style.display = "none";
                    document.getElementById("admin-view").style.display = "block";
                    
                    adminMod.renderAdminView();
                }

                updateSplittersVisibility();
            });
        });
    });
}

export async function populateDashboard() {
    const totalSquadsCount = state.teams.length;
    const totalPlayersCount = state.teams.reduce((acc, t) => acc + (t.players ? t.players.length : 0), 0);
    
    const squadsEl = document.getElementById("db-stat-total-squads");
    if (squadsEl) squadsEl.innerText = totalSquadsCount;
    
    const playersEl = document.getElementById("db-stat-total-players");
    if (playersEl) playersEl.innerText = totalPlayersCount;

    const dbFilter = document.getElementById("dashboard-team-filter");
    const selectedTeamId = dbFilter ? dbFilter.value : "all";

    let activeTeam = null;
    let isAllTeams = selectedTeamId === "all";

    if (!isAllTeams) {
        activeTeam = state.teams.find(t => t.id === selectedTeamId);
        if (!activeTeam && state.activeTeamId) {
            activeTeam = state.teams.find(t => t.id === state.activeTeamId);
            if (dbFilter) dbFilter.value = state.activeTeamId;
        }
    }

    if (!isAllTeams && !activeTeam) {
        document.getElementById("db-stat-active-injuries").innerText = "0";
        document.getElementById("db-upcoming-trainings").innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 20px 0;">Lütfen bir takım seçin.</div>`;
        document.getElementById("db-upcoming-matches").innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 20px 0;">Lütfen bir takım seçin.</div>`;
        document.getElementById("dashboard-announcements-ticker").style.display = "none";
        return;
    }

    // 1. Stats (Injuries)
    let injuredCount = 0;
    if (isAllTeams) {
        state.teams.forEach(t => {
            injuredCount += t.players.filter(p => p.injuryStatus && p.injuryStatus !== "Sağlıklı").length;
        });
    } else {
        injuredCount = activeTeam.players.filter(p => p.injuryStatus && p.injuryStatus !== "Sağlıklı").length;
    }
    document.getElementById("db-stat-active-injuries").innerText = injuredCount;

    // 2. Announcements Ticker
    try {
        const queryUrl = isAllTeams ? "/api/announcements?team_id=all" : `/api/announcements?team_id=${activeTeam.id}`;
        const annRes = await fetch(queryUrl);
        if (annRes.ok) {
            const anns = await annRes.json();
            const pinned = anns.filter(a => a.is_pinned);
            const ticker = document.getElementById("dashboard-announcements-ticker");
            const tickerText = document.getElementById("dashboard-ticker-text");
            if (pinned.length > 0 && ticker && tickerText) {
                tickerText.innerText = pinned.map(p => {
                    const prefix = isAllTeams ? `[${p.team_name || "Tüm"}] ` : "";
                    return `${prefix}${p.title}: ${p.content}`;
                }).join("  |  ");
                ticker.style.display = "flex";
            } else if (ticker) {
                ticker.style.display = "none";
            }
        }
    } catch (e) {
        console.error("Announcements ticker error:", e);
    }

    // 3. Upcoming trainings
    try {
        const queryUrl = isAllTeams ? "/api/training?team_id=all" : `/api/training?team_id=${activeTeam.id}`;
        const trainRes = await fetch(queryUrl);
        if (trainRes.ok) {
            const trainings = await trainRes.json();
            const nowStr = new Date().toISOString().split("T")[0];
            const upcoming = trainings.filter(t => t.date >= nowStr).sort((a,b) => a.date.localeCompare(b.date));
            const trainContainer = document.getElementById("db-upcoming-trainings");
            if (upcoming.length > 0) {
                trainContainer.innerHTML = upcoming.map(t => {
                    const prefix = isAllTeams ? `[${t.team_name || "Tüm"}] ` : "";
                    return `
                    <div class="list-item" style="border-left: 3px solid ${t.color || '#00ff88'}; padding: 10px; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; border-radius: var(--border-radius);">
                        <div>
                            <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${prefix}${t.title}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">📍 ${t.location || 'Saha'} | 🕒 ${t.start_time || '16:00'}-${t.end_time || '18:00'}</div>
                        </div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-color); background: rgba(106, 27, 154, 0.2); padding: 4px 8px; border-radius: 4px;">
                            ${t.date.split("-").reverse().join("/")}
                        </div>
                    </div>
                `}).join("");
            } else {
                trainContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 20px 0;">Yaklaşan çalışma kaydı bulunmuyor.</div>`;
            }
        }
    } catch (e) {
        console.error(e);
    }

    // 4. Upcoming & Recent Matches
    try {
        const queryUrl = isAllTeams ? "/api/matches?team_id=all" : `/api/matches?team_id=${activeTeam.id}`;
        const matchRes = await fetch(queryUrl);
        if (matchRes.ok) {
            const matches = await matchRes.json();
            const sortedMatches = matches.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
            const matchContainer = document.getElementById("db-upcoming-matches");
            if (sortedMatches.length > 0) {
                matchContainer.innerHTML = sortedMatches.map(m => {
                    const isUpcoming = new Date(m.date) > new Date();
                    const scoreText = isUpcoming ? "VS" : `${m.our_score} - ${m.opponent_score}`;
                    const resultColor = isUpcoming ? "var(--text-muted)" : (m.our_score > m.opponent_score ? "var(--attr-excellent)" : (m.our_score < m.opponent_score ? "var(--attr-poor)" : "var(--attr-average)"));
                    const prefix = isAllTeams ? `[${m.team_name || "Tüm"}] ` : "";
                    return `
                        <div class="list-item" style="padding: 10px; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; border-radius: var(--border-radius);">
                            <div>
                                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${prefix}vs ${m.opponent}</div>
                                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">📅 ${m.date.split("-").reverse().join("/")}</div>
                            </div>
                            <div style="font-size: 0.8rem; font-weight: 800; color: ${resultColor}; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 4px; min-width: 50px; text-align: center;">
                                ${scoreText}
                            </div>
                        </div>
                    `;
                }).join("");
            } else {
                matchContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 20px 0;">Kayıtlı maç bulunmuyor.</div>`;
            }
        }
    } catch (e) {
        console.error(e);
    }

    // 5. Active Injuries list on dashboard
    const injuryContainer = document.getElementById("db-active-injuries-list");
    if (injuryContainer) {
        let injuredPlayers = [];
        if (isAllTeams) {
            state.teams.forEach(t => {
                const injured = t.players.filter(p => p.injuryStatus && p.injuryStatus !== "Sağlıklı");
                injured.forEach(p => {
                    p.team_name = t.name;
                });
                injuredPlayers = injuredPlayers.concat(injured);
            });
        } else {
            injuredPlayers = activeTeam.players.filter(p => p.injuryStatus && p.injuryStatus !== "Sağlıklı");
        }

        if (injuredPlayers.length > 0) {
            injuryContainer.innerHTML = injuredPlayers.map(p => {
                const teamSubtext = isAllTeams ? ` | Takım: ${p.team_name || "Bilinmeyen"}` : "";
                return `
                <div class="list-item" style="padding: 10px; background: rgba(255, 69, 58, 0.03); border-left: 3px solid var(--attr-poor); display: flex; justify-content: space-between; align-items: center; border-radius: var(--border-radius);">
                    <div>
                        <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">${p.name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Mevki: ${p.primaryPosition}${teamSubtext} | Durum: ${p.injuryStatus}</div>
                    </div>
                    <div style="font-size: 0.68rem; font-weight: 700; color: var(--attr-poor); background: rgba(255, 69, 58, 0.1); padding: 2px 6px; border-radius: 4px;">
                        🚨 Sakat
                    </div>
                </div>
            `}).join("");
        } else {
            injuryContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 20px 0;">Aktif sakatlık kaydı bulunmuyor.</div>`;
        }
    }

    // 6. Haftanın En Formda 5 Futbolcusu
    const bestPlayersList = document.getElementById("dashboard-best-players-list");
    const pitchNodes = document.getElementById("dashboard-pitch-nodes");
    if (bestPlayersList && pitchNodes) {
        bestPlayersList.innerHTML = "";
        pitchNodes.innerHTML = "";

        let allPlayers = [];
        if (isAllTeams) {
            state.teams.forEach(t => {
                t.players.forEach(p => {
                    p.team_name = t.name;
                    allPlayers.push(p);
                });
            });
        } else {
            allPlayers = [...activeTeam.players];
        }

        const sortedFormPlayers = allPlayers
            .sort((a, b) => (b.matchRating || 0) - (a.matchRating || 0))
            .slice(0, 5);

        if (sortedFormPlayers.length === 0) {
            bestPlayersList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 10px 0;">Oyuncu bulunmuyor.</div>`;
            pitchNodes.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 10px 0;">Oyuncu bulunmuyor.</div>`;
        } else {
            // Render List
            bestPlayersList.innerHTML = sortedFormPlayers.map((p, idx) => {
                const teamSubtext = isAllTeams ? ` · ${p.team_name || "Bilinmeyen"}` : "";
                return `
                <div class="list-item" style="padding: 8px 12px; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; border-radius: var(--border-radius); border-left: 3px solid var(--accent-color);">
                    <div>
                        <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">${idx + 1}. ${p.name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Mevki: ${p.primaryPosition}${teamSubtext} · ${p.age} Yaş</div>
                    </div>
                    <div style="font-size: 0.8rem; font-weight: 850; color: var(--accent-color); background: rgba(0, 255, 136, 0.1); padding: 3px 8px; border-radius: 4px;">
                        ★ ${(p.matchRating || 6.0).toFixed(2)}
                    </div>
                </div>
            `}).join("");

            // Render Pitch Circles
            pitchNodes.innerHTML = sortedFormPlayers.map(p => {
                const initials = p.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                const teamTooltip = isAllTeams ? ` (${p.team_name})` : "";
                return `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-color) 0%, #00b359 100%); border: 2px solid #fff; display: flex; align-items: center; justify-content: center; color: #000; font-weight: 800; font-size: 0.75rem; box-shadow: 0 4px 10px rgba(0,255,136,0.3); cursor: pointer;" title="${p.name} (${p.primaryPosition})${teamTooltip} - ★ ${(p.matchRating || 6.0).toFixed(2)}">
                            ${initials}
                        </div>
                        <span style="font-size: 0.65rem; color: #fff; font-weight: bold; background: rgba(0,0,0,0.6); padding: 1px 4px; border-radius: 3px; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${p.name.split(" ").pop()}
                        </span>
                    </div>
                `;
            }).join("");
        }
    }

    // Load recent audit logs
    import("./extras.js").then(module => {
        module.loadAndRenderDashboardAuditLogs();
    }).catch(e => console.error("Failed to load loadAndRenderDashboardAuditLogs", e));
}

// Render Teams List (Left Panel)
export function renderTeams() {
    // Update total counts
    const totalSquads = state.teams.length;
    const totalPlayers = state.teams.reduce((acc, t) => acc + (t.players ? t.players.length : 0), 0);
    const squadsSpan = document.getElementById("total-squads-count");
    const playersSpan = document.getElementById("total-players-count");
    if (squadsSpan) squadsSpan.innerText = totalSquads;
    if (playersSpan) playersSpan.innerText = totalPlayers;

    const container = document.getElementById("teams-list");
    if (container) {
        container.innerHTML = "";
        state.teams.forEach(team => {
            const item = document.createElement("div");
            item.className = `list-item ${state.activeTeamId === team.id ? 'active' : ''}`;
            item.innerHTML = `
                <div>
                    <div class="list-item-title">${team.name}</div>
                    <div class="list-item-subtitle">${team.players.length} Oyuncu, ${team.coaches.length} Antrenör</div>
                </div>
                <button class="modal-close" style="color: var(--text-muted); opacity: 0.6;" onclick="event.stopPropagation(); deleteTeam('${team.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            item.addEventListener("click", () => selectTeam(team.id));
            container.appendChild(item);
        });
    }

    const select = document.getElementById("sidebar-team-select");
    if (select) {
        select.innerHTML = "";
        state.teams.forEach(team => {
            const opt = document.createElement("option");
            opt.value = team.id;
            opt.innerText = `${team.name} (${team.players.length} Oyuncu)`;
            if (state.activeTeamId === team.id) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
    }

    // Populate Dashboard Filter
    const dbFilter = document.getElementById("dashboard-team-filter");
    if (dbFilter) {
        const currentVal = dbFilter.value || "all";
        dbFilter.innerHTML = `<option value="all">Tüm Takımlar</option>`;
        state.teams.forEach(team => {
            const opt = document.createElement("option");
            opt.value = team.id;
            opt.innerText = team.name;
            dbFilter.appendChild(opt);
        });
        dbFilter.value = currentVal;
    }

    // Populate Calendar Filter
    const calFilter = document.getElementById("calendar-team-filter");
    if (calFilter) {
        const currentVal = calFilter.value || "all";
        calFilter.innerHTML = `<option value="all">Tüm Takımlar</option>`;
        state.teams.forEach(team => {
            const opt = document.createElement("option");
            opt.value = team.id;
            opt.innerText = team.name;
            calFilter.appendChild(opt);
        });
        calFilter.value = currentVal;
    }
}

// Select Team Action
export function selectTeam(id) {
    if (!id) {
        state.activeTeamId = null;
        localStorage.removeItem("fm_active_team_id");
        
        const select = document.getElementById("sidebar-team-select");
        if (select) select.value = "";
        
        const items = document.querySelectorAll("#teams-list .list-item");
        items.forEach(item => item.classList.remove("active"));
        
        updateDynamicPanel();
        showEmptyState();
        return;
    }

    state.activeTeamId = id;
    localStorage.setItem("fm_active_team_id", id);
    
    const select = document.getElementById("sidebar-team-select");
    if (select && select.value !== id) {
        select.value = id;
    }
    
    const items = document.querySelectorAll("#teams-list .list-item");
    state.teams.forEach((t, idx) => {
        if (items[idx]) {
            if (t.id === id) items[idx].classList.add("active");
            else items[idx].classList.remove("active");
        }
    });

    updateDynamicPanel();

    const activeTeam = state.teams.find(t => t.id === id);
    if (!activeTeam) return;

    const activeTitle = document.getElementById("active-view-title");
    if (activeTitle) activeTitle.innerText = activeTeam.name;

    if (state.activeTab === "nav-dashboard") {
        populateDashboard();
    } else if (state.activeTab === "nav-teams") {
        const addBtn = document.getElementById("btn-add-player");
        if (addBtn) addBtn.style.display = "block";
        const emptyState = document.getElementById("empty-state-view");
        if (emptyState) emptyState.style.display = "none";
        
        import("./player.js").then(playerMod => {
            playerMod.renderPlayersList();
            import("./lineup.js").then(lineupMod => {
                lineupMod.selectTeamLineupBoard();
            });
        });
    } else if (state.activeTab === "nav-management") {
        populateTeamManagement();
    } else if (state.activeTab === "nav-attendance") {
        loadAttendanceData();
    } else if (state.activeTab === "nav-matches") {
        import("./matches.js").then(matchesMod => matchesMod.loadMatchesData());
    } else if (state.activeTab === "nav-finance") {
        import("./api.js").then(apiMod => apiMod.loadFinanceData());
        import("./charts.js").then(chartMod => chartMod.loadFinanceTrendChart(state.activeTeamId));
    } else if (state.activeTab === "nav-transfers") {
        import("./transfers.js").then(mod => mod.initTransfersView());
    }

    // Update Notification Center alerts for the active team
    import("./notifications.js").then(mod => mod.updateNotificationCenter());
}

export function showEmptyState() {
    const activeTitle = document.getElementById("active-view-title");
    if (activeTitle) activeTitle.innerText = "Altyapı Manager";
    const emptyState = document.getElementById("empty-state-view");
    if (emptyState) emptyState.style.display = "flex";
    const detailPanel = document.getElementById("player-detail-panel");
    if (detailPanel) detailPanel.style.display = "none";
    const placeholder = document.getElementById("player-not-selected-view");
    if (placeholder) placeholder.style.display = "none";
}

export function showNoPlayerSelected() {
    const detailPanel = document.getElementById("player-detail-panel");
    if (detailPanel) detailPanel.style.display = "none";
}

export function populateTeamManagement() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;

    const teamInput = document.getElementById("edit-team-name");
    if (teamInput) teamInput.value = activeTeam.name;

    const tbody = document.getElementById("coaches-list-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (activeTeam.coaches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Henüz antrenör eklenmemiş.</td></tr>`;
    } else {
        activeTeam.coaches.forEach(coach => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${coach.name}</strong></td>
                <td>${coach.role}</td>
                <td>
                    <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="deleteCoach('${coach.id}')">Sil</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Fetch and populate seasons
    fetch(`/api/seasons?team_id=${activeTeam.id}`).then(r => r.json()).then(seasons => {
        const tbodyS = document.getElementById("seasons-list-tbody");
        if (!tbodyS) return;
        tbodyS.innerHTML = "";
        if (seasons.length === 0) {
            tbodyS.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 15px;">Kayıtlı sezon yok.</td></tr>`;
            return;
        }
        seasons.forEach(s => {
            const tr = document.createElement("tr");
            const statusBadge = s.is_active 
                ? `<span class="badge-injury-resolved">AKTİF</span>`
                : `<span style="background: rgba(255,255,255,0.05); color: var(--text-muted); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; cursor: pointer;" onclick="window.activateSeason('${s.id}')">Etkinleştir</span>`;
            
            tr.innerHTML = `
                <td><strong>${s.name}</strong></td>
                <td>${s.start_date.split("-").reverse().join("/")} - ${s.end_date.split("-").reverse().join("/")}</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td>
                    <button class="btn-secondary" style="padding: 3px 8px; font-size: 0.7rem; border-color: var(--attr-poor); color: var(--attr-poor);" onclick="window.deleteSeason('${s.id}')">Sil</button>
                </td>
            `;
            tbodyS.appendChild(tr);
        });
    });

    // Fetch and populate transfers
    fetch(`/api/transfers?team_id=${activeTeam.id}`).then(r => r.json()).then(transfers => {
        const tbodyT = document.getElementById("transfers-list-tbody");
        if (!tbodyT) return;
        tbodyT.innerHTML = "";
        if (transfers.length === 0) {
            tbodyT.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px;">Kayıtlı transfer yok.</td></tr>`;
            return;
        }
        transfers.forEach(t => {
            const tr = document.createElement("tr");
            const isGelen = t.transfer_type.includes("Gelen");
            const badgeColor = isGelen ? "var(--attr-excellent)" : "var(--attr-poor)";
            const detailText = isGelen ? `Giriş: ${t.from_team || 'Serbest'}` : `Çıkış: ${t.to_team || 'Serbest'}`;
            
            tr.innerHTML = `
                <td><strong>${t.player_name || 'Bilinmeyen'}</strong></td>
                <td><span style="font-size: 0.7rem; font-weight: 700; color: ${badgeColor};">${t.transfer_type}</span></td>
                <td style="font-size: 0.75rem; color: var(--text-secondary);">${detailText}</td>
                <td style="font-weight: 700;">${t.fee > 0 ? t.fee.toLocaleString('tr-TR') + ' TL' : 'Bedelsiz'}</td>
                <td>
                    <button class="btn-secondary" style="padding: 3px 8px; font-size: 0.7rem; border-color: var(--attr-poor); color: var(--attr-poor);" onclick="window.deleteTransfer('${t.id}')">Sil</button>
                </td>
            `;
            tbodyT.appendChild(tr);
        });
    });

    // Populate Parent Contacts list
    populateParentContacts();

    // Load Team Archive
    import("./archive.js").then(mod => {
        mod.loadTeamArchive(activeTeam.id);
    });
}

export function populateParentContacts() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;

    const tbody = document.getElementById("parent-contact-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchInput = document.getElementById("parent-contact-search");
    const q = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filtered = activeTeam.players.filter(p => {
        return p.name.toLowerCase().includes(q) || 
               (p.parentName && p.parentName.toLowerCase().includes(q)) ||
               (p.parentPhone && p.parentPhone.includes(q));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Eşleşen veli bulunamadı.</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td>${p.parentName || '-'}</td>
            <td><a href="tel:${p.parentPhone}" style="color: var(--accent-color); font-weight: 600; text-decoration: none;">${p.parentPhone || '-'}</a></td>
            <td>
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.72rem;" onclick="window.printContactCard('${p.id}')">🖨️ Kart Yazdır</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

export function openAddSeasonModal() {
    document.getElementById("season-input-name").value = "";
    document.getElementById("season-input-start").value = new Date().toISOString().split("T")[0];
    document.getElementById("season-input-end").value = "";
    document.getElementById("season-input-active").checked = false;
    openModal("modal-add-season");
}

export function openAddTransferModal() {
    const select = document.getElementById("transfer-input-player");
    if (select) {
        select.innerHTML = '<option value="">-- Futbolcu Seçin --</option>';
        state.teams.forEach(team => {
            team.players.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.id;
                opt.innerText = `${p.name} (${team.name})`;
                select.appendChild(opt);
            });
        });
    }
    document.getElementById("transfer-input-fee").value = "";
    document.getElementById("transfer-input-from").value = "";
    document.getElementById("transfer-input-to").value = "";
    document.getElementById("transfer-input-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("transfer-input-notes").value = "";
    openModal("modal-add-transfer");
}

// Team Archiving Actions
export async function handleArchiveTeamToggle() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;

    const actionText = activeTeam.is_archived ? "arşivden çıkarmak" : "arşive atmak";
    const confirmed = await showConfirm(`Bu takımı ${actionText} istediğinize emin misiniz?`);
    if (!confirmed) return;

    const ok = await archiveTeamAction(state.activeTeamId, !activeTeam.is_archived);
    if (ok) {
        populateTeamManagement();
    }
}

export function selectAttendancePill(element, status) {
    const parent = element.parentElement;
    parent.querySelectorAll(".att-pill").forEach(pill => pill.classList.remove("active"));
    element.classList.add("active");
}

// Expenses (Mali Hesaplar) helper handlers
export function openAddExpenseModal() {
    document.getElementById("modal-expense-title").innerText = "Yeni Mali İşlem Ekle";
    document.getElementById("expense-id-hidden").value = "";
    document.getElementById("expense-input-description").value = "";
    document.getElementById("expense-input-category").value = "Kira";
    document.getElementById("expense-input-type").value = "Gider";
    document.getElementById("expense-input-amount").value = "";
    document.getElementById("expense-input-date").value = new Date().toISOString().split('T')[0];
    openModal("modal-add-expense");
}

export function handleEditExpenseClick(id, description, category, amount, date, type) {
    document.getElementById("modal-expense-title").innerText = "Mali İşlemi Düzenle";
    document.getElementById("expense-id-hidden").value = id;
    document.getElementById("expense-input-description").value = description;
    document.getElementById("expense-input-category").value = category;
    document.getElementById("expense-input-type").value = type;
    document.getElementById("expense-input-amount").value = amount;
    document.getElementById("expense-input-date").value = date;
    openModal("modal-add-expense");
}

export async function handleDeleteExpense(id) {
    import("./api.js").then(async apiMod => {
        await apiMod.deleteExpenseAction(id);
    });
}

// Kits (Forma Takibi) helper handlers
export function openAddKitModal() {
    document.getElementById("modal-kit-title").innerText = "Yeni Forma Kaydı Ekle";
    document.getElementById("kit-id-hidden").value = "";
    document.getElementById("kit-input-player").value = "";
    document.getElementById("kit-input-size").value = "M";
    document.getElementById("kit-input-number").value = "";
    document.getElementById("kit-input-status").value = "Beklemede";
    document.getElementById("kit-input-payment").value = "Ödenmedi";
    document.getElementById("kit-input-notes").value = "";
    
    // Populate players list in select dropdown
    populateKitPlayersSelect();
    
    openModal("modal-add-kit");
}

export function handleEditKitClick(id, player_id, size, number, status, notes, payment_status) {
    document.getElementById("modal-kit-title").innerText = "Forma Kaydını Düzenle";
    document.getElementById("kit-id-hidden").value = id;
    
    populateKitPlayersSelect();
    
    document.getElementById("kit-input-player").value = player_id || "";
    document.getElementById("kit-input-size").value = size;
    document.getElementById("kit-input-number").value = number || "";
    document.getElementById("kit-input-status").value = status;
    document.getElementById("kit-input-payment").value = payment_status || "Ödenmedi";
    document.getElementById("kit-input-notes").value = notes || "";
    openModal("modal-add-kit");
}

export async function handleDeleteKit(id) {
    import("./api.js").then(async apiMod => {
        await apiMod.deleteKitAction(id);
    });
}

export function populateKitPlayersSelect() {
    const select = document.getElementById("kit-input-player");
    if (!select) return;
    select.innerHTML = '<option value="">-- Futbolcu Seçin (Atanmamış) --</option>';
    
    // Add all players from all teams in state
    state.teams.forEach(team => {
        team.players.forEach(player => {
            const opt = document.createElement("option");
            opt.value = player.id;
            opt.innerText = `${player.name} (${team.name})`;
            select.appendChild(opt);
        });
    });
}

export function updateDynamicPanel() {
    const isTeamActive = !!state.activeTeamId;
    
    const headerPlayers = document.getElementById("panel-header-players");
    const searchFilterBox = document.getElementById("search-filter-box");
    const listPlayers = document.getElementById("players-list-container");
    const emptyMsg = document.getElementById("players-panel-empty-message");
    
    if (isTeamActive) {
        if (headerPlayers) headerPlayers.style.display = "flex";
        if (searchFilterBox) searchFilterBox.style.display = "flex";
        if (listPlayers) listPlayers.style.display = "block";
        if (emptyMsg) emptyMsg.style.display = "none";
    } else {
        if (headerPlayers) headerPlayers.style.display = "none";
        if (searchFilterBox) searchFilterBox.style.display = "none";
        if (listPlayers) listPlayers.style.display = "none";
        if (emptyMsg) emptyMsg.style.display = "block";
    }
}

export function initCompareHub() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    const select1 = document.getElementById("hub-compare-p1-select");
    const select2 = document.getElementById("hub-compare-p2-select");
    
    if (!select1 || !select2) return;
    
    select1.innerHTML = '<option value="">-- Oyuncu Seçin --</option>';
    select2.innerHTML = '<option value="">-- Oyuncu Seçin --</option>';
    
    if (!activeTeam || !activeTeam.players || activeTeam.players.length === 0) {
        return;
    }
    
    activeTeam.players.forEach(p => {
        const opt1 = document.createElement("option");
        opt1.value = p.id;
        opt1.innerText = `${p.name} (${p.primaryPosition})`;
        select1.appendChild(opt1);
        
        const opt2 = document.createElement("option");
        opt2.value = p.id;
        opt2.innerText = `${p.name} (${p.primaryPosition})`;
        select2.appendChild(opt2);
    });
    
    const updateCompareHub = () => {
        const p1Id = select1.value;
        const p2Id = select2.value;
        
        const p1 = activeTeam.players.find(p => p.id === p1Id);
        const p2 = activeTeam.players.find(p => p.id === p2Id);
        
        renderCompareHubCard(p1, "hub-p1-card", true);
        renderCompareHubCard(p2, "hub-p2-card", false);
        
        renderCompareHubBars(p1, p2);
        drawComparisonRadar(p1, p2);
    };
    
    select1.onchange = updateCompareHub;
    select2.onchange = updateCompareHub;
    
    updateCompareHub();
}

export function renderCompareHubCard(player, cardId, isP1) {
    const card = document.getElementById(cardId);
    if (!card) return;
    if (!player) {
        card.style.display = "none";
        return;
    }
    card.style.display = "flex";
    const rating = calculateWeightedRating(player.primaryPosition, player.attributes);
    const color = getAttributeColor(rating);
    const starCount = player.currentAbility || 3;
    const stars = "⭐".repeat(starCount);
    
    const avatarHtml = player.photo 
        ? `<img src="${player.photo}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid ${isP1 ? 'var(--accent-color)' : '#5dade2'};">`
        : `<div style="width: 70px; height: 70px; border-radius: 50%; background: var(--bg-dark); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 2px solid ${isP1 ? 'var(--accent-color)' : '#5dade2'}; color: var(--text-muted);">👤</div>`;

    card.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center;">
            ${avatarHtml}
            <div>
                <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary); font-weight: 800;">${player.name}</h4>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                    ${player.primaryPosition} • ${player.age} Yaş • ${player.foot} Ayak
                </div>
                <div style="font-size: 0.85rem; margin-top: 4px;">${stars}</div>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 10px; font-size: 0.8rem;">
            <div><span style="color: var(--text-muted);">Genel Reyting:</span> <strong style="color: ${color}">${rating}</strong></div>
            <div><span style="color: var(--text-muted);">Mevki Rolü:</span> <strong>${player.squadRole}</strong></div>
            <div><span style="color: var(--text-muted);">Boy / Kilo:</span> <strong>${player.height || 175}cm / ${player.weight || 70}kg</strong></div>
            <div><span style="color: var(--text-muted);">Maç / Gol:</span> <strong>${player.matchesPlayed || 0} / ${player.goals || 0}</strong></div>
        </div>
    `;
}

export function renderCompareHubBars(p1, p2) {
    const listContainer = document.getElementById("hub-comparison-bars-list");
    const container = document.getElementById("hub-comparison-bars-container");
    if (!listContainer || !container) return;
    
    if (!p1 || !p2) {
        container.style.display = "none";
        return;
    }
    
    container.style.display = "flex";
    listContainer.innerHTML = "";
    
    const compareMetrics = [
        { label: "Genel Reyting", val1: calculateWeightedRating(p1.primaryPosition, p1.attributes), val2: calculateWeightedRating(p2.primaryPosition, p2.attributes) },
        { label: "Yaş", val1: p1.age, val2: p2.age, inverse: true },
        { label: "Boy (cm)", val1: p1.height || 175, val2: p2.height || 175 },
        { label: "Kilo (kg)", val1: p1.weight || 70, val2: p2.weight || 70 },
        { label: "Hız (Pace)", val1: p1.attributes.pace || 50, val2: p2.attributes.pace || 50 },
        { label: "Bitiricilik (Finish)", val1: p1.attributes.finishing || 50, val2: p2.attributes.finishing || 50 },
        { label: "Pas (Passing)", val1: p1.attributes.passing || 50, val2: p2.attributes.passing || 50 },
        { label: "Top Sürme (Dribble)", val1: p1.attributes.dribbling || 50, val2: p2.attributes.dribbling || 50 },
        { label: "Markaj (Marking)", val1: p1.attributes.marking || 50, val2: p2.attributes.marking || 50 },
        { label: "Vizyon (Vision)", val1: p1.attributes.vision || 50, val2: p2.attributes.vision || 50 },
        { label: "Kararlılık (Determin)", val1: p1.attributes.determination || 50, val2: p2.attributes.determination || 50 },
        { label: "Güç (Strength)", val1: p1.attributes.strength || 50, val2: p2.attributes.strength || 50 }
    ];

    compareMetrics.forEach(m => {
        const sum = m.val1 + m.val2;
        let p1Percent = 50;
        let p2Percent = 50;
        
        if (sum > 0) {
            p1Percent = (m.val1 / sum) * 100;
            p2Percent = (m.val2 / sum) * 100;
        }

        const isP1Better = m.inverse ? (m.val1 < m.val2) : (m.val1 > m.val2);
        const isP2Better = m.inverse ? (m.val2 < m.val1) : (m.val2 > m.val1);

        const row = document.createElement("div");
        row.className = "comp-row";
        row.innerHTML = `
            <div style="font-weight: 700; text-align: left; min-width: 30px; color: ${isP1Better ? 'var(--accent-color)' : 'var(--text-primary)'}">${m.val1}</div>
            <div style="flex: 1;">
                <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; margin-bottom: 4px; text-align: center;">${m.label}</div>
                <div class="comp-bar-container">
                    <div class="comp-bar-p1" style="width: ${p1Percent}%; background: var(--accent-color);"></div>
                    <div class="comp-bar-p2" style="width: ${p2Percent}%; background: #5dade2;"></div>
                </div>
            </div>
            <div style="font-weight: 700; text-align: right; min-width: 30px; color: ${isP2Better ? '#5dade2' : 'var(--text-primary)'}">${m.val2}</div>
        `;
        listContainer.appendChild(row);
    });
}

export function drawComparisonRadar(p1, p2) {
    const radarCard = document.getElementById("hub-comparison-radar-card");
    const svg = document.getElementById("hub-comparison-radar-chart");
    if (!radarCard || !svg) return;

    if (!p1 || !p2) {
        radarCard.style.display = "none";
        return;
    }
    radarCard.style.display = "flex";

    const calculatePoints = (data) => {
        const speedScore = Math.round(((data.pace || 50) + (data.acceleration || 50) + (data.agility || 50)) / 3);
        const techScore = Math.round(((data.dribbling || 50) + (data.passing || 50) + (data.crossing || 50)) / 3);
        const attackScore = Math.round(((data.finishing || 50) + (data.shooting || 50) + (data.heading || 50)) / 3);
        const defenseScore = Math.round(((data.marking || 50) + (data.positioning || 50) + (data.strength || 50)) / 3);
        const mentalScore = Math.round(((data.decision || 50) + (data.vision || 50) + (data.determination || 50) + (data.teamwork || 50)) / 4);
        
        const scores = [speedScore, techScore, attackScore, defenseScore, mentalScore];
        const center = 110;
        const maxRadius = 75;
        let points = [];
        
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
            const radius = maxRadius * (scores[i] / 100);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            points.push(`${Math.round(x)},${Math.round(y)}`);
        }
        return points.join(" ");
    };

    const center = 110;
    const maxRadius = 75;
    const labels = ["HIZ", "TEK", "HÜC", "DEF", "ZİH"];
    
    // Draw grid rings (background pentagons)
    let gridHtml = "";
    for (let r = 4; r >= 1; r--) {
        const radius = maxRadius * (r / 4);
        let pts = [];
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            pts.push(`${Math.round(x)},${Math.round(y)}`);
        }
        gridHtml += `<polygon points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"></polygon>`;
    }
    
    // Draw axes lines and labels
    let axesHtml = "";
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
        const xOuter = center + maxRadius * Math.cos(angle);
        const yOuter = center + maxRadius * Math.sin(angle);
        const labelRadius = maxRadius + 16;
        const xLabel = center + labelRadius * Math.cos(angle);
        const yLabel = center + labelRadius * Math.sin(angle) + 3;
        
        axesHtml += `
            <line x1="${center}" y1="${center}" x2="${Math.round(xOuter)}" y2="${Math.round(yOuter)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"></line>
            <text x="${Math.round(xLabel)}" y="${Math.round(yLabel)}" fill="var(--text-muted)" font-size="8.5" font-weight="bold" text-anchor="middle" font-family="Outfit">${labels[i]}</text>
        `;
    }

    const p1Points = calculatePoints(p1.attributes);
    const p2Points = calculatePoints(p2.attributes);

    svg.innerHTML = `
        <!-- Background Grid -->
        ${gridHtml}
        <!-- Axes -->
        ${axesHtml}
        <!-- Player 1 Polygon (Accent Green) -->
        <polygon points="${p1Points}" fill="rgba(0, 255, 136, 0.25)" stroke="var(--accent-color)" stroke-width="2" style="transition: all 0.5s;"></polygon>
        <!-- Player 2 Polygon (Light Blue) -->
        <polygon points="${p2Points}" fill="rgba(93, 173, 226, 0.25)" stroke="#5dade2" stroke-width="2" style="transition: all 0.5s;"></polygon>
        <!-- Center core -->
        <circle cx="${center}" cy="${center}" r="3" fill="#fff" opacity="0.3"></circle>
    `;
}

let calendarCurrentDate = new Date();
let _calendarInitialized = false;

export function initCalendarHub() {
    const prevBtn = document.getElementById("calendar-prev-btn");
    const nextBtn = document.getElementById("calendar-next-btn");
    
    if (prevBtn && !prevBtn._calBound) {
        prevBtn._calBound = true;
        prevBtn.onclick = () => {
            calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
            renderCalendar();
        };
    }
    if (nextBtn && !nextBtn._calBound) {
        nextBtn._calBound = true;
        nextBtn.onclick = () => {
            calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
            renderCalendar();
        };
    }

    // Auto-color when event type changes
    if (!_calendarInitialized) {
        _calendarInitialized = true;
        const typeSelect = document.getElementById("calendar-event-type");
        if (typeSelect) {
            typeSelect.addEventListener("change", () => {
                const selected = typeSelect.options[typeSelect.selectedIndex];
                const autoColor = selected.getAttribute("data-color");
                if (autoColor) {
                    const colorSel = document.getElementById("calendar-event-color");
                    if (colorSel) {
                        // Find and select matching option
                        for (const opt of colorSel.options) {
                            if (opt.value === autoColor) { opt.selected = true; break; }
                        }
                    }
                }
            });
        }
    }

    renderCalendar();
}

// ─── Expand recurring weekly events across a given month ─────────────────────
function expandRecurringEvents(baseEvents, year, month) {
    const expanded = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    baseEvents.forEach(evt => {
        if (evt.recurrence === "weekly" && evt.date) {
            // Add the original date
            const baseDate = new Date(evt.date);
            const cancelled = Array.isArray(evt.cancelled_dates) ? evt.cancelled_dates : [];

            // Generate all occurrences within the displayed month
            // Start from first day of this month, go day by day matching weekday
            const baseWeekday = baseDate.getDay(); // 0=Sun..6=Sat
            for (let d = 1; d <= daysInMonth; d++) {
                const candidate = new Date(year, month, d);
                if (candidate.getDay() === baseWeekday && candidate >= baseDate) {
                    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    if (!cancelled.includes(dateStr)) {
                        expanded.push({
                            ...evt,
                            date: dateStr,
                            _recurring: true,
                            _baseId: evt.id
                        });
                    }
                }
            }
        } else {
            // One-time event — include as-is
            const cancelled = Array.isArray(evt.cancelled_dates) ? evt.cancelled_dates : [];
            if (!cancelled.includes(evt.date)) {
                expanded.push(evt);
            }
        }
    });

    return expanded;
}

async function renderCalendar() {
    const gridDays = document.getElementById("calendar-grid-days");
    const monthYearHeader = document.getElementById("calendar-month-year");
    if (!gridDays || !monthYearHeader) return;
    
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    monthYearHeader.innerText = `${monthNames[month]} ${year}`;
    
    // Load all data sources
    let baseCalEvents = [];
    let allEvents = [];
    
    const calFilter = document.getElementById("calendar-team-filter");
    const targetTeamId = calFilter ? calFilter.value : "all";
    const isAllTeams = targetTeamId === "all";
    
    try {
        const [trainRes, matchRes, tournRes, calRes] = await Promise.all([
            fetch(`/api/training?team_id=${targetTeamId}`),
            fetch(`/api/matches?team_id=${targetTeamId}`),
            fetch(`/api/tournaments?team_id=${targetTeamId}`),
            fetch(`/api/calendar-events?team_id=${targetTeamId}`)
        ]);
        
        if (trainRes.ok) {
            const trainings = await trainRes.json();
            trainings.forEach(t => {
                const prefix = isAllTeams ? `[${t.team_name || "Tüm"}] ` : "";
                allEvents.push({ date: t.date, type: "training", title: `🏋️ ${prefix}${t.title}`, color: t.color || "#00ff88", time: t.start_time, sourceId: t.id });
            });
        }
        if (matchRes.ok) {
            const matches = await matchRes.json();
            matches.forEach(m => {
                const score = (m.our_score !== null && m.opponent_score !== null) ? ` (${m.our_score}-${m.opponent_score})` : '';
                const prefix = isAllTeams ? `[${m.team_name || "Tüm"}] ` : "";
                allEvents.push({ date: m.date, type: "match", title: `⚽ ${prefix}vs ${m.opponent}${score}`, color: "#ff453a", time: m.time || "17:00", sourceId: m.id });
            });
        }
        if (tournRes.ok) {
            const tournaments = await tournRes.json();
            tournaments.forEach(t => {
                const prefix = isAllTeams ? `[${t.team_name || "Tüm"}] ` : "";
                allEvents.push({ date: t.start_date, type: "tournament", title: `🏆 ${prefix}${t.name}`, color: "#ffd60a", time: "09:00", sourceId: t.id });
            });
        }
        if (calRes && calRes.ok) {
            baseCalEvents = await calRes.json();
            // Expand recurring events for this month
            const expanded = expandRecurringEvents(baseCalEvents, year, month);
            expanded.forEach(e => {
                const prefix = isAllTeams ? `[${e.team_name || "Tüm"}] ` : "";
                allEvents.push({ 
                    date: e.date, 
                    type: "custom", 
                    title: `${prefix}${e.title}`, 
                    color: e.color || "#4facfe", 
                    time: e.time,
                    id: e.id,
                    event_type: e.event_type,
                    description: e.description,
                    recurrence: e.recurrence,
                    _recurring: e._recurring,
                    _baseId: e._baseId
                });
            });
        }
    } catch (e) {
        console.error("Takvim verileri yüklenirken hata oluştu", e);
    }
    gridDays.innerHTML = "";
    
    let firstDayIndex = new Date(year, month, 1).getDay() - 1;
    if (firstDayIndex < 0) firstDayIndex = 6;
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    for (let i = firstDayIndex; i > 0; i--) {
        const dayVal = prevMonthTotalDays - i + 1;
        const cell = document.createElement("div");
        cell.style.cssText = "background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); border-radius: var(--border-radius); padding: 8px; min-height: 70px; color: var(--text-muted); opacity: 0.3; font-size: 0.75rem; text-align: left;";
        cell.innerHTML = `<div>${dayVal}</div>`;
        gridDays.appendChild(cell);
    }
    
    const todayStr = new Date().toISOString().split("T")[0];
    
    for (let day = 1; day <= totalDays; day++) {
        const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = cellDateStr === todayStr;
        
        const cell = document.createElement("div");
        let borderStyle = isToday ? "border: 2px solid var(--accent-color);" : "border: 1px solid var(--border-color);";
        let bgStyle = isToday ? "background: rgba(0, 255, 136, 0.03);" : "background: rgba(255, 255, 255, 0.02);";
        
        cell.style.cssText = `${bgStyle} ${borderStyle} border-radius: var(--border-radius); padding: 8px; min-height: 70px; font-size: 0.75rem; text-align: left; display: flex; flex-direction: column; gap: 4px; transition: transform 0.2s, background 0.2s; cursor: pointer;`;
        
        cell.onmouseover = () => {
            cell.style.transform = "translateY(-2px)";
            cell.style.background = "rgba(255,255,255,0.04)";
        };
        cell.onmouseout = () => {
            cell.style.transform = "translateY(0)";
            cell.style.background = isToday ? "rgba(0, 255, 136, 0.03)" : "rgba(255, 255, 255, 0.02)";
        };
        
        const dayNumberHtml = `<div style="font-weight: bold; color: ${isToday ? 'var(--accent-color)' : 'var(--text-secondary)'}; font-size: 0.8rem;">${day}</div>`;
        cell.innerHTML = dayNumberHtml;
        
        const dayEvents = allEvents.filter(e => e.date === cellDateStr);
        if (dayEvents.length > 0) {
            const listContainer = document.createElement("div");
            listContainer.style.cssText = "display: flex; flex-direction: column; gap: 3px; margin-top: 4px; overflow: hidden;";
            
            dayEvents.forEach(evt => {
                const badge = document.createElement("div");
                badge.style.cssText = `background: ${evt.color}15; color: ${evt.color}; border: 1px solid ${evt.color}30; font-size: 0.62rem; font-weight: 700; padding: 2px 4px; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;`;
                const recurIcon = evt._recurring ? "🔁 " : "";
                badge.innerText = `${evt.time ? evt.time.substring(0, 5) + ' ' : ''}${recurIcon}${evt.title}`;
                badge.title = `${evt.title}${evt.description ? '\n' + evt.description : ''}${evt._recurring ? '\n(Haftalık Rutin)' : ''} (${evt.time || 'Tüm Gün'})`;
                
                // Double clicking a badge directly opens the edit view for that specific custom event
                badge.ondblclick = (e) => {
                    e.stopPropagation();
                    if (evt.type === "custom") {
                        openDayPlansModal(cellDateStr, true, evt.id);
                    } else {
                        openDayPlansModal(cellDateStr, false);
                    }
                };
                
                listContainer.appendChild(badge);
            });
            cell.appendChild(listContainer);
        }
        
        // Use timeout to separate single click from double click
        let clickTimeout = null;
        cell.onclick = (e) => {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
                openDayPlansModal(cellDateStr, true);
            } else {
                clickTimeout = setTimeout(() => {
                    openDayPlansModal(cellDateStr, false);
                    clickTimeout = null;
                }, 250);
            }
        };
        
        gridDays.appendChild(cell);
    }
}

export async function openDayPlansModal(dateStr, autoEdit = false, targetEventId = null) {
    document.getElementById("calendar-event-date-hidden").value = dateStr;
    
    const formattedDate = dateStr.split("-").reverse().join("/");
    document.getElementById("modal-day-plans-title").innerText = `📅 ${formattedDate} Planları`;
    
    // Reset form to "add new" mode
    resetCalendarForm(dateStr);
    
    const dayEvents = await renderDayPlansList(dateStr);
    openModal("modal-day-plans");

    if (autoEdit) {
        // Find targeted event or first custom event on that day
        const activeId = targetEventId || (dayEvents.find(e => e.type === "custom") || {}).id;
        if (activeId) {
            try {
                const res = await fetch(`/api/calendar-events?team_id=${state.activeTeamId}`);
                if (res.ok) {
                    const rawCalEvents = await res.json();
                    const rawEvt = rawCalEvents.find(re => re.id === activeId);
                    if (rawEvt) {
                        window.editCalendarEvent(rawEvt);
                        const titleInput = document.getElementById("calendar-event-title");
                        if (titleInput) {
                            setTimeout(() => {
                                titleInput.scrollIntoView({ behavior: "smooth", block: "center" });
                                titleInput.focus();
                            }, 100);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch raw events for editing", err);
            }
        } else {
            const titleInput = document.getElementById("calendar-event-title");
            if (titleInput) {
                setTimeout(() => {
                    titleInput.focus();
                }, 150);
            }
        }
    }
}

function resetCalendarForm(dateStr) {
    document.getElementById("calendar-event-edit-id").value = "";
    document.getElementById("calendar-event-title").value = "";
    document.getElementById("calendar-event-description").value = "";
    document.getElementById("calendar-event-time").value = "16:00";
    document.getElementById("calendar-event-type").value = "Özel";
    document.getElementById("calendar-event-color").value = "#4facfe";
    document.getElementById("calendar-event-recurrence").value = "none";
    document.getElementById("btn-save-calendar-event").innerText = "✅ Takvime Ekle";
    document.getElementById("cal-form-title").innerText = "Yeni Plan Ekle";
    document.getElementById("btn-cal-cancel-edit").style.display = "none";
}

window.cancelCalendarEdit = function() {
    const dateStr = document.getElementById("calendar-event-date-hidden").value;
    resetCalendarForm(dateStr);
};

window.editCalendarEvent = function(evt) {
    document.getElementById("calendar-event-edit-id").value = evt.id;
    document.getElementById("calendar-event-title").value = evt.title;
    document.getElementById("calendar-event-description").value = evt.description || "";
    document.getElementById("calendar-event-time").value = evt.time || "16:00";
    document.getElementById("calendar-event-type").value = evt.event_type || "Özel";
    document.getElementById("calendar-event-color").value = evt.color || "#4facfe";
    document.getElementById("calendar-event-recurrence").value = evt.recurrence || "none";
    document.getElementById("btn-save-calendar-event").innerText = "💾 Değişiklikleri Kaydet";
    document.getElementById("cal-form-title").innerText = "Planı Düzenle";
    document.getElementById("btn-cal-cancel-edit").style.display = "inline-block";
};

export async function renderDayPlansList(dateStr) {
    const listContainer = document.getElementById("modal-day-plans-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 10px;">Yükleniyor...</div>`;
    
    let dayEvents = [];
    let rawCalEvents = [];
    
    try {
        const [trainRes, matchRes, tournRes, calRes] = await Promise.all([
            fetch(`/api/training?team_id=${state.activeTeamId}`),
            fetch(`/api/matches?team_id=${state.activeTeamId}`),
            fetch(`/api/tournaments?team_id=${state.activeTeamId}`),
            fetch(`/api/calendar-events?team_id=${state.activeTeamId}`)
        ]);
        
        if (trainRes.ok) {
            const trainings = await trainRes.json();
            trainings.filter(t => t.date === dateStr).forEach(t => {
                dayEvents.push({ type: "training", label: "Antrenman", title: t.title, color: t.color || "#00ff88", time: t.start_time, description: t.notes || "", icon: "🏋️" });
            });
        }
        if (matchRes.ok) {
            const matches = await matchRes.json();
            matches.filter(m => m.date === dateStr).forEach(m => {
                const score = (m.our_score !== null && m.opponent_score !== null) ? ` (${m.our_score}-${m.opponent_score})` : '';
                dayEvents.push({ type: "match", label: "Maç", title: `vs ${m.opponent}${score}`, color: "#ff453a", time: m.time || "17:00", description: "", icon: "⚽" });
            });
        }
        if (tournRes.ok) {
            const tournaments = await tournRes.json();
            tournaments.filter(t => t.start_date === dateStr).forEach(t => {
                dayEvents.push({ type: "tournament", label: "Turnuva", title: t.name, color: "#ffd60a", time: "09:00", description: t.notes || "", icon: "🏆" });
            });
        }
        if (calRes.ok) {
            rawCalEvents = await calRes.json();
            // Expand to include recurring events on this date
            const expanded = expandRecurringEvents(rawCalEvents, 
                parseInt(dateStr.split("-")[0]), 
                parseInt(dateStr.split("-")[1]) - 1
            );
            expanded.filter(e => e.date === dateStr).forEach(e => {
                dayEvents.push({ 
                    id: e.id, 
                    type: "custom", 
                    label: e.event_type || "Özel",
                    title: e.title, 
                    color: e.color || "#4facfe", 
                    time: e.time,
                    description: e.description || "",
                    icon: getEventIcon(e.event_type),
                    recurrence: e.recurrence,
                    _recurring: e._recurring,
                    event_type: e.event_type
                });
            });
        }
    } catch(e) {
        console.error("Failed to load events for day", e);
    }
    
    if (dayEvents.length === 0) {
        listContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 15px; font-style: italic;">Bu gün için planlanmış aktivite bulunmuyor.</div>`;
        return [];
    }
    
    listContainer.innerHTML = "";
    dayEvents.forEach(evt => {
        const item = document.createElement("div");
        item.style.cssText = `background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: var(--border-radius); border-left: 3px solid ${evt.color}; display: flex; flex-direction: column; gap: 4px;`;
        
        // Action buttons for custom events
        let actionButtons = "";
        if (evt.type === "custom") {
            const cancelBtn = evt.recurrence === "weekly" 
                ? `<button class="btn-cancel-occurrence" data-id="${evt.id}" data-date="${dateStr}" style="background: none; border: 1px solid rgba(255,165,0,0.4); color: #ff9500; cursor: pointer; font-size: 0.68rem; padding: 2px 6px; border-radius: 3px; white-space: nowrap;">Bu seferlik iptal</button>`
                : "";
            actionButtons = `
                <div style="display: flex; gap: 5px; align-items: center; flex-wrap: wrap; margin-top: 3px;">
                    <button class="btn-edit-event" data-id="${evt.id}" style="background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.2); color: var(--accent-color); cursor: pointer; font-size: 0.68rem; padding: 2px 6px; border-radius: 3px;">✏️ Düzenle</button>
                    ${cancelBtn}
                    <button class="btn-delete-event" data-id="${evt.id}" style="background: none; border: 1px solid rgba(255,59,48,0.3); color: var(--attr-poor); cursor: pointer; font-size: 0.68rem; padding: 2px 6px; border-radius: 3px;">🗑️ Sil</button>
                </div>
            `;
        }

        const recurBadge = evt._recurring 
            ? `<span style="font-size: 0.6rem; background: rgba(255,255,255,0.05); color: var(--text-muted); padding: 1px 5px; border-radius: 3px; margin-left: 4px;">🔁 Haftalık</span>`
            : "";
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                        <span style="font-weight: bold; color: ${evt.color}; font-size: 0.7rem;">${evt.icon} ${evt.label.toUpperCase()}</span>
                        <span style="font-size: 0.68rem; color: var(--text-muted);">[${evt.time ? evt.time.substring(0, 5) : 'Tüm Gün'}]</span>
                        ${recurBadge}
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-primary); font-weight: 600; margin-top: 2px;">${evt.title}</div>
                    ${evt.description ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; font-style: italic;">${evt.description}</div>` : ""}
                </div>
            </div>
            ${actionButtons}
        `;
        
        // Wire up buttons for custom events
        if (evt.type === "custom") {
            const editBtn = item.querySelector(".btn-edit-event");
            if (editBtn) {
                editBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    // Find the raw event to populate form
                    const rawEvt = rawCalEvents.find(re => re.id === evt.id);
                    if (rawEvt) {
                        window.editCalendarEvent(rawEvt);
                        // Scroll to form
                        document.getElementById("calendar-event-title").scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                });
            }
            
            const cancelOccBtn = item.querySelector(".btn-cancel-occurrence");
            if (cancelOccBtn) {
                cancelOccBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (confirm(`${dateStr.split("-").reverse().join("/")} tarihindeki tekrarı iptal etmek istiyor musunuz?`)) {
                        const { cancelCalendarOccurrenceAction } = await import("./api_calendar.js");
                        const ok = await cancelCalendarOccurrenceAction(evt.id, dateStr);
                        if (ok) {
                            const { showToast } = await import("./utils.js");
                            showToast("Bu tekrar iptal edildi.", "success");
                            renderDayPlansList(dateStr);
                            renderCalendar();
                        }
                    }
                });
            }
            
            const deleteBtn = item.querySelector(".btn-delete-event");
            if (deleteBtn) {
                deleteBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const msg = evt.recurrence === "weekly" 
                        ? "Bu haftalık planı tamamen silmek istiyor musunuz? Tüm gelecek tekrarlar da silinecek." 
                        : "Bu planı silmek istediğinize emin misiniz?";
                    if (confirm(msg)) {
                        const { deleteCalendarEventAction } = await import("./api_calendar.js");
                        const ok = await deleteCalendarEventAction(evt.id);
                        if (ok) {
                            const { showToast } = await import("./utils.js");
                            showToast("Plan silindi.", "success");
                            renderDayPlansList(dateStr);
                            renderCalendar();
                        } else {
                            const { showToast } = await import("./utils.js");
                            showToast("Plan silinemedi.", "error");
                        }
                    }
                });
            }
        }
        
        listContainer.appendChild(item);
    });
    return dayEvents;
}

function getEventIcon(eventType) {
    const map = {
        "Antrenman": "🏋️", "Maç": "⚽", "Toplantı": "👥",
        "Veli Görüşmesi": "👨‍👩‍👧", "Turnuva": "🏆",
        "Sağlık Kontrolü": "🏥", "Tatil / İzin": "🏖️", "Özel": "📌"
    };
    return map[eventType] || "📌";
}

export async function handleSaveCalendarEventSubmit() {
    const dateStr = document.getElementById("calendar-event-date-hidden").value;
    const title = document.getElementById("calendar-event-title").value.trim();
    const time = document.getElementById("calendar-event-time").value;
    const color = document.getElementById("calendar-event-color").value;
    const eventType = document.getElementById("calendar-event-type").value;
    const description = document.getElementById("calendar-event-description").value.trim();
    const recurrence = document.getElementById("calendar-event-recurrence").value;
    const editId = document.getElementById("calendar-event-edit-id").value;
    
    if (!title) {
        const { showToast } = await import("./utils.js");
        showToast("Lütfen plan başlığı yazın.", "error");
        return;
    }
    
    const { showToast } = await import("./utils.js");

    // UPDATE existing event
    if (editId) {
        const { updateCalendarEventAction } = await import("./api_calendar.js");
        const res = await updateCalendarEventAction({
            id: editId, title, time, color, event_type: eventType, description, recurrence
        });
        if (res.success) {
            showToast("Plan güncellendi.", "success");
            resetCalendarForm(dateStr);
            await renderDayPlansList(dateStr);
            renderCalendar();
        } else {
            showToast("Güncelleme sırasında hata oluştu.", "error");
        }
        return;
    }
    
    // CREATE new event
    const eventData = {
        team_id: state.activeTeamId,
        title,
        date: dateStr,
        time,
        color,
        event_type: eventType,
        description,
        recurrence
    };
    
    const { saveCalendarEventAction } = await import("./api_calendar.js");
    const res = await saveCalendarEventAction(eventData);
    
    if (res.success) {
        // Cross-module sync: If event type is Antrenman, also add to training module
        if (eventType === "Antrenman") {
            try {
                const tsId = `ts-cal-${res.id}`;
                await fetch("/api/training", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: tsId,
                        team_id: state.activeTeamId,
                        title,
                        date: dateStr,
                        start_time: time,
                        end_time: "",
                        location: "",
                        notes: description,
                        color
                    })
                });
            } catch(e) { console.warn("Antrenman sync failed", e); }
        }
        
        showToast("Plan başarıyla eklendi.", "success");
        resetCalendarForm(dateStr);
        await renderDayPlansList(dateStr);
        renderCalendar();
    } else {
        showToast("Plan eklenirken hata oluştu.", "error");
    }
}
window.handleDashboardTeamFilterChange = function(val) {
    populateDashboard();
};

window.handleCalendarTeamFilterChange = function(val) {
    renderCalendar();
};
