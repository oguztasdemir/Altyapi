import { state } from "./state.js";
import { showToast } from "./utils.js";
import { 
    checkAdminStatus, updateAdminSettings, 
    getBackups, createManualBackup, restoreBackup
} from "./api.js";
import { openModal, closeModal, switchTab } from "./ui.js";

export function updateAdminUI() {
    const navAdmin = document.getElementById("nav-admin");
    if (navAdmin) {
        if (state.isAdminLoggedIn) {
            navAdmin.style.color = "var(--accent-color)";
        } else {
            navAdmin.style.color = "var(--text-muted)";
        }
    }

    const groupFinance = document.getElementById("group-finance");
    if (groupFinance) {
        if (state.isAdminLoggedIn) {
            groupFinance.style.display = "flex";
        } else {
            groupFinance.style.display = "none";
            if (["nav-finance", "nav-expenses", "nav-kits"].includes(state.activeTab)) {
                switchTab("nav-teams");
            }
        }
    }
}

export async function renderAdminView() {
    await checkAdminStatus();
    
    const dashboardPanel = document.getElementById("admin-dashboard-panel");
    if (!dashboardPanel) return;

    dashboardPanel.style.display = "block";
    
    // Populate inputs
    const feeEl = document.getElementById("admin-setting-fee");
    if (feeEl) feeEl.value = state.adminMonthlyFee;
    
    loadAndRenderBackups();
}

export async function handleAdminSaveSettings() {
    const fee = parseInt(document.getElementById("admin-setting-fee").value) || 500;
    const email = state.adminEmail || "";
    
    const ok = await updateAdminSettings(email, fee);
    if (ok) {
        showToast("Ayarlar başarıyla güncellendi.", "success");
        await checkAdminStatus();
        renderAdminView();
    }
}

export async function loadAndRenderBackups() {
    const tableBody = document.getElementById("backups-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">Yükleniyor...</td></tr>`;
    
    const backups = await getBackups();
    if (!backups || backups.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">Kayıtlı yedek bulunamadı.</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = "";
    backups.forEach(backup => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border-color)";
        
        tr.innerHTML = `
            <td style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-primary); font-weight: 500;">${escapeHtml(backup.timestamp)}</td>
            <td style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(backup.action)}</td>
            <td style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(backup.filename)}</td>
            <td style="padding: 12px 10px; font-size: 0.85rem; text-align: right; white-space: nowrap;">
                <button class="btn-primary btn-download-backup" data-filename="${escapeHtml(backup.filename)}" style="padding: 4px 8px; font-size: 0.75rem; margin-right: 6px;">İndir</button>
                <button class="btn-secondary btn-restore-backup" data-filename="${escapeHtml(backup.filename)}" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--accent-color); color: var(--accent-color);">Geri Yükle</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    
    // Bind download buttons
    tableBody.querySelectorAll(".btn-download-backup").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const filename = e.currentTarget.getAttribute("data-filename");
            window.open(`/api/backups/download?filename=${encodeURIComponent(filename)}`);
        });
    });
    
    // Bind restore buttons
    tableBody.querySelectorAll(".btn-restore-backup").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const filename = e.currentTarget.getAttribute("data-filename");
            if (confirm(`Uygulama veritabanını "${filename}" yedeğine geri yüklemek istediğinize emin misiniz? Mevcut verileriniz otomatik yedeklenecektir.`)) {
                showToast("Veritabanı geri yükleniyor...", "info");
                const res = await restoreBackup(filename);
                if (res && res.status === "success") {
                    showToast("Geri yükleme başarılı! Sayfa yenileniyor...", "success");
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showToast("Geri yükleme başarısız oldu.", "error");
                }
            }
        });
    });
}

export async function handleCreateManualBackup() {
    const desc = prompt("Yedekleme açıklaması yazın (isteğe bağlı):", "Manuel Yedek");
    if (desc === null) return; // cancelled
    
    showToast("Yedek alınıyor...", "info");
    const res = await createManualBackup(desc.trim() || "Manuel Yedek");
    if (res && res.status === "success") {
        showToast("Manuel yedek başarıyla oluşturuldu.", "success");
        await loadAndRenderBackups();
    } else {
        showToast("Yedek alınamadı.", "error");
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

