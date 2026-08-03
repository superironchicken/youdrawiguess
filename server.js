const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Server = socketio.Server;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = {};

function generationroom(){
	let code;
	do{
		code = String(Math.random()).slice(2,6);
	}while(rooms[code]);
	return code;
}
app.use(express.static('front'));

io.on('connection',(socket) => {
	console.log(socket.id,'来了');

	socket.on('create-room',(cb)=>{
		const code = generationroom();
		rooms[code]= {host:socket.id , members:new Set([socket.id])};
		socket.join(code);
		cb(code);
	});

	socket.on('join-room',(code , cb)=>{
		if(!rooms[code]){
			cb({ok:false});
			return;
		}
		rooms[code].members.add(socket.id);
		socket.join(code);
		cb({ok:true});
	});

	socket.on('stroke', (data) =>{
		socket.to(data.room).emit('stroke',data.stroke);
	});
});

server.listen(33333, () => console.log('testmessage'));
