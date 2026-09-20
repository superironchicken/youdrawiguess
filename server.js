// 启动入口：只负责把 http / express / socket.io 组装起来
const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const { registerHandlers } = require('./src/socketHandlers');

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server);

app.use(express.static('front'));
registerHandlers(io);

server.listen(33333, () => console.log("请访问  http://127.0.0.1:33333  (默认)"));
