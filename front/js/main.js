// 入口：import 即初始化各模块，再挂上房间相关的按钮
import './socket.js';
import './canvas.js';
import { socket } from './connection.js';
import { state } from './state.js';

document.getElementById('createbtn').addEventListener('click', () => {
    const name = document.getElementById('nameinput').value || '无名氏';
    socket.emit('create-room', name, (code) => {
        state.myRoom = code;
        document.getElementById('myroom').textContent = '房间号：' + code;
    });
});

document.getElementById('startbtn').addEventListener('click', () => {
    socket.emit('start-game', state.myRoom);
});

document.getElementById('joinbtn').addEventListener('click', () => {
    const code = document.getElementById('roominput').value;
    const name = document.getElementById('nameinput').value || '无名氏';
    socket.emit('join-room', code, name, (res) => {
        if (res.ok) {
            state.myRoom = code;
            document.getElementById('startbtn').textContent = '等待开始游戏';
            document.getElementById('myroom').textContent = '房间号：' + code;
        } else {
            alert(res.msg || '加入失败');
        }
    });
});
