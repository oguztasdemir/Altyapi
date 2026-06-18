import { state } from "./state.js";
import { showToast } from "./utils.js";
import { switchTab } from "./ui.js";

// ──────────────────────────────────────────────
// GLOBAL SEARCH
// ──────────────────────────────────────────────
let _searchDebounce = null;

export function initGlobalSearch() {
    const input = document.getElementById("global-search-input");
    const dropdown = document.getElementById("global-search-dropdown");
    if (!input || !dropdown) return;

    input.addEventListener("input", () => {
        clearTimeout(_searchDebounce);
        const q = input.value.trim();
        if (q.length < 2) { dropdown.style.display = "none"; return; }
        _searchDebounce = setTimeout(() => fetchSearchResults(q), 300);
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#global-search-wrapper")) dropdown.style.display = "none";
    });
}

async function fetchSearchResults(q) {
    const dropdown = document.getElementById("global-search-dropdown");
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const results = await res.json();
        renderSearchDropdown(results, dropdown);
    } catch(e) {
        dropdown.style.display = "none";
    }
}

function renderSearchDropdown(results, dropdown) {
    if (!results.length) {
        dropdown.innerHTML = `<div style="padding:14px 16px; color:var(--text-muted); font-size:0.85rem;">Sonuç bulunamadı.</div>`;
        dropdown.style.display = "block";
        return;
    }
    const icons = { team: "🏟️", player: "👤", match: "⚽" };
    dropdown.innerHTML = results.map(r => `
        <div class="search-result-item" data-type="${r.type}" data-id="${r.id}"
            style="padding:10px 16px; cursor:pointer; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:10px; transition:background 0.15s;">
            <span style="font-size:1.1rem;">${icons[r.type] || "📌"}</span>
            <div>
                <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">${escHtml(r.label)}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${escHtml(r.sub)}</div>
            </div>
        </div>`).join("");
    dropdown.style.display = "block";

    dropdown.querySelectorAll(".search-result-item").forEach(item => {
        item.addEventListener("mouseenter", () => item.style.background = "var(--bg-card)");
        item.addEventListener("mouseleave", () => item.style.background = "");
        item.addEventListener("click", () => {
            const type = item.dataset.type;
            const id = item.dataset.id;
            dropdown.style.display = "none";
            document.getElementById("global-search-input").value = "";
            if (type === "team") switchTab("nav-teams");
            else if (type === "player") {
                switchTab("nav-teams");
                setTimeout(() => {
                    const el = document.querySelector(`[data-player-id="${id}"]`);
                    if (el) el.click();
                }, 400);
            } else if (type === "match") switchTab("nav-matches");
        });
    });
}

// ──────────────────────────────────────────────
// SESSION TIMEOUT (30 min)
// ──────────────────────────────────────────────
export function startSessionTimer() {}

// ──────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ──────────────────────────────────────────────
export function initKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        // Ignore when typing in inputs
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
            if (e.key === "Escape") {
                document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = "none");
            }
            return;
        }
        if (e.altKey) {
            switch(e.key.toLowerCase()) {
                case "n":
                    e.preventDefault();
                    document.getElementById("btn-add-player")?.click();
                    break;
                case "/":
                    e.preventDefault();
                    document.getElementById("global-search-input")?.focus();
                    break;
                case "f":
                    e.preventDefault();
                    if (state.isAdminLoggedIn) switchTab("nav-finance");
                    break;
                case "k":
                    e.preventDefault();
                    switchTab("nav-teams");
                    break;
                case "?":
                    e.preventDefault();
                    document.getElementById("modal-keyboard-shortcuts").style.display = "flex";
                    break;
            }
        }
        if (e.key === "Escape") {
            document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = "none");
        }
    });
}

// ──────────────────────────────────────────────
// AUDIT LOG UI
// ──────────────────────────────────────────────
export async function loadAndRenderAuditLog() {
    const tbody = document.getElementById("audit-log-table-body");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-muted);">Yükleniyor...</td></tr>`;
    try {
        const res = await fetch("/api/audit-log?limit=80");
        const logs = await res.json();
        if (!logs.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-muted);">Henüz kayıt yok.</td></tr>`;
            return;
        }
        const typeColors = { admin: "#4facfe", backup: "#00ff88", security: "#ff6b6b" };
        tbody.innerHTML = logs.map(l => `
            <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:9px 8px;font-size:0.8rem;color:var(--text-muted);white-space:nowrap;">${escHtml(l.timestamp)}</td>
                <td style="padding:9px 8px;font-size:0.82rem;color:var(--text-primary);font-weight:500;">${escHtml(l.action)}</td>
                <td style="padding:9px 8px;font-size:0.8rem;color:var(--text-secondary);">${escHtml(l.detail)}</td>
                <td style="padding:9px 8px;">
                    <span style="font-size:0.72rem;padding:2px 8px;border-radius:10px;background:${typeColors[l.entity_type]||"var(--bg-card)"};color:#000;font-weight:600;">
                        ${escHtml(l.entity_type||"sistem")}
                    </span>
                </td>
            </tr>`).join("");
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--attr-poor);">Günlük yüklenemedi.</td></tr>`;
    }
}

