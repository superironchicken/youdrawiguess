// 游戏状态机：waiting → choosing → drawing → answering → voting → roundEnd → 下一轮
// 只改房间状态 + 通过 broadcast 发消息，不直接碰 socket 连接的注册（那在 socketHandlers.js）
const {
	WORDS,
	TARGET_SCORE,
	BASE_SCORE,
	DRAWER_COEF,
	CHOOSING_SECONDS,
	DRAWING_SECONDS,
	ANSWERING_SECONDS,
	VOTING_SECONDS,
	ROUND_END_PAUSE,
} = require('./config');
const { toRoom, toSocket } = require('./broadcast');
const { startTimer, clearTimer } = require('./timer');

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

function broadcastState(room) {
	toRoom(room.code).emit('game-state', {
		phase: room.phase,
		drawerId: room.drawerId,
		players: room.players,
	});
}

function startChoosing(room) {
	room.drawerId = pickDrawer(room);
	room.phase = 'choosing';
	room.choices = pickChoices();
	toRoom(room.code).emit('clear-board');
	broadcastState(room);
	// 词只发给画师本人，绝不能广播（泄词就玩不了了）
	const drawer = toSocket(room.drawerId);
	if (drawer) drawer.emit('word-choices', room.choices);
	startTimer(room, CHOOSING_SECONDS, () => {
		room.word = room.choices[0];
		startDrawing(room);
	});
}

function startDrawing(room) {
	room.phase = 'drawing';
	broadcastState(room);
	const drawer = toSocket(room.drawerId);
	if (drawer) drawer.emit('your-word', room.word);
	startTimer(room, DRAWING_SECONDS, () => startAnswering(room));
}

function startAnswering(room) {
	room.phase = 'answering';
	room.answers = [];
	broadcastState(room);
	startTimer(room, ANSWERING_SECONDS, () => startVoting(room));
}

function startVoting(room) {
	clearTimer(room);
	room.phase = 'voting';
	room.votes = {};
	room.voteCount = 0;
	broadcastState(room);
	toRoom(room.code).emit('voting-start', {
		word: room.word,
		answers: room.answers,
		drawerId: room.drawerId,
	});
	startTimer(room, VOTING_SECONDS, () => finishVoting(room));
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
	toRoom(room.code).emit('round-reveal', {
		word: room.word,
		answers: room.answers,
		scores: gained,
		players: room.players,
	});

	const winner = room.players.find(p => p.score >= TARGET_SCORE);
	if (winner) {
		room.phase = 'waiting';
		room.finished = true;
		toRoom(room.code).emit('game-over', { winner: winner.name, players: room.players });
	} else {
		setTimeout(() => nextRound(room), ROUND_END_PAUSE);
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

module.exports = {
	startChoosing,
	startDrawing,
	startAnswering,
	startVoting,
	finishVoting,
	nextRound,
	broadcastState,
};
