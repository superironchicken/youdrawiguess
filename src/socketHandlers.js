// 所有 socket 事件的入口：身份校验 + 阶段校验都在这里，校验过了才调 game.js
const { rooms, generationroom, newRoom } = require('./rooms');
const { setIo, toRoom } = require('./broadcast');
const { startChoosing, startDrawing, startAnswering, startVoting, finishVoting } = require('./game');
const { clearTimer } = require('./timer');

function registerHandlers(io) {
	setIo(io);

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

		socket.on('clear-board',(code)=>{
			const room = rooms[code];
			if(!room) return;
			if(room.phase !== 'drawing') return;
			if(socket.id !== room.drawerId) return;
			socket.to(room.code).emit('clear-board');
		});

		socket.on('undo',(code)=>{
			const room = rooms[code];
			if(!room) return;
			if(room.phase !== 'drawing') return;
			if(socket.id !== room.drawerId) return;
			socket.to(room.code).emit('undo');
		});
	});
}

module.exports = { registerHandlers };
