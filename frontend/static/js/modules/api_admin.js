import { state } from "./state.js";

export async function checkAdminStatus() {
    try {
        const res = await fetch("/api/admin/status");
        if (res.ok) {
            const data = await res.json();
            state.isAdminInitialized = data.is_initialized;
            state.adminEmail = data.email;
            state.adminEmailVerified = data.email_verified;
            state.adminMonthlyFee = data.monthly_fee;
        }
    } catch (e) {
        console.error("Failed to check admin status", e);
    }
}

export async function setupAdminPassword(password) {
    try {
        const res = await fetch("/api/admin/setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });
        return res.ok;
    } catch (e) {
        console.error("Setup password failed", e);
        return false;
    }
}

export async function loginAdmin(password) {
    try {
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });
        return res.ok;
    } catch (e) {
        console.error("Admin login failed", e);
        return false;
    }
}

export async function changeAdminPassword(currentPassword, newPassword) {
    try {
        const res = await fetch("/api/admin/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
        return res.ok;
    } catch (e) {
        console.error("Change password failed", e);
        return false;
    }
}

export async function updateAdminSettings(email, monthlyFee) {
    try {
        const res = await fetch("/api/admin/update-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, monthly_fee: monthlyFee })
        });
        return res.ok;
    } catch (e) {
        console.error("Update admin settings failed", e);
        return false;
    }
}

export async function sendAdminOTP(email) {
    try {
        const res = await fetch("/api/admin/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            const data = await res.json();
            return data;
        }
        return null;
    } catch (e) {
        console.error("Send OTP failed", e);
        return null;
    }
}

export async function verifyAdminOTP(email, code, isReset = false) {
    try {
        const res = await fetch("/api/admin/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, is_reset: isReset })
        });
        return res.ok;
    } catch (e) {
        console.error("Verify OTP failed", e);
        return false;
    }
}

export async function getBackups() {
    try {
        const res = await fetch("/api/backups");
        if (res.ok) {
            return await res.json();
        }
        return [];
    } catch (e) {
        console.error("Failed to load backups", e);
        return [];
    }
}

export async function createManualBackup(action) {
    try {
        const res = await fetch("/api/backups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action })
        });
        if (res.ok) {
            return await res.json();
        }
        return null;
    } catch (e) {
        console.error("Failed to create backup", e);
        return null;
    }
}

export async function restoreBackup(filename) {
    try {
        const res = await fetch("/api/backups/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename })
        });
        if (res.ok) {
            return await res.json();
        }
        return null;
    } catch (e) {
        console.error("Failed to restore backup", e);
        return null;
    }
}
