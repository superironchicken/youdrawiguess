// 倒计时：每秒广播一次 countdown，到 0 调 onEnd 进入下一阶段
const { toRoom } = require('./broadcast');

function clearTimer(room) {
	if (room.timer) clearInterval(room.timer);
	room.timer = null;
}

function startTimer(room, seconds, onEnd) {
	clearTimer(room);
	room.timeLeft = seconds;
	toRoom(room.code).emit('countdown', room.timeLeft);
	room.timer = setInterval(() => {
		room.timeLeft--;
		toRoom(room.code).emit('countdown', room.timeLeft);
		if (room.timeLeft <= 0) {
			clearTimer(room);
			onEnd();
		}
	}, 1000);
}

module.exports = { startTimer, clearTimer };
