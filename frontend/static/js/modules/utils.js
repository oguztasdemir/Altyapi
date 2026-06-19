import { POSITION_WEIGHTS } from "./state.js";

// Calculate Weighted Rating based on position weights
export function calculateWeightedRating(position, attrs) {
    const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.SNT;
    let rating = 0;
    let weightSum = 0;
    
    for (const key in weights) {
        rating += (attrs[key] || 50) * weights[key];
        weightSum += weights[key];
    }
    
    const keys = Object.keys(attrs);
    const unweightedKeys = keys.filter(k => !(k in weights));
    let remainingAvg = 0;
    unweightedKeys.forEach(k => {
        remainingAvg += attrs[k] || 50;
    });
    
    if (unweightedKeys.length > 0) {
        remainingAvg /= unweightedKeys.length;
        rating = (rating * 0.80) + (remainingAvg * 0.20);
    }
    
    return Math.round(rating);
}

// Populate Attribute Badge with value and colors (0-100 scale)
export function populateAttributeBadge(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.innerText = value;
    el.className = "attr-val-badge";
    
    if (value >= 80) {
        el.classList.add("attr-excellent-bg");
    } else if (value >= 65) {
        el.classList.add("attr-good-bg");
    } else if (value >= 50) {
        el.classList.add("attr-average-bg");
    } else {
        el.classList.add("attr-poor-bg");
    }
}

// Color scale code based on 0-100 range
export function getAttributeColor(value) {
    if (value >= 80) return "var(--attr-excellent)";
    if (value >= 65) return "var(--attr-good)";
    if (value >= 50) return "var(--attr-average)";
    return "var(--attr-poor)";
}

export function formatDateText(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

// Custom Premium Toast Notification
export function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    // Add micro-icon based on type
    let icon = "";
    if (type === "success") {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:var(--accent-color);"><path d="M20 6L9 17l-5-5"></path></svg>`;
    } else if (type === "error") {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:#ff4444;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    } else {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    // Fade in
    setTimeout(() => toast.classList.add("show"), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Custom Premium Confirmation Modal
export function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("modal-confirm");
        const msgEl = document.getElementById("confirm-message");
        const yesBtn = document.getElementById("btn-confirm-yes");
        const noBtn = document.getElementById("btn-confirm-no");

        if (!modal || !msgEl || !yesBtn || !noBtn) {
            // Fallback to native if elements not in DOM
            resolve(window.confirm(message));
            return;
        }

        msgEl.innerText = message;
        modal.style.display = "flex";

        const handleYes = () => {
            modal.style.display = "none";
            yesBtn.removeEventListener("click", handleYes);
            noBtn.removeEventListener("click", handleNo);
            resolve(true);
        };

        const handleNo = () => {
            modal.style.display = "none";
            yesBtn.removeEventListener("click", handleYes);
            noBtn.removeEventListener("click", handleNo);
            resolve(false);
        };

        yesBtn.addEventListener("click", handleYes);
        noBtn.addEventListener("click", handleNo);
    });
}

