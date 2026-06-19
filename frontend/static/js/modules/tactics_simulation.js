import { state } from "./state.js";
import { FORMATIONS } from "./player_tactical.js";
import { showToast } from "./utils.js";

// State for Mode 2: Manual Simulation
export const simState = {
    isActive: false,
    steps: [
        {
            playerPaths: {},     // slotKey -> array of coords [{left, bottom}]
            ballOwner: "",       // slotKey of player holding the ball
            action: "dribble",   // "dribble", "pass", "shot"
            passReceiver: "",    // slotKey of pass receiver
            drawnHistory: []     // Stack of slotKeys representing drawing order
        }
    ],
    currentStepIndex: 0,
    isPlaying: false,
    durationMs: 2000,
    animationFrameId: null,
    startTime: null,
    startPositions: {},        // default formation positions
    eraserMode: false
};

// State for Mode 3: AI Tactics Simulation
export const aiSimState = {
    isActive: false,
    steps: [
        {
            playerPaths: {},     // slotKey -> array of coords
            opponentPaths: {},   // OPP_slotKey -> array of coords
            ballOwner: "",       // slotKey of possessor
            action: "dribble",   // "dribble", "pass", "shot"
            passReceiver: "",    // slotKey of receiver
            aiPlayStyle: "tiki-taka",
            drawnHistory: []
        }
    ],
    currentStepIndex: 0,
    isPlaying: false,
    durationMs: 2000,
    animationFrameId: null,
    startTime: null,
    startPositions: {},
    opponents: [],
    eraserMode: false
};

const POSITION_MAP = {
    "GK": "KL", "CB": "STP", "LB": "SLB", "RB": "SĞB", "DM": "DOS", "CM": "OS",
    "LM": "SLK", "RM": "SĞK", "AM": "OOS", "ST": "SNT",
    "KL": "KL", "STP": "STP", "SLB": "SLB", "SĞB": "SĞB", "DOS": "DOS", "OS": "OS",
    "SLK": "SLK", "SĞK": "SĞK", "OOS": "OOS", "SNT": "SNT"
};

function translatePosition(pos) {
    return POSITION_MAP[pos] || pos;
}

function requireActiveLineup() {
    const activeTeam = state.teams.find(t => t.id === state.activeTeamId);
    const savedLineups = localStorage.getItem(`fm_lineups_${state.activeTeamId}`);
    let teamLineups = [];
    if (savedLineups) {
        try { teamLineups = JSON.parse(savedLineups); } catch(e) {}
    }
    const savedActiveId = localStorage.getItem(`fm_active_lineup_id_${state.activeTeamId}`);
    let activeLineup = teamLineups.find(l => l.id === savedActiveId) || teamLineups[0] || {
        formation: "4-3-3-holding",
        positions: {},
        bench: {}
    };
    return { activeTeam, getActiveLineup: () => activeLineup };
}

// -------------------------------------------------------------
// HELPERS FOR COORDINATES & FORMATIONS
// -------------------------------------------------------------
function getFormationPosition(slotKey, isAiMode = false) {
    const targetState = isAiMode ? aiSimState : simState;
    if (targetState.startPositions && targetState.startPositions[slotKey]) {
        return targetState.startPositions[slotKey];
    }
    const { getActiveLineup } = requireActiveLineup();
    const activeLineup = getActiveLineup();
    const formationName = activeLineup.formation || "4-3-3-holding";
    const nodes = FORMATIONS[formationName] || FORMATIONS["4-3-3-holding"];
    const nodeIndex = parseInt(slotKey.split("_").pop());
    const node = nodes[nodeIndex];
    if (node) {
        return { left: parseFloat(node.left), bottom: parseFloat(node.bottom) };
    }
    return { left: 50, bottom: 50 };
}

function getPlayerPositionAtStepStart(slotKey, stepIdx, isAiMode = false) {
    if (stepIdx <= 0) {
        return getFormationPosition(slotKey, isAiMode);
    }
    return getPlayerPositionAtStepEnd(slotKey, stepIdx - 1, isAiMode);
}

function getPlayerPositionAtStepEnd(slotKey, stepIdx, isAiMode = false) {
    const targetState = isAiMode ? aiSimState : simState;
    const step = targetState.steps[stepIdx];
    if (!step) return getFormationPosition(slotKey, isAiMode);
    const path = step.playerPaths[slotKey];
    if (path && path.length > 0) {
        return path[path.length - 1];
    }
    return getPlayerPositionAtStepStart(slotKey, stepIdx, isAiMode);
}

function getPlayerPositionAtProgress(slotKey, stepIdx, progress, isAiMode = false) {
    const targetState = isAiMode ? aiSimState : simState;
    const step = targetState.steps[stepIdx];
    if (!step) return getFormationPosition(slotKey, isAiMode);
    const path = step.playerPaths[slotKey];
    if (path && path.length >= 2) {
        const targetIdx = Math.floor(progress * (path.length - 1));
        const nextIdx = Math.min(targetIdx + 1, path.length - 1);
        const p1 = path[targetIdx];
        const p2 = path[nextIdx];
        const segmentProgress = (progress * (path.length - 1)) - targetIdx;
        return {
            left: p1.left + (p2.left - p1.left) * segmentProgress,
            bottom: p1.bottom + (p2.bottom - p1.bottom) * segmentProgress
        };
    }
    return getPlayerPositionAtStepStart(slotKey, stepIdx, isAiMode);
}

// Opponents (AI Mode Only)
function getOpponentPositionAtStepStart(slotKey, stepIdx) {
    if (stepIdx <= 0) {
        const opp = aiSimState.opponents.find(o => o.slotKey === slotKey);
        return opp ? opp.coords : { left: 50, bottom: 80 };
    }
    return getOpponentPositionAtStepEnd(slotKey, stepIdx - 1);
}

function getOpponentPositionAtStepEnd(slotKey, stepIdx) {
    const step = aiSimState.steps[stepIdx];
    if (!step) return { left: 50, bottom: 80 };
    const path = step.opponentPaths ? step.opponentPaths[slotKey] : null;
    if (path && path.length > 0) {
        return path[path.length - 1];
    }
    return getOpponentPositionAtStepStart(slotKey, stepIdx);
}

function getOpponentPositionAtProgress(slotKey, stepIdx, progress) {
    const step = aiSimState.steps[stepIdx];
    if (!step) return { left: 50, bottom: 80 };
    const path = step.opponentPaths ? step.opponentPaths[slotKey] : null;
    if (path && path.length >= 2) {
        const targetIdx = Math.floor(progress * (path.length - 1));
        const nextIdx = Math.min(targetIdx + 1, path.length - 1);
        const p1 = path[targetIdx];
        const p2 = path[nextIdx];
        const segmentProgress = (progress * (path.length - 1)) - targetIdx;
        return {
            left: p1.left + (p2.left - p1.left) * segmentProgress,
            bottom: p1.bottom + (p2.bottom - p1.bottom) * segmentProgress
        };
    }
    return getOpponentPositionAtStepStart(slotKey, stepIdx);
}

// -------------------------------------------------------------
// RENDERING & CANVAS DRAWING
// -------------------------------------------------------------
export function renderSimulationPitch() {
    const isAi = aiSimState.isActive;
    const prefix = isAi ? "ai" : "sim";
    const pitchField = document.getElementById(`${prefix}-pitch-field`);
    if (!pitchField) return;
    
    pitchField.querySelectorAll(`.sim-player-node`).forEach(n => n.remove());
    
    const { activeTeam, getActiveLineup } = requireActiveLineup();
    if (!activeTeam) return;
    
    const activeLineup = getActiveLineup();
    const formation = activeLineup.formation || "4-3-3-holding";
    const nodes = FORMATIONS[formation] || FORMATIONS["4-3-3-holding"];
    const targetState = isAi ? aiSimState : simState;
    
    nodes.forEach((node, index) => {
        const slotKey = `${node.pos}_${index}`;
        const assignedPlayerId = activeLineup.positions[slotKey];
        const player = assignedPlayerId ? activeTeam.players.find(p => p.id === assignedPlayerId) : null;
        
        const coords = getPlayerPositionAtStepStart(slotKey, targetState.currentStepIndex, isAi);
        
        const div = document.createElement("div");
        div.className = "sim-player-node";
        div.id = `${prefix}-node-${slotKey}`;
        div.style.position = "absolute";
        div.style.bottom = `${coords.bottom}%`;
        div.style.left = `${coords.left}%`;
        div.style.transform = "translate(-50%, 50%)";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.alignItems = "center";
        div.style.cursor = "pointer";
        div.style.zIndex = "10";
        div.setAttribute("data-slot", slotKey);
        
        const isPossessor = targetState.steps[targetState.currentStepIndex]?.ballOwner === slotKey;
        const turkishPos = translatePosition(node.pos);
        
        div.innerHTML = `
            <div class="lineup-shirt ${player ? 'assigned' : 'empty'}" style="width: 42px; height: 42px; border-radius: 50%; background: ${player ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}; color: ${player ? '#000' : '#fff'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; border: 2.5px solid ${isPossessor ? '#ffd60a' : (player ? '#fff' : 'rgba(255,255,255,0.4)')}; box-shadow: ${isPossessor ? '0 0 12px #ffd60a' : '0 4px 8px rgba(0,0,0,0.3)'};">
                ${player ? (player.name.charAt(0) + (player.name.split(" ")[1]?.charAt(0) || "")) : turkishPos}
            </div>
            <div class="lineup-label" style="background: rgba(0,0,0,0.85); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; margin-top: 5px; border: 1px solid rgba(255,255,255,0.15); max-width: 115px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: center;">
                ${player ? player.name.split(" ").pop() : "BOŞ"}
            </div>
        `;
        
        setupPathDrawingForNode(div, slotKey);
        pitchField.appendChild(div);
    });

    // Render Opponents (AI Mode Only)
    if (isAi && aiSimState.opponents) {
        aiSimState.opponents.forEach((opp) => {
            const slotKey = opp.slotKey;
            const coords = getOpponentPositionAtStepStart(slotKey, aiSimState.currentStepIndex);
            
            const div = document.createElement("div");
            div.className = "sim-player-node opponent-node";
            div.id = `${prefix}-node-${slotKey}`;
            div.style.position = "absolute";
            div.style.bottom = `${coords.bottom}%`;
            div.style.left = `${coords.left}%`;
            div.style.transform = "translate(-50%, 50%)";
            div.style.display = "flex";
            div.style.flexDirection = "column";
            div.style.alignItems = "center";
            div.style.cursor = "pointer";
            div.style.zIndex = "10";
            div.setAttribute("data-slot", slotKey);
            
            const isPossessor = aiSimState.steps[aiSimState.currentStepIndex]?.ballOwner === slotKey;
            
            div.innerHTML = `
                <div class="lineup-shirt opponent" style="width: 42px; height: 42px; border-radius: 50%; background: #ff453a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; border: 2.5px solid ${isPossessor ? '#ffd60a' : 'rgba(255,255,255,0.4)'}; box-shadow: ${isPossessor ? '0 0 12px #ffd60a' : '0 4px 8px rgba(0,0,0,0.3)'};">
                    ${opp.name.charAt(0) + (opp.name.split(" ")[1]?.charAt(0) || "")}
                </div>
                <div class="lineup-label" style="background: rgba(0,0,0,0.85); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; margin-top: 5px; border: 1px solid rgba(255,255,255,0.15); max-width: 115px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: center;">
                    ${opp.name.replace(" (Rakip)", "")}
                </div>
            `;
            
            setupPathDrawingForNode(div, slotKey);
            pitchField.appendChild(div);
        });
    }

    renderSimBall();
}

