// 唯一的 socket 连接：谁要发消息就从这里 import，避免各处自己 io() 建多条连接
const socket = io();

export { socket };