// ──────────────────────────────────────────────
// FINANCIAL KPI
// ──────────────────────────────────────────────
export async function loadFinanceKPI(teamId) {
    try {
        const url = teamId ? `/api/finance/kpi?team_id=${teamId}` : `/api/finance/kpi`;
        const res = await fetch(url);
        const kpi = await res.json();
        const fmt = (n) => Number(n).toLocaleString("tr-TR");
        const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        setEl("kpi-income", fmt(kpi.total_income));
        setEl("kpi-expense", fmt(kpi.total_expense));
        const balEl = document.getElementById("kpi-balance");
        if (balEl) {
            balEl.textContent = fmt(kpi.balance);
            balEl.style.color = kpi.balance >= 0 ? "var(--attr-excellent)" : "var(--attr-poor)";
        }
        setEl("kpi-fee-rate", `%${kpi.fee_rate}`);
        setEl("kpi-fee-detail", `${kpi.paid_players}/${kpi.total_players} ödeme`);
    } catch(e) {
        console.warn("KPI load failed", e);
    }
}

// ──────────────────────────────────────────────
// TRAINING LOAD
// ──────────────────────────────────────────────
export async function loadTrainingLoad(teamId) {
    const panel = document.getElementById("training-load-panel");
    if (!panel || !teamId) return;
    try {
        const res = await fetch(`/api/training/load?team_id=${teamId}`);
        const players = await res.json();
        if (!players.length) { panel.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">Antrenman verisi bulunamadı.</p>`; return; }
        const riskConfig = {
            high: { label: "Yüksek Yük 🔴", color: "#ff6b6b", bg: "rgba(255,107,107,0.1)" },
            normal: { label: "Normal 🟢", color: "#00ff88", bg: "rgba(0,255,136,0.1)" },
            low: { label: "Düşük 🟡", color: "#f7971e", bg: "rgba(247,151,30,0.1)" }
        };
        panel.innerHTML = players.map(pl => {
            const cfg = riskConfig[pl.risk] || riskConfig.normal;
            return `<div style="background:${cfg.bg};border:1px solid ${cfg.color}33;border-radius:10px;padding:12px;">
                <div style="font-size:0.8rem;font-weight:700;color:var(--text-primary);margin-bottom:4px;">${escHtml(pl.name)}</div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:8px;">${escHtml(pl.position||"")} · ${pl.sessions}/${pl.total} antrenman</div>
                <div style="height:6px;background:var(--border-color);border-radius:3px;">
                    <div style="height:100%;width:${pl.load_pct}%;background:${cfg.color};border-radius:3px;"></div>
                </div>
                <div style="font-size:0.7rem;color:${cfg.color};margin-top:5px;font-weight:600;">${cfg.label} (${pl.load_pct}%)</div>
            </div>`;
        }).join("");
    } catch(e) {
        panel.innerHTML = `<p style="color:var(--attr-poor);font-size:0.85rem;">Yük verisi alınamadı.</p>`;
    }
}

// ──────────────────────────────────────────────
// PARENT NOTIFICATION TEMPLATES
// ──────────────────────────────────────────────
export function getParentTemplates(playerName, parentName) {
    const pn = playerName || "Oyuncunuz";
    const par = parentName || "Sayın Veli";
    return [
        {
            title: "💳 Aidat Hatırlatması",
            text: `${par} Merhaba,\n${pn} için bu aya ait aidat ödemesi henüz gerçekleşmemiştir. Lütfen en kısa sürede işlemi tamamlayınız.\nAkademimize gösterdiğiniz ilgi için teşekkür ederiz.`
        },
        {
            title: "🏥 Sakatlık Bildirimi",
            text: `${par} Merhaba,\n${pn} bugünkü antrenman sırasında küçük bir rahatsızlık yaşamıştır. Durum ciddi değil ancak bir süre dinlendirilmesi önerilmektedir. Gerekli durumlarda lütfen iletişime geçin.`
        },
        {
            title: "⚽ Maç Daveti",
            text: `${par} Merhaba,\nTakımımızın yaklaşan maçında ${pn}'un sahada yer alması planlanmaktadır. Maç detayları için lütfen antrenörümüzle iletişime geçin.`
        },
        {
            title: "🏆 Tebrik Mesajı",
            text: `${par} Merhaba,\n${pn} son antrenmanlardaki performansı ve gösterdiği gelişimle akademimizde fark yaratmaktadır. Bu başarıyı ailesiyle paylaşmak istedik, tebrikler! 🎉`
        }
    ];
}

function escHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
