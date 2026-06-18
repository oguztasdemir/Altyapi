import { showToast, showConfirm } from "./utils.js";

// Matches Management Actions
export async function fetchMatches(teamId) {
    try {
        const res = await fetch(`/api/matches?team_id=${teamId}`);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error("Maç kayıtları yüklenemedi", e);
    }
    return [];
}

export async function saveMatchAction(matchPayload) {
    try {
        const res = await fetch("/api/matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(matchPayload)
        });
        if (res.ok) {
            const { loadData } = await import("./api.js");
            await loadData();
            showToast("Maç kaydı başarıyla eklendi.", "success");
            return true;
        }
    } catch (e) {
        console.error("Maç kaydedilemedi", e);
        showToast("Maç kaydedilirken hata oluştu.", "error");
    }
    return false;
}

export async function deleteMatchAction(matchId) {
    const confirmed = await showConfirm("Bu maç kaydını silmek istediğinize emin misiniz?");
    if (!confirmed) return false;
    try {
        const res = await fetch(`/api/matches?id=${matchId}`, { method: "DELETE" });
        if (res.ok) {
            const { loadData } = await import("./api.js");
            await loadData();
            showToast("Maç kaydı silindi.", "success");
            return true;
        }
    } catch (e) {
        console.error("Maç silinemedi", e);
        showToast("Maç silinirken hata oluştu.", "error");
    }
    return false;
}
