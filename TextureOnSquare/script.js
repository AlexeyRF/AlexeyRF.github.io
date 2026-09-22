const bgUpload = document.getElementById('bg-upload');
const textureUpload = document.getElementById('texture-upload');
const opacitySlider = document.getElementById('opacity-slider');
const opacityVal = document.getElementById('opacity-val');
const resetBtn = document.getElementById('reset-btn');
const exportBtn = document.getElementById('export-btn');
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const placeholder = document.getElementById('placeholder');
const canvasWrapper = document.getElementById('canvas-wrapper');

let bgImg = null;
let texImg = null;

let opacity = 1;
const gridSize = 20; 
let corners = [];
let points = []; 

let draggingPoint = null;

function getHomography(p0, p1, p2, p3) {
    let dx1 = p1.x - p2.x;
    let dx2 = p3.x - p2.x;
    let sum_x = p0.x - p1.x + p2.x - p3.x;
    let dy1 = p1.y - p2.y;
    let dy2 = p3.y - p2.y;
    let sum_y = p0.y - p1.y + p2.y - p3.y;

    let g = 0, h = 0;
    if (sum_x !== 0 || sum_y !== 0) {
        let det = dx1 * dy2 - dx2 * dy1;
        if (det !== 0) {
            g = (sum_x * dy2 - sum_y * dx2) / det;
            h = (dx1 * sum_y - dy1 * sum_x) / det;
        }
    }
    
    let a = p1.x - p0.x + g * p1.x;
    let b = p3.x - p0.x + h * p3.x;
    let c = p0.x;
    let d = p1.y - p0.y + g * p1.y;
    let e = p3.y - p0.y + h * p3.y;
    let f = p0.y;
    
    return {a, b, c, d, e, f, g, h};
}

function projectPoint(H, u, v) {
    let denom = H.g * u + H.h * v + 1;
    return {
        x: (H.a * u + H.b * v + H.c) / denom,
        y: (H.d * u + H.e * v + H.f) / denom
    };
}

function initGrid() {
    if (!texImg) return;
    
    let startX = 0;
    let startY = 0;
    let width = canvas.width;
    let height = canvas.height;

    if (bgImg) {
        const scale = Math.min((canvas.width * 0.8) / texImg.width, (canvas.height * 0.8) / texImg.height);
        width = texImg.width * scale;
        height = texImg.height * scale;
        startX = (canvas.width - width) / 2;
        startY = (canvas.height - height) / 2;
    }

    corners = [
        {x: startX, y: startY}, 
        {x: startX + width, y: startY}, 
        {x: startX + width, y: startY + height},
        {x: startX, y: startY + height} 
    ];
    
    updateGridFromCorners();
}

function updateGridFromCorners() {
    points = [];
    if (!texImg || corners.length < 4) return;
    
    const H = getHomography(corners[0], corners[1], corners[2], corners[3]);
    
    for (let i = 0; i <= gridSize; i++) {
        let row = [];
        for (let j = 0; j <= gridSize; j++) {
            let u = j / gridSize;
            let v = i / gridSize;
            let proj = projectPoint(H, u, v);
            row.push({
                x: proj.x,
                y: proj.y,
                u: u * texImg.width,
                v: v * texImg.height
            });
        }
        points.push(row);
    }
    render();
}

function updateUploadLabel(inputElem, fileName) {
    const label = inputElem.nextElementSibling;
    if (fileName.length > 25) {
        fileName = fileName.substring(0, 22) + '...';
    }
    label.textContent = fileName;
}

bgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        updateUploadLabel(e.target, file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            bgImg = new Image();
            bgImg.onload = () => {
                canvas.width = bgImg.width;
                canvas.height = bgImg.height;
                placeholder.style.display = 'none';
                if (!texImg) {
                    render();
                } else {
                    initGrid();
                }
            };
            bgImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

textureUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        updateUploadLabel(e.target, file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            texImg = new Image();
            texImg.onload = () => {
                if (!bgImg) {
                    canvas.width = texImg.width;
                    canvas.height = texImg.height;
                }
                placeholder.style.display = 'none';
                initGrid();
            };
            texImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

opacitySlider.addEventListener('input', (e) => {
    opacity = parseFloat(e.target.value);
    opacityVal.innerText = Math.round(opacity * 100) + '%';
    render();
});

resetBtn.addEventListener('click', () => {
    initGrid();
});

exportBtn.addEventListener('click', () => {
    if (!bgImg && !texImg) return;
    
    render(true);
    
    const link = document.createElement('a');
    link.download = 'texture_warp_result.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    render();
});

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (!texImg || corners.length === 0) return;
    
    const pos = getMousePos(e);
    let minD = Infinity;
    draggingPoint = null;
    
    const rect = canvas.getBoundingClientRect();
    const displayRatio = canvas.width / rect.width;
    const interactionRadius = 20 * displayRatio;

    for (let i = 0; i < 4; i++) {
        const pt = corners[i];
        const dx = pt.x - pos.x;
        const dy = pt.y - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minD && dist < interactionRadius) {
            minD = dist;
            draggingPoint = pt;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (draggingPoint) {
        const pos = getMousePos(e);
        draggingPoint.x = pos.x;
        draggingPoint.y = pos.y;
        
        if (!render.pending) {
            render.pending = true;
            requestAnimationFrame(() => {
                updateGridFromCorners();
                render.pending = false;
            });
        }
    }
});

window.addEventListener('mouseup', () => {
    draggingPoint = null;
});

const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

function drawTexturedTriangle(targetCtx, p0, p1, p2) {
    const expand = 0.8;
    let cx = (p0.x + p1.x + p2.x) / 3;
    let cy = (p0.y + p1.y + p2.y) / 3;
    
    let movePoint = (p) => {
        let dx = p.x - cx;
        let dy = p.y - cy;
        let len = Math.sqrt(dx*dx + dy*dy);
        if (len === 0) return {x: p.x, y: p.y};
        return {
            x: p.x + (dx / len) * expand,
            y: p.y + (dy / len) * expand
        };
    };

    let ep0 = movePoint(p0);
    let ep1 = movePoint(p1);
    let ep2 = movePoint(p2);

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.moveTo(ep0.x, ep0.y);
    targetCtx.lineTo(ep1.x, ep1.y);
    targetCtx.lineTo(ep2.x, ep2.y);
    targetCtx.closePath();
    targetCtx.clip();
    
    let x0 = p0.u, y0 = p0.v, x1 = p1.u, y1 = p1.v, x2 = p2.u, y2 = p2.v;
    let u0 = p0.x, v0 = p0.y, u1 = p1.x, v1 = p1.y, u2 = p2.x, v2 = p2.y;

    let det = (x0*y1 - x1*y0) + (x1*y2 - x2*y1) + (x2*y0 - x0*y2);
    if (det !== 0) {
        let a = (u0*(y1 - y2) + u1*(y2 - y0) + u2*(y0 - y1)) / det;
        let b = (v0*(y1 - y2) + v1*(y2 - y0) + v2*(y0 - y1)) / det;
        let c = (u0*(x2 - x1) + u1*(x0 - x2) + u2*(x1 - x0)) / det;
        let d = (v0*(x2 - x1) + v1*(x0 - x2) + v2*(x1 - x0)) / det;
        let e = (u0*(x1*y2 - x2*y1) + u1*(x2*y0 - x0*y2) + u2*(x0*y1 - x1*y0)) / det;
        let f = (v0*(x1*y2 - x2*y1) + v1*(x2*y0 - x0*y2) + v2*(x0*y1 - x1*y0)) / det;

        targetCtx.transform(a, b, c, d, e, f);
        targetCtx.drawImage(texImg, 0, 0);
    }
    targetCtx.restore();
}

function render(forExport = false) {
    if (!canvas.width || !canvas.height) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (bgImg) {
        ctx.globalAlpha = 1;
        ctx.drawImage(bgImg, 0, 0);
    }
    
    if (texImg && points.length > 0 && corners.length === 4) {
        if (offCanvas.width !== canvas.width || offCanvas.height !== canvas.height) {
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
        } else {
            offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        }
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const p0 = points[i][j];
                const p1 = points[i][j+1];
                const p2 = points[i+1][j];
                const p3 = points[i+1][j+1];
                
                drawTexturedTriangle(offCtx, p0, p1, p2);
                drawTexturedTriangle(offCtx, p1, p3, p2);
            }
        }
        
        ctx.globalAlpha = opacity;
        ctx.drawImage(offCanvas, 0, 0);
        ctx.globalAlpha = 1;
        
        if (!forExport) {
            const rect = canvas.getBoundingClientRect();
            const displayRatio = canvas.width / rect.width;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5 * displayRatio;
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            ctx.lineTo(corners[1].x, corners[1].y);
            ctx.lineTo(corners[2].x, corners[2].y);
            ctx.lineTo(corners[3].x, corners[3].y);
            ctx.closePath();
            ctx.stroke();

            const radius = 6 * displayRatio;
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = '#ffffff'; 
                ctx.beginPath();
                ctx.arc(corners[i].x, corners[i].y, radius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1 * displayRatio;
                ctx.stroke();
            }
        }
    }
}
render.pending = false;
