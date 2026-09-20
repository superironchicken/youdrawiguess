## 这是什么

一个网页版的「你画我猜」多人小游戏。一个人画，其他人猜，猜完大家投票，先到 100 分的赢。

技术栈很简单：Node.js + Express + Socket.IO 做后端（服务器说了算，前端只是显示），前端是原生的 HTML + JavaScript，不用构建工具，也不用框架。

玩法流程：

1. 输入名字，创建或加入一个 4 位房间号（至少 2 人）
2. 每轮系统选分数最高的人当画师，画师从 3 个候选词里挑一个（15 秒）
3. 画师在画板上画画（60 秒），其他人实时看到笔画
4. 大家盲猜答案并提交（30 秒，画师不猜）
5. 揭示答案，所有人给每个答案和画作投票「合理/不合理」（30 秒）
6. 计分：猜的人得票率 × 100，画师减半；先到 100 分获胜

## 更新记录

First commit: 基本实现了绘制和交互

v0.1： 基本完成了功能

v0.2： 代码拆分重构。逻辑没变，只是按职责拆成了多个文件，方便阅读和维护。

## 部署方法

1.安装npm 以及依赖 npm ci。
2.node server.js 启动
3.然后局域网访问 127.0.0.1:33333 默认。然后开放端口映射？

## 项目结构

```
server.js              # 启动入口：组装 http / express / socket.io
src/                   # 后端
  config.js            #   常量：词表、计分参数、各阶段秒数（改游戏规则只动这里）
  rooms.js             #   房间数据：rooms 表、创建房间
  broadcast.js         #   广播出口：统一管理发消息，启动时注入 io
  timer.js             #   倒计时：每秒广播 countdown，到点进下一阶段
  game.js              #   游戏状态机：选词→画→答→投票→计分→换轮
  socketHandlers.js    #   所有 socket 事件的入口 + 身份/阶段校验
front/                 # 前端（原生 JS 的 ES Modules，无需构建）
  index.html           #   页面骨架
  style.css            #   样式
  js/
    main.js            #   入口：初始化各模块 + 房间按钮
    connection.js      #   唯一的 socket 接
    state.js           #   状态唯一存放处（phase、players、word 等）
    socket.js          #   收服务器消息 → 更新 state → 触发重画
    actions.js         #   用户操作：发消息给服务器
    render.js          #   渲染：state → DOM
    canvas.js          #   画板：笔画、撤销、清空、鼠标事件
```

数据流：

- 后端：socketHandlers 收到消息 → 校验 → game.js 改房间状态并广播 → 前端被动更新。
- 前端：socket.js 收到推送 → 写进 state.js → render.js / canvas.js 根据 state 重画。


