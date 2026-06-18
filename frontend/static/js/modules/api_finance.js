import { state } from "./state.js";
import { selectPlayer, closeModal } from "./ui.js";
import { showToast, showConfirm, formatDateText } from "./utils.js";

// Finance Dashboard Helpers
export async function loadFinanceData() {
    try {
        const url = state.activeTeamId ? `/api/finance?team_id=${state.activeTeamId}` : "/api/finance";
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            
            document.getElementById("finance-total-paid").innerText = data.total_paid.toLocaleString('tr-TR') + " TL";
            document.getElementById("finance-total-unpaid").innerText = data.total_unpaid.toLocaleString('tr-TR') + " TL";
            document.getElementById("finance-total-overdue").innerText = data.total_overdue.toLocaleString('tr-TR') + " TL";
            
            // Calculate comprehensive net balance (Dues Collected + Other Income - Expenses)
            let netBalance = data.total_paid;
            try {
                const expRes = await fetch("/api/finance/expenses");
                if (expRes.ok) {
                    const expenses = await expRes.json();
                    expenses.forEach(item => {
                        if (item.type === "Gider") {
                            netBalance -= item.amount;
                        } else if (item.type === "Gelir") {
                            netBalance += item.amount;
                        }
                    });
                }
            } catch (e) {
                console.error("Net bakiye hesaplanırken giderler yüklenemedi", e);
            }
            
            const netEl = document.getElementById("finance-net-balance");
            if (netEl) {
                netEl.innerText = netBalance.toLocaleString('tr-TR') + " TL";
                netEl.style.color = netBalance >= 0 ? "var(--attr-excellent)" : "var(--attr-poor)";
            }
            
            const standardFeeEl = document.getElementById("finance-standard-fee-display");
            if (standardFeeEl) standardFeeEl.innerText = (data.standard_fee || 0).toLocaleString('tr-TR') + " TL";
            
            // ---- All Players Fee Table ----
            const allTbody = document.getElementById("finance-all-players-tbody");
            if (allTbody) {
                allTbody.innerHTML = "";
                if (!data.all_players || data.all_players.length === 0) {
                    allTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Bu takımda kayıtlı oyuncu bulunmuyor.</td></tr>`;
                } else {
                    data.all_players.forEach(item => {
                        const tr = document.createElement("tr");
                        const isCustom = item.fee_discount_locked || (item.amount !== data.standard_fee);
                        const isLocked = item.fee_discount_locked;
                        
                        let statusBadge = '';
                        if (item.fee_status === "Ödendi") statusBadge = `<span class="badge-injury-resolved">ÖDENDİ</span>`;
                        else if (item.fee_status === "Gecikti") statusBadge = `<span class="badge-injury-active">GECİKTİ</span>`;
                        else statusBadge = `<span style="background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid var(--border-color); padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:600;">BEKLİYOR</span>`;
                        
                        const lockBadge = isLocked
                            ? `<span class="fee-lock-badge locked">🔒 KİLİTLİ</span>`
                            : `<span class="fee-lock-badge unlocked">🔓 Kilitsiz</span>`;
                        
                        const customBadge = isCustom ? `<span class="fee-custom-badge">Özel</span>` : '';
                        
                        tr.innerHTML = `
                            <td><strong>${item.name}</strong></td>
                            <td style="font-size: 0.8rem; color: var(--text-secondary);">${item.parent_name || '-'}</td>
                            <td style="text-align: center; font-weight: 700; color: ${isCustom ? '#ff9100' : 'var(--text-primary)'};">
                                ${item.amount.toLocaleString('tr-TR')} TL${customBadge}
                            </td>
                            <td style="text-align: center;">${statusBadge}</td>
                            <td style="text-align: center;">${lockBadge}</td>
                            <td style="text-align: center;">
                                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="window.openPlayerFeeModal('${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.amount}, ${isLocked}, ${data.standard_fee})">Ayarla</button>
                            </td>
                        `;
                        allTbody.appendChild(tr);
                    });
                }
            }
            
            // ---- Debtors Table ----
            const tbody = document.getElementById("finance-debtors-tbody");
            if (tbody) {
                tbody.innerHTML = "";
                
                if (data.debtors.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Ödemesi geciken veli bulunmuyor.</td></tr>`;
                    return;
                }
                
                data.debtors.forEach(item => {
                    const tr = document.createElement("tr");
                    const badgeClass = item.fee_status === "Gecikti" ? "badge-injury-active" : "badge-injury-resolved";
                    
                    const msgText = `Sayın ${item.parent_name}, ${item.name} isimli öğrencimizin geciken aidat tutarı (${item.amount.toLocaleString('tr-TR')} TL) için ödeme yapmanızı rica ederiz.`;
    
                    tr.innerHTML = `
                        <td><strong>${item.name}</strong></td>
                        <td>${item.parent_name}</td>
                        <td><a href="tel:${item.parent_phone}" style="color: var(--accent-color); text-decoration: none;">${item.parent_phone}</a></td>
                        <td><span class="${badgeClass}" style="text-transform: uppercase;">${item.fee_status}</span></td>
                        <td><strong>${item.amount.toLocaleString('tr-TR')} TL</strong></td>
                        <td>
                            <button class="btn-primary btn-copy-reminder" style="padding: 4px 10px; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 4px;">
                                📋 Hatırlat
                            </button>
                        </td>
                    `;
                    
                    const btn = tr.querySelector(".btn-copy-reminder");
                    btn.addEventListener("click", () => {
                        navigator.clipboard.writeText(msgText).then(() => {
                            showToast("Hatırlatma mesajı panoya kopyalandı.", "success");
                        }).catch(err => {
                            console.error(err);
                            showToast("Kopyalanamadı.", "error");
                        });
                    });
                    
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.error("Finansal veriler yüklenemedi", e);
    }
}

// Fee status direct update
export async function handleFeeStatusChange(e) {
    if (!state.isAdminLoggedIn || !state.activePlayerId) return;
    
    const newStatus = e.target.value;
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) return;
    
    const player = activeTeam.players.find(p => p.id === state.activePlayerId);
    if (!player) return;
    
    player.feeStatus = newStatus;
    
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
            const { loadData } = await import("./api.js");
            await loadData();
            selectPlayer(player.id);
        }
    } catch (err) {
        console.error("Aidat durumu güncellenemedi:", err);
    }
}

