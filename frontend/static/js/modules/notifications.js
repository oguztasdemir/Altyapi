import { state } from "./state.js";
import { showToast } from "./utils.js";

const TEMPLATES = {
    dues: "Sayın [Veli Adı], [Oyuncu Adı] isimli sporcumuzun bu aya ait [Borç Tutar] TL aidat borcu bulunmaktadır. Ödemeyi en kısa sürede yapmanızı rica ederiz. İyi çalışmalar dileriz.",
    attendance: "Sayın [Veli Adı], [Oyuncu Adı] isimli sporcumuz son çalışmalara mazeretsiz olarak katılım sağlamamıştır. Sporcumuzun antrenman devam durumu, bireysel ve takım gelişimi açısından büyük önem taşımaktadır. Bilgilerinize sunarız.",
    training: "Sayın Velimiz ([Veli Adı]), [Oyuncu Adı] isimli sporcumuzun önümüzdeki antrenman programında/saatinde değişiklik yapılmıştır. Detaylı bilgi en kısa sürede iletilecektir. Bilgilerinize sunarız.",
    performance: "Sayın [Veli Adı], [Oyuncu Adı] isimli sporcumuzun son antrenman ve maçlardaki genel performansı, disiplini ve gelişim seyri son derece memnuniyet vericidir. Sporcumuzun takibini sürdürüyoruz. Destekleriniz için teşekkür ederiz."
};

export function initNotifications() {
    const select = document.getElementById("notification-template-select");
    const textarea = document.getElementById("notification-message-textarea");
    const sendBtn = document.getElementById("btn-send-whatsapp-notification");

    if (select && textarea && sendBtn) {
        select.addEventListener("change", () => {
            const templateKey = select.value;
            if (!templateKey) {
                textarea.value = "";
                return;
            }

            const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
            if (!activeTeam || !state.activePlayerId) {
                showToast("Lütfen önce bir oyuncu seçin.", "error");
                select.value = "";
                return;
            }

            const player = activeTeam.players.find(p => p.id === state.activePlayerId);
            if (!player) {
                showToast("Oyuncu bulunamadı.", "error");
                select.value = "";
                return;
            }

            let message = TEMPLATES[templateKey] || "";
            const veliAdi = player.parentName || "Veli";
            const oyuncuAdi = player.name || "Sporcu";
            const borcTutar = state.adminMonthlyFee || 500;

            message = message.replace(/\[Veli Adı\]/g, veliAdi)
                             .replace(/\[Oyuncu Adı\]/g, oyuncuAdi)
                             .replace(/\[Borç Tutar\]/g, borcTutar);

            textarea.value = message;
        });

        sendBtn.addEventListener("click", () => {
            const message = textarea.value.trim();
            if (!message) {
                showToast("Lütfen önce göndermek istediğiniz mesajı hazırlayın.", "warning");
                return;
            }

            navigator.clipboard.writeText(message)
                .then(() => {
                    showToast("Mesaj panoya kopyalandı!", "success");
                })
                .catch(err => {
                    console.error("Kopyalama hatası:", err);
                    showToast("Mesaj kopyalanamadı.", "error");
                });
        });
    }

    // Toggle dropdown
    const bellBtn = document.getElementById("btn-notification-center");
    const dropdown = document.getElementById("notification-dropdown");
    const refreshBtn = document.getElementById("btn-refresh-notifications");

    if (bellBtn && dropdown) {
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === "flex";
            dropdown.style.display = isVisible ? "none" : "flex";
            if (!isVisible) {
                updateNotificationCenter();
            }
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest("#notification-center-wrapper")) {
                dropdown.style.display = "none";
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            updateNotificationCenter();
        });
    }

    // Run initial counts on load
    setTimeout(updateNotificationCenter, 2000);
}

export async function updateNotificationCenter() {
    const list = document.getElementById("notification-list");
    const badge = document.getElementById("notification-badge");
    if (!list || !badge) return;

    list.innerHTML = "";
    let alerts = [];

    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    if (!activeTeam) {
        list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 10px 0;">Lütfen bir takım seçin.</div>`;
        badge.style.display = "none";
        badge.innerText = "0";
        return;
    }

    // 1. Injuries status check
    activeTeam.players.forEach(p => {
        if (p.injuryStatus && p.injuryStatus !== "Sağlıklı") {
            alerts.push({
                type: "injury",
                text: `🚨 <strong>${p.name}</strong> sakatlık aşamasında (${p.injuryStatus}).`,
                icon: "🏥"
            });
        }
    });

    // 2. Overdue fees check
    activeTeam.players.forEach(p => {
        if (p.feeStatus === "Gecikti") {
            alerts.push({
                type: "finance",
                text: `💰 <strong>${p.name}</strong> aidat ödemesini geciktirdi.`,
                icon: "💵"
            });
        }
    });

    // 3. Upcoming matches in next 3 days
    try {
        const matchRes = await fetch(`/api/matches?team_id=${activeTeam.id}`);
        if (matchRes.ok) {
            const matches = await matchRes.json();
            const now = new Date();
            const threeDaysLater = new Date();
            threeDaysLater.setDate(now.getDate() + 3);

            matches.forEach(m => {
                const matchDate = new Date(m.date);
                if (matchDate >= now && matchDate <= threeDaysLater) {
                    alerts.push({
                        type: "match",
                        text: `⚽ <strong>${m.opponent}</strong> ile yakın zamanda maç var! (${m.date.split("-").reverse().join("/")})`,
                        icon: "🏟️"
                    });
                }
            });
        }
    } catch(e) {
        console.error(e);
    }

    // 4. Low attendance rate warning (< 70%)
    try {
        const attRes = await fetch(`/api/attendance/analysis?team_id=${activeTeam.id}`);
        if (attRes.ok) {
            const analysis = await attRes.json();
            (analysis || []).forEach(p => {
                if (p.rate < 70) {
                    alerts.push({
                        type: "attendance",
                        text: `📋 <strong>${p.name}</strong> yoklama katılım oranı düşük: <strong>%${p.rate}</strong>`,
                        icon: "⚠️"
                    });
                }
            });
        }
    } catch(e) {
        console.error(e);
    }

    // Render alerts
    if (alerts.length === 0) {
        list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 10px 0;">Hiçbir kritik uyarı veya bildirim bulunmuyor.</div>`;
        badge.style.display = "none";
        badge.innerText = "0";
    } else {
        badge.innerText = alerts.length;
        badge.style.display = "flex";

        list.innerHTML = alerts.map(a => `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 8px 10px; font-size: 0.75rem; color: var(--text-primary); display: flex; gap: 8px; align-items: start;">
                <span style="font-size: 1rem; line-height: 1;">${a.icon}</span>
                <span style="line-height: 1.4;">${a.text}</span>
            </div>
        `).join("");
    }
}
