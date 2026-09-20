// 前端状态的唯一存放处：所有模块都从这里读写，不再用散落的全局变量
const state = {
    myId: null,      // 连接建立后才有值（socket.on('connect') 里设置）
    myRoom: null,    // 当前房间号
    phase: 'waiting',
    isDrawer: false,
    word: null,
    choices: [],
    reveal: null,
    players: [],
    voteData: null,
    myVotes: {},
    gameOver: null,
};

export { state };