export async function loadExpensesData() {
    try {
        const res = await fetch("/api/finance/expenses");
        if (res.ok) {
            const data = await res.json();
            
            let extIncome = 0;
            let outcome = 0;
            let totalDues = 0;
            
            try {
                const finRes = await fetch(state.activeTeamId ? `/api/finance?team_id=${state.activeTeamId}` : "/api/finance");
                if (finRes.ok) {
                    const finData = await finRes.json();
                    totalDues = finData.total_paid || 0;
                }
            } catch(e) {
                console.error("Dues load failed", e);
            }
            
            data.forEach(item => {
                if (item.type === "Gelir") {
                    extIncome += item.amount;
                } else {
                    outcome += item.amount;
                }
            });
            
            const income = extIncome + totalDues;
            const net = income - outcome;
            
            document.getElementById("expenses-total-income").innerText = income.toLocaleString('tr-TR') + " TL";
            document.getElementById("expenses-total-outcome").innerText = outcome.toLocaleString('tr-TR') + " TL";
            document.getElementById("expenses-net-balance").innerText = net.toLocaleString('tr-TR') + " TL";
            
            if (net >= 0) {
                document.getElementById("expenses-net-balance").style.color = "var(--attr-excellent)";
            } else {
                document.getElementById("expenses-net-balance").style.color = "var(--attr-poor)";
            }
            
            const tbody = document.getElementById("expenses-list-tbody");
            tbody.innerHTML = "";
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Kayıtlı mali işlem bulunmuyor.</td></tr>`;
                return;
            }
            
            data.forEach(item => {
                const tr = document.createElement("tr");
                const isIncome = item.type === "Gelir";
                const typeText = isIncome ? "Gelir" : "Gider";
                const typeStyle = isIncome ? "color: var(--attr-excellent); font-weight: bold;" : "color: var(--attr-poor); font-weight: bold;";
                
                tr.innerHTML = `
                    <td><strong>${item.description}</strong></td>
                    <td><span class="badge-role">${item.category}</span></td>
                    <td>${formatDateText ? formatDateText(item.date) : item.date}</td>
                    <td><span style="${typeStyle}">${typeText}</span></td>
                    <td><strong>${item.amount.toLocaleString('tr-TR')} TL</strong></td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="handleEditExpenseClick('${item.id}', '${item.description.replace(/'/g, "\\'")}', '${item.category}', ${item.amount}, '${item.date}', '${item.type}')">Düzenle</button>
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; border-color:var(--attr-poor); color:var(--attr-poor);" onclick="handleDeleteExpense('${item.id}')">Sil</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Gider verileri yüklenemedi", e);
    }
}