export function renderSimPitchNodes() {
    renderSimulationPitch();
}

function renderSimBall() {
    const isAi = aiSimState.isActive;
    const prefix = isAi ? "ai" : "sim";
    const pitchField = document.getElementById(`${prefix}-pitch-field`);
    if (!pitchField) return;

    let ballEl = document.getElementById(`${prefix}-ball`);
    if (!ballEl) {
        ballEl = document.createElement("div");
        ballEl.id = `${prefix}-ball`;
        ballEl.style.position = "absolute";
        ballEl.style.zIndex = "15";
        ballEl.style.fontSize = "1.3rem";
        ballEl.style.pointerEvents = "none";
        ballEl.style.display = "none";
        ballEl.innerHTML = "⚽";
        pitchField.appendChild(ballEl);
    }

    const targetState = isAi ? aiSimState : simState;
    const step = targetState.steps[targetState.currentStepIndex];
    if (step && step.ballOwner) {
        const isOwnerOpponent = step.ballOwner.startsWith("OPP_");
        const ownerPos = isOwnerOpponent
            ? getOpponentPositionAtStepStart(step.ballOwner, targetState.currentStepIndex)
            : getPlayerPositionAtStepStart(step.ballOwner, targetState.currentStepIndex, isAi);
        ballEl.style.display = "block";
        ballEl.style.left = `${ownerPos.left}%`;
        ballEl.style.bottom = `${ownerPos.bottom}%`;
        ballEl.style.transform = "translate(-50%, 50%) scale(1)";
    } else {
        ballEl.style.display = "none";
    }
}

export function drawAllPaths() {
    const isAi = aiSimState.isActive;
    const prefix = isAi ? "ai" : "sim";
    const canvas = document.getElementById(`${prefix}-pitch-canvas`);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = canvas.width;
    const height = canvas.height;
    const targetState = isAi ? aiSimState : simState;
    const step = targetState.steps[targetState.currentStepIndex];
    if (!step) return;
    
    // Draw paths for teammates
    for (const [slotKey, path] of Object.entries(step.playerPaths)) {
        if (!path || path.length < 2) continue;
        
        ctx.beginPath();
        const start = path[0];
        ctx.moveTo(start.left * width / 100, (100 - start.bottom) * height / 100);
        
        for (let i = 1; i < path.length; i++) {
            const pt = path[i];
            ctx.lineTo(pt.left * width / 100, (100 - pt.bottom) * height / 100);
        }
        
        ctx.strokeStyle = "rgba(0, 255, 136, 0.75)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        
        // Arrowhead
        ctx.setLineDash([]);
        const end = path[path.length - 1];
        const prev = path[path.length - 2];
        const endX = end.left * width / 100;
        const endY = (100 - end.bottom) * height / 100;
        const prevX = prev.left * width / 100;
        const prevY = (100 - prev.bottom) * height / 100;
        
        const angle = Math.atan2(endY - prevY, endX - prevX);
        ctx.fillStyle = "rgba(0, 255, 136, 0.9)";
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 12 * Math.cos(angle - Math.PI / 6), endY - 12 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - 12 * Math.cos(angle + Math.PI / 6), endY - 12 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    // Draw opponent paths
    if (isAi && step.opponentPaths) {
        for (const [slotKey, path] of Object.entries(step.opponentPaths)) {
            if (!path || path.length < 2) continue;
            
            ctx.beginPath();
            const start = path[0];
            ctx.moveTo(start.left * width / 100, (100 - start.bottom) * height / 100);
            
            for (let i = 1; i < path.length; i++) {
                const pt = path[i];
                ctx.lineTo(pt.left * width / 100, (100 - pt.bottom) * height / 100);
            }
            
            ctx.strokeStyle = "rgba(255, 69, 58, 0.55)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
        }
    }

    // Draw Ball action line
    if (step.ballOwner) {
        const isOwnerOpponent = step.ballOwner.startsWith("OPP_");
        const ownerPos = isOwnerOpponent
            ? getOpponentPositionAtStepEnd(step.ballOwner, targetState.currentStepIndex)
            : getPlayerPositionAtStepEnd(step.ballOwner, targetState.currentStepIndex, isAi);
        const ownerX = ownerPos.left * width / 100;
        const ownerY = (100 - ownerPos.bottom) * height / 100;

        if (step.action === "pass" && step.passReceiver) {
            const isRcOpponent = step.passReceiver.startsWith("OPP_");
            const rcPos = isRcOpponent
                ? getOpponentPositionAtStepEnd(step.passReceiver, targetState.currentStepIndex)
                : getPlayerPositionAtStepEnd(step.passReceiver, targetState.currentStepIndex, isAi);
            const rcX = rcPos.left * width / 100;
            const rcY = (100 - rcPos.bottom) * height / 100;

            ctx.beginPath();
            ctx.moveTo(ownerX, ownerY);
            ctx.lineTo(rcX, rcY);
            ctx.strokeStyle = "rgba(255, 214, 10, 0.8)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(rcX, rcY, 6, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(255, 214, 10, 0.9)";
            ctx.fill();
        } else if (step.action === "shot") {
            const goalX = 50 * width / 100;
            const goalY = isOwnerOpponent ? (100 - 3) * height / 100 : (100 - 97) * height / 100;

            ctx.beginPath();
            ctx.moveTo(ownerX, ownerY);
            ctx.lineTo(goalX, goalY);
            ctx.strokeStyle = "rgba(255, 69, 58, 0.8)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(goalX, goalY, 8, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(255, 69, 58, 0.9)";
            ctx.fill();
        }
    }
}

function setupPathDrawingForNode(node, slotKey) {
    const isAi = aiSimState.isActive;
    const prefix = isAi ? "ai" : "sim";
    const pitch = document.getElementById(`${prefix}-pitch-field`);
    let currentPath = [];
    const isOpponent = slotKey.startsWith("OPP_");
    const targetState = isAi ? aiSimState : simState;
    
    const onMouseMove = (e) => {
        if (targetState.isPlaying) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const pitchRect = pitch.getBoundingClientRect();
        
        const leftPercent = ((clientX - pitchRect.left) / pitchRect.width) * 100;
        const bottomPercent = (1 - (clientY - pitchRect.top) / pitchRect.height) * 100;
        
        const leftClamped = Math.min(Math.max(leftPercent, 1), 99);
        const bottomClamped = Math.min(Math.max(bottomPercent, 1), 99);
        
        node.style.left = `${leftClamped}%`;
        node.style.bottom = `${bottomClamped}%`;
        
        currentPath.push({ left: leftClamped, bottom: bottomClamped });
        
        const step = targetState.steps[targetState.currentStepIndex];
        if (step) {
            if (isOpponent) {
                if (!step.opponentPaths) step.opponentPaths = {};
                step.opponentPaths[slotKey] = currentPath;
            } else {
                step.playerPaths[slotKey] = currentPath;
            }
        }
        drawAllPaths();
    };
    
    const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchmove", onMouseMove);
        document.removeEventListener("touchend", onMouseUp);
        
        const start = isOpponent
            ? getOpponentPositionAtStepStart(slotKey, targetState.currentStepIndex)
            : getPlayerPositionAtStepStart(slotKey, targetState.currentStepIndex, isAi);
        if (start) {
            node.style.left = `${start.left}%`;
            node.style.bottom = `${start.bottom}%`;
        }
        
        const step = targetState.steps[targetState.currentStepIndex];
        if (step && currentPath.length > 1) {
            if (!step.drawnHistory) step.drawnHistory = [];
            step.drawnHistory = step.drawnHistory.filter(k => k !== slotKey);
            step.drawnHistory.push(slotKey);
        }
        
        drawAllPaths();
    };
    
    const onMouseDown = (e) => {
        if (targetState.isPlaying) return;
        e.preventDefault();
        
        if (targetState.eraserMode) {
            const step = targetState.steps[targetState.currentStepIndex];
            if (step) {
                if (isOpponent && step.opponentPaths && step.opponentPaths[slotKey]) {
                    delete step.opponentPaths[slotKey];
                } else if (!isOpponent && step.playerPaths[slotKey]) {
                    delete step.playerPaths[slotKey];
                }
                if (step.drawnHistory) {
                    step.drawnHistory = step.drawnHistory.filter(k => k !== slotKey);
                }
                drawAllPaths();
                showToast("Oyuncunun koşu yolu silindi.", "info");
            }
            return;
        }
        
        const start = isOpponent
            ? getOpponentPositionAtStepStart(slotKey, targetState.currentStepIndex)
            : getPlayerPositionAtStepStart(slotKey, targetState.currentStepIndex, isAi);
        currentPath = [{ left: start.left, bottom: start.bottom }];
        
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("touchmove", onMouseMove, { passive: false });
        document.addEventListener("touchend", onMouseUp);
    };
    
    node.addEventListener("mousedown", onMouseDown);
    node.addEventListener("touchstart", onMouseDown, { passive: false });
}

