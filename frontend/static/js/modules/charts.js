import { state } from "./state.js";

// Render SVG Radar Chart dynamically
export function renderRadarChart(attrs, playerId = null) {
    const polygon = document.getElementById("radar-polygon");
    if (!polygon) return;
    
    const calculatePoints = (data) => {
        const speedScore = Math.round(((data.pace || 50) + (data.acceleration || 50) + (data.agility || 50)) / 3);
        const techScore = Math.round(((data.dribbling || 50) + (data.passing || 50) + (data.crossing || 50)) / 3);
        const attackScore = Math.round(((data.finishing || 50) + (data.shooting || 50) + (data.heading || 50)) / 3);
        const defenseScore = Math.round(((data.marking || 50) + (data.positioning || 50) + (data.strength || 50)) / 3);
        const mentalScore = Math.round(((data.decision || 50) + (data.vision || 50) + (data.determination || 50) + (data.teamwork || 50)) / 4);
        
        const scores = [speedScore, techScore, attackScore, defenseScore, mentalScore];
        const center = 100;
        const maxRadius = 80;
        let points = [];
        
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
            const radius = maxRadius * (scores[i] / 100);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            points.push(`${Math.round(x)},${Math.round(y)}`);
        }
        return points.join(" ");
    };
    
    polygon.setAttribute("points", calculatePoints(attrs));
    
    const polyHistory = document.getElementById("radar-polygon-history");
    if (polyHistory) {
        polyHistory.setAttribute("points", "");
    }
    
    if (playerId) {
        fetch(`/api/players/attributes-history?player_id=${playerId}`)
            .then(res => res.json())
            .then(history => {
                if (history && history.length > 1 && polyHistory) {
                    const oldRecord = history[0];
                    if (oldRecord && oldRecord.attributes) {
                        polyHistory.setAttribute("points", calculatePoints(oldRecord.attributes));
                        polyHistory.style.display = "block";
                    }
                } else if (polyHistory) {
                    polyHistory.style.display = "none";
                }
            })
            .catch(err => console.error("Error drawing historical radar:", err));
    }
}

export function drawProgressChart(history) {
    const canvas = document.getElementById("progress-chart-canvas");
    if (!canvas) return;
    
    // Set internal size to match bounding box for crisp styling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    if (!history || history.length === 0) {
        ctx.fillStyle = "#6b7280";
        ctx.font = "13px Outfit";
        ctx.textAlign = "center";
        ctx.fillText("Henüz gelişim geçmişi verisi bulunmuyor.", rect.width / 2, rect.height / 2);
        return;
    }
    
    const paddingLeft = 45;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 35;
    
    const width = rect.width - paddingLeft - paddingRight;
    const height = rect.height - paddingTop - paddingBottom;
    
    let ratings = history.map(h => h.rating);
    let minRating = Math.min(...ratings, 50);
    let maxRating = Math.max(...ratings, 100);
    
    minRating = Math.max(0, minRating - 5);
    maxRating = Math.min(100, maxRating + 5);
    const rangeY = maxRating - minRating;
    
    // Y Gridlines
    ctx.strokeStyle = "rgba(38, 49, 71, 0.4)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px Outfit";
    ctx.textAlign = "right";
    
    const grids = 4;
    for (let i = 0; i <= grids; i++) {
        const val = minRating + (rangeY * i / grids);
        const y = rect.height - paddingBottom - (height * i / grids);
        
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(rect.width - paddingRight, y);
        ctx.stroke();
        
        ctx.fillText(Math.round(val), paddingLeft - 8, y + 3);
    }
    
    // Calculate points
    const points = history.map((item, idx) => {
        const x = paddingLeft + (width * (history.length > 1 ? idx / (history.length - 1) : 0.5));
        const y = rect.height - paddingBottom - (height * (item.rating - minRating) / rangeY);
        return { x, y, date: item.date, rating: item.rating };
    });
    
    // Draw Line
    if (points.length > 0) {
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        // Fill Area
        ctx.fillStyle = "rgba(0, 255, 136, 0.04)";
        ctx.beginPath();
        ctx.moveTo(points[0].x, rect.height - paddingBottom);
        for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[points.length - 1].x, rect.height - paddingBottom);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw Dots
    points.forEach(pt => {
        ctx.fillStyle = "rgba(0, 255, 136, 0.35)";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = "#00ff88";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Value Label
        ctx.fillStyle = "#f3f4f6";
        ctx.font = "bold 9px Outfit";
        ctx.textAlign = "center";
        ctx.fillText(pt.rating, pt.x, pt.y - 9);
        
        // Date Label
        const parts = pt.date.split("-");
        const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : pt.date;
        ctx.fillStyle = "#9ca3af";
        ctx.font = "9px Outfit";
        ctx.fillText(displayDate, pt.x, rect.height - paddingBottom + 15);
    });
}

