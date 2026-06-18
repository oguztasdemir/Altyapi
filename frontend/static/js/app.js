import { state } from "./modules/state.js";
import { 
    loadData, handleCreateTeam, handleUpdateTeamName, 
    deleteTeam, deletePlayer, handleCreatePlayer, 
    handleCreateCoach, deleteCoach, loadAttendanceData, 
    loadAttendanceAnalysis, handleSaveAttendance, handleFeeStatusChange, 
    handleSaveInjurySubmit, handleResolveInjury, handleDeleteInjury,
    saveExpenseAction, saveKitAction
} from "./modules/api.js";
import { 
    openModal, closeModal, switchTab, 
    renderPlayersList, openPlayerComparison, 
    handleComparisonSelect, handleAdminSaveSettings,
    handleEditPlayerClick, handleAddInjuryClick, 
    handlePhotoUpload, updateAdminUI, selectTeam, 
    selectAttendancePill, resetPlayerForm, handleArchiveTeamToggle,
    openAddMatchModal, handleSaveMatchSubmit, handleDeleteMatch, switchDetailTab,
    selectPlayer, renderTacticalPitch,
    openAddExpenseModal, handleEditExpenseClick, handleDeleteExpense,
    openAddKitModal, handleEditKitClick, handleDeleteKit,
    saveInlineEdit, cancelInlineEdit, setupPitchPickerListeners,
    openAddSeasonModal, openAddTransferModal, populateParentContacts,
    handleSaveCalendarEventSubmit
} from "./modules/ui.js";
import { loadRatingHistory } from "./modules/charts.js";
import { showToast } from "./modules/utils.js";
import { initPanelDragAndDrop } from "./modules/drag.js";
import {
    openPlayerAddGoalModal, handleSaveGoalSubmit,
    openPlayerAddEvaluationModal, handleSaveEvaluationSubmit,
    openPlayerAddAchievementModal, handleSaveAchievementSubmit,
    initPlayerPrint
} from "./modules/player.js";
import { openAddTrainingModal, handleSaveTrainingSubmit, navigateWeek } from "./modules/training.js";
import { openAddTournamentModal, handleSaveTournamentSubmit } from "./modules/tournaments.js";
import { openAddAnnouncementModal, handleSaveAnnouncementSubmit, setSubTab, copyTemplateToClipboard } from "./modules/announcements.js";
import { initTacticsDraw } from "./modules/tactics_draw.js";
import { initNotifications } from "./modules/notifications.js";
import { handleCreateManualBackup } from "./modules/admin.js";
import { openPlayerReport, printPlayerReport } from "./modules/report.js";
import { initGlobalSearch, initKeyboardShortcuts, loadAndRenderAuditLog, loadFinanceKPI, loadTrainingLoad } from "./modules/extras.js";

