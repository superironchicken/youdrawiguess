// 画板：本地 strokes 数组 + 命令式同步。
// 只有画师在 drawing 阶段能画；撤销/清空必须作为命令发给服务器，不能只改本地
import { socket } from './connection.js';
import { state } from './state.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

let strokes = [];
let drawing = false;    // 是否正在画
let lastX = 0, lastY = 0;
let current = null;
let pen = { color: '#ff0000', width: 4 };

// ---- 远端命令的应用（socket.js 调用）----
function applyRemoteStroke(s) {
    strokes.push(s);
    redraw();
}
function applyUndo() {
    strokes.pop();
    redraw();
}
function applyClear() {
    strokes = [];
    redraw();
}

// ---- 工具栏 ----
document.getElementById('colorpick').addEventListener('input', (e) => {
    pen.color = e.target.value;
});

document.getElementById('widthpick').addEventListener('input', (e) => {
    pen.width = Number(e.target.value);
});

document.getElementById('clearbtn').addEventListener('click', () => {
    if (!(state.phase === 'drawing' && state.isDrawer)) return;
    strokes = [];
    redraw();
    socket.emit('clear-board', state.myRoom);
});

document.getElementById('undobtn').addEventListener('click', () => {
    if (!(state.phase === 'drawing' && state.isDrawer)) return;
    strokes.pop();
    redraw();
    socket.emit('undo', state.myRoom);
});

// ---- 绘制 ----
function drawStroke(s) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
    }
    ctx.stroke();
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(drawStroke);
}

// 把浏览器坐标换算成画布内部坐标
function pos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (!(state.phase === 'drawing' && state.isDrawer)) return;
    drawing = true;
    const p = pos(e);
    lastX = p.x; lastY = p.y;
    current = { color: pen.color, width: pen.width, points: [p] };
    strokes.push(current);
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.strokeStyle = pen.color;
    current.points.push({ x: p.x, y: p.y });
    ctx.lineWidth = pen.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
});

// 一笔画完（松开鼠标）才发给服务器
canvas.addEventListener('mouseup', () => {
    drawing = false;
    if (state.phase === 'drawing' && state.isDrawer) socket.emit('stroke', { room: state.myRoom, stroke: current });
    current = null;
});
canvas.addEventListener('mouseleave', () => { drawing = false; });

export { applyRemoteStroke, applyUndo, applyClear };