// Rating History & Chart Helpers
export async function loadRatingHistory(playerId) {
    try {
        const res = await fetch(`/api/players/history?player_id=${playerId}`);
        if (res.ok) {
            const data = await res.json();
            drawProgressChart(data);
        }
    } catch (e) {
        console.error("Gelişim geçmişi yüklenemedi", e);
    }
}

export async function loadMatchPerformance(playerId) {
    try {
        const res = await fetch(`/api/players/match-stats?player_id=${playerId}`);
        if (res.ok) {
            const data = await res.json();
            drawMatchPerformanceChart(data);
        }
    } catch (e) {
        console.error("Maç istatistikleri yüklenemedi", e);
    }
}

export function drawMatchPerformanceChart(history) {
    const canvas = document.getElementById("performance-chart-canvas");
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    if (!history || history.length === 0) {
        ctx.fillStyle = "#6b7280";
        ctx.font = "13px Outfit";
        ctx.textAlign = "center";
        ctx.fillText("Henüz bu oyuncunun maç istatistik verisi bulunmuyor.", rect.width / 2, rect.height / 2);
        return;
    }
    
    const paddingLeft = 35;
    const paddingRight = 35;
    const paddingTop = 25;
    const paddingBottom = 35;
    
    const width = rect.width - paddingLeft - paddingRight;
    const height = rect.height - paddingTop - paddingBottom;
    
    // Draw Y gridlines for Goals/Assists (left side) and Rating (right side)
    ctx.strokeStyle = "rgba(38, 49, 71, 0.4)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#9ca3af";
    ctx.font = "9px Outfit";
    
    // Draw grid lines
    const grids = 4;
    for (let i = 0; i <= grids; i++) {
        const y = rect.height - paddingBottom - (height * i / grids);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(rect.width - paddingRight, y);
        ctx.stroke();
    }
    
    const numMatches = history.length;
    const colWidth = width / numMatches;
    
    history.forEach((m, idx) => {
        const xCenter = paddingLeft + (idx * colWidth) + (colWidth / 2);
        
        // 1. Draw bars for Goals and Assists side-by-side
        const barWidth = Math.max(10, colWidth * 0.25);
        const maxVal = 4; // max scale for goals/assists
        
        // Goals bar (green)
        const gVal = m.goals || 0;
        const gHeight = (gVal / maxVal) * (height * 0.7); // limit to 70% height
        const gX = xCenter - barWidth - 2;
        const gY = rect.height - paddingBottom - gHeight;
        if (gVal > 0) {
            ctx.fillStyle = "#00ff88"; // Green accent
            ctx.fillRect(gX, gY, barWidth, gHeight);
            
            // Goal label
            ctx.fillStyle = "#fff";
            ctx.font = "bold 9px Outfit";
            ctx.textAlign = "center";
            ctx.fillText(gVal, gX + barWidth/2, gY - 4);
        }
        
        // Assists bar (sky blue)
        const aVal = m.assists || 0;
        const aHeight = (aVal / maxVal) * (height * 0.7);
        const aX = xCenter + 2;
        const aY = rect.height - paddingBottom - aHeight;
        if (aVal > 0) {
            ctx.fillStyle = "#0a84ff"; // Sky Blue
            ctx.fillRect(aX, aY, barWidth, aHeight);
            
            // Assist label
            ctx.fillStyle = "#fff";
            ctx.font = "bold 9px Outfit";
            ctx.textAlign = "center";
            ctx.fillText(aVal, aX + barWidth/2, aY - 4);
        }
        
        // Match label (Opponent & Date)
        ctx.fillStyle = "#9ca3af";
        ctx.font = "9px Outfit";
        ctx.textAlign = "center";
        let oppName = m.opponent || "Rakip";
        if (oppName.length > 8) oppName = oppName.substring(0, 6) + "..";
        ctx.fillText(oppName, xCenter, rect.height - paddingBottom + 12);
        
        const dateParts = (m.date || "").split("-");
        const displayDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : (m.date || "");
        ctx.fillStyle = "#6b7280";
        ctx.font = "8px Outfit";
        ctx.fillText(displayDate, xCenter, rect.height - paddingBottom + 22);
    });
    
    // 2. Draw Rating line
    const points = history.map((m, idx) => {
        const xCenter = paddingLeft + (idx * colWidth) + (colWidth / 2);
        const rating = m.rating || 6.0;
        // Map rating 0-10 to Y coordinate
        const y = rect.height - paddingBottom - (height * (rating / 10));
        return { x: xCenter, y, rating };
    });
    
    if (points.length > 0) {
        ctx.strokeStyle = "#ffd60a"; // Yellow line
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        points.forEach(pt => {
            // Draw Dot
            ctx.fillStyle = "rgba(255, 214, 10, 0.35)";
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = "#ffd60a";
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
            ctx.fill();
            
            // Rating label
            ctx.fillStyle = "#fff";
            ctx.font = "bold 9px Outfit";
            ctx.textAlign = "center";
            ctx.fillText(pt.rating.toFixed(1), pt.x, pt.y - 7);
        });
    }
    
    // Legend
    ctx.textAlign = "left";
    ctx.font = "9px Outfit";
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(paddingLeft, paddingTop - 15, 8, 8);
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Gol", paddingLeft + 12, paddingTop - 8);
    
    ctx.fillStyle = "#0a84ff";
    ctx.fillRect(paddingLeft + 40, paddingTop - 15, 8, 8);
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Asist", paddingLeft + 52, paddingTop - 8);
    
    ctx.fillStyle = "#ffd60a";
    ctx.beginPath();
    ctx.arc(paddingLeft + 85, paddingTop - 11, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Reyting (10)", paddingLeft + 94, paddingTop - 8);
}

export async function loadFinanceTrendChart(teamId) {
    try {
        const res = await fetch(`/api/finance/chart-data?team_id=${teamId || ''}`);
        if (res.ok) {
            const data = await res.json();
            drawFinanceTrendChart(data);
        }
    } catch (e) {
        console.error("Finans grafiği yüklenemedi", e);
    }
}

export function drawFinanceTrendChart(data) {
    const canvas = document.getElementById("finance-trend-chart");
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const paddingLeft = 55;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 35;
    
    const width = rect.width - paddingLeft - paddingRight;
    const height = rect.height - paddingTop - paddingBottom;
    
    const labels = data.labels || [];
    const income = data.income || [];
    const expenses = data.expenses || [];
    
    if (labels.length === 0) return;
    
    const maxVal = Math.max(...income, ...expenses, 1000) * 1.1;
    
    ctx.strokeStyle = "rgba(38, 49, 71, 0.4)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#9ca3af";
    ctx.font = "9px Outfit";
    ctx.textAlign = "right";
    
    const grids = 4;
    for (let i = 0; i <= grids; i++) {
        const val = (maxVal * i / grids);
        const y = rect.height - paddingBottom - (height * i / grids);
        
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(rect.width - paddingRight, y);
        ctx.stroke();
        
        ctx.fillText(Math.round(val) + " TL", paddingLeft - 8, y + 3);
    }
    
    const numMonths = labels.length;
    const colWidth = width / numMonths;
    
    labels.forEach((month, idx) => {
        const xCenter = paddingLeft + (idx * colWidth) + (colWidth / 2);
        const barWidth = Math.max(12, colWidth * 0.25);
        
        const incVal = income[idx] || 0;
        const incHeight = (incVal / maxVal) * height;
        const incX = xCenter - barWidth - 2;
        const incY = rect.height - paddingBottom - incHeight;
        
        ctx.fillStyle = "#00ff88";
        ctx.fillRect(incX, incY, barWidth, incHeight);
        if (incVal > 0) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 8px Outfit";
            ctx.textAlign = "center";
            ctx.fillText(Math.round(incVal), incX + barWidth/2, incY - 4);
        }
        
        const expVal = expenses[idx] || 0;
        const expHeight = (expVal / maxVal) * height;
        const expX = xCenter + 2;
        const expY = rect.height - paddingBottom - expHeight;
        
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(expX, expY, barWidth, expHeight);
        if (expVal > 0) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 8px Outfit";
            ctx.textAlign = "center";
            ctx.fillText(Math.round(expVal), expX + barWidth/2, expY - 4);
        }
        
        ctx.fillStyle = "#9ca3af";
        ctx.font = "9px Outfit";
        ctx.textAlign = "center";
        ctx.fillText(month, xCenter, rect.height - paddingBottom + 15);
    });
    
    ctx.textAlign = "left";
    ctx.font = "9px Outfit";
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(paddingLeft, paddingTop - 15, 8, 8);
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Gelir (Aidat)", paddingLeft + 12, paddingTop - 8);
    
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(paddingLeft + 90, paddingTop - 15, 8, 8);
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Gider", paddingLeft + 102, paddingTop - 8);
}


