import { closeModal, populateTeamManagement } from "./ui.js";
import { showToast, showConfirm } from "./utils.js";

// Seasons Management
export async function saveSeasonAction(payload) {
    try {
        const res = await fetch("/api/seasons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Sezon başarıyla kaydedildi.", "success");
            closeModal("modal-add-season");
            populateTeamManagement();
            return true;
        }
    } catch (e) {
        console.error(e);
        showToast("Sezon kaydedilirken hata oluştu.", "error");
    }
    return false;
}

export async function deleteSeasonAction(id) {
    const confirmed = await showConfirm("Bu sezonu silmek istediğinize emin misiniz?");
    if (!confirmed) return false;
    try {
        const res = await fetch(`/api/seasons?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Sezon silindi.", "success");
            populateTeamManagement();
            return true;
        }
    } catch (e) {
        console.error(e);
        showToast("Sezon silinirken hata oluştu.", "error");
    }
    return false;
}

export async function activateSeasonAction(id, teamId) {
    try {
        const res = await fetch("/api/seasons/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, team_id: teamId })
        });
        if (res.ok) {
            showToast("Sezon etkinleştirildi.", "success");
            populateTeamManagement();
            return true;
        }
    } catch (e) {
        console.error(e);
        showToast("Sezon etkinleştirilirken hata oluştu.", "error");
    }
    return false;
}

// Transfers Management
export async function saveTransferAction(payload) {
    try {
        const res = await fetch("/api/transfers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Transfer başarıyla kaydedildi.", "success");
            closeModal("modal-add-transfer");
            populateTeamManagement();
            return true;
        }
    } catch (e) {
        console.error(e);
        showToast("Transfer kaydedilirken hata oluştu.", "error");
    }
    return false;
}

export async function deleteTransferAction(id) {
    const confirmed = await showConfirm("Bu transfer kaydını silmek istediğinize emin misiniz?");
    if (!confirmed) return false;
    try {
        const res = await fetch(`/api/transfers?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Transfer kaydı silindi.", "success");
            populateTeamManagement();
            return true;
        }
    } catch (e) {
        console.error(e);
        showToast("Transfer silinirken hata oluştu.", "error");
    }
    return false;
}
