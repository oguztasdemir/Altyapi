import { state } from "./state.js";
import { calculateWeightedRating, getAttributeColor, populateAttributeBadge, showToast } from "./utils.js";
import { renderRadarChart, loadRatingHistory, loadMatchPerformance } from "./charts.js";
import { deletePlayer, loadInjuriesHistory } from "./api.js";
import { openModal } from "./ui.js";
import { getParentTemplates } from "./extras.js";

// Re-export sub-module functions to keep main entry imports intact
export {
    FORMATIONS, selectedPickerPosition, renderPickerNodes,
    openTacticalPitchPicker, setupPitchPickerListeners, renderTacticalPitch
} from "./player_tactical.js";

export {
    handleAddInjuryClick, populateGrowthHistory, deleteGrowthRecord, renderGrowthChart
} from "./player_health.js";

export {
    loadPlayerGoals, openPlayerAddGoalModal, handleSaveGoalSubmit,
    loadPlayerEvaluations, openPlayerAddEvaluationModal, handleSaveEvaluationSubmit,
    loadPlayerAchievements, openPlayerAddAchievementModal, handleSaveAchievementSubmit
} from "./player_goals.js";

// Render Players list
export function renderPlayersList() {
    const container = document.getElementById("players-list-container");
    if (!container) return;
    container.innerHTML = "";
    
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 20px;">Kadroda oyuncu bulunmuyor.</div>`;
        return;
    }
    
    if (activeTeam.players.length === 0) {
        return;
    }
    
    let filteredPlayers = activeTeam.players.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(state.searchQuery);
        const matchesPosition = state.filterPosition === "ALL" || player.primaryPosition === state.filterPosition;
        return matchesSearch && matchesPosition;
    });

    if (filteredPlayers.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 20px;">Filtrelere uygun oyuncu bulunamadı.</div>`;
        return;
    }

    // Sort players according to sortBy config
    filteredPlayers.forEach(p => {
        p.tempRating = calculateWeightedRating(p.primaryPosition, p.attributes);
    });

    if (state.sortBy === "rating-desc") {
        filteredPlayers.sort((a, b) => b.tempRating - a.tempRating);
    } else if (state.sortBy === "rating-asc") {
        filteredPlayers.sort((a, b) => a.tempRating - b.tempRating);
    } else if (state.sortBy === "alpha-asc") {
        filteredPlayers.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    } else if (state.sortBy === "alpha-desc") {
        filteredPlayers.sort((a, b) => b.name.localeCompare(a.name, "tr"));
    }

    filteredPlayers.forEach(player => {
        const item = document.createElement("div");
        item.className = `list-item ${state.activePlayerId === player.id ? 'active' : ''}`;
        item.setAttribute("data-player-id", player.id);
        
        const rating = player.tempRating;
        
        item.innerHTML = `
            <div>
                <div class="list-item-title">${player.name}</div>
                <div class="list-item-subtitle">${player.primaryPosition} • ${player.age} Yaş • ${player.squadRole}</div>
            </div>
            <div style="display:flex; align-items:center; gap: 8px;">
                <span style="font-weight: 800; font-size: 0.9rem; color: ${getAttributeColor(rating)}">${rating}</span>
            </div>
        `;
        item.addEventListener("click", () => selectPlayer(player.id));
        container.appendChild(item);
    });
}

