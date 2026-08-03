const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Server = socketio.Server;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = {};

const WORDS = ['苹果','房子','电脑','月亮','熊猫','飞机','香蕉','雨伞','太阳','汽车','小狗','电视','书本','铅笔','火车','足球','蛋糕','花朵','山峰','河流','眼睛','电话','眼镜','楼梯','剪刀','灯笼','火箭','企鹅','蘑菇','冰淇淋'];
const TARGET_SCORE = 100;
const BASE_SCORE = 100;
const DRAWER_COEF = 0.5;

function generationroom(){
	let code;
	do{
		code = String(Math.random()).slice(2,6);
	}while(rooms[code]);
	return code;
}

function newRoom(code, hostId, hostName) {
	return {
		code,
		host: hostId,
		players: [{ id: hostId, name: hostName, score: 0 }],
		phase: 'waiting',
		drawerId: null,
		word: null,
		choices: [],
		answers: [],
		votes: {},
		voteCount: 0,
		timeLeft: 0,
		timer: null,
		finished: false,
	};
}

function pickDrawer(room) {
	if (room.drawerId === null) return room.host;
	let best = room.players[0];
	for (const p of room.players) if (p.score > best.score) best = p;
	return best.id;
}

function pickChoices() {
	const pool = [...WORDS];
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool.slice(0, 3);
}

function clearTimer(room) {
	if (room.timer) clearInterval(room.timer);
	room.timer = null;
}

function startTimer(room, seconds, onEnd) {
	clearTimer(room);
	room.timeLeft = seconds;
	io.to(room.code).emit('countdown', room.timeLeft);
	room.timer = setInterval(() => {
		room.timeLeft--;
		io.to(room.code).emit('countdown', room.timeLeft);
		if (room.timeLeft <= 0) {
			clearTimer(room);
			onEnd();
		}
	}, 1000);
}

function broadcastState(room) {
	io.to(room.code).emit('game-state', {
		phase: room.phase,
		drawerId: room.drawerId,
		players: room.players,
	});
}

function startChoosing(room) {
	room.drawerId = pickDrawer(room);
	room.phase = 'choosing';
	room.choices = pickChoices();
	io.to(room.code).emit('clear-board');
	broadcastState(room);
	const drawer = io.sockets.sockets.get(room.drawerId);
	if (drawer) drawer.emit('word-choices', room.choices);
	startTimer(room, 15, () => {
		room.word = room.choices[0];
		startDrawing(room);
	});
}

function startDrawing(room) {
	room.phase = 'drawing';
	broadcastState(room);
	const drawer = io.sockets.sockets.get(room.drawerId);
	if (drawer) drawer.emit('your-word', room.word);
	startTimer(room, 60, () => startAnswering(room));
}

function startAnswering(room) {
	room.phase = 'answering';
	room.answers = [];
	broadcastState(room);
	startTimer(room, 30, () => startVoting(room));
}

function startVoting(room) {
	clearTimer(room);
	room.phase = 'voting';
	room.votes = {};
	room.voteCount = 0;
	broadcastState(room);
	io.to(room.code).emit('voting-start', {
		word: room.word,
		answers: room.answers,
		drawerId: room.drawerId,
	});
	startTimer(room, 30, () => finishVoting(room));
}

function finishVoting(room) {
	clearTimer(room);
	const n = room.players.length;
	const gained = room.players.map(p => {
		const yes = room.votes[p.id] ? Object.values(room.votes[p.id]).filter(v => v).length : 0;
		const isDrawer = p.id === room.drawerId;
		return { id: p.id, name: p.name, gained: Math.round(yes / (n - 1) * BASE_SCORE * (isDrawer ? DRAWER_COEF : 1)) };
	});
	gained.forEach(g => {
		const player = room.players.find(p => p.id === g.id);
		player.score += g.gained;
	});

	room.phase = 'roundEnd';
	io.to(room.code).emit('round-reveal', {
		word: room.word,
		answers: room.answers,
		scores: gained,
		players: room.players,
	});

	const winner = room.players.find(p => p.score >= TARGET_SCORE);
	if (winner) {
		room.phase = 'waiting';
		room.finished = true;
		io.to(room.code).emit('game-over', { winner: winner.name, players: room.players });
	} else {
		setTimeout(() => nextRound(room), 6000);
	}
}

function nextRound(room) {
	room.word = null;
	room.choices = [];
	room.answers = [];
	room.votes = {};
	room.voteCount = 0;
	startChoosing(room);
}

app.use(express.static('front'));

io.on('connection',(socket) => {
	console.log(socket.id,'来了');

	socket.on('create-room',(name, cb)=>{
		const code = generationroom();
		rooms[code]= newRoom(code, socket.id, name);
		socket.join(code);
		cb(code);
	});

	socket.on('join-room',(code, name, cb)=>{
		const room = rooms[code];
		if(!room){
			cb({ok:false});
			return;
		}
		if (room.phase !== 'waiting' && !room.finished){
			cb({ok:false, msg:'游戏已开始，无法加入'});
			return;
		}
		room.players.push({id:socket.id, name, score:0});
		socket.join(code);
		cb({ok:true});
		io.to(code).emit('room-update', room.players);
	});

	socket.on('start-game',(code)=>{
		const room = rooms[code];
		if(!room) return;
		if(socket.id !== room.host) return;
		if(room.players.length < 2) return;
		if (room.finished) {
			room.finished = false;
			room.players.forEach(p => p.score = 0);
		}
		startChoosing(room);
	});

	socket.on('choose-word',(code, index)=>{
		const room = rooms[code];
		if(!room) return;
		if(room.phase !== 'choosing') return;
		if(socket.id !== room.drawerId) return;
		const w = room.choices[index];
		if(!w) return;
		room.word = w;
		clearTimer(room);
		startDrawing(room);
	});

	socket.on('done-drawing',(code)=>{
		const room = rooms[code];
		if(!room) return;
		if(room.phase !== 'drawing') return;
		if(socket.id !== room.drawerId) return;
		clearTimer(room);
		startAnswering(room);
	});

	socket.on('answer',(code, text)=>{
		const room = rooms[code];
		if(!room) return;
		if(room.phase !== 'answering') return;
		if(socket.id === room.drawerId) return;
		if(room.answers.some(a => a.playerId === socket.id)) return;
		const player = room.players.find(p => p.id === socket.id);
		room.answers.push({ playerId: socket.id, name: player ? player.name : '?', text });
		if(room.answers.length >= room.players.length - 1){
			startVoting(room);
		}
	});

	socket.on('vote',(code, targetId, yes)=>{
		const room = rooms[code];
		if(!room) return;
		if(room.phase !== 'voting') return;
		if(socket.id === targetId) return;
		if(room.votes[targetId] && room.votes[targetId][socket.id] !== undefined) return;
		room.votes[targetId] = room.votes[targetId] || {};
		room.votes[targetId][socket.id] = yes;
		room.voteCount++;
		if(room.voteCount >= room.players.length * (room.players.length - 1)){
			finishVoting(room);
		}
	});

	socket.on('stroke', (data) =>{
		const room = rooms[data.room];
		if(!room) return;
		if(room.phase !== 'drawing') return;
		if(socket.id !== room.drawerId) return;
		socket.to(data.room).emit('stroke',data.stroke);
	});
});

server.listen(33333, () => console.log('testmessage'));
