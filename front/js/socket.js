// 收服务器消息：只负责更新 state 和触发重画，不做任何判断
import { socket } from './connection.js';
import { state } from './state.js';
import { renderPanel, renderScores, updateStatus } from './render.js';
import { applyRemoteStroke, applyUndo, applyClear } from './canvas.js';

socket.on('connect', () => {
    state.myId = socket.id;
});

socket.on('game-state', (s) => {
    state.phase = s.phase;
    state.isDrawer = (state.myId === s.drawerId);
    state.players = s.players;
    if (state.phase === 'choosing') { state.reveal = null; state.voteData = null; state.gameOver = null; }
    updateStatus(s);
    renderPanel();
    renderScores();
});

socket.on('word-choices', (chs) => {
    state.choices = chs;
    renderPanel();
});

socket.on('your-word', (w) => {
    state.word = w;
    renderPanel();
});

socket.on('countdown', (t) => {
    document.getElementById('countdown').textContent = t + 's';
});

socket.on('round-reveal', (data) => {
    state.reveal = data;
    renderPanel();
    renderScores();
});

socket.on('voting-start', (data) => {
    state.voteData = data;
    state.myVotes = {};
    renderPanel();
});

socket.on('game-over', (data) => {
    state.gameOver = data;
    renderPanel();
    renderScores();
});

socket.on('room-update', (pls) => {
    state.players = pls;
    renderScores();
});

// 画布同步是命令式的：别人的笔画/撤销/清空到达后按顺序应用
socket.on('stroke', (s) => applyRemoteStroke(s));
socket.on('undo', () => applyUndo());
socket.on('clear-board', () => applyClear());