// Select Player Details
export function selectPlayer(id) {
    state.activePlayerId = id;
    
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    
    const player = activeTeam.players.find(p => p.id === id);
    if (!player) return;

    // Highlight players list
    document.querySelectorAll("#players-list-container .list-item").forEach(item => {
        if (item.getAttribute("data-player-id") === id) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    const teamTacticPanel = document.getElementById("team-tactic-board-panel");
    if (teamTacticPanel) teamTacticPanel.style.display = "none";
    
    const notSelectedEl = document.getElementById("player-not-selected-view");
    if (notSelectedEl) notSelectedEl.style.display = "none";
    
    document.getElementById("player-detail-panel").style.display = "flex";

    // Populate Details
    const lastName = player.name.split(" ").pop().toUpperCase();
    document.getElementById("detail-card-lastname").innerText = lastName || "OYUNCU";
    document.getElementById("detail-card-position").innerText = player.primaryPosition;
    
    const shirtNumber = (parseInt(player.id.replace(/[^0-9]/g, "")) || 10) % 99 + 1;
    document.getElementById("detail-card-number").innerText = shirtNumber;

    const currentStars = "⭐".repeat(player.currentAbility || 3);
    document.getElementById("detail-card-stars").innerText = currentStars;

    // Nationality flag mapping
    const nat = (player.nationality || "").toUpperCase().trim();
    let flag = "🌐";
    if (nat.includes("TÜRK") || nat.includes("TURK")) flag = "🇹🇷";
    else if (nat.includes("USA") || nat.includes("AMERİ") || nat.includes("AMERI")) flag = "🇺🇸";
    else if (nat.includes("İNGİL") || nat.includes("INGIL") || nat.includes("ENG")) flag = "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
    else if (nat.includes("BREZ") || nat.includes("BRA")) flag = "🇧🇷";
    else if (nat.includes("İSPAN") || nat.includes("ISPAN") || nat.includes("SPA")) flag = "🇪🇸";
    else if (nat.includes("ALMAN") || nat.includes("GER")) flag = "🇩🇪";
    else if (nat.includes("FRAN") || nat.includes("FRA")) flag = "🇫🇷";
    else if (nat.includes("İTAL") || nat.includes("ITAL")) flag = "🇮🇹";
    else if (nat.includes("PORT")) flag = "🇵🇹";
    document.getElementById("detail-flag-badge").innerText = flag;

    // Set specs safely
    document.getElementById("detail-nationality").innerText = nat;
    document.getElementById("detail-age").innerText = player.age;
    document.getElementById("detail-foot").innerText = player.foot;
    document.getElementById("detail-squad-role").innerText = player.squadRole;

    const heightEl = document.getElementById("detail-height");
    if (heightEl) heightEl.innerText = `${player.height || 175} cm`;
    const weightEl = document.getElementById("detail-weight");
    if (weightEl) weightEl.innerText = `${player.weight || 70} kg`;
    const footDisplayEl = document.getElementById("detail-foot-display");
    if (footDisplayEl) footDisplayEl.innerText = player.foot;

    const overallRating = calculateWeightedRating(player.primaryPosition, player.attributes);
    const mockVal = overallRating > 75 
        ? `€${((overallRating - 70) * 1.6).toFixed(1)}M` 
        : `€${((overallRating - 50) * 20 + 200).toFixed(0)}K`;
    const mockWage = overallRating > 75
        ? `€${((overallRating - 70) * 4.5 + 10).toFixed(1)}K`
        : `€${(overallRating * 60).toFixed(0)}`;

    const valDisplayEl = document.getElementById("detail-value-display");
    if (valDisplayEl) valDisplayEl.innerText = mockVal;
    const wageDisplayEl = document.getElementById("detail-wage-display");
    if (wageDisplayEl) wageDisplayEl.innerText = mockWage;
    
    // Safety check for optional contract/date elements
    const startContractEl = document.getElementById("detail-contract-start");
    if (startContractEl) startContractEl.innerText = "01/07/2024";
    const endContractEl = document.getElementById("detail-contract-end");
    if (endContractEl) endContractEl.innerText = "30/06/2030";

    document.getElementById("detail-club-name").innerText = activeTeam.name;

    // Set Role and Position Summary based on primary position
    let roleTitle = "Yaratıcı Forvet";
    let posSummary = "Hücumcu (Merkez)";
    const pos = player.primaryPosition;
    if (pos === "KL") { roleTitle = "Libero Kaleci"; posSummary = "Kaleci (KL)"; }
    else if (pos === "STP") { roleTitle = "Geniş Alan Stoperi"; posSummary = "Stoper (STP)"; }
    else if (pos === "SLB" || pos === "SĞB") { roleTitle = "Kanat Beki"; posSummary = "Sol/Sağ Bek (SLB/SĞB)"; }
    else if (pos === "DOS") { roleTitle = "Savaşçı Önlibero"; posSummary = "Defansif Orta Saha (DOS)"; }
    else if (pos === "OS") { roleTitle = "İki Yönlü Orta Saha"; posSummary = "Merkez Orta Saha (OS)"; }
    else if (pos === "SLK" || pos === "SĞK") { roleTitle = "Ters Ayaklı Kanat"; posSummary = "Kanat Oyuncusu (SLK/SĞK)"; }
    else if (pos === "OOS") { roleTitle = "Gizli Oyun Kurucu"; posSummary = "Ofansif Orta Saha (OOS)"; }
    else if (pos === "SNT") { roleTitle = "Fırsatçı Golcü"; posSummary = "Santrafor (SNT)"; }
    
    document.getElementById("detail-role-title").innerText = roleTitle;
    document.getElementById("detail-positions-summary").innerText = posSummary;
    document.getElementById("detail-coach-notes").innerText = player.coachNotes || "Henüz bir değerlendirme raporu girilmemiş.";
    
    const bloodTypeEl = document.getElementById("detail-blood-type");
    if (bloodTypeEl) bloodTypeEl.innerText = player.bloodType || "Bilinmiyor";
    const chronicEl = document.getElementById("detail-chronic-illnesses");
    if (chronicEl) chronicEl.innerText = player.chronicIllnesses || "Yok";
    const allergiesEl = document.getElementById("detail-allergies");
    if (allergiesEl) allergiesEl.innerText = player.allergies || "Yok";
    const medicationsEl = document.getElementById("detail-medications");
    if (medicationsEl) medicationsEl.innerText = player.medications || "Yok";

    // Render Tactical Pitch
    import("./player_tactical.js").then(mod => mod.renderTacticalPitch());

    // Render Radar Chart
    renderRadarChart(player.attributes, player.id);

    // Photos
    const detailAvatarImg = document.getElementById("detail-avatar-img");
    const detailAvatarPlaceholder = document.getElementById("detail-avatar-placeholder");
    if (player.photo) {
        detailAvatarImg.src = player.photo;
        detailAvatarImg.style.display = "block";
        detailAvatarPlaceholder.style.display = "none";
    } else {
        detailAvatarImg.style.display = "none";
        detailAvatarPlaceholder.style.display = "flex";
    }

    // Quick Injury Alert Bar handling
    const injuryBar = document.getElementById("quick-injury-alert-bar");
    const injuryText = document.getElementById("quick-injury-text");
    const resolveBtn = document.getElementById("btn-quick-resolve-injury");
    
    if (injuryBar && player.injuryStatus && player.injuryStatus !== "Sağlıklı") {
        injuryBar.style.display = "flex";
        if (injuryText) {
            injuryText.innerText = `Bu oyuncunun aktif sakatlığı bulunmaktadır! (${player.injuryStatus})`;
        }
        if (resolveBtn) {
            const newResolveBtn = resolveBtn.cloneNode(true);
            resolveBtn.parentNode.replaceChild(newResolveBtn, resolveBtn);
            newResolveBtn.addEventListener("click", async () => {
                try {
                    const res = await fetch(`/api/injuries?player_id=${player.id}`);
                    if (res.ok) {
                        const injuries = await res.json();
                        const activeInjury = injuries.find(item => !item.end_date);
                        if (activeInjury) {
                            const { handleResolveInjury } = await import("./api_health.js");
                            await handleResolveInjury(
                                activeInjury.id, 
                                activeInjury.player_id, 
                                activeInjury.injury_type, 
                                activeInjury.start_date, 
                                activeInjury.notes
                            );
                        } else {
                            showToast("Aktif sakatlık kaydı bulunamadı.", "error");
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            });
        }
    } else if (injuryBar) {
        injuryBar.style.display = "none";
    }

    // Populate Attribute Badges & Progress Bars
    const keys = Object.keys(player.attributes);
    keys.forEach(key => {
        populateAttributeBadge("attr-" + key, player.attributes[key]);
        
        // Update Progress Bar
        const pb = document.getElementById("pb-" + key);
        if (pb) {
            const val = player.attributes[key] || 50;
            pb.style.width = val + "%";
            
            // Set Color Class
            pb.className = "fc-progress-bar";
            if (val >= 80) pb.classList.add("fc-bar-excellent");
            else if (val >= 65) pb.classList.add("fc-bar-good");
            else if (val >= 50) pb.classList.add("fc-bar-average");
            else pb.classList.add("fc-bar-poor");
        }
    });

    // Hover Interaction for Attribute Details Card
    const attrRows = document.querySelectorAll(".fc-attr-row");
    attrRows.forEach(row => {
        const key = row.getAttribute("data-key");
        const handleInteraction = () => {
            attrRows.forEach(r => r.classList.remove("active"));
            row.classList.add("active");
            updateAttributeDetailCard(key, player.attributes[key] || 50);
        };
        row.addEventListener("mouseenter", handleInteraction);
        row.addEventListener("click", handleInteraction);
    });

    // Initialize with a default attribute
    if (keys.length > 0) {
        const defaultKey = keys.includes("dribbling") ? "dribbling" : keys[0];
        const defaultRow = document.querySelector(`.fc-attr-row[data-key="${defaultKey}"]`);
        if (defaultRow) {
            defaultRow.classList.add("active");
            updateAttributeDetailCard(defaultKey, player.attributes[defaultKey] || 50);
        }
    }

    // Populate contact fields in Tab 5
    const contactName = document.getElementById("detail-parent-name");
    const contactPhone = document.getElementById("detail-parent-phone");
    if (contactName) contactName.innerText = player.parentName || "-";
    if (contactPhone) {
        contactPhone.innerText = player.parentPhone || "-";
        contactPhone.href = player.parentPhone ? `tel:${player.parentPhone}` : "#";
    }

    // Parent notification templates
    const templatesContainer = document.getElementById("parent-templates-container");
    if (templatesContainer) {
        const templatesSection = templatesContainer.closest(".parent-templates-section");
        if (player.parentName) {
            const baseTemplates = getParentTemplates(player.name, player.parentName);
            let customTemplates = [];
            try {
                const stored = localStorage.getItem("fm_custom_parent_templates");
                if (stored) {
                    customTemplates = JSON.parse(stored);
                }
            } catch(e) {
                console.error("Custom templates load error", e);
            }
            
            const mappedCustom = customTemplates.map(t => {
                let replacedText = t.text || "";
                replacedText = replacedText.replace(/\[Oyuncu Adı\]/g, player.name || "Oyuncunuz");
                replacedText = replacedText.replace(/\[Veli Adı\]/g, player.parentName || "Sayın Veli");
                return {
                    title: t.title,
                    text: replacedText,
                    isCustom: true
                };
            });
            
            const allTemplates = [...baseTemplates, ...mappedCustom];
            
            templatesContainer.innerHTML = "";
            allTemplates.forEach((t, idx) => {
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.gap = "8px";
                row.style.alignItems = "center";
                row.style.marginBottom = "6px";
                row.style.width = "100%";
                
                const btn = document.createElement("button");
                btn.innerText = t.title;
                btn.style.background = "var(--bg-card)";
                btn.style.border = "1px solid var(--border-color)";
                btn.style.borderRadius = "8px";
                btn.style.padding = "8px 14px";
                btn.style.cursor = "pointer";
                btn.style.color = "var(--text-secondary)";
                btn.style.fontSize = "0.78rem";
                btn.style.textAlign = "left";
                btn.style.flex = "1";
                btn.style.transition = "border-color 0.2s";
                
                btn.addEventListener("mouseover", () => btn.style.borderColor = "var(--accent-color)");
                btn.addEventListener("mouseout", () => btn.style.borderColor = "var(--border-color)");
                btn.addEventListener("click", () => {
                    navigator.clipboard.writeText(t.text).then(() => {
                        showToast("Şablon kopyalandı!", "success");
                    }).catch(err => {
                        console.error(err);
                        showToast("Kopyalanamadı.", "error");
                    });
                });
                
                row.appendChild(btn);
                
                if (t.isCustom) {
                    const delBtn = document.createElement("button");
                    delBtn.innerHTML = "🗑️";
                    delBtn.style.background = "none";
                    delBtn.style.border = "none";
                    delBtn.style.color = "var(--attr-poor)";
                    delBtn.style.cursor = "pointer";
                    delBtn.style.fontSize = "0.95rem";
                    delBtn.style.padding = "4px 8px";
                    delBtn.style.display = "flex";
                    delBtn.style.alignItems = "center";
                    delBtn.title = "Şablonu Sil";
                    delBtn.addEventListener("click", () => {
                        if (confirm(`"${t.title}" şablonunu silmek istediğinize emin misiniz?`)) {
                            const customIdx = idx - baseTemplates.length;
                            customTemplates.splice(customIdx, 1);
                            localStorage.setItem("fm_custom_parent_templates", JSON.stringify(customTemplates));
                            showToast("Şablon silindi.", "success");
                            selectPlayer(player.id);
                        }
                    });
                    row.appendChild(delBtn);
                }
                
                templatesContainer.appendChild(row);
            });
            
            if (templatesSection) templatesSection.style.display = "block";
        } else {
            templatesContainer.innerHTML = "";
            if (templatesSection) templatesSection.style.display = "none";
        }
    }

    // Attendance stats indicator in Tab 5
    const attendanceStatsEl = document.getElementById("contact-attendance-rate");
    if (attendanceStatsEl) {
        fetch(`/api/players/attendance-stats?player_id=${player.id}`)
            .then(res => res.json())
            .then(stats => {
                attendanceStatsEl.innerText = `%${stats.rate} (${stats.attended}/${stats.total} İdman)`;
            })
            .catch(err => {
                console.error(err);
                attendanceStatsEl.innerText = "%100";
            });
    }

    const adminFeeDiv = document.getElementById("admin-only-card");
    const nonAdminFeeDiv = document.getElementById("non-admin-fee-status");
    if (state.isAdminLoggedIn) {
        if (adminFeeDiv) adminFeeDiv.style.display = "block";
        if (nonAdminFeeDiv) nonAdminFeeDiv.style.display = "none";
        const feeSelect = document.getElementById("detail-fee-status");
        if (feeSelect) feeSelect.value = player.feeStatus || "Ödenmedi";
    } else {
        if (adminFeeDiv) adminFeeDiv.style.display = "none";
        if (nonAdminFeeDiv) {
            nonAdminFeeDiv.style.display = "block";
            nonAdminFeeDiv.innerText = player.feeStatus || "Ödenmedi";
            if (player.feeStatus === "Ödendi") {
                nonAdminFeeDiv.style.color = "var(--attr-excellent)";
            } else if (player.feeStatus === "Gecikti") {
                nonAdminFeeDiv.style.color = "var(--attr-poor)";
            } else {
                nonAdminFeeDiv.style.color = "var(--attr-average)";
            }
        }
    }

    // Load rating progression graph
    loadRatingHistory(player.id);
    loadMatchPerformance(player.id);

    // Load player injuries
    loadInjuriesHistory(player.id);

    // Load player goals, evaluations, achievements
    import("./player_goals.js").then(mod => {
        mod.loadPlayerGoals(player.id);
        mod.loadPlayerEvaluations(player.id);
        mod.loadPlayerAchievements(player.id);
        
        // Render badges on the main player card under stars
        fetch(`/api/achievements?player_id=${player.id}`)
            .then(res => res.json())
            .then(achs => {
                const starsEl = document.getElementById("detail-card-stars");
                if (starsEl) {
                    // Remove existing dynamically created badges containers if any
                    const oldBadges = document.getElementById("detail-card-achievements-badges");
                    if (oldBadges) oldBadges.remove();

                    if (achs.length > 0) {
                        const badgesContainer = document.createElement("div");
                        badgesContainer.id = "detail-card-achievements-badges";
                        badgesContainer.style.display = "flex";
                        badgesContainer.style.gap = "4px";
                        badgesContainer.style.justifyContent = "center";
                        badgesContainer.style.marginTop = "6px";
                        badgesContainer.style.flexWrap = "wrap";

                        const badgeIcons = {
                            "star": "⭐",
                            "fire": "🔥",
                            "target": "🎯",
                            "trophy": "🏆",
                            "shield": "🛡️",
                            "zap": "⚡",
                            "ilk_gol": "⚽",
                            "5_gol": "🔥",
                            "10_gol": "💥",
                            "ilk_asist": "🎯",
                            "5_asist": "🅰️",
                            "ilk_mac": "🏟️",
                            "10_mac": "⭐",
                            "devam_10": "✅",
                            "devam_30": "🏆"
                        };

                        achs.slice(0, 5).forEach(ac => {
                            const icon = badgeIcons[ac.badge_type] || "🏅";
                            const badgeSpan = document.createElement("span");
                            badgeSpan.style.fontSize = "1rem";
                            badgeSpan.title = `${ac.title}: ${ac.description}`;
                            badgeSpan.innerText = icon;
                            badgesContainer.appendChild(badgeSpan);
                        });

                        starsEl.parentNode.insertBefore(badgesContainer, starsEl.nextSibling);
                    }
                }
            })
            .catch(err => console.error("Error loading profile header badges:", err));
    });

    // Populate growth history and draw chart
    const growthInputDate = document.getElementById("growth-input-date");
    if (growthInputDate) {
        growthInputDate.value = new Date().toISOString().split('T')[0];
    }
    import("./player_health.js").then(mod => {
        mod.populateGrowthHistory(player);
        setTimeout(() => mod.renderGrowthChart(player), 100);
    });

    const isArchiveTabActive = document.getElementById("tab-detail-archive")?.classList.contains("active");
    if (isArchiveTabActive) {
        import("./archive.js").then(mod => {
            mod.loadPlayerGallery(player.id);
            mod.loadPlayerArchive(player.id);
        });
    }
}

// Update Pitch Marker (legacy support)
export function updatePitchMarker(position) {
    // Left empty since we now use renderTacticalPitch
}

// Comparison Modal Open
export function openPlayerComparison() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || !state.activePlayerId) return;

    const p1 = activeTeam.players.find(p => p.id === state.activePlayerId);
    if (!p1) return;

    document.getElementById("comp-player-1-name").innerText = p1.name;
    document.getElementById("comp-player-1-position").innerText = p1.primaryPosition;

    const select = document.getElementById("comp-player-2-select");
    select.innerHTML = '<option value="">-- Kıyaslanacak Oyuncu Seçin --</option>';

    const otherPlayers = activeTeam.players.filter(p => p.id !== state.activePlayerId);
    otherPlayers.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.innerText = `${p.name} (${p.primaryPosition})`;
        select.appendChild(opt);
    });

    document.getElementById("comparison-bars-list").innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 20px;">Karşılaştırmak için sağ taraftan bir oyuncu seçin.</div>';

    const modal = document.getElementById("modal-comparison");
    if (modal) modal.classList.add("active");
}

export function handleComparisonSelect() {
    const p2Id = document.getElementById("comp-player-2-select").value;
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || !state.activePlayerId || !p2Id) return;

    const p1 = activeTeam.players.find(p => p.id === state.activePlayerId);
    const p2 = activeTeam.players.find(p => p.id === p2Id);
    if (!p1 || !p2) return;

    const container = document.getElementById("comparison-bars-list");
    container.innerHTML = "";

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
            <div style="font-weight: 700; text-align: left; color: ${isP1Better ? 'var(--accent-color)' : 'var(--text-primary)'}">${m.val1}</div>
            <div>
                <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; margin-bottom: 4px;">${m.label}</div>
                <div class="comp-bar-container">
                    <div class="comp-bar-p1" style="width: ${p1Percent}%"></div>
                    <div class="comp-bar-p2" style="width: ${p2Percent}%"></div>
                </div>
            </div>
            <div style="font-weight: 700; text-align: right; color: ${isP2Better ? '#5dade2' : 'var(--text-primary)'}">${m.val2}</div>
        `;
        container.appendChild(row);
    });
}

export function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        state.currentUploadedPhoto = evt.target.result;
        const previewImg = document.getElementById("modal-avatar-img");
        const placeholder = document.getElementById("modal-avatar-placeholder");
        
        previewImg.src = evt.target.result;
        previewImg.style.display = "block";
        placeholder.style.display = "none";
    };
    reader.readAsDataURL(file);
}

export function resetPlayerForm() {
    state.editingPlayerId = null;
    document.getElementById("modal-player-title").innerText = "Yeni Oyuncu Ekle";
    document.getElementById("player-name").value = "";
    document.getElementById("player-age").value = "18";
    document.getElementById("player-nationality").value = "TÜRKİYE";
    document.getElementById("player-foot").value = "Sağ";
    document.getElementById("player-primary-pos").value = "ST";
    document.getElementById("player-secondary-pos").value = "";
    document.getElementById("player-squad-role").value = "Rotasyon";
    document.getElementById("player-photo-input").value = "";
    document.getElementById("player-height").value = "175";
    document.getElementById("player-weight").value = "70";
    document.getElementById("player-injury-status").value = "Sağlıklı";
    document.getElementById("player-coach-notes").value = "";
    
    document.getElementById("player-matches").value = "0";
    document.getElementById("player-goals").value = "0";
    document.getElementById("player-assists").value = "0";
    document.getElementById("player-yellow").value = "0";
    document.getElementById("player-red").value = "0";
    document.getElementById("player-match-rating").value = "6.0";

    document.getElementById("player-current-ability").value = "3";
    document.getElementById("player-potential-ability").value = "4";
    document.getElementById("player-parent-name").value = "";
    document.getElementById("player-parent-phone").value = "";
    document.getElementById("player-fee-status").value = "Ödenmedi";
    
    document.getElementById("player-blood-type").value = "Bilinmiyor";
    document.getElementById("player-chronic-illnesses").value = "";
    document.getElementById("player-allergies").value = "";
    document.getElementById("player-medications").value = "";

    document.getElementById("modal-avatar-img").style.display = "none";
    document.getElementById("modal-avatar-placeholder").style.display = "flex";
    
    const sliders = document.querySelectorAll(".attr-range-slider");
    sliders.forEach(s => {
        s.value = 50;
        const valId = "val-" + s.id.replace("input-", "");
        const span = document.getElementById(valId);
        if (span) span.innerText = "50";
    });
}

export function handleEditPlayerClick() {
    startInlineEdit();
}

// Start Direct Profile Inline Editing
export function startInlineEdit() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || !state.activePlayerId) return;
    
    const player = activeTeam.players.find(p => p.id === state.activePlayerId);
    if (!player) return;
    
    const panel = document.getElementById("player-detail-panel");
    if (panel) panel.classList.add("editing");
    
    // Populate inline inputs
    document.getElementById("edit-detail-name").value = player.name;
    document.getElementById("edit-detail-age").value = player.age;
    document.getElementById("edit-detail-nationality").value = player.nationality;
    document.getElementById("edit-detail-foot").value = player.foot;
    document.getElementById("edit-detail-height").value = player.height || 175;
    document.getElementById("edit-detail-weight").value = player.weight || 70;
    document.getElementById("edit-detail-squad-role").value = player.squadRole;
    document.getElementById("edit-detail-coach-notes").value = player.coachNotes || "";
    
    document.getElementById("edit-detail-blood-type").value = player.bloodType || "Bilinmiyor";
    document.getElementById("edit-detail-chronic-illnesses").value = player.chronicIllnesses || "";
    document.getElementById("edit-detail-allergies").value = player.allergies || "";
    document.getElementById("edit-detail-medications").value = player.medications || "";
    
    const attributeKeys = [
        "crossing", "finishing", "heading", "dribbling", "passing", "shooting", "freekick", "penalty", "volley", "longshots", "corner", "firsttouch", "technique", "tackling", "sliding", "longpassing", "curve",
        "decision", "vision", "determination", "teamwork", "positioning", "aggression", "anticipation", "bravery", "composure", "concentration", "leadership", "workrate",
        "pace", "acceleration", "stamina", "strength", "agility", "jumping", "balance", "naturalfitness", "flair",
        "gk_handling", "gk_kicking", "gk_reflexes", "gk_oneonones", "gk_aerial"
    ];
    
    attributeKeys.forEach(key => {
        const slider = document.getElementById("input-edit-" + key);
        if (slider) {
            slider.value = player.attributes[key] || 50;
            const badge = document.getElementById("attr-" + key);
            if (badge) badge.innerText = slider.value;
        }
    });
}

// Cancel Inline Editing
export function cancelInlineEdit() {
    const panel = document.getElementById("player-detail-panel");
    if (panel) panel.classList.remove("editing");
    if (state.activePlayerId) {
        selectPlayer(state.activePlayerId);
    }
}

// Save Inline Editing
export async function saveInlineEdit() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam || !state.activePlayerId) return;
    
    const player = activeTeam.players.find(p => p.id === state.activePlayerId);
    if (!player) return;
    
    const name = document.getElementById("edit-detail-name").value.trim();
    if (!name) {
        showToast("Lütfen oyuncu ismini girin.", "error");
        return;
    }
    
    const attributes = {};
    const attributeKeys = [
        "crossing", "finishing", "heading", "dribbling", "passing", "shooting", "freekick", "penalty", "volley", "longshots", "corner", "firsttouch", "technique", "tackling", "sliding", "longpassing", "curve",
        "decision", "vision", "determination", "teamwork", "positioning", "aggression", "anticipation", "bravery", "composure", "concentration", "leadership", "workrate",
        "pace", "acceleration", "stamina", "strength", "agility", "jumping", "balance", "naturalfitness", "flair",
        "gk_handling", "gk_kicking", "gk_reflexes", "gk_oneonones", "gk_aerial"
    ];
    
    attributeKeys.forEach(key => {
        const slider = document.getElementById("input-edit-" + key);
        attributes[key] = slider ? parseInt(slider.value) : (player.attributes[key] || 50);
    });
    
    const updatedPlayer = {
        ...player,
        name: name,
        age: parseInt(document.getElementById("edit-detail-age").value) || player.age,
        nationality: document.getElementById("edit-detail-nationality").value.trim().toUpperCase(),
        foot: document.getElementById("edit-detail-foot").value,
        height: parseInt(document.getElementById("edit-detail-height").value) || player.height,
        weight: parseInt(document.getElementById("edit-detail-weight").value) || player.weight,
        squadRole: document.getElementById("edit-detail-squad-role").value,
        coachNotes: document.getElementById("edit-detail-coach-notes").value.trim(),
        bloodType: document.getElementById("edit-detail-blood-type").value,
        chronicIllnesses: document.getElementById("edit-detail-chronic-illnesses").value.trim(),
        allergies: document.getElementById("edit-detail-allergies").value.trim(),
        medications: document.getElementById("edit-detail-medications").value.trim(),
        attributes: attributes
    };
    
    try {
        const res = await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPlayer)
        });
        if (res.ok) {
            const panel = document.getElementById("player-detail-panel");
            if (panel) panel.classList.remove("editing");
            
            const { loadData } = await import("./api.js");
            await loadData();
            selectPlayer(player.id);
            showToast("Oyuncu profili güncellendi.", "success");
        } else {
            showToast("Profil güncellenirken hata oluştu.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Profil güncellenirken hata oluştu.", "error");
    }
}

// Switch Detail Tab
export function switchDetailTab(tabId) {
    document.querySelectorAll(".detail-tab-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById(tabId);
    if (activeBtn) activeBtn.classList.add("active");
 
    const sections = [
        "section-detail-profile",
        "section-detail-attributes",
        "section-detail-performance",
        "section-detail-health",
        "section-detail-contact",
        "section-detail-archive"
    ];
 
    sections.forEach(secId => {
        const sec = document.getElementById(secId);
        if (sec) {
            if (secId === "section-" + tabId.replace("tab-", "")) {
                if (secId === "section-detail-profile" || secId === "section-detail-performance" || secId === "section-detail-contact") {
                    sec.style.display = "grid";
                } else {
                    sec.style.display = "block";
                }
                
                if (secId === "section-detail-archive" && state.activePlayerId) {
                    import("./archive.js").then(mod => {
                        mod.loadPlayerGallery(state.activePlayerId);
                        mod.loadPlayerArchive(state.activePlayerId);
                    });
                }
            } else {
                sec.style.display = "none";
            }
        }
    });
}
 
// EA FC 43 Attribute Descriptions in Turkish
const ATTRIBUTE_DESCRIPTIONS = {
    crossing: {
        name: "Orta Yapma (crossing)",
        desc: "Oyuncunun kanatlardan ceza sahasına kestiği ortaların isabetini ve kalitesini belirler."
    },
    finishing: {
        name: "Bitiricilik (finishing)",
        desc: "Oyuncunun ceza sahası içindeki şutlarının golle sonuçlanma ihtimalini belirler."
    },
    heading: {
        name: "Kafa Vuruşu (heading)",
        desc: "Oyuncunun kafa şutlarının ve kafa paslarının isabet oranını belirler."
    },
    dribbling: {
        name: "Top Sürme (dribbling)",
        desc: "Oyuncunun top ayağındayken yaptığı hareketlerin, dönüşlerin ve top kontrolünün kalitesini belirler."
    },
    passing: {
        name: "Pas (passing)",
        desc: "Oyuncunun takım arkadaşlarına attığı kısa ve uzun pasların isabetini ve hızını belirler."
    },
    shooting: {
        name: "Şut (shooting)",
        desc: "Oyuncunun şut gücü ile genel şut çekme kalitesini belirler."
    },
    freekick: {
        name: "Serbest Vuruş (freekick)",
        desc: "Oyuncunun duran toplarda barajın üzerinden veya yanından etkili şut çekme yeteneğini belirler."
    },
    penalty: {
        name: "Penaltı (penalty)",
        desc: "Oyuncunun penaltı vuruşlarındaki soğukkanlılığını ve şut isabetini belirler."
    },
    volley: {
        name: "Vole (volley)",
        desc: "Oyuncunun havadan gelen toplara gelişine yaptığı vuruşların kalitesini ve isabetini belirler."
    },
    longshots: {
        name: "Uzaktan Şut (longshots)",
        desc: "Oyuncunun ceza sahası dışından çektiği şutların isabetini ve tehlike derecesini belirler."
    },
    corner: {
        name: "Köşe Vuruşu (corner)",
        desc: "Oyuncunun korner atışlarında ceza sahasına kestiği ortaların kalitesini belirler."
    },
    firsttouch: {
        name: "İlk Temas (firsttouch)",
        desc: "Oyuncunun kendisine gelen pasları ne kadar yumuşak ve kontrol altında kontrol edebileceğini belirler."
    },
    technique: {
        name: "Teknik (technique)",
        desc: "Oyuncunun topla yaptığı estetik hareketleri ve zor vuruşları yapabilme becerisini belirler."
    },
    tackling: {
        name: "Ayakta Müdahale (tackling)",
        desc: "Oyuncunun rakibine ayakta müdahale ederek topu temiz bir şekilde kapabilme becerisidir."
    },
    sliding: {
        name: "Kayarak Müdahale (sliding)",
        desc: "Oyuncunun kayarak yaptığı müdahalelerde topu kapma ve faul yapmama oranını belirler."
    },
    longpassing: {
        name: "Uzun Pas (longpassing)",
        desc: "Oyuncunun havadan veya yerden uzun mesafeli paslarının hedefine ulaşma isabetini belirler."
    },
    curve: {
        name: "Falso (curve)",
        desc: "Oyuncunun şutlarına, ortalarına ve paslarına verdiği kavis (kavisli vuruş) derecesini belirler."
    },
    decision: {
        name: "Karar Verme (decision)",
        desc: "Oyuncunun saha içinde kritik durumlarda en doğru tercihi yapma hızını ve kalitesini belirler."
    },
    vision: {
        name: "Vizyon (vision)",
        desc: "Oyuncunun sahadaki boşlukları görme ve oyun kurma/pas kanalları yaratma becerini belirler."
    },
    positioning: {
        name: "Pozisyon Alma (positioning)",
        desc: "Oyuncunun saha yerleşimini doğru yapmasını ve hem savunmada hem hücumda doğru yerde bulunmasını sağlar."
    },
    determination: {
        name: "Kararlılık (determination)",
        desc: "Oyuncunun geriye düşülen maçlarda veya zor anlarda pes etmeyerek performansını koruma veya artırma gücüdür."
    },
    teamwork: {
        name: "Takım Oyunu (teamwork)",
        desc: "Oyuncunun taktiksel planlara sadık kalıp takım arkadaşlarıyla uyum içinde oynamasını belirler."
    },
    aggression: {
        name: "Agresiflik (aggression)",
        desc: "Oyuncunun ikili mücadelelerdeki hırsını ve savunmadaki baskı kurma isteğini belirler."
    },
    anticipation: {
        name: "Sezgi (anticipation)",
        desc: "Oyuncunun sahadaki gelişmeleri önceden sezerek doğru zamanda doğru pozisyonu almasını sağlar."
    },
    bravery: {
        name: "Cesaret (bravery)",
        desc: "Oyuncunun sakatlanma pahasına da olsa topa müdahale etme ve savunma yapma kararlılığını gösterir."
    },
    composure: {
        name: "Soğukkanlılık (composure)",
        desc: "Oyuncunun baskı altındayken panik yapmadan en doğru kararı verebilme yeteneğidir."
    },
    concentration: {
        name: "Konsantrasyon (concentration)",
        desc: "Oyuncunun maç süresince odaklanmasını korumasını ve basit hatalar yapmamasını belirler."
    },
    leadership: {
        name: "Liderlik (leadership)",
        desc: "Oyuncunun sahadaki takım arkadaşlarını organize etme ve onları motive etme beceridir."
    },
    workrate: {
        name: "Çalışkanlık (workrate)",
        desc: "Oyuncunun topsuz alanda yaptığı koşuları ve takım savunmasına verdiği desteği belirler."
    },
    pace: {
        name: "Hız (pace)",
        desc: "Oyuncunun topsuz veya toplu koşularda ulaşabildiği maksimum sürati belirler."
    },
    acceleration: {
        name: "Hızlanma (acceleration)",
        desc: "Oyuncunun durağan halden maksimum süratine ne kadar sürede çıkabildiğini belirler."
    },
    stamina: {
        name: "Dayanıklılık (stamina)",
        desc: "Oyuncunun kondisyonunun maç boyunca ne kadar yavaş tükeneceğini belirler."
    },
    strength: {
        name: "Güç (strength)",
        desc: "Oyuncunun ikili mücadelelerde ve topu korumadaki fiziksel üstünlüğünü belirler."
    },
    agility: {
        name: "Çeviklik (agility)",
        desc: "Oyuncunun yüksek hızdayken ne kadar hızlı yön değiştirebildiğini belirler."
    },
    jumping: {
        name: "Zıplama (jumping)",
        desc: "Oyuncunun hava toplarında ne kadar yükseğe sıçrayabileceğini belirler."
    },
    balance: {
        name: "Denge (balance)",
        desc: "Oyuncunun ikili mücadelelerde ve top sürerken ayakta kalabilme becerisini belirler."
    },
    naturalfitness: {
        name: "Doğal Zindelik (naturalfitness)",
        desc: "Oyuncunun sakatlıklardan sonra ne kadar hızlı iyileştiğini ve kondisyonunu ne kadar koruduğunu belirler."
    },
    flair: {
        name: "Yaratıcılık (flair)",
        desc: "Oyuncunun beklenmedik hareketler yapma ve rakip savunmayı şaşırtacak paslar/şutlar çıkarma becerisidir."
    },
    gk_handling: {
        name: "Elle Kontrol (gk_handling)",
        desc: "Kalecinin gelen şutları sektirmeden çift elle kontrol edebilme veya kavrayabilme yeteneğidir."
    },
    gk_kicking: {
        name: "Degaj (gk_kicking)",
        desc: "Kalecinin degaj veya ayakla yaptığı pasların/uzun topların isabetini ve mesafesini belirler."
    },
    gk_reflexes: {
        name: "Refleksler (gk_reflexes)",
        desc: "Kalecinin ani ve yakın mesafeli şutlarda ne kadar hızlı tepki verebildiğini belirler."
    },
    gk_oneonones: {
        name: "Bire Bir (gk_oneonones)",
        desc: "Kalecinin rakip forvetle karşı karşıya kaldığı pozisyonlardaki kurtarış başarısını belirler."
    },
    gk_aerial: {
        name: "Hava Hakimiyeti (gk_aerial)",
        desc: "Kalecinin yan ortalarda ve havadan gelen toplarda kalesini terk edip topu kontrolle alma becerisidir."
    }
};

export function updateAttributeDetailCard(key, value) {
    const data = ATTRIBUTE_DESCRIPTIONS[key];
    if (!data) return;

    const nameEl = document.getElementById("fc-detail-name");
    const valEl = document.getElementById("fc-detail-value");
    const descEl = document.getElementById("fc-detail-desc");

    if (nameEl) nameEl.innerText = data.name;
    if (valEl) valEl.innerText = value;
    if (descEl) descEl.innerText = data.desc;
}

export function initPlayerPrint() {
    const printBtn = document.getElementById("btn-print-scout");
    if (!printBtn) return;
    
    printBtn.addEventListener("click", () => {
        const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
        if (!activeTeam || !state.activePlayerId) {
            showToast("Lütfen yazdırmak için önce bir oyuncu seçin.", "error");
            return;
        }
        const player = activeTeam.players.find(p => p.id === state.activePlayerId);
        if (!player) return;
        
        // Populate printable karne elements
        document.getElementById("print-club-name").innerText = activeTeam.name || "KULÜP ADI";
        document.getElementById("print-player-id").innerText = `#${player.id}`;
        
        const today = new Date();
        const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        document.getElementById("print-date").innerText = `Tarih: ${formattedDate}`;
        
        const avatarContainer = document.getElementById("print-avatar-container");
        if (player.photo) {
            avatarContainer.innerHTML = `<img src="${player.photo}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            avatarContainer.innerHTML = "👤";
        }
        
        document.getElementById("print-player-name").innerText = player.name || "-";
        document.getElementById("print-player-position").innerText = player.primaryPosition || "-";
        document.getElementById("print-player-age").innerText = player.age || "-";
        document.getElementById("print-player-foot").innerText = player.foot || "-";
        document.getElementById("print-player-height").innerText = `${player.height || 175} cm`;
        document.getElementById("print-player-weight").innerText = `${player.weight || 70} kg`;
        
        const currentStars = "★".repeat(player.currentAbility || 3) + "☆".repeat(5 - (player.currentAbility || 3));
        document.getElementById("print-player-ability").innerText = currentStars;
        document.getElementById("print-player-role").innerText = player.squadRole || "-";
        
        // Populate attributes grid
        const attrNames = {
            pace: "Hız", acceleration: "Hızlanma", agility: "Çeviklik",
            finishing: "Bitiricilik", shooting: "Şut Çekme", passing: "Paslaşma",
            dribbling: "Top Sürme", crossing: "Orta Yapma", marking: "Markaj",
            positioning: "Pozisyon Alma", heading: "Kafa Vuruşu", stamina: "Dayanıklılık",
            strength: "Güç", vision: "Oyun Görüşü", decision: "Karar Verme",
            determination: "Kararlılık", teamwork: "Takım Oyunu"
        };
        
        let attrsHtml = "";
        Object.keys(attrNames).forEach(k => {
            const val = player.attributes[k] || 50;
            attrsHtml += `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding-bottom: 4px;">
                    <span style="font-weight: 500;">${attrNames[k]}:</span>
                    <span style="font-weight: 800;">${val}</span>
                </div>
            `;
        });
        document.getElementById("print-attributes-grid").innerHTML = attrsHtml;
        
        document.getElementById("print-stats-matches").innerText = player.matchesPlayed || 0;
        document.getElementById("print-stats-goals").innerText = player.goals || 0;
        document.getElementById("print-stats-assists").innerText = player.assists || 0;
        
        const overallRating = calculateWeightedRating(player.primaryPosition, player.attributes);
        document.getElementById("print-stats-rating").innerText = overallRating;
        
        document.getElementById("print-injury-status").innerText = player.injuryStatus || "Sağlıklı";
        
        const injuryHistorySummary = document.getElementById("active-injury-details-text")?.innerText || "Son sakatlık kaydı bulunmuyor.";
        document.getElementById("print-injury-history-summary").innerText = injuryHistorySummary;
        
        document.getElementById("print-blood-type").innerText = player.bloodType || "Bilinmiyor";
        document.getElementById("print-chronic-illnesses").innerText = player.chronicIllnesses || "Yok";
        document.getElementById("print-allergies").innerText = player.allergies || "Yok";
        document.getElementById("print-medications").innerText = player.medications || "Yok";
        
        document.getElementById("print-coach-notes").innerText = player.coachNotes || "Henüz değerlendirme notu girilmemiş.";
        
        // Call print API
        window.print();
    });
}

export function openAddCustomTemplateModal() {
    const titleEl = document.getElementById("custom-template-input-title");
    const textEl = document.getElementById("custom-template-input-text");
    if (titleEl) titleEl.value = "";
    if (textEl) textEl.value = "";
    openModal("modal-add-custom-template");
}

export function saveCustomTemplate() {
    const titleEl = document.getElementById("custom-template-input-title");
    const textEl = document.getElementById("custom-template-input-text");
    if (!titleEl || !textEl) return;
    
    const title = titleEl.value.trim();
    const text = textEl.value.trim();
    
    if (!title || !text) {
        showToast("Lütfen hem başlık hem şablon metnini girin.", "error");
        return;
    }
    
    let customTemplates = [];
    try {
        const stored = localStorage.getItem("fm_custom_parent_templates");
        if (stored) {
            customTemplates = JSON.parse(stored);
        }
    } catch(e) {}
    
    customTemplates.push({ title, text });
    localStorage.setItem("fm_custom_parent_templates", JSON.stringify(customTemplates));
    
    showToast("Özel şablon başarıyla kaydedildi.", "success");
    closeModal("modal-add-custom-template");
    
    // Trigger re-render of templates
    if (state.activePlayerId) {
        selectPlayer(state.activePlayerId);
    }
}