export function resizeSimCanvas() {
    const isAi = aiSimState.isActive;
    const prefix = isAi ? "ai" : "sim";
    const canvas = document.getElementById(`${prefix}-pitch-canvas`);
    const pitch = document.getElementById(`${prefix}-pitch-field`);
    if (!canvas || !pitch) return;
    
    canvas.width = pitch.clientWidth;
    canvas.height = pitch.clientHeight;
}

// -------------------------------------------------------------
// PLAYBACK / ANIMATION
// -------------------------------------------------------------
export function animateSimulation(timestamp) {
    const isAi = aiSimState.isActive;
    const targetState = isAi ? aiSimState : simState;
    if (!targetState.isPlaying) return;
    if (!targetState.startTime) targetState.startTime = timestamp;
    
    const elapsed = timestamp - targetState.startTime;
    const totalDuration = targetState.steps.length * targetState.durationMs;
    const progress = Math.min(elapsed / totalDuration, 1);
    
    let currentStepIdx = Math.floor(elapsed / targetState.durationMs);
    if (currentStepIdx >= targetState.steps.length) {
        currentStepIdx = targetState.steps.length - 1;
    }
    const stepProgress = (elapsed % targetState.durationMs) / targetState.durationMs;
    
    const step = targetState.steps[currentStepIdx];
    const { activeTeam, getActiveLineup } = requireActiveLineup();
    const prefix = isAi ? "ai" : "sim";
    
    if (activeTeam) {
        const activeLineup = getActiveLineup();
        const formation = activeLineup.formation || "4-3-3-holding";
        const nodes = FORMATIONS[formation] || FORMATIONS["4-3-3-holding"];
        
        nodes.forEach((node, index) => {
            const slotKey = `${node.pos}_${index}`;
            const playerNode = document.getElementById(`${prefix}-node-${slotKey}`);
            if (playerNode) {
                const pos = getPlayerPositionAtProgress(slotKey, currentStepIdx, stepProgress, isAi);
                playerNode.style.left = `${pos.left}%`;
                playerNode.style.bottom = `${pos.bottom}%`;
            }
        });
    }

    // Move opponents
    if (isAi && aiSimState.opponents) {
        aiSimState.opponents.forEach((opp) => {
            const slotKey = opp.slotKey;
            const oppNode = document.getElementById(`${prefix}-node-${slotKey}`);
            if (oppNode) {
                const pos = getOpponentPositionAtProgress(slotKey, currentStepIdx, stepProgress);
                oppNode.style.left = `${pos.left}%`;
                oppNode.style.bottom = `${pos.bottom}%`;
            }
        });
    }

    const ballEl = document.getElementById(`${prefix}-ball`);
    if (ballEl) {
        if (step && step.ballOwner) {
            ballEl.style.display = "block";
            const ownerPos = step.ballOwner.startsWith("OPP_")
                ? getOpponentPositionAtProgress(step.ballOwner, currentStepIdx, stepProgress)
                : getPlayerPositionAtProgress(step.ballOwner, currentStepIdx, stepProgress, isAi);
            
            let curveOffset = 0;
            let scaleOffset = 1;
            
            if (step.action === "pass" && step.passReceiver) {
                const receiverPos = step.passReceiver.startsWith("OPP_")
                    ? getOpponentPositionAtProgress(step.passReceiver, currentStepIdx, stepProgress)
                    : getPlayerPositionAtProgress(step.passReceiver, currentStepIdx, stepProgress, isAi);
                const ballLeft = ownerPos.left + (receiverPos.left - ownerPos.left) * stepProgress;
                const ballBottom = ownerPos.bottom + (receiverPos.bottom - ownerPos.bottom) * stepProgress;
                ballEl.style.left = `${ballLeft}%`;
                ballEl.style.bottom = `${ballBottom}%`;
                
                const heightFactor = Math.sin(stepProgress * Math.PI);
                curveOffset = -heightFactor * 30; // 30px max vertical arc
                scaleOffset = 1 + heightFactor * 0.3; // scale up by 30% in mid-air
            } else if (step.action === "shot") {
                const isOwnerOpponent = step.ballOwner.startsWith("OPP_");
                const goalLeft = 50;
                const goalBottom = isOwnerOpponent ? 3 : 97;
                const ballLeft = ownerPos.left + (goalLeft - ownerPos.left) * stepProgress;
                const ballBottom = ownerPos.bottom + (goalBottom - ownerPos.bottom) * stepProgress;
                ballEl.style.left = `${ballLeft}%`;
                ballEl.style.bottom = `${ballBottom}%`;
                
                const heightFactor = Math.sin(stepProgress * Math.PI);
                curveOffset = -heightFactor * 45; // 45px max vertical arc for shots
                scaleOffset = 1 + heightFactor * 0.4; // scale up by 40% in mid-air
            } else {
                ballEl.style.left = `${ownerPos.left}%`;
                ballEl.style.bottom = `${ownerPos.bottom}%`;
            }
            ballEl.style.transform = `translate(-50%, 50%) translateY(${curveOffset}px) scale(${scaleOffset}) rotate(${progress * 1080}deg)`;
        } else {
            ballEl.style.display = "none";
        }
    }
    
    if (progress < 1) {
        targetState.animationFrameId = requestAnimationFrame(animateSimulation);
    } else {
        stopPlaybackWithoutReset();
    }
}

export function stopPlaybackWithoutReset() {
    const isAi = aiSimState.isActive;
    const targetState = isAi ? aiSimState : simState;
    const prefix = isAi ? "ai" : "sim";
    
    const playBtn = document.getElementById(`btn-${prefix}-play`);
    if (playBtn) {
        playBtn.innerText = "▶️ Yeniden Oynat";
        playBtn.style.background = "var(--accent-color)";
        playBtn.style.color = "#000";
        playBtn.style.borderColor = "var(--accent-color)";
    }
    
    targetState.isPlaying = false;
    if (targetState.animationFrameId) {
        cancelAnimationFrame(targetState.animationFrameId);
        targetState.animationFrameId = null;
    }
}

export function startPlayback() {
    const isAi = aiSimState.isActive;
    const targetState = isAi ? aiSimState : simState;
    const prefix = isAi ? "ai" : "sim";
    const playBtn = document.getElementById(`btn-${prefix}-play`);
    if (playBtn) {
        playBtn.innerText = "⏸️ Durdur";
        playBtn.style.background = "#ff453a";
        playBtn.style.color = "#fff";
        playBtn.style.borderColor = "#ff453a";
    }
    
    const speedSelect = document.getElementById(`select-${prefix}-speed`);
    if (speedSelect) {
        targetState.durationMs = parseInt(speedSelect.value) || 2000;
    }
    
    targetState.isPlaying = true;
    targetState.startTime = null;
    renderSimulationPitch();
    targetState.animationFrameId = requestAnimationFrame(animateSimulation);
}

export function stopPlayback() {
    const isAi = aiSimState.isActive;
    const targetState = isAi ? aiSimState : simState;
    const prefix = isAi ? "ai" : "sim";
    const playBtn = document.getElementById(`btn-${prefix}-play`);
    if (playBtn) {
        playBtn.innerText = "▶️ Oynat";
        playBtn.style.background = "var(--accent-color)";
        playBtn.style.color = "#000";
        playBtn.style.borderColor = "var(--accent-color)";
    }
    
    targetState.isPlaying = false;
    if (targetState.animationFrameId) {
        cancelAnimationFrame(targetState.animationFrameId);
        targetState.animationFrameId = null;
    }
    renderSimulationPitch();
}

export function resetSimulation() {
    stopPlayback();
    const targetState = aiSimState.isActive ? aiSimState : simState;
    targetState.currentStepIndex = 0;
    renderSimulationPitch();
    renderStepTabs();
    updateStepDropdowns();
    drawAllPaths();
    showToast("Simülasyon başlangıç konumuna sıfırlandı.", "info");
}

export function clearAllPaths() {
    stopPlayback();
    const isAi = aiSimState.isActive;
    if (isAi) {
        aiSimState.steps = [{
            playerPaths: {},
            opponentPaths: {},
            ballOwner: "",
            action: "dribble",
            passReceiver: "",
            aiPlayStyle: "tiki-taka",
            drawnHistory: []
        }];
        aiSimState.opponents = [];
        aiSimState.currentStepIndex = 0;
    } else {
        simState.steps = [{
            playerPaths: {},
            ballOwner: "",
            action: "dribble",
            passReceiver: "",
            drawnHistory: []
        }];
        simState.currentStepIndex = 0;
    }
    renderSimulationPitch();
    renderStepTabs();
    updateStepDropdowns();
    drawAllPaths();
    showToast("Tüm adımlar ve yollar temizlendi.", "info");
}

