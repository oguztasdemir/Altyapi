let isDrawing = false;
let currentColor = '#ffffff';
let lineWidth = 3;
let canvas = null;
let ctx = null;

// History of strokes for Undo functionality and responsive scaling.
// Points are normalized (0 to 1) based on the canvas bounding rect.
let strokes = [];
let currentStrokePoints = [];

export function initTacticsDraw() {
    canvas = document.getElementById('tactic-pitch-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    // Resize canvas attributes to match CSS bounds
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile support
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) / rect.width;
            const y = (touch.clientY - rect.top) / rect.height;
            currentStrokePoints = [{ x, y }];
            isDrawing = true;
            e.preventDefault();
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        if (isDrawing && e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) / rect.width;
            const y = (touch.clientY - rect.top) / rect.height;
            
            ctx.beginPath();
            const lastPt = currentStrokePoints[currentStrokePoints.length - 1];
            ctx.moveTo(lastPt.x * canvas.width, lastPt.y * canvas.height);
            ctx.lineTo(x * canvas.width, y * canvas.height);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            
            currentStrokePoints.push({ x, y });
            e.preventDefault();
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', stopDrawing);
    
    // Setup color buttons
    document.querySelectorAll('.btn-tactic-color').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-tactic-color').forEach(b => {
                b.classList.remove('active');
                b.style.border = '1px solid rgba(255,255,255,0.3)';
            });
            btn.classList.add('active');
            btn.style.border = '2px solid var(--accent-color)';
            currentColor = btn.getAttribute('data-color') || '#ffffff';
        });
    });
    
    // Setup clear button
    const clearBtn = document.getElementById('btn-clear-tactic-draw');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCanvas);
    }

    // Setup undo button
    const undoBtn = document.getElementById('btn-undo-tactic-draw');
    if (undoBtn) {
        undoBtn.addEventListener('click', undoLastStroke);
    }
}

export function redrawCanvas() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    strokes.forEach(stroke => {
        if (stroke.points.length < 1) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const firstPt = stroke.points[0];
        ctx.moveTo(firstPt.x * canvas.width, firstPt.y * canvas.height);
        
        for (let i = 1; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
            ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
        }
        ctx.stroke();
    });
}

function resizeCanvas() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 800;
    canvas.height = rect.height || 520;
    redrawCanvas();
}

function startDrawing(e) {
    if (!canvas || !ctx) return;
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    currentStrokePoints = [{ x, y }];
}

function draw(e) {
    if (!isDrawing || !canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    ctx.beginPath();
    const lastPt = currentStrokePoints[currentStrokePoints.length - 1];
    ctx.moveTo(lastPt.x * canvas.width, lastPt.y * canvas.height);
    ctx.lineTo(x * canvas.width, y * canvas.height);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    currentStrokePoints.push({ x, y });
}

function stopDrawing() {
    if (isDrawing && currentStrokePoints.length > 0) {
        strokes.push({
            color: currentColor,
            width: lineWidth,
            points: currentStrokePoints
        });
    }
    isDrawing = false;
    currentStrokePoints = [];
}

export function undoLastStroke() {
    strokes.pop();
    redrawCanvas();
}

export function clearCanvas() {
    strokes = [];
    currentStrokePoints = [];
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
