// 用户操作：只负责发消息给服务器，不做本地决策（客户端校验只是体验优化）
import { socket } from './connection.js';
import { state } from './state.js';

function pickWord(i) { socket.emit('choose-word', state.myRoom, i); }

function doneDrawing() { socket.emit('done-drawing', state.myRoom); }

function submitAnswer(input) {
    if (!input.value.trim()) return;
    socket.emit('answer', state.myRoom, input.value);
    input.disabled = true;
}

function vote(targetId, yes) { socket.emit('vote', state.myRoom, targetId, yes); }

export { pickWord, doneDrawing, submitAnswer, vote };