window.selectSimStep = function(idx) {
    const isAi = aiSimState.isActive;
    const targetState = isAi ? aiSimState : simState;
    if (targetState.isPlaying) stopPlayback();
    targetState.currentStepIndex = idx;
    renderSimulationPitch();
    renderStepTabs();
    updateStepDropdowns();
    drawAllPaths();
};

function renderStepsTimeline() {
    const isAi = aiSimState.isActive;
    const prefix = isAi ? "ai" : "sim";
    const container = document.getElementById(`${prefix}-steps-timeline-container`);
    const badge = document.getElementById(`${prefix}-steps-count-badge`);
    if (!container) return;

    const targetState = isAi ? aiSimState : simState;
    if (badge) {
        badge.textContent = `${targetState.steps.length} Adım`;
    }

    if (!targetState.steps || targetState.steps.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.75rem; text-align: center; padding: 20px 0;">Henüz adım eklenmedi.</div>`;
        return;
    }

    const { activeTeam } = requireActiveLineup();
    const getPlayerName = (slotKey) => {
        if (!slotKey) return "BOŞ";
        if (slotKey.startsWith("OPP_")) {
            if (isAi && aiSimState.opponents) {
                const opp = aiSimState.opponents.find(o => o.slotKey === slotKey);
                if (opp) return opp.name;
            }
            return `${slotKey.replace("OPP_", "")} (Rakip)`;
        }
        if (activeTeam) {
            const { getActiveLineup } = requireActiveLineup();
            const activeLineup = getActiveLineup();
            const playerId = activeLineup.positions[slotKey] || activeLineup.bench[slotKey];
            if (playerId) {
                const player = activeTeam.players.find(p => p.id === playerId);
                if (player) return player.name.split(" ").pop();
            }
        }
        return slotKey.split("_")[0];
    };

    container.innerHTML = targetState.steps.map((step, idx) => {
        const isActive = idx === targetState.currentStepIndex;
        const activeBg = isActive ? "rgba(0, 255, 136, 0.08)" : "rgba(255,255,255,0.02)";
        const activeBorder = isActive ? "1px solid var(--accent-color)" : "1px solid var(--border-color)";
        
        let actionDesc = "";
        let actionIcon = "🏃‍♂️";
        
        if (step.action === "pass") {
            actionIcon = "🔀";
            const receiverName = getPlayerName(step.passReceiver);
            actionDesc = `Pas: <b>${getPlayerName(step.ballOwner)}</b> ➡️ <b>${receiverName}</b>`;
        } else if (step.action === "shot") {
            actionIcon = "💥";
            actionDesc = `<b>${getPlayerName(step.ballOwner)}</b> kaleyi deniyor! (Şut)`;
        } else {
            actionIcon = "🏃‍♂️";
            const owner = step.ballOwner ? getPlayerName(step.ballOwner) : "Bilinmeyen";
            actionDesc = `Top Sürme: <b>${owner}</b>`;
        }

        const styleBadge = step.aiPlayStyle ? `
            <span style="font-size: 0.65rem; background: rgba(0, 123, 255, 0.15); color: #007bff; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-top: 5px; display: inline-block;">
                🤖 ${step.aiPlayStyle === 'tiki-taka' ? 'Pas Oyunu' : step.aiPlayStyle === 'wing-attack' ? 'Kanat Akını' : step.aiPlayStyle === 'dribble-attack' ? 'Merkez Dripling' : step.aiPlayStyle === 'long-ball' ? 'Uzun Top' : step.aiPlayStyle === 'defense-press' ? 'Savunma/Pres' : step.aiPlayStyle === 'shot-chance' ? 'Şut Fırsatı' : step.aiPlayStyle === 'free-kick' ? 'Frikik' : step.aiPlayStyle === 'corner' ? 'Korner' : step.aiPlayStyle === 'penalty' ? 'Penaltı' : 'Genel AI'}
            </span>
        ` : "";

        const oppStyleBadge = step.aiOpponentStyle ? `
            <span style="font-size: 0.65rem; background: rgba(255, 152, 0, 0.15); color: #ff9800; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-top: 5px; display: inline-block;">
                🛡️ ${step.aiOpponentStyle === 'compact-def' ? 'Kompakt Sav.' : step.aiOpponentStyle === 'aggressive-press' ? 'Agresif Pres' : step.aiOpponentStyle === 'counter-attack' ? 'Kontratak' : 'Dengeli'}
            </span>
        ` : "";

        return `
            <div style="padding: 10px; background: ${activeBg}; border: ${activeBorder}; border-radius: var(--border-radius); font-size: 0.78rem; display: flex; align-items: start; gap: 10px; cursor: pointer; transition: all 0.2s;" onclick="window.selectSimStep(${idx})">
                <div style="width: 20px; height: 20px; border-radius: 50%; background: ${isActive ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}; color: ${isActive ? '#000' : 'var(--text-muted)'}; font-size: 0.72rem; font-weight: bold; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                    ${idx + 1}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 4px;">
                        <span>${actionIcon}</span>
                        <span>${actionDesc}</span>
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${styleBadge}
                        ${oppStyleBadge}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function renderStepTabs() {
    const isAi = aiSimState.isActive;
    const prefix = isAi ? "ai" : "sim";
    const tabsContainer = document.getElementById(`${prefix}-step-tabs`);
    if (!tabsContainer) return;
    tabsContainer.innerHTML = "";

    const targetState = isAi ? aiSimState : simState;
    targetState.steps.forEach((step, idx) => {
        const btn = document.createElement("button");
        btn.className = `btn-secondary${idx === targetState.currentStepIndex ? ' active' : ''}`;
        btn.style.padding = "4px 10px";
        btn.style.fontSize = "0.75rem";
        btn.style.borderRadius = "4px";
        btn.style.whiteSpace = "nowrap";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";

        if (idx === targetState.currentStepIndex) {
            btn.style.background = "var(--accent-color)";
            btn.style.color = "#000";
            btn.style.borderColor = "var(--accent-color)";
        } else {
            btn.style.background = "rgba(255, 255, 255, 0.05)";
            btn.style.color = "var(--text-primary)";
            btn.style.borderColor = "rgba(255, 255, 255, 0.1)";
        }

        btn.textContent = `${idx + 1}. Adım`;
        btn.addEventListener("click", () => {
            if (targetState.isPlaying) stopPlayback();
            targetState.currentStepIndex = idx;
            renderSimulationPitch();
            renderStepTabs();
            updateStepDropdowns();
            drawAllPaths();
        });
        tabsContainer.appendChild(btn);
    });
    
    // Also render the steps list timeline
    renderStepsTimeline();
}

function updateStepDropdowns() {
    if (aiSimState.isActive) {
        // Dropdown selection UI is only present in Mode 2, not Mode 3. 
        // Mode 3 determines things based on the simulated style dropdown.
        return;
    }
    const ballOwnerSelect = document.getElementById("select-sim-ball-owner");
    const actionSelect = document.getElementById("select-sim-action");
    const receiverSelect = document.getElementById("select-sim-pass-receiver");
    const receiverWrapper = document.getElementById("wrapper-sim-pass-receiver");

    if (!ballOwnerSelect || !actionSelect || !receiverSelect) return;

    const step = simState.steps[simState.currentStepIndex];
    if (!step) return;

    const { activeTeam, getActiveLineup } = requireActiveLineup();
    if (!activeTeam) return;

    const activeLineup = getActiveLineup();
    const formation = activeLineup.formation || "4-3-3-holding";
    const nodes = FORMATIONS[formation] || FORMATIONS["4-3-3-holding"];

    const pitchPlayers = [];
    nodes.forEach((node, index) => {
        const slotKey = `${node.pos}_${index}`;
        const assignedPlayerId = activeLineup.positions[slotKey];
        const player = assignedPlayerId ? activeTeam.players.find(p => p.id === assignedPlayerId) : null;
        pitchPlayers.push({
            slotKey,
            pos: translatePosition(node.pos),
            name: player ? player.name : `Boş (${translatePosition(node.pos)})`
        });
    });

    const currentOwner = step.ballOwner || "";
    ballOwnerSelect.innerHTML = `<option value="">⚽ Top Yok</option>`;
    pitchPlayers.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.slotKey;
        opt.textContent = `${p.pos} - ${p.name}`;
        if (p.slotKey === currentOwner) opt.selected = true;
        ballOwnerSelect.appendChild(opt);
    });

    actionSelect.value = step.action || "dribble";

    if (step.action === "pass" && currentOwner) {
        if (receiverWrapper) receiverWrapper.style.display = "flex";
        receiverSelect.innerHTML = `<option value="">👤 Alıcı Seçin</option>`;
        pitchPlayers.forEach(p => {
            if (p.slotKey !== currentOwner) {
                const opt = document.createElement("option");
                opt.value = p.slotKey;
                opt.textContent = `${p.pos} - ${p.name}`;
                if (p.slotKey === step.passReceiver) opt.selected = true;
                receiverSelect.appendChild(opt);
            }
        });
    } else {
        if (receiverWrapper) receiverWrapper.style.display = "none";
    }
}

function updateEraserButtonUI() {
    const eraserBtn = document.getElementById("btn-sim-eraser");
    if (!eraserBtn) return;
    if (simState.eraserMode) {
        eraserBtn.style.background = "#ff453a";
        eraserBtn.style.color = "#fff";
        eraserBtn.style.borderColor = "#ff453a";
        eraserBtn.innerText = "🧹 Silgi Açık";
    } else {
        eraserBtn.style.background = "";
        eraserBtn.style.color = "";
        eraserBtn.style.borderColor = "";
        eraserBtn.innerText = "🧹 Silgi Modu";
    }
}

// -------------------------------------------------------------
// STEP-BY-STEP AI SIMULATOR ENGINE (Mode 3)
// -------------------------------------------------------------
export function simulateActiveStepWithAi(overrideStyle = null) {
    const stepIdx = aiSimState.currentStepIndex;
    const styleSelect = document.getElementById("select-ai-step-style");
    const style = overrideStyle || (styleSelect ? styleSelect.value : "tiki-taka");

    const { activeTeam, getActiveLineup } = requireActiveLineup();
    if (!activeTeam) {
        showToast("Lütfen önce bir takım seçin.", "error");
        return;
    }

    const activeLineup = getActiveLineup();
    const formationName = activeLineup.formation || "4-3-3-holding";
    const nodes = FORMATIONS[formationName] || FORMATIONS["4-3-3-holding"];

    // Initialize opponent squad if this is the first step
    if (stepIdx === 0 || aiSimState.opponents.length === 0) {
        // Calculate team average stats
        const squadPlayers = [];
        nodes.forEach((node, index) => {
            const slotKey = `${node.pos}_${index}`;
            const playerId = activeLineup.positions[slotKey];
            const player = playerId ? activeTeam.players.find(p => p.id === playerId) : null;
            squadPlayers.push({
                slotKey,
                pos: node.pos,
                pace: player?.attributes?.pace || 60,
                passing: player?.attributes?.passing || 60,
                dribbling: player?.attributes?.dribbling || 60,
                shooting: player?.attributes?.shooting || 60,
                defending: player?.attributes?.defending || 60
            });
        });
        const avgStats = {
            pace: Math.round(squadPlayers.reduce((sum, p) => sum + p.pace, 0) / 11),
            passing: Math.round(squadPlayers.reduce((sum, p) => sum + p.passing, 0) / 11),
            dribbling: Math.round(squadPlayers.reduce((sum, p) => sum + p.dribbling, 0) / 11),
            shooting: Math.round(squadPlayers.reduce((sum, p) => sum + p.shooting, 0) / 11),
            defending: Math.round(squadPlayers.reduce((sum, p) => sum + p.defending, 0) / 11)
        };

        const opponentNames = ["Caner", "Volkan", "Alper", "Oğuz", "Tuncay", "Selçuk", "Burak", "Emre", "Arda", "Salih", "Gökhan"];
        aiSimState.opponents = nodes.map((node, index) => {
            const slotKey = `OPP_${node.pos}_${index}`;
            const randName = opponentNames[index % opponentNames.length] + " (Rakip)";
            const getStat = (base) => Math.min(99, Math.max(30, base + Math.floor(Math.random() * 11) - 5));
            return {
                slotKey,
                pos: node.pos,
                name: randName,
                pace: getStat(avgStats.pace),
                passing: getStat(avgStats.passing),
                dribbling: getStat(avgStats.dribbling),
                shooting: getStat(avgStats.shooting),
                defending: getStat(avgStats.defending),
                coords: { left: 100 - parseFloat(node.left), bottom: 100 - parseFloat(node.bottom) }
            };
        });
    }

    // Teammate personas list
    const currentTeammates = nodes.map((node, index) => {
        const slotKey = `${node.pos}_${index}`;
        const playerId = activeLineup.positions[slotKey];
        const player = playerId ? activeTeam.players.find(p => p.id === playerId) : null;
        return {
            slotKey,
            pos: node.pos,
            pace: player?.attributes?.pace || 60,
            passing: player?.attributes?.passing || 60,
            dribbling: player?.attributes?.dribbling || 60,
            shooting: player?.attributes?.shooting || 60,
            defending: player?.attributes?.defending || 60,
            coords: getPlayerPositionAtStepStart(slotKey, stepIdx, true)
        };
    });

    // Opponent personas list
    const currentOpponents = aiSimState.opponents.map((opp) => {
        return {
            ...opp,
            coords: getOpponentPositionAtStepStart(opp.slotKey, stepIdx)
        };
    });

    // Determine ball owner
    let ballOwner = "";
    if (stepIdx > 0) {
        const prevStep = aiSimState.steps[stepIdx - 1];
        if (prevStep.action === "pass" && prevStep.passReceiver) {
            ballOwner = prevStep.passReceiver;
        } else if (prevStep.ballOwner) {
            ballOwner = prevStep.ballOwner;
        }
    }

    if (!ballOwner) {
        if (style === "defense-press") {
            const oppMid = currentOpponents.find(o => o.pos.includes("M") || o.pos.includes("CM"));
            ballOwner = oppMid ? oppMid.slotKey : currentOpponents[5].slotKey;
        } else {
            const ourMid = currentTeammates.find(t => t.pos.includes("M") || t.pos.includes("CM"));
            ballOwner = ourMid ? ourMid.slotKey : currentTeammates[5].slotKey;
        }
    }

    const stepPlayerPaths = {};
    const stepOpponentPaths = {};
    let action = "dribble";
    let passReceiver = "";

    const isOurPossession = !ballOwner.startsWith("OPP_");
    const possessor = isOurPossession 
        ? currentTeammates.find(p => p.slotKey === ballOwner)
        : currentOpponents.find(p => p.slotKey === ballOwner);

    // Apply different movement algorithms based on style
    if (style === "tiki-taka") {
        action = "pass";
        if (isOurPossession) {
            const nearby = currentTeammates.filter(p => p.slotKey !== ballOwner);
            nearby.sort((a, b) => {
                const distA = Math.hypot(a.coords.left - possessor.coords.left, a.coords.bottom - possessor.coords.bottom);
                const distB = Math.hypot(b.coords.left - possessor.coords.left, b.coords.bottom - possessor.coords.bottom);
                return distA - distB;
            });
            passReceiver = nearby[0]?.slotKey || "";
        } else {
            const nearby = currentOpponents.filter(p => p.slotKey !== ballOwner);
            nearby.sort((a, b) => {
                const distA = Math.hypot(a.coords.left - possessor.coords.left, a.coords.bottom - possessor.coords.bottom);
                const distB = Math.hypot(b.coords.left - possessor.coords.left, b.coords.bottom - possessor.coords.bottom);
                return distA - distB;
            });
            passReceiver = nearby[0]?.slotKey || "";
        }

        // Everyone moves in short support steps
        currentTeammates.forEach(p => {
            const move = (p.pace / 100) * 4 + 1;
            const targetX = Math.min(95, Math.max(5, p.coords.left + (Math.random() - 0.5) * move));
            const targetY = Math.min(95, Math.max(5, p.coords.bottom + (Math.random() - 0.3) * move));
            stepPlayerPaths[p.slotKey] = [p.coords, { left: targetX, bottom: targetY }];
        });
        currentOpponents.forEach(o => {
            const move = (o.pace / 100) * 4 + 1;
            const targetX = Math.min(95, Math.max(5, o.coords.left + (Math.random() - 0.5) * move));
            const targetY = Math.min(95, Math.max(5, o.coords.bottom - (Math.random() - 0.3) * move)); // move down
            stepOpponentPaths[o.slotKey] = [o.coords, { left: targetX, bottom: targetY }];
        });

    } else if (style === "wing-attack") {
        action = "pass";
        // Force ball to wingers (SLK_8 or SĞK_9 or similar)
        if (isOurPossession) {
            const winger = currentTeammates.find(p => p.pos.includes("L") || p.pos.includes("R") || p.pos.includes("W"));
            passReceiver = winger ? winger.slotKey : currentTeammates[9].slotKey;
        } else {
            const winger = currentOpponents.find(p => p.pos.includes("L") || p.pos.includes("R"));
            passReceiver = winger ? winger.slotKey : currentOpponents[9].slotKey;
        }

        currentTeammates.forEach(p => {
            const isWinger = p.slotKey === passReceiver;
            const move = (p.pace / 100) * (isWinger ? 14 : 7);
            const targetX = isWinger ? (p.coords.left < 50 ? 8 : 92) : Math.min(95, Math.max(5, p.coords.left + (Math.random() - 0.5) * 5));
            const targetY = Math.min(95, p.coords.bottom + move);
            stepPlayerPaths[p.slotKey] = [p.coords, { left: targetX, bottom: targetY }];
        });
        currentOpponents.forEach(o => {
            const move = (o.pace / 100) * 5;
            const targetX = Math.min(95, Math.max(5, o.coords.left + (Math.random() - 0.5) * 4));
            const targetY = Math.max(5, o.coords.bottom - move);
            stepOpponentPaths[o.slotKey] = [o.coords, { left: targetX, bottom: targetY }];
        });

    } else if (style === "dribble-attack") {
        action = "dribble";
        currentTeammates.forEach(p => {
            const isOwner = p.slotKey === ballOwner;
            const move = (p.pace / 100) * (isOwner ? 10 : 6);
            const targetX = isOwner ? p.coords.left : Math.min(95, Math.max(5, p.coords.left + (Math.random() - 0.5) * 5));
            const targetY = Math.min(95, p.coords.bottom + move);
            stepPlayerPaths[p.slotKey] = [p.coords, { left: targetX, bottom: targetY }];
        });
        currentOpponents.forEach(o => {
            // Defenders rush to close down owner
            const isPresser = o.pos.includes("CB") || o.pos.includes("DM");
            const move = (o.pace / 100) * (isPresser ? 9 : 4);
            const targetX = isPresser ? possessor.coords.left : o.coords.left;
            const targetY = Math.max(5, o.coords.bottom - move);
            stepOpponentPaths[o.slotKey] = [o.coords, { left: targetX, bottom: targetY }];
        });

    } else if (style === "long-ball") {
        action = "pass";
        if (isOurPossession) {
            const striker = currentTeammates.find(p => p.pos.includes("SNT") || p.pos.includes("ST") || p.pos.includes("F"));
            passReceiver = striker ? striker.slotKey : currentTeammates[10].slotKey;
        } else {
            const striker = currentOpponents.find(p => p.pos.includes("SNT") || p.pos.includes("ST"));
            passReceiver = striker ? striker.slotKey : currentOpponents[10].slotKey;
        }

        currentTeammates.forEach(p => {
            const move = (p.pace / 100) * (p.slotKey === passReceiver ? 12 : 5);
            const targetX = p.coords.left;
            const targetY = Math.min(95, p.coords.bottom + move);
            stepPlayerPaths[p.slotKey] = [p.coords, { left: targetX, bottom: targetY }];
        });
        currentOpponents.forEach(o => {
            const move = (o.pace / 100) * 6;
            const targetX = o.coords.left;
            const targetY = Math.max(5, o.coords.bottom - move);
            stepOpponentPaths[o.slotKey] = [o.coords, { left: targetX, bottom: targetY }];
        });

    } else if (style === "defense-press") {
        action = "dribble";
        // Opponents attack, teammates press
        currentTeammates.forEach(p => {
            // Move towards opponent ball owner
            const move = (p.pace / 100) * 8;
            const dx = possessor.coords.left - p.coords.left;
            const dy = possessor.coords.bottom - p.coords.bottom;
            const len = Math.hypot(dx, dy) || 1;
            const targetX = Math.min(95, Math.max(5, p.coords.left + (dx / len) * move));
            const targetY = Math.min(95, Math.max(5, p.coords.bottom + (dy / len) * move));
            stepPlayerPaths[p.slotKey] = [p.coords, { left: targetX, bottom: targetY }];
        });
        currentOpponents.forEach(o => {
            const isOwner = o.slotKey === ballOwner;
            const move = (o.pace / 100) * (isOwner ? 8 : 4);
            const targetX = o.coords.left + (Math.random() - 0.5) * 4;
            const targetY = Math.max(5, o.coords.bottom - move);
            stepOpponentPaths[o.slotKey] = [o.coords, { left: targetX, bottom: targetY }];
        });

    } else if (style === "shot-chance") {
        action = "shot";
        currentTeammates.forEach(p => {
            const move = (p.pace / 100) * 4;
            const targetX = p.coords.left;
            const targetY = Math.min(95, p.coords.bottom + move);
            stepPlayerPaths[p.slotKey] = [p.coords, { left: targetX, bottom: targetY }];
        });
        currentOpponents.forEach(o => {
            // Opponent GK moves towards center/shot trajectory
            const isGK = o.pos.includes("GK") || o.pos.includes("KL");
            const move = (o.pace / 100) * (isGK ? 8 : 4);
            const targetX = isGK ? 50 : o.coords.left;
            const targetY = isGK ? 5 : Math.max(5, o.coords.bottom - move);
            stepOpponentPaths[o.slotKey] = [o.coords, { left: targetX, bottom: targetY }];
        });
    } else if (style === "free-kick") {
        action = "shot";
        const taker = currentTeammates.find(p => p.pos.includes("SNT") || p.pos.includes("AM") || p.pos.includes("OOS") || p.pos.includes("OS")) || currentTeammates[10];
        ballOwner = taker.slotKey;
        
        currentTeammates.forEach(p => {
            const isTaker = p.slotKey === ballOwner;
            const targetX = isTaker ? 50 : p.coords.left;
            const targetY = isTaker ? 75 : Math.min(95, p.coords.bottom + (Math.random() - 0.2) * 5);
            stepPlayerPaths[p.slotKey] = [isTaker ? { left: 50, bottom: 75 } : p.coords, { left: targetX, bottom: targetY }];
        });
        
        currentOpponents.forEach((o, index) => {
            const isGK = o.pos.includes("GK") || o.pos.includes("KL");
            if (isGK) {
                stepOpponentPaths[o.slotKey] = [o.coords, { left: 50, bottom: 96 }];
            } else if (index >= 1 && index <= 4) {
                const wallX = 42 + (index - 1) * 5;
                stepOpponentPaths[o.slotKey] = [o.coords, { left: wallX, bottom: 85 }];
            } else {
                stepOpponentPaths[o.slotKey] = [o.coords, { left: o.coords.left, bottom: Math.max(10, o.coords.bottom - 4) }];
            }
        });

    } else if (style === "corner") {
        action = "pass";
        const taker = currentTeammates.find(p => p.pos.includes("L") || p.pos.includes("R")) || currentTeammates[8];
        ballOwner = taker.slotKey;
        const cornerSide = Math.random() > 0.5 ? 2 : 98;
        
        const receiver = currentTeammates.find(p => p.pos.includes("SNT") || p.pos.includes("STP")) || currentTeammates[10];
        passReceiver = receiver.slotKey;

        currentTeammates.forEach(p => {
            const isTaker = p.slotKey === ballOwner;
            const isReceiver = p.slotKey === passReceiver;
            
            let targetX = p.coords.left;
            let targetY = p.coords.bottom;
            
            if (isTaker) {
                targetX = cornerSide;
                targetY = 95;
            } else if (isReceiver) {
                targetX = 50 + (Math.random() - 0.5) * 6;
                targetY = 85 + (Math.random() - 0.5) * 5;
            } else {
                targetX = 40 + Math.random() * 20;
                targetY = 80 + Math.random() * 12;
            }
            stepPlayerPaths[p.slotKey] = [isTaker ? { left: cornerSide, bottom: 95 } : p.coords, { left: targetX, bottom: targetY }];
        });

        currentOpponents.forEach((o, index) => {
            const isGK = o.pos.includes("GK") || o.pos.includes("KL");
            let targetX = o.coords.left;
            let targetY = o.coords.bottom;
            
            if (isGK) {
                targetX = 50;
                targetY = 96;
            } else {
                targetX = 38 + Math.random() * 24;
                targetY = 82 + Math.random() * 12;
            }
            stepOpponentPaths[o.slotKey] = [o.coords, { left: targetX, bottom: targetY }];
        });

    } else if (style === "penalty") {
        action = "shot";
        const taker = currentTeammates.find(p => p.pos.includes("SNT") || p.pos.includes("ST")) || currentTeammates[10];
        ballOwner = taker.slotKey;

        currentTeammates.forEach(p => {
            const isTaker = p.slotKey === ballOwner;
            let targetX = p.coords.left;
            let targetY = p.coords.bottom;
            
            if (isTaker) {
                targetX = 50;
                targetY = 82;
            } else {
                targetX = p.coords.left;
                targetY = Math.min(78, p.coords.bottom);
            }
            stepPlayerPaths[p.slotKey] = [isTaker ? { left: 50, bottom: 82 } : p.coords, { left: targetX, bottom: targetY }];
        });

        currentOpponents.forEach(o => {
            const isGK = o.pos.includes("GK") || o.pos.includes("KL");
            let targetX = o.coords.left;
            let targetY = o.coords.bottom;
            
            if (isGK) {
                targetX = 50;
                targetY = 97;
            } else {
                targetX = o.coords.left;
                targetY = Math.max(25, Math.min(78, o.coords.bottom));
            }
            stepOpponentPaths[o.slotKey] = [o.coords, { left: targetX, bottom: targetY }];
        });
    }

    // AI Offside Check and Avoidance
    if (isOurPossession && action === "pass" && passReceiver) {
        const oppYCoords = Object.values(stepOpponentPaths).map(p => p[1].bottom).sort((a, b) => b - a);
        const lastDefenderY = oppYCoords[1] || 90;
        
        const receiverPath = stepPlayerPaths[passReceiver];
        if (receiverPath && receiverPath[1].bottom > 50 && receiverPath[1].bottom > lastDefenderY) {
            receiverPath[1].bottom = Math.max(50, lastDefenderY - 2.5);
            showToast("AI Ofsayt Engelleyici: Alıcı oyuncu ofsayttan kaçınmak için geriye çekildi!", "warning");
        }
    }

    // Apply Opponent AI Strategy positioning modifications
    const oppStyleSelect = document.getElementById("select-ai-opponent-style");
    const oppStyle = oppStyleSelect ? oppStyleSelect.value : "balanced";

    for (const key in stepOpponentPaths) {
        const path = stepOpponentPaths[key];
        if (path && path.length === 2) {
            const end = path[1];
            const isGK = key.includes("GK") || key.includes("KL");
            if (isGK) continue;

            if (oppStyle === "compact-def") {
                end.bottom = Math.min(95, Math.max(60, end.bottom + 8));
            } else if (oppStyle === "aggressive-press") {
                end.bottom = Math.min(90, Math.max(25, end.bottom - 12));
            } else if (oppStyle === "counter-attack") {
                const isForward = key.includes("ST") || key.includes("SNT") || key.includes("LW") || key.includes("RW") || key.includes("SLK") || key.includes("SĞK");
                if (isForward) {
                    end.bottom = Math.min(90, Math.max(10, end.bottom - 15));
                } else {
                    end.bottom = Math.min(95, Math.max(55, end.bottom + 6));
                }
            }
        }
    }

    // Save step variables
    const step = aiSimState.steps[stepIdx];
    if (step) {
        step.playerPaths = stepPlayerPaths;
        step.opponentPaths = stepOpponentPaths;
        step.ballOwner = ballOwner;
        step.action = action;
        step.passReceiver = passReceiver;
        step.aiPlayStyle = style;
        step.aiOpponentStyle = oppStyle;
    }

    renderSimulationPitch();
    drawAllPaths();
    showToast(`${stepIdx + 1}. Adım AI tarafından simüle edildi!`, "success");
}

export function simulateFullAttackWithAi() {
    const { activeTeam } = requireActiveLineup();
    if (!activeTeam) {
        showToast("Lütfen önce bir takım seçin.", "error");
        return;
    }

    const styleSelect = document.getElementById("select-ai-step-style");
    const baseStyle = styleSelect ? styleSelect.value : "tiki-taka";

    let sequence = [];
    if (baseStyle === "tiki-taka") {
        sequence = ["tiki-taka", "tiki-taka", "tiki-taka", "tiki-taka", "shot-chance"];
    } else if (baseStyle === "wing-attack") {
        sequence = ["wing-attack", "tiki-taka", "wing-attack", "wing-attack", "shot-chance"];
    } else if (baseStyle === "dribble-attack") {
        sequence = ["dribble-attack", "tiki-taka", "dribble-attack", "dribble-attack", "shot-chance"];
    } else if (baseStyle === "long-ball") {
        sequence = ["tiki-taka", "long-ball", "long-ball", "shot-chance"];
    } else if (baseStyle === "defense-press") {
        sequence = ["defense-press", "tiki-taka", "dribble-attack", "shot-chance"];
    } else if (baseStyle === "shot-chance") {
        sequence = ["tiki-taka", "dribble-attack", "shot-chance"];
    } else {
        sequence = ["tiki-taka", "tiki-taka", "shot-chance"];
    }

    aiSimState.steps = [{
        playerPaths: {},
        opponentPaths: {},
        ballOwner: "",
        action: "dribble",
        passReceiver: "",
        drawnHistory: []
    }];
    aiSimState.currentStepIndex = 0;

    sequence.forEach((styleName, idx) => {
        aiSimState.currentStepIndex = idx;
        
        if (aiSimState.steps.length <= idx) {
            aiSimState.steps.push({
                playerPaths: {},
                opponentPaths: {},
                ballOwner: "",
                action: "dribble",
                passReceiver: "",
                drawnHistory: []
            });
        }
        
        simulateActiveStepWithAi(styleName);
    });

    aiSimState.currentStepIndex = 0;
    renderStepTabs();
    renderSimulationPitch();
    drawAllPaths();
    showToast(`AI ${sequence.length} adımlı atağı başarıyla otomatik simüle etti!`, "success");
}

// -------------------------------------------------------------
// SAVE / LOAD / DELETE FOR MODE 3
// -------------------------------------------------------------
export function saveCurrentAiTactic(name) {
    if (!name || name.trim() === "") {
        showToast("Lütfen bir taktik adı girin.", "warning");
        return;
    }
    if (!aiSimState.steps || aiSimState.steps.length === 0) {
        showToast("Kaydedilecek taktik bulunamadı.", "error");
        return;
    }
    const savedList = localStorage.getItem(`fm_saved_ai_tactics_${state.activeTeamId}`);
    let tactics = [];
    if (savedList) {
        try { tactics = JSON.parse(savedList); } catch(e) {}
    }

    const newTactic = {
        id: "ai_tactic_" + Date.now(),
        name: name,
        steps: aiSimState.steps,
        opponents: aiSimState.opponents
    };

    tactics.push(newTactic);
    localStorage.setItem(`fm_saved_ai_tactics_${state.activeTeamId}`, JSON.stringify(tactics));
    showToast("AI Taktik planı başarıyla kaydedildi.", "success");
    populateSavedTacticsDropdown();
}

export function loadSavedAiTactic(id) {
    if (!id) return;
    const savedList = localStorage.getItem(`fm_saved_ai_tactics_${state.activeTeamId}`);
    if (!savedList) return;
    let tactics = [];
    try { tactics = JSON.parse(savedList); } catch(e) {}

    const tactic = tactics.find(t => t.id === id);
    if (!tactic) return;

    aiSimState.steps = tactic.steps;
    aiSimState.opponents = tactic.opponents || [];
    aiSimState.currentStepIndex = 0;

    renderSimulationPitch();
    renderStepTabs();
    drawAllPaths();
    showToast(`"${tactic.name}" AI Taktik planı yüklendi.`, "success");
}

export function deleteSavedAiTactic(id) {
    if (!id) return;
    const savedList = localStorage.getItem(`fm_saved_ai_tactics_${state.activeTeamId}`);
    if (!savedList) return;
    let tactics = [];
    try { tactics = JSON.parse(savedList); } catch(e) {}

    tactics = tactics.filter(t => t.id !== id);
    localStorage.setItem(`fm_saved_ai_tactics_${state.activeTeamId}`, JSON.stringify(tactics));
    showToast("Kayıtlı AI taktiği silindi.", "info");
    populateSavedTacticsDropdown();
}

export function populateSavedTacticsDropdown() {
    const dropdown = document.getElementById("select-ai-saved-tactics");
    if (!dropdown) return;
    dropdown.innerHTML = `<option value="">-- Taktik Seçin --</option>`;

    const savedList = localStorage.getItem(`fm_saved_ai_tactics_${state.activeTeamId}`);
    if (!savedList) return;
    let tactics = [];
    try { tactics = JSON.parse(savedList); } catch(e) {}

    tactics.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name;
        dropdown.appendChild(opt);
    });
}

// -------------------------------------------------------------
// NAVIGATION SWITCHER & LISTENERS
// -------------------------------------------------------------
export function setupTacticModeSwitcher() {
    const btnBoard = document.getElementById("btn-tactic-mode-board");
    const btnSim = document.getElementById("btn-tactic-mode-sim");
    const btnAi = document.getElementById("btn-tactic-mode-ai");
    
    const boardControls = document.getElementById("tactic-board-controls-wrapper");
    const simControls = document.getElementById("tactic-sim-controls-wrapper");
    const aiControls = document.getElementById("tactic-ai-controls-wrapper");
    
    const boardPitchRow = document.getElementById("tactic-board-pitch-row");
    const simPitchRow = document.getElementById("tactic-sim-pitch-row");
    const aiPitchRow = document.getElementById("tactic-ai-pitch-row");
    
    if (!btnBoard || !btnSim || !btnAi) return;
    
    btnBoard.onclick = () => {
        btnBoard.classList.add("active");
        btnBoard.style.borderColor = "var(--accent-color)";
        btnBoard.style.color = "var(--accent-color)";
        btnBoard.style.background = "rgba(0, 255, 136, 0.05)";
        
        btnSim.classList.remove("active"); btnSim.style.borderColor = ""; btnSim.style.color = ""; btnSim.style.background = "";
        btnAi.classList.remove("active"); btnAi.style.borderColor = ""; btnAi.style.color = ""; btnAi.style.background = "";
        
        if (boardControls) boardControls.style.display = "flex";
        if (simControls) simControls.style.display = "none";
        if (aiControls) aiControls.style.display = "none";
        
        if (boardPitchRow) boardPitchRow.style.display = "grid";
        if (simPitchRow) simPitchRow.style.display = "none";
        if (aiPitchRow) aiPitchRow.style.display = "none";
        
        stopPlayback();
        simState.isActive = false;
        aiSimState.isActive = false;
        
        import("./lineup.js").then(mod => {
            mod.renderTeamLineupPitch();
        });
    };
    
    btnSim.onclick = () => {
        btnSim.classList.add("active");
        btnSim.style.borderColor = "var(--accent-color)";
        btnSim.style.color = "var(--accent-color)";
        btnSim.style.background = "rgba(0, 255, 136, 0.05)";
        
        btnBoard.classList.remove("active"); btnBoard.style.borderColor = ""; btnBoard.style.color = ""; btnBoard.style.background = "";
        btnAi.classList.remove("active"); btnAi.style.borderColor = ""; btnAi.style.color = ""; btnAi.style.background = "";
        
        if (boardControls) boardControls.style.display = "none";
        if (simControls) simControls.style.display = "flex";
        if (aiControls) aiControls.style.display = "none";
        
        if (boardPitchRow) boardPitchRow.style.display = "none";
        if (simPitchRow) simPitchRow.style.display = "grid";
        if (aiPitchRow) aiPitchRow.style.display = "none";
        
        simState.isActive = true;
        aiSimState.isActive = false;
        startSimulationModeDirectly();
    };

    btnAi.onclick = () => {
        btnAi.classList.add("active");
        btnAi.style.borderColor = "var(--accent-color)";
        btnAi.style.color = "var(--accent-color)";
        btnAi.style.background = "rgba(0, 255, 136, 0.05)";
        
        btnBoard.classList.remove("active"); btnBoard.style.borderColor = ""; btnBoard.style.color = ""; btnBoard.style.background = "";
        btnSim.classList.remove("active"); btnSim.style.borderColor = ""; btnSim.style.color = ""; btnSim.style.background = "";
        
        if (boardControls) boardControls.style.display = "none";
        if (simControls) simControls.style.display = "none";
        if (aiControls) aiControls.style.display = "flex";
        
        if (boardPitchRow) boardPitchRow.style.display = "none";
        if (simPitchRow) simPitchRow.style.display = "none";
        if (aiPitchRow) aiPitchRow.style.display = "grid";
        
        simState.isActive = false;
        aiSimState.isActive = true;
        
        // Initialize AI simulation step if empty
        if (!aiSimState.steps || aiSimState.steps.length === 0) {
            aiSimState.steps = [{
                playerPaths: {},
                opponentPaths: {},
                ballOwner: "",
                action: "dribble",
                passReceiver: "",
                aiPlayStyle: "tiki-taka",
                drawnHistory: []
            }];
            aiSimState.currentStepIndex = 0;
            aiSimState.opponents = [];
        }
        
        initSimulationPositions();
        renderSimulationPitch();
        renderStepTabs();
        populateSavedTacticsDropdown();
        resizeSimCanvas();
        setTimeout(() => {
            resizeSimCanvas();
            drawAllPaths();
        }, 50);
    };
}

export function setupSimulationListeners() {
    setupTacticModeSwitcher();

    // -------------------------------------------------------------
    // MANUEL SIMULATION (Mode 2) LISTENERS
    // -------------------------------------------------------------
    const playBtn = document.getElementById("btn-sim-play");
    if (playBtn) {
        playBtn.onclick = () => {
            if (simState.isPlaying) stopPlayback();
            else startPlayback();
        };
    }
    
    const resetBtn = document.getElementById("btn-sim-reset");
    if (resetBtn) {
        resetBtn.onclick = resetSimulation;
    }

    const clearBtn = document.getElementById("btn-sim-clear");
    if (clearBtn) {
        clearBtn.onclick = clearAllPaths;
    }

    const undoBtn = document.getElementById("btn-sim-undo");
    if (undoBtn) {
        undoBtn.onclick = () => {
            if (simState.isPlaying) stopPlayback();
            const step = simState.steps[simState.currentStepIndex];
            if (step && step.drawnHistory && step.drawnHistory.length > 0) {
                const lastKey = step.drawnHistory.pop();
                delete step.playerPaths[lastKey];
                drawAllPaths();
                showToast("Son çizim geri alındı.", "info");
            } else {
                showToast("Geri alınacak çizim yok.", "warning");
            }
        };
    }

    const eraserBtn = document.getElementById("btn-sim-eraser");
    if (eraserBtn) {
        eraserBtn.onclick = () => {
            simState.eraserMode = !simState.eraserMode;
            updateEraserButtonUI();
            if (simState.eraserMode) {
                showToast("Silgi Modu aktif. Silmek istediğiniz oyuncunun üzerine tıklayın.", "info");
            } else {
                showToast("Çizim Modu aktif.", "info");
            }
        };
    }
    
    const speedSelect = document.getElementById("select-sim-speed");
    if (speedSelect) {
        speedSelect.onchange = (e) => {
            simState.durationMs = parseInt(e.target.value) || 2000;
        };
    }

    const addStepBtn = document.getElementById("btn-sim-add-step");
    if (addStepBtn) {
        addStepBtn.onclick = () => {
            if (simState.isPlaying) stopPlayback();
            
            const prevStep = simState.steps[simState.steps.length - 1];
            let nextOwner = "";
            if (prevStep) {
                if (prevStep.action === "pass" && prevStep.passReceiver) {
                    nextOwner = prevStep.passReceiver;
                } else if (prevStep.action === "dribble" && prevStep.ballOwner) {
                    nextOwner = prevStep.ballOwner;
                }
            }

            simState.steps.push({
                playerPaths: {},
                ballOwner: nextOwner,
                action: "dribble",
                passReceiver: "",
                drawnHistory: []
            });
            simState.currentStepIndex = simState.steps.length - 1;
            renderSimulationPitch();
            renderStepTabs();
            updateStepDropdowns();
            drawAllPaths();
            showToast("Yeni adım eklendi.", "success");
        };
    }

    const delStepBtn = document.getElementById("btn-sim-del-step");
    if (delStepBtn) {
        delStepBtn.onclick = () => {
            if (simState.isPlaying) stopPlayback();
            if (simState.steps.length <= 1) {
                simState.steps[0].playerPaths = {};
                simState.steps[0].ballOwner = "";
                simState.steps[0].action = "dribble";
                simState.steps[0].passReceiver = "";
                simState.steps[0].drawnHistory = [];
                renderSimulationPitch();
                updateStepDropdowns();
                drawAllPaths();
                showToast("Adım içeriği temizlendi.", "info");
                return;
            }

            simState.steps.splice(simState.currentStepIndex, 1);
            if (simState.currentStepIndex >= simState.steps.length) {
                simState.currentStepIndex = simState.steps.length - 1;
            }
            renderSimulationPitch();
            renderStepTabs();
            updateStepDropdowns();
            drawAllPaths();
            showToast("Adım silindi.", "info");
        };
    }

    const ballOwnerSelect = document.getElementById("select-sim-ball-owner");
    if (ballOwnerSelect) {
        ballOwnerSelect.onchange = (e) => {
            const step = simState.steps[simState.currentStepIndex];
            if (step) {
                step.ballOwner = e.target.value;
                if (!step.ballOwner) {
                    step.action = "dribble";
                    step.passReceiver = "";
                }
                updateStepDropdowns();
                renderSimulationPitch();
                drawAllPaths();
            }
        };
    }

    const actionSelect = document.getElementById("select-sim-action");
    if (actionSelect) {
        actionSelect.onchange = (e) => {
            const step = simState.steps[simState.currentStepIndex];
            if (step) {
                step.action = e.target.value;
                if (step.action !== "pass") {
                    step.passReceiver = "";
                }
                updateStepDropdowns();
                drawAllPaths();
            }
        };
    }

    const receiverSelect = document.getElementById("select-sim-pass-receiver");
    if (receiverSelect) {
        receiverSelect.onchange = (e) => {
            const step = simState.steps[simState.currentStepIndex];
            if (step) {
                step.passReceiver = e.target.value;
                drawAllPaths();
            }
        };
    }

    // -------------------------------------------------------------
    // AI TACTICS GENERATOR (Mode 3) LISTENERS
    // -------------------------------------------------------------
    const aiPlayBtn = document.getElementById("btn-ai-play");
    if (aiPlayBtn) {
        aiPlayBtn.onclick = () => {
            if (aiSimState.isPlaying) stopPlayback();
            else startPlayback();
        };
    }

    const aiResetBtn = document.getElementById("btn-ai-reset");
    if (aiResetBtn) {
        aiResetBtn.onclick = resetSimulation;
    }

    const aiClearBtn = document.getElementById("btn-ai-clear");
    if (aiClearBtn) {
        aiClearBtn.onclick = clearAllPaths;
    }

    const aiSpeedSelect = document.getElementById("select-ai-speed");
    if (aiSpeedSelect) {
        aiSpeedSelect.onchange = (e) => {
            aiSimState.durationMs = parseInt(e.target.value) || 2000;
        };
    }

    const aiAddStepBtn = document.getElementById("btn-ai-add-step");
    if (aiAddStepBtn) {
        aiAddStepBtn.onclick = () => {
            if (aiSimState.isPlaying) stopPlayback();

            const prevStep = aiSimState.steps[aiSimState.steps.length - 1];
            let nextOwner = "";
            if (prevStep) {
                if (prevStep.action === "pass" && prevStep.passReceiver) {
                    nextOwner = prevStep.passReceiver;
                } else if (prevStep.ballOwner) {
                    nextOwner = prevStep.ballOwner;
                }
            }

            aiSimState.steps.push({
                playerPaths: {},
                opponentPaths: {},
                ballOwner: nextOwner,
                action: "dribble",
                passReceiver: "",
                aiPlayStyle: "tiki-taka",
                drawnHistory: []
            });
            aiSimState.currentStepIndex = aiSimState.steps.length - 1;
            renderSimulationPitch();
            renderStepTabs();
            drawAllPaths();
            showToast("Yeni AI simülasyon adımı eklendi.", "success");
        };
    }

    const aiDelStepBtn = document.getElementById("btn-ai-del-step");
    if (aiDelStepBtn) {
        aiDelStepBtn.onclick = () => {
            if (aiSimState.isPlaying) stopPlayback();
            if (aiSimState.steps.length <= 1) {
                aiSimState.steps[0].playerPaths = {};
                aiSimState.steps[0].opponentPaths = {};
                aiSimState.steps[0].ballOwner = "";
                aiSimState.steps[0].action = "dribble";
                aiSimState.steps[0].passReceiver = "";
                aiSimState.steps[0].drawnHistory = [];
                renderSimulationPitch();
                drawAllPaths();
                showToast("AI adımı temizlendi.", "info");
                return;
            }

            aiSimState.steps.splice(aiSimState.currentStepIndex, 1);
            if (aiSimState.currentStepIndex >= aiSimState.steps.length) {
                aiSimState.currentStepIndex = aiSimState.steps.length - 1;
            }
            renderSimulationPitch();
            renderStepTabs();
            drawAllPaths();
            showToast("AI adımı silindi.", "info");
        };
    }

    // Simulate active step with AI
    const simulateStepBtn = document.getElementById("btn-ai-simulate-step");
    if (simulateStepBtn) {
        simulateStepBtn.onclick = () => {
            if (aiSimState.isPlaying) stopPlayback();
            simulateActiveStepWithAi();
        };
    }

    // Simulate full attack with AI
    const simulateFullBtn = document.getElementById("btn-ai-simulate-full");
    if (simulateFullBtn) {
        simulateFullBtn.onclick = () => {
            if (aiSimState.isPlaying) stopPlayback();
            simulateFullAttackWithAi();
        };
    }

    // Save AI Tactic
    const aiSaveBtn = document.getElementById("btn-ai-save-tactic");
    if (aiSaveBtn) {
        aiSaveBtn.onclick = () => {
            const input = document.getElementById("input-ai-tactic-name");
            if (input) {
                saveCurrentAiTactic(input.value);
                input.value = "";
            }
        };
    }

    // Load AI Tactic dropdown
    const aiSavedSelect = document.getElementById("select-ai-saved-tactics");
    if (aiSavedSelect) {
        aiSavedSelect.onchange = (e) => {
            if (e.target.value) {
                loadSavedAiTactic(e.target.value);
            }
        };
    }

    // Delete Saved AI Tactic
    const aiDeleteBtn = document.getElementById("btn-ai-delete-saved-tactic");
    if (aiDeleteBtn && aiSavedSelect) {
        aiDeleteBtn.onclick = () => {
            if (aiSavedSelect.value) {
                deleteSavedAiTactic(aiSavedSelect.value);
            } else {
                showToast("Lütfen silmek için önce bir taktik seçin.", "warning");
            }
        };
    }
    
    window.addEventListener("resize", () => {
        const isAi = aiSimState.isActive;
        const targetState = isAi ? aiSimState : simState;
        if (targetState.isActive) {
            resizeSimCanvas();
            drawAllPaths();
        }
    });
}
