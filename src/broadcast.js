// 广播的统一出口：server 启动时注入 io，其它模块只从这里拿，不直接依赖 server.js
let io = null;

function setIo(instance) {
	io = instance;
}

function toRoom(code) {
	return io.to(code);
}

// 拿某个玩家自己的 socket（用于只发给画师的秘密消息，比如词）
function toSocket(id) {
	return io.sockets.sockets.get(id);
}

module.exports = { setIo, toRoom, toSocket };