export async function saveExpenseAction(expensePayload) {
    try {
        const res = await fetch("/api/finance/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expensePayload)
        });
        if (res.ok) {
            showToast("İşlem başarıyla kaydedildi.", "success");
            closeModal("modal-add-expense");
            await loadExpensesData();
            return true;
        }
    } catch (e) {
        console.error("İşlem kaydedilemedi", e);
        showToast("İşlem kaydedilirken hata oluştu.", "error");
    }
    return false;
}

export async function deleteExpenseAction(expenseId) {
    const confirmed = await showConfirm("Bu mali işlemi silmek istediğinize emin misiniz?");
    if (!confirmed) return false;
    try {
        const res = await fetch(`/api/finance/expenses?id=${expenseId}`, { method: "DELETE" });
        if (res.ok) {
            showToast("İşlem silindi.", "success");
            await loadExpensesData();
            return true;
        }
    } catch (e) {
        console.error("İşlem silinemedi", e);
        showToast("İşlem silinirken hata oluştu.", "error");
    }
    return false;
}

export async function loadKitsData() {
    try {
        const res = await fetch("/api/kits");
        if (res.ok) {
            const data = await res.json();
            const tbody = document.getElementById("kits-list-tbody");
            tbody.innerHTML = "";
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">Kayıtlı forma takibi bulunmuyor.</td></tr>`;
                return;
            }
            
            data.forEach(item => {
                const tr = document.createElement("tr");
                let badgeClass = "badge-injury-resolved";
                if (item.status === "Beklemede") badgeClass = "badge-injury-active";
                if (item.status === "Sipariş Edildi") badgeClass = "badge-role";
                
                let payBadgeClass = item.payment_status === "Ödendi" ? "badge-injury-resolved" : "badge-injury-active";
                const paymentStatus = item.payment_status || "Ödenmedi";
                
                tr.innerHTML = `
                    <td><strong>${item.player_name}</strong></td>
                    <td><span style="font-size:0.9rem; font-weight:bold; color:var(--accent-color);">${item.number ? '#' + item.number : '-'}</span></td>
                    <td><strong>${item.size}</strong></td>
                    <td><span class="${badgeClass}">${item.status}</span></td>
                    <td><span class="${payBadgeClass}">${paymentStatus}</span></td>
                    <td style="font-size:0.75rem; color:var(--text-secondary); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.notes}">${item.notes || "-"}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="handleEditKitClick('${item.id}', '${item.player_id}', '${item.size}', '${item.number}', '${item.status}', '${item.notes.replace(/'/g, "\\'")}', '${paymentStatus}')">Düzenle</button>
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; border-color:var(--attr-poor); color:var(--attr-poor);" onclick="handleDeleteKit('${item.id}')">Sil</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Forma verileri yüklenemedi", e);
    }
}

export async function saveKitAction(kitPayload) {
    try {
        const res = await fetch("/api/kits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(kitPayload)
        });
        if (res.ok) {
            showToast("Forma kaydı başarıyla kaydedildi.", "success");
            closeModal("modal-add-kit");
            await loadKitsData();
            return true;
        }
    } catch (e) {
        console.error("Forma kaydı kaydedilemedi", e);
        showToast("Forma kaydı kaydedilirken hata oluştu.", "error");
    }
    return false;
}

export async function deleteKitAction(kitId) {
    const confirmed = await showConfirm("Bu forma kaydını silmek istediğinize emin misiniz?");
    if (!confirmed) return false;
    try {
        const res = await fetch(`/api/kits?id=${kitId}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Forma kaydı silindi.", "success");
            await loadKitsData();
            return true;
        }
    } catch (e) {
        console.error("Forma kaydı silinemedi", e);
        showToast("Forma kaydı silinirken hata oluştu.", "error");
    }
    return false;
}

// ---------------------------------------------------------------------
// INCOME MANAGEMENT METHODS
// ---------------------------------------------------------------------

export async function loadIncomesData() {
    try {
        const res = await fetch("/api/finance/expenses");
        if (res.ok) {
            const data = await res.json();
            
            let extIncome = 0;
            let totalDues = 0;
            
            try {
                const finRes = await fetch(state.activeTeamId ? `/api/finance?team_id=${state.activeTeamId}` : "/api/finance");
                if (finRes.ok) {
                    const finData = await finRes.json();
                    totalDues = finData.total_paid || 0;
                }
            } catch(e) {
                console.error("Dues load failed", e);
            }
            
            data.forEach(item => {
                if (item.type === "Gelir") {
                    extIncome += item.amount;
                }
            });
            
            const totalNet = extIncome + totalDues;
            
            const incomeTotalEl = document.getElementById("incomes-total-income");
            if (incomeTotalEl) incomeTotalEl.innerText = extIncome.toLocaleString('tr-TR') + " TL";
            
            const duesTotalEl = document.getElementById("incomes-total-dues");
            if (duesTotalEl) duesTotalEl.innerText = totalDues.toLocaleString('tr-TR') + " TL";
            
            const netBalanceEl = document.getElementById("incomes-net-balance");
            if (netBalanceEl) {
                netBalanceEl.innerText = totalNet.toLocaleString('tr-TR') + " TL";
                netBalanceEl.style.color = "var(--attr-excellent)";
            }
            
            const tbody = document.getElementById("incomes-list-tbody");
            if (tbody) {
                tbody.innerHTML = "";
                
                const incomesOnly = data.filter(item => item.type === "Gelir");
                if (incomesOnly.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Kayıtlı gelir işlemi bulunmuyor.</td></tr>`;
                    return;
                }
                
                incomesOnly.forEach(item => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${item.description}</strong></td>
                        <td><span class="badge-role">${item.category}</span></td>
                        <td>${formatDateText ? formatDateText(item.date) : item.date}</td>
                        <td><span style="color: var(--attr-excellent); font-weight: bold;">Gelir</span></td>
                        <td><strong>${item.amount.toLocaleString('tr-TR')} TL</strong></td>
                        <td>
                            <div style="display:flex; gap:6px;">
                                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="window.handleEditIncomeClick('${item.id}', '${item.description.replace(/'/g, "\\'")}', '${item.category.replace(/'/g, "\\'")}', ${item.amount}, '${item.date}')">Düzenle</button>
                                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; border-color:var(--attr-poor); color:var(--attr-poor);" onclick="window.handleDeleteIncome('${item.id}')">Sil</button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.error("Gelir verileri yüklenemedi", e);
    }
}

export async function saveIncomeAction(incomePayload) {
    try {
        const res = await fetch("/api/finance/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(incomePayload)
        });
        if (res.ok) {
            let savedCats = localStorage.getItem("fm_income_categories");
            let cats = savedCats ? JSON.parse(savedCats) : ["Sponsor", "Bağış", "Kantin", "Turnuva", "Diğer"];
            if (incomePayload.category && !cats.includes(incomePayload.category)) {
                cats.push(incomePayload.category);
                localStorage.setItem("fm_income_categories", JSON.stringify(cats));
            }
            
            showToast("Gelir başarıyla kaydedildi.", "success");
            closeModal("modal-add-income");
            await loadIncomesData();
            updateIncomeSuggestions();
            return true;
        }
    } catch (e) {
        console.error("Gelir kaydedilemedi", e);
        showToast("Gelir kaydedilirken hata oluştu.", "error");
    }
    return false;
}

export async function deleteIncomeAction(incomeId) {
    const confirmed = await showConfirm("Bu gelir kaydını silmek istediğinize emin misiniz?");
    if (!confirmed) return false;
    try {
        const res = await fetch(`/api/finance/expenses?id=${incomeId}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Gelir kaydı silindi.", "success");
            await loadIncomesData();
            return true;
        }
    } catch (e) {
        console.error("Gelir silinemedi", e);
        showToast("Gelir silinirken hata oluştu.", "error");
    }
    return false;
}

export function updateIncomeSuggestions() {
    const datalist = document.getElementById("income-categories");
    if (!datalist) return;
    
    let savedCats = localStorage.getItem("fm_income_categories");
    let cats = savedCats ? JSON.parse(savedCats) : ["Sponsor", "Bağış", "Kantin", "Turnuva", "Diğer"];
    
    datalist.innerHTML = cats.map(cat => `<option value="${cat}"></option>`).join("");
}

// Global hook methods for inline onclick events
window.handleEditIncomeClick = function(id, description, category, amount, date) {
    document.getElementById("modal-income-title").innerText = "Gelir Kaydını Düzenle";
    document.getElementById("income-id-hidden").value = id;
    document.getElementById("income-input-description").value = description;
    document.getElementById("income-input-category").value = category;
    document.getElementById("income-input-amount").value = amount;
    document.getElementById("income-input-date").value = date;
    
    document.getElementById("modal-add-income").classList.add("active");
};

window.handleDeleteIncome = async function(id) {
    await deleteIncomeAction(id);
};
