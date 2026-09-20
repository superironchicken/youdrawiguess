// 房间数据层：房间的创建和存放。游戏逻辑在 game.js，别混进来
const rooms = {};

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

module.exports = { rooms, generationroom, newRoom };