// Bind functions to window object for inline HTML event handlers
window.switchTab = switchTab;
window.printPlayerReport = printPlayerReport;
window.showToast = showToast;
window.closeModal = closeModal;
window.deleteTeam = deleteTeam;
window.deletePlayer = deletePlayer;
window.deleteCoach = deleteCoach;
window.selectAttendancePill = selectAttendancePill;
window.handleResolveInjury = handleResolveInjury;
window.handleDeleteInjury = handleDeleteInjury;
window.handleDeleteMatch = handleDeleteMatch;
window.handleEditExpenseClick = handleEditExpenseClick;
window.handleDeleteExpense = handleDeleteExpense;
window.handleEditKitClick = handleEditKitClick;
window.handleDeleteKit = handleDeleteKit;
window.openAddSeasonModal = openAddSeasonModal;
window.openAddTransferModal = openAddTransferModal;
window.deleteSeason = async (id) => {
    const { deleteSeasonAction } = await import("./modules/api.js");
    await deleteSeasonAction(id);
};
window.deleteTransfer = async (id) => {
    const { deleteTransferAction } = await import("./modules/api.js");
    await deleteTransferAction(id);
};
window.activateSeason = async (id) => {
    const { activateSeasonAction } = await import("./modules/api.js");
    await activateSeasonAction(id, state.activeTeamId);
};
window.printContactCard = (playerId) => {
    // Generate simple contact printable
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    const player = activeTeam.players.find(p => p.id === playerId);
    if (!player) return;
    
    const printWin = window.open("", "_blank");
    printWin.document.write(`
        <html>
        <head>
            <title>Acil Durum İletişim Kartı - ${player.name}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #000; padding: 40px; }
                .card { border: 3px double #333; padding: 25px; max-width: 450px; border-radius: 8px; margin: auto; }
                h2 { margin-top: 0; border-bottom: 2px solid #333; padding-bottom: 8px; color: #111; }
                p { margin: 10px 0; font-size: 1.1rem; }
                strong { display: inline-block; width: 140px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="card">
                <h2>🚨 ACİL DURUM İLETİŞİM KARTI</h2>
                <p><strong>Futbolcu:</strong> ${player.name}</p>
                <p><strong>Takım:</strong> ${activeTeam.name}</p>
                <p><strong>Veli Adı Soyadı:</strong> ${player.parentName || '-'}</p>
                <p><strong>Veli Telefon:</strong> ${player.parentPhone || '-'}</p>
                <p><strong>Kan Grubu:</strong> ${player.bloodType || 'Bilinmiyor'}</p>
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
};

function initThemeSwitcher() {
    const savedColor = localStorage.getItem("club-theme-color") || "#00ff88";
    
    const applyTheme = (color) => {
        document.documentElement.style.setProperty('--accent-color', color);
        let hoverColor = color;
        if (color === '#00ff88') hoverColor = '#00e577';
        else if (color === '#24a0ed') hoverColor = '#1a8ad6';
        else if (color === '#e74c3c') hoverColor = '#d63b2a';
        else if (color === '#ffd60a') hoverColor = '#e6c000';
        else if (color === '#af7ac5') hoverColor = '#9b59b6';
        document.documentElement.style.setProperty('--accent-hover', hoverColor);
        
        document.querySelectorAll(".theme-dot").forEach(dot => {
            if (dot.getAttribute("data-color") === color) {
                dot.style.border = "2px solid #fff";
                dot.style.boxShadow = `0 0 8px ${color}`;
            } else {
                dot.style.border = "1px solid rgba(255,255,255,0.2)";
                dot.style.boxShadow = "none";
            }
        });
    };
    
    document.querySelectorAll(".theme-dot").forEach(dot => {
        dot.addEventListener("click", () => {
            const color = dot.getAttribute("data-color");
            localStorage.setItem("club-theme-color", color);
            applyTheme(color);
            showToast("Kulüp renk teması güncellendi.", "success");
        });
    });
    
    applyTheme(savedColor);
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    state.isAdminLoggedIn = true;
    updateAdminUI();
    
    let initialTab = "nav-dashboard";
    if (window.location.hash) {
        initialTab = window.location.hash.substring(1).split("?")[0];
    } else {
        const savedTab = localStorage.getItem("fm_active_tab");
        if (savedTab) {
            initialTab = savedTab;
        }
    }
    
    loadData().then(() => {
        switchTab(initialTab);
    });

    window.addEventListener("hashchange", () => {
        const hashTab = window.location.hash.substring(1).split("?")[0];
        if (hashTab && state.activeTab !== hashTab) {
            switchTab(hashTab);
        }
    });
    
    initPanelDragAndDrop();
    setupEventListeners();
    setupPitchPickerListeners();
    initTacticsDraw();
    initNotifications();
    initPlayerPrint();

    initGlobalSearch();
    initKeyboardShortcuts();

    initThemeSwitcher();

    // Close modals by clicking outside (on overlay backdrop)
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            closeModal(e.target.id);
        }
    });

    // Close modals on Escape key press
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const activeModal = document.querySelector(".modal-overlay.active");
            if (activeModal) {
                closeModal(activeModal.id);
            }
        }
    });
});

// Setup Event Listeners
function setupEventListeners() {
    // Nav Items
    document.getElementById("nav-dashboard").addEventListener("click", () => switchTab("nav-dashboard"));
    document.getElementById("nav-teams").addEventListener("click", () => switchTab("nav-teams"));
    document.getElementById("nav-finance").addEventListener("click", () => { switchTab("nav-finance"); if(state.activeTeamId) loadFinanceKPI(state.activeTeamId); });
    document.getElementById("nav-management").addEventListener("click", () => switchTab("nav-management"));
    document.getElementById("nav-admin").addEventListener("click", () => { switchTab("nav-admin"); if(state.isAdminLoggedIn) { loadAndRenderAuditLog(); } });
    document.getElementById("nav-matches").addEventListener("click", () => switchTab("nav-matches"));
    document.getElementById("nav-training").addEventListener("click", () => { switchTab("nav-training"); if(state.activeTeamId) loadTrainingLoad(state.activeTeamId); });
    document.getElementById("nav-tournaments").addEventListener("click", () => switchTab("nav-tournaments"));
    document.getElementById("nav-announcements").addEventListener("click", () => switchTab("nav-announcements"));
    const navTactics = document.getElementById("nav-tactics");
    if (navTactics) {
        navTactics.addEventListener("click", () => switchTab("nav-tactics"));
    }
    const navCompareHub = document.getElementById("nav-compare-hub");
    if (navCompareHub) {
        navCompareHub.addEventListener("click", () => switchTab("nav-compare-hub"));
    }
    const navCalendar = document.getElementById("nav-calendar");
    if (navCalendar) {
        navCalendar.addEventListener("click", () => switchTab("nav-calendar"));
    }

    // Finance Sub-tab bindings
    document.querySelectorAll(".tab-finance-fees-btn").forEach(btn => {
        btn.addEventListener("click", () => switchTab("nav-finance"));
    });
    document.querySelectorAll(".tab-finance-expenses-btn").forEach(btn => {
        btn.addEventListener("click", () => switchTab("nav-expenses"));
    });
    document.querySelectorAll(".tab-finance-incomes-btn").forEach(btn => {
        btn.addEventListener("click", () => switchTab("nav-incomes"));
    });
    document.querySelectorAll(".tab-finance-kits-btn").forEach(btn => {
        btn.addEventListener("click", () => switchTab("nav-kits"));
    });
    document.querySelectorAll(".tab-finance-analysis-btn").forEach(btn => {
        btn.addEventListener("click", () => switchTab("nav-finance-analysis"));
    });

    // Team Actions
    const btnSaveTeam = document.getElementById("btn-save-team");
    if (btnSaveTeam) btnSaveTeam.addEventListener("click", handleCreateTeam);
    const btnUpdateTeamName = document.getElementById("btn-update-team-name");
    if (btnUpdateTeamName) btnUpdateTeamName.addEventListener("click", handleUpdateTeamName);
    const btnArchiveTeam = document.getElementById("btn-archive-team");
    if (btnArchiveTeam) btnArchiveTeam.addEventListener("click", handleArchiveTeamToggle);
    
    const showArchivedTeams = document.getElementById("show-archived-teams");
    if (showArchivedTeams) showArchivedTeams.addEventListener("change", loadData);

    // Sidebar Team Selector & Action Events
    const sidebarTeamSelect = document.getElementById("sidebar-team-select");
    if (sidebarTeamSelect) {
        sidebarTeamSelect.addEventListener("change", (e) => {
            selectTeam(e.target.value);
        });
    }

    const sidebarBtnNewTeam = document.getElementById("sidebar-btn-new-team");
    if (sidebarBtnNewTeam) {
        sidebarBtnNewTeam.addEventListener("click", () => {
            openModal("modal-new-team");
        });
    }

    const btnSaveCalEvent = document.getElementById("btn-save-calendar-event");
    if (btnSaveCalEvent) {
        btnSaveCalEvent.addEventListener("click", handleSaveCalendarEventSubmit);
    }

    // Player Actions
    const btnBackToTeams = document.getElementById("btn-back-to-teams");
    if (btnBackToTeams) {
        btnBackToTeams.addEventListener("click", () => {
            selectTeam(null);
        });
    }

    document.getElementById("btn-add-player").addEventListener("click", () => {
        state.currentUploadedPhoto = null;
        resetPlayerForm();
        openModal("modal-add-player");
    });
    document.getElementById("btn-save-player").addEventListener("click", handleCreatePlayer);

    // CSV Import / Export Handlers
    document.getElementById("btn-export-csv").addEventListener("click", () => {
        if (!state.activeTeamId) {
            showToast("Lütfen önce bir takım seçin.", "error");
            return;
        }
        window.location.href = `/api/players/export?team_id=${state.activeTeamId}`;
    });

    document.getElementById("btn-template-csv").addEventListener("click", () => {
        const headers = "name,age,nationality,foot,primaryPosition,squadRole,height,weight,injuryStatus,coachNotes,matchesPlayed,goals,assists,yellowCards,redCards,matchRating,parentName,parentPhone,feeStatus,currentAbility,potentialAbility,pace,acceleration,agility,finishing,shooting,passing,dribbling,crossing,marking,positioning,heading,stamina,strength,vision,decision,determination,teamwork\n";
        const sampleRow = "Ahmet Yilmaz,17,Turkiye,Sag,ST,Rotasyon,180,72,Saglikli,Gelecegi parlak oyuncu,3,1,0,0,0,6.5,Mehmet Yilmaz,5551234567,Odedi,3,5,65,70,62,68,60,55,62,50,40,65,58,60,55,50,60,70,65\n";
        const blob = new Blob([headers + sampleRow], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "altyapi_oyuncu_sablon.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("CSV Şablonu indirildi.", "success");
    });

    const fileInput = document.getElementById("csv-file-input");
    document.getElementById("btn-import-csv").addEventListener("click", () => {
        if (!state.activeTeamId) {
            showToast("Lütfen önce bir takım seçin.", "error");
            return;
        }
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const csvText = evt.target.result;
            try {
                const res = await fetch("/api/players/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        team_id: state.activeTeamId,
                        csv: csvText
                    })
                });
                if (res.ok) {
                    const resData = await res.json();
                    showToast(`${resData.imported} oyuncu başarıyla içe aktarıldı.`, "success");
                    loadData();
                } else {
                    showToast("Dosya aktarılırken hata oluştu.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Bağlantı hatası.", "error");
            }
        };
        reader.readAsText(file, "UTF-8");
        fileInput.value = "";
    });

    // Coach Actions
    document.getElementById("btn-add-coach").addEventListener("click", () => openModal("modal-add-coach"));
    document.getElementById("btn-save-coach").addEventListener("click", handleCreateCoach);

    // Avatar upload triggers
    const modalAvatarBox = document.getElementById("modal-avatar-box");
    const photoInput = document.getElementById("player-photo-input");
    modalAvatarBox.addEventListener("click", () => photoInput.click());
    photoInput.addEventListener("change", handlePhotoUpload);

    // Search & Filter Events
    document.getElementById("player-search").addEventListener("input", (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderPlayersList();
    });
    document.getElementById("player-filter-pos").addEventListener("change", (e) => {
        state.filterPosition = e.target.value;
        renderPlayersList();
    });
    document.getElementById("player-sort-by").addEventListener("change", (e) => {
        state.sortBy = e.target.value;
        renderPlayersList();
    });

    // Print Button
    document.getElementById("btn-print-scout").addEventListener("click", () => {
        document.body.classList.add("print-scout-report");
        window.print();
        const cleanup = () => {
            document.body.classList.remove("print-scout-report");
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        setTimeout(cleanup, 1000);
    });

    // Compare button trigger
    document.getElementById("btn-compare-player").addEventListener("click", openPlayerComparison);
    document.getElementById("comp-player-2-select").addEventListener("change", handleComparisonSelect);

    // Admin Panel Actions
    document.getElementById("admin-setting-fee")?.addEventListener("change", handleAdminSaveSettings);
    document.getElementById("btn-create-manual-backup").addEventListener("click", handleCreateManualBackup);
    document.getElementById("btn-refresh-audit-log")?.addEventListener("click", loadAndRenderAuditLog);
    document.getElementById("btn-view-player-report")?.addEventListener("click", () => {
        if (state.selectedPlayerId || state.activePlayerId) openPlayerReport(state.selectedPlayerId || state.activePlayerId);
        else showToast("Önce bir oyuncu seçin.", "warning");
    });
    
    // Fee status change listener for direct toggle
    document.getElementById("detail-fee-status").addEventListener("change", handleFeeStatusChange);

    // Edit player button listener
    document.getElementById("btn-edit-player").addEventListener("click", handleEditPlayerClick);
    document.getElementById("btn-save-profile").addEventListener("click", saveInlineEdit);
    document.getElementById("btn-cancel-profile").addEventListener("click", cancelInlineEdit);

    // Attendance Events
    document.getElementById("nav-attendance").addEventListener("click", () => switchTab("nav-attendance"));
    document.getElementById("nav-finance").addEventListener("click", () => switchTab("nav-finance"));
    const btnAddDate = document.getElementById("btn-add-attendance-date");
    if (btnAddDate) {
        btnAddDate.addEventListener("click", async () => {
            const dateInput = document.getElementById("new-attendance-date");
            if (!dateInput || !dateInput.value) return;
            const chosenDate = dateInput.value;
            
            const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
            if (!activeTeam || activeTeam.players.length === 0) {
                showToast("Takımda oyuncu yok.", "error");
                return;
            }
            
            const initialRecords = activeTeam.players.map(p => ({
                player_id: p.id,
                date: chosenDate,
                status: "Katıldı"
            }));
            
            try {
                const res = await fetch("/api/attendance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(initialRecords)
                });
                if (res.ok) {
                    showToast("Yeni gün yoklaması oluşturuldu.", "success");
                    loadAttendanceData();
                } else {
                    showToast("Tarih eklenemedi.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Bağlantı hatası.", "error");
            }
        });
    }

    // Seasons & Transfers Event Listeners
    document.getElementById("btn-save-season").addEventListener("click", async () => {
        const name = document.getElementById("season-input-name").value.trim();
        const start = document.getElementById("season-input-start").value;
        const end = document.getElementById("season-input-end").value;
        const is_active = document.getElementById("season-input-active").checked;
        
        if (!name || !start || !end) {
            showToast("Lütfen tüm alanları doldurun.", "error");
            return;
        }
        
        const { saveSeasonAction } = await import("./modules/api.js");
        await saveSeasonAction({
            team_id: state.activeTeamId,
            name,
            start_date: start,
            end_date: end,
            is_active
        });
    });

    document.getElementById("btn-save-transfer").addEventListener("click", async () => {
        const player_id = document.getElementById("transfer-input-player").value;
        const type = document.getElementById("transfer-input-type").value;
        const feeVal = document.getElementById("transfer-input-fee").value;
        const fee = feeVal !== "" ? parseInt(feeVal) : 0;
        const from_team = document.getElementById("transfer-input-from").value.trim();
        const to_team = document.getElementById("transfer-input-to").value.trim();
        const date = document.getElementById("transfer-input-date").value;
        const notes = document.getElementById("transfer-input-notes").value.trim();
        
        if (!player_id || !date) {
            showToast("Lütfen futbolcu ve tarihi seçin.", "error");
            return;
        }
        
        const { saveTransferAction } = await import("./modules/api.js");
        await saveTransferAction({
            player_id,
            team_id: state.activeTeamId,
            transfer_type: type,
            fee,
            from_team,
            to_team,
            date,
            notes
        });
    });

    // Parent Contact Search Listener
    document.getElementById("parent-contact-search").addEventListener("input", () => {
        populateParentContacts();
    });

    // Expenses, Incomes & Kits Event Listeners
    document.getElementById("btn-open-add-expense-modal").addEventListener("click", openAddExpenseModal);
    document.getElementById("btn-save-expense").addEventListener("click", handleSaveExpenseSubmit);
    document.getElementById("btn-open-add-income-modal")?.addEventListener("click", openAddIncomeModal);
    document.getElementById("btn-save-income")?.addEventListener("click", handleSaveIncomeSubmit);
    document.getElementById("btn-open-add-kit-modal").addEventListener("click", openAddKitModal);
    document.getElementById("btn-save-kit").addEventListener("click", handleSaveKitSubmit);

    // Tactic Duplication
    document.getElementById("btn-copy-tactic-lineup")?.addEventListener("click", () => {
        import("./modules/lineup.js").then(mod => mod.duplicateLineup());
    });

    // Custom Parent Notification Templates
    document.getElementById("btn-add-custom-template")?.addEventListener("click", () => {
        import("./modules/player.js").then(mod => mod.openAddCustomTemplateModal());
    });
    document.getElementById("btn-save-custom-template")?.addEventListener("click", () => {
        import("./modules/player.js").then(mod => mod.saveCustomTemplate());
    });

    // Finance Print Report
    document.getElementById("btn-print-finance-report")?.addEventListener("click", () => {
        document.body.classList.add("print-finance-report");
        window.print();
        const cleanup = () => {
            document.body.classList.remove("print-finance-report");
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        setTimeout(cleanup, 1000);
    });

    // Injury Events
    document.getElementById("btn-add-injury").addEventListener("click", handleAddInjuryClick);
    document.getElementById("btn-save-injury").addEventListener("click", handleSaveInjurySubmit);

    // Match Events
    document.getElementById("btn-open-add-match-modal").addEventListener("click", openAddMatchModal);
    document.getElementById("btn-save-match").addEventListener("click", handleSaveMatchSubmit);

    // Training Events
    document.getElementById("btn-open-add-training-modal").addEventListener("click", openAddTrainingModal);
    document.getElementById("btn-save-training").addEventListener("click", handleSaveTrainingSubmit);
    document.getElementById("btn-training-prev-week").addEventListener("click", () => navigateWeek(-1));
    document.getElementById("btn-training-next-week").addEventListener("click", () => navigateWeek(1));

    // Tournament Events
    document.getElementById("btn-open-add-tournament-modal").addEventListener("click", openAddTournamentModal);
    document.getElementById("btn-save-tournament").addEventListener("click", handleSaveTournamentSubmit);

    // Announcement Events
    document.getElementById("btn-open-add-announcement-modal").addEventListener("click", openAddAnnouncementModal);
    document.getElementById("btn-save-announcement").addEventListener("click", handleSaveAnnouncementSubmit);
    document.getElementById("tab-ann-bulletin").addEventListener("click", () => setSubTab("bulletin"));
    document.getElementById("tab-ann-templates").addEventListener("click", () => setSubTab("templates"));
    document.getElementById("btn-copy-template-msg").addEventListener("click", copyTemplateToClipboard);

    // Player Goals, Evaluations, Achievements Events
    document.getElementById("btn-player-add-goal").addEventListener("click", openPlayerAddGoalModal);
    document.getElementById("btn-save-goal").addEventListener("click", handleSaveGoalSubmit);
    document.getElementById("btn-player-add-evaluation").addEventListener("click", openPlayerAddEvaluationModal);
    document.getElementById("btn-save-evaluation").addEventListener("click", handleSaveEvaluationSubmit);
    document.getElementById("btn-player-add-achievement").addEventListener("click", openPlayerAddAchievementModal);
    document.getElementById("btn-save-achievement").addEventListener("click", handleSaveAchievementSubmit);

    // Save Physical Growth Event
    const btnSaveGrowth = document.getElementById("btn-save-growth");
    if (btnSaveGrowth) {
        btnSaveGrowth.addEventListener("click", async () => {
            if (!state.activePlayerId) return;
            const dateVal = document.getElementById("growth-input-date").value;
            const heightVal = parseInt(document.getElementById("growth-input-height").value);
            const weightVal = parseInt(document.getElementById("growth-input-weight").value);
            
            if (!dateVal || isNaN(heightVal) || isNaN(weightVal)) {
                showToast("Lütfen geçerli tarih, boy ve kilo değerlerini girin.", "error");
                return;
            }
            
            const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
            if (!activeTeam) return;
            const player = activeTeam.players.find(p => p.id === state.activePlayerId);
            if (!player) return;
            
            const history = player.growth_history || [];
            
            const existingIdx = history.findIndex(r => r.date === dateVal);
            if (existingIdx !== -1) {
                history[existingIdx].height = heightVal;
                history[existingIdx].weight = weightVal;
            } else {
                history.push({ date: dateVal, height: heightVal, weight: weightVal });
            }
            
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
                    showToast("Fiziksel ölçüm kaydedildi.", "success");
                    document.getElementById("growth-input-height").value = "";
                    document.getElementById("growth-input-weight").value = "";
                    
                    await loadData();
                    
                    const freshTeam = state.teams.find(t => t.id === state.activeTeamId);
                    const freshPlayer = freshTeam.players.find(p => p.id === player.id);
                    selectPlayer(freshPlayer.id);
                } else {
                    showToast("Ölçüm kaydedilirken hata oluştu.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Bağlantı hatası.", "error");
            }
        });
    }

    // Sub-Tabs Click Listeners for Attendance View
    const btnAttDays = document.getElementById("btn-att-tab-days");
    const btnAttReport = document.getElementById("btn-att-tab-report");
    if (btnAttDays && btnAttReport) {
        btnAttDays.addEventListener("click", () => {
            btnAttDays.classList.add("active");
            btnAttReport.classList.remove("active");
            document.getElementById("att-section-days").style.display = "block";
            document.getElementById("att-section-report").style.display = "none";
            loadAttendanceData();
        });
        btnAttReport.addEventListener("click", () => {
            btnAttReport.classList.add("active");
            btnAttDays.classList.remove("active");
            document.getElementById("att-section-days").style.display = "none";
            document.getElementById("att-section-report").style.display = "block";
            loadAttendanceAnalysis();
        });
    }

    // Sub-Tabs Click Listeners for Right Profile Details Panel
    document.getElementById("tab-detail-profile").addEventListener("click", () => switchDetailTab("tab-detail-profile"));
    document.getElementById("tab-detail-attributes").addEventListener("click", () => switchDetailTab("tab-detail-attributes"));
    document.getElementById("tab-detail-performance").addEventListener("click", () => switchDetailTab("tab-detail-performance"));
    document.getElementById("tab-detail-health").addEventListener("click", () => switchDetailTab("tab-detail-health"));
    document.getElementById("tab-detail-contact").addEventListener("click", () => switchDetailTab("tab-detail-contact"));
    const tabDetailArchive = document.getElementById("tab-detail-archive");
    if (tabDetailArchive) {
        tabDetailArchive.addEventListener("click", () => switchDetailTab("tab-detail-archive"));
    }

    // Player Media & Gallery Upload Triggers
    const btnAddPlayerGallery = document.getElementById("btn-add-player-gallery-photo");
    if (btnAddPlayerGallery) {
        btnAddPlayerGallery.addEventListener("click", () => openModal("modal-add-player-gallery"));
    }
    const btnSavePlayerGallery = document.getElementById("btn-save-player-gallery");
    if (btnSavePlayerGallery) {
        btnSavePlayerGallery.addEventListener("click", () => {
            if (state.activePlayerId) {
                import("./modules/archive.js").then(mod => mod.uploadPlayerGalleryPhoto(state.activePlayerId));
            }
        });
    }

    const btnAddPlayerArchive = document.getElementById("btn-add-player-archive-item");
    if (btnAddPlayerArchive) {
        btnAddPlayerArchive.addEventListener("click", () => openModal("modal-add-player-archive"));
    }
    const btnSavePlayerArchive = document.getElementById("btn-save-player-archive");
    if (btnSavePlayerArchive) {
        btnSavePlayerArchive.addEventListener("click", () => {
            if (state.activePlayerId) {
                import("./modules/archive.js").then(mod => mod.uploadPlayerArchiveItem(state.activePlayerId));
            }
        });
    }

    // Team Media & Archive Upload Triggers
    const btnAddTeamArchive = document.getElementById("btn-add-team-archive");
    if (btnAddTeamArchive) {
        btnAddTeamArchive.addEventListener("click", () => openModal("modal-add-team-archive"));
    }
    const btnSaveTeamArchive = document.getElementById("btn-save-team-archive");
    if (btnSaveTeamArchive) {
        btnSaveTeamArchive.addEventListener("click", () => {
            if (state.activeTeamId) {
                import("./modules/archive.js").then(mod => mod.uploadTeamArchiveItem(state.activeTeamId));
            }
        });
    }

    // Formation Select Change Listener
    const formationSelect = document.getElementById("picker-formation-select");
    if (formationSelect) {
        formationSelect.addEventListener("change", renderTacticalPitch);
    }

    const teamFormationSelect = document.getElementById("team-formation-select");
    if (teamFormationSelect) {
        teamFormationSelect.addEventListener("change", () => {
            import("./modules/lineup.js").then(mod => mod.renderTeamLineupPitch());
        });
    }

    const btnSaveTeamLineup = document.getElementById("btn-save-team-lineup");
    if (btnSaveTeamLineup) {
        btnSaveTeamLineup.addEventListener("click", () => {
            import("./modules/lineup.js").then(mod => mod.saveTeamLineup());
        });
    }

    const tacticLineupSelect = document.getElementById("tactic-lineup-select");
    if (tacticLineupSelect) {
        tacticLineupSelect.addEventListener("change", (e) => {
            import("./modules/lineup.js").then(mod => mod.selectTacticLineup(e.target.value));
        });
    }

    const btnAddTacticLineup = document.getElementById("btn-add-tactic-lineup");
    if (btnAddTacticLineup) {
        btnAddTacticLineup.addEventListener("click", () => {
            import("./modules/lineup.js").then(mod => mod.addNewLineup());
        });
    }

    const btnRenameTacticLineup = document.getElementById("btn-rename-tactic-lineup");
    if (btnRenameTacticLineup) {
        btnRenameTacticLineup.addEventListener("click", () => {
            import("./modules/lineup.js").then(mod => mod.renameLineup());
        });
    }

    const btnDeleteTacticLineup = document.getElementById("btn-delete-tactic-lineup");
    if (btnDeleteTacticLineup) {
        btnDeleteTacticLineup.addEventListener("click", () => {
            import("./modules/lineup.js").then(mod => mod.deleteLineup());
        });
    }

    // Delegated click listener for inline player attributes editing
    document.addEventListener("click", async (e) => {
        const panel = document.getElementById("player-detail-panel");
        if (panel && panel.classList.contains("editing")) return;
        const badge = e.target.closest(".attr-val-badge");
        if (!badge || badge.querySelector("input") || !badge.id.startsWith("attr-")) return;

        const attrKey = badge.id.replace("attr-", "");
        if (!attrKey || !state.activePlayerId) return;

        const currentValue = parseInt(badge.innerText) || 50;
        badge.innerHTML = `<input type="number" min="0" max="100" class="attr-edit-input" value="${currentValue}" style="width: 45px; text-align: center; border: 1px solid var(--accent-color); background: var(--bg-dark); color: var(--text-primary); font-weight: bold; border-radius: 4px; padding: 2px 0;">`;
        const input = badge.querySelector("input");
        input.focus();
        input.select();

        let isSaving = false;
        const saveValue = async () => {
            if (isSaving) return;
            isSaving = true;
            let newValue = parseInt(input.value);
            if (isNaN(newValue)) newValue = currentValue;
            newValue = Math.max(0, Math.min(100, newValue));

            const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
            if (activeTeam) {
                const player = activeTeam.players.find(p => p.id === state.activePlayerId);
                if (player) {
                    player.attributes[attrKey] = newValue;
                    
                    const payload = {
                        id: player.id,
                        team_id: state.activeTeamId,
                        name: player.name,
                        age: player.age,
                        nationality: player.nationality,
                        foot: player.foot,
                        primaryPosition: player.primaryPosition,
                        secondaryPositions: player.secondaryPositions,
                        photo: player.photo,
                        attributes: player.attributes,
                        squadRole: player.squadRole,
                        height: player.height,
                        weight: player.weight,
                        injuryStatus: player.injuryStatus,
                        coachNotes: player.coachNotes,
                        matchesPlayed: player.matchesPlayed,
                        goals: player.goals,
                        assists: player.assists,
                        yellowCards: player.yellowCards,
                        redCards: player.redCards,
                        matchRating: player.matchRating,
                        parentName: player.parentName,
                        parentPhone: player.parentPhone,
                        feeStatus: player.feeStatus,
                        currentAbility: player.currentAbility,
                        potentialAbility: player.potentialAbility
                    };

                    try {
                        const res = await fetch("/api/players", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        });
                        if (res.ok) {
                            showToast("Yetenek başarıyla güncellendi.", "success");
                            await loadData();
                            selectPlayer(player.id);
                        } else {
                            showToast("Güncelleme başarısız.", "error");
                            selectPlayer(player.id);
                        }
                    } catch (err) {
                        console.error(err);
                        showToast("Bağlantı hatası.", "error");
                        selectPlayer(player.id);
                    }
                }
            }
        };

        input.addEventListener("blur", saveValue);
        input.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter") {
                saveValue();
            } else if (evt.key === "Escape") {
                isSaving = true;
                selectPlayer(state.activePlayerId);
            }
        });
    });

    // Dashboard navigation click listeners
    const cardDbTotalPlayers = document.getElementById("card-db-total-players");
    if (cardDbTotalPlayers) {
        cardDbTotalPlayers.addEventListener("click", () => switchTab("nav-teams"));
    }
    const cardDbCollectionRate = document.getElementById("card-db-collection-rate");
    if (cardDbCollectionRate) {
        cardDbCollectionRate.addEventListener("click", () => switchTab("nav-finance"));
    }
    const cardDbActiveInjuries = document.getElementById("card-db-active-injuries");
    if (cardDbActiveInjuries) {
        cardDbActiveInjuries.addEventListener("click", () => {
            const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
            if (activeTeam) {
                const injured = activeTeam.players.find(p => p.injuryStatus && p.injuryStatus !== "Sağlıklı");
                if (injured) {
                    switchTab("nav-teams");
                    selectPlayer(injured.id);
                    switchDetailTab("tab-detail-health");
                } else {
                    switchTab("nav-teams");
                }
            } else {
                switchTab("nav-teams");
            }
        });
    }
}

async function handleSaveExpenseSubmit() {
    const id = document.getElementById("expense-id-hidden").value || null;
    const description = document.getElementById("expense-input-description").value.trim();
    const category = document.getElementById("expense-input-category").value;
    const expense_type = document.getElementById("expense-input-type").value;
    const amount = parseFloat(document.getElementById("expense-input-amount").value);
    const date = document.getElementById("expense-input-date").value;
    
    if (!description || isNaN(amount) || !date) {
        showToast("Lütfen tüm alanları doldurun.", "error");
        return;
    }
    
    const payload = {
        id: id,
        description: description,
        category: category,
        amount: amount,
        date: date,
        type: expense_type
    };
    
    await saveExpenseAction(payload);
}

function openAddIncomeModal() {
    document.getElementById("modal-income-title").innerText = "Yeni Gelir Kaydı Ekle";
    document.getElementById("income-id-hidden").value = "";
    document.getElementById("income-input-description").value = "";
    document.getElementById("income-input-category").value = "";
    document.getElementById("income-input-amount").value = "";
    document.getElementById("income-input-date").value = new Date().toISOString().split('T')[0];
    
    import("./modules/api_finance.js").then(mod => mod.updateIncomeSuggestions());
    openModal("modal-add-income");
}

async function handleSaveIncomeSubmit() {
    const id = document.getElementById("income-id-hidden").value || null;
    const description = document.getElementById("income-input-description").value.trim();
    const category = document.getElementById("income-input-category").value.trim();
    const amount = parseFloat(document.getElementById("income-input-amount").value);
    const date = document.getElementById("income-input-date").value;
    
    if (!description || !category || isNaN(amount) || !date) {
        showToast("Lütfen tüm alanları doldurun.", "error");
        return;
    }
    
    const payload = {
        id: id,
        description: description,
        category: category,
        amount: amount,
        date: date,
        type: "Gelir"
    };
    
    import("./modules/api_finance.js").then(async (mod) => {
        const success = await mod.saveIncomeAction(payload);
        if (success) {
            import("./modules/api.js").then(apiMod => apiMod.loadFinanceData());
        }
    });
}

async function handleSaveKitSubmit() {
    const id = document.getElementById("kit-id-hidden").value || null;
    const player_id = document.getElementById("kit-input-player").value;
    const size = document.getElementById("kit-input-size").value;
    const number = document.getElementById("kit-input-number").value.trim();
    const status = document.getElementById("kit-input-status").value;
    const payment_status = document.getElementById("kit-input-payment").value;
    const notes = document.getElementById("kit-input-notes").value.trim();
    
    if (!size || !status) {
        showToast("Lütfen beden ve teslimat durumunu doldurun.", "error");
        return;
    }
    
    const payload = {
        id: id,
        player_id: player_id || null,
        size: size,
        number: number !== "" ? parseInt(number) : null,
        status: status,
        payment_status: payment_status,
        notes: notes
    };
    
    await saveKitAction(payload);
}

// Redraw chart responsively on window resize
window.addEventListener("resize", () => {
    if (state.activePlayerId && state.activeTab === "nav-teams") {
        const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
        if (activeTeam) {
            const player = activeTeam.players.find(p => p.id === state.activePlayerId);
            if (player) {
                loadRatingHistory(player.id);
            }
        }
    }
});

// ============================================================
// Bulk Fee Modal
// ============================================================
function setupBulkFeeModal() {
    const btnOpen = document.getElementById("btn-open-bulk-fee-modal");
    const btnConfirm = document.getElementById("btn-confirm-bulk-fee");
    if (btnOpen) {
        btnOpen.addEventListener("click", () => {
            // Show current standard fee
            const feeDisplay = document.getElementById("finance-standard-fee-display");
            const currentText = feeDisplay ? feeDisplay.innerText : "—";
            const currentDisplayEl = document.getElementById("bulk-fee-current-display");
            if (currentDisplayEl) currentDisplayEl.value = currentText;
            
            // Show locked players preview
            const lockedList = document.getElementById("bulk-fee-locked-list");
            if (lockedList) {
                const url = state.activeTeamId ? `/api/finance?team_id=${state.activeTeamId}` : "/api/finance";
                fetch(url).then(r => r.json()).then(data => {
                    const locked = (data.all_players || []).filter(p => p.fee_discount_locked);
                    if (locked.length === 0) {
                        lockedList.innerHTML = `<em>Kilidi açık oyuncu bulunmuyor – tüm oyuncular güncellenecek.</em>`;
                    } else {
                        lockedList.innerHTML = locked.map(p =>
                            `<div style="display:flex; justify-content:space-between; padding:2px 0; border-bottom:1px solid var(--border-color);">
                                <span>${p.name}</span>
                                <strong style="color:#ff9100;">${p.amount.toLocaleString('tr-TR')} TL (korunuyor)</strong>
                            </div>`
                        ).join("");
                    }
                }).catch(() => {
                    lockedList.innerHTML = `<em style="color:var(--attr-poor);">Veriler yüklenemedi.</em>`;
                });
            }
            
            // Clear new amount field
            const newAmountEl = document.getElementById("bulk-fee-new-amount");
            if (newAmountEl) newAmountEl.value = "";
            
            openModal("modal-bulk-fee");
        });
    }
    
    if (btnConfirm) {
        btnConfirm.addEventListener("click", async () => {
            const newAmountEl = document.getElementById("bulk-fee-new-amount");
            const newAmount = parseInt(newAmountEl?.value);
            if (isNaN(newAmount) || newAmount < 0) {
                showToast("Lütfen geçerli bir tutar girin.", "error");
                return;
            }
            if (!state.activeTeamId) {
                showToast("Lütfen önce bir takım seçin.", "error");
                return;
            }
            
            try {
                const res = await fetch("/api/finance/bulk-fee", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ team_id: state.activeTeamId, new_amount: newAmount })
                });
                if (res.ok) {
                    closeModal("modal-bulk-fee");
                    showToast(`Standart aidat ${newAmount.toLocaleString('tr-TR')} TL olarak güncellendi.`, "success");
                    // Reload finance data
                    const { loadFinanceData } = await import("./modules/api.js");
                    await loadFinanceData();
                } else {
                    showToast("Toplu güncelleme başarısız.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Bağlantı hatası.", "error");
            }
        });
    }
}

// ============================================================
// Player Individual Fee Settings Modal
// ============================================================
window.openPlayerFeeModal = function(playerId, playerName, currentAmount, isLocked, standardFee) {
    document.getElementById("fee-settings-player-id").value = playerId;
    document.getElementById("modal-player-fee-title").innerText = `Aidat Ayarı – ${playerName}`;
    
    // Set amount: if same as standard and not locked, leave blank (use standard)
    const amountEl = document.getElementById("fee-settings-amount");
    const lockedEl = document.getElementById("fee-settings-locked");
    const sliderEl = document.querySelector("#modal-player-fee .toggle-slider");
    
    // Show custom amount only if it differs from standard
    if (currentAmount !== standardFee) {
        amountEl.value = currentAmount;
    } else {
        amountEl.value = "";
    }
    
    if (lockedEl) {
        lockedEl.checked = isLocked;
        // Visually update slider
        if (sliderEl) {
            if (isLocked) {
                sliderEl.style.background = "var(--accent-color)";
                sliderEl.style.borderColor = "var(--accent-color)";
            } else {
                sliderEl.style.background = "";
                sliderEl.style.borderColor = "";
            }
        }
    }
    
    openModal("modal-player-fee");
};

function setupPlayerFeeModal() {
    const lockedCheckbox = document.getElementById("fee-settings-locked");
    const sliderEl = document.querySelector("#modal-player-fee .toggle-slider");
    
    if (lockedCheckbox && sliderEl) {
        lockedCheckbox.addEventListener("change", () => {
            if (lockedCheckbox.checked) {
                sliderEl.style.background = "var(--accent-color)";
                sliderEl.style.borderColor = "var(--accent-color)";
            } else {
                sliderEl.style.background = "";
                sliderEl.style.borderColor = "";
            }
        });
    }
    
    const btnSave = document.getElementById("btn-save-player-fee");
    if (btnSave) {
        btnSave.addEventListener("click", async () => {
            const playerId = document.getElementById("fee-settings-player-id").value;
            const amountVal = document.getElementById("fee-settings-amount").value.trim();
            const isLocked = document.getElementById("fee-settings-locked")?.checked || false;
            
            const feeAmount = amountVal !== "" ? parseInt(amountVal) : null;
            if (feeAmount !== null && (isNaN(feeAmount) || feeAmount < 0)) {
                showToast("Geçersiz aidat tutarı.", "error");
                return;
            }
            
            try {
                const res = await fetch("/api/players/fee-settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ player_id: playerId, fee_amount: feeAmount, fee_discount_locked: isLocked })
                });
                if (res.ok) {
                    closeModal("modal-player-fee");
                    showToast("Oyuncu aidat ayarı kaydedildi.", "success");
                    const { loadFinanceData } = await import("./modules/api.js");
                    await loadFinanceData();
                } else {
                    showToast("Kaydetme başarısız.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Bağlantı hatası.", "error");
            }
        });
    }
}

// Initialize fee modals after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    setupBulkFeeModal();
    setupPlayerFeeModal();
});

