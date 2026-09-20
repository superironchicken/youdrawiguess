// 渲染：纯"state → DOM"，按钮的事件在 innerHTML 生成后统一用 addEventListener 挂
import { state } from './state.js';
import { pickWord, doneDrawing, submitAnswer, vote } from './actions.js';

function updateStatus(s) {
    const el = document.getElementById('status');
    const drawer = s.players.find(p => p.id === s.drawerId);
    const who = drawer ? drawer.name : '?';
    if (s.phase === 'waiting') {
        el.textContent = '等待开始（至少2人）';
    } else if (s.phase === 'choosing') {
        el.textContent = s.drawerId === state.myId ? '请选一个词' : '画师(' + who + ')正在选词...';
    } else if (s.phase === 'drawing') {
        el.textContent = s.drawerId === state.myId ? '你是画师，开始画吧！' : '画师是：' + who;
    } else if (s.phase === 'answering') {
        el.textContent = s.drawerId === state.myId ? '等待大家提交答案...' : '你猜这是什么？';
    } else if (s.phase === 'voting') {
        el.textContent = '投票：每个答案是否合理';
    } else if (s.phase === 'roundEnd') {
        el.textContent = '回合结束';
    }
}

function renderPanel() {
    const panel = document.getElementById('panel');
    if (state.gameOver) {
        panel.innerHTML = `<b>${state.gameOver.winner}</b> 赢得了游戏！<br>房主可再次点击开始游戏`;
    } else if (state.phase === 'choosing' && state.isDrawer) {
        panel.innerHTML = state.choices.map((w, i) =>
            `<button data-pick="${i}">${w}</button>`).join('');
        panel.querySelectorAll('button[data-pick]').forEach(btn =>
            btn.addEventListener('click', () => pickWord(Number(btn.dataset.pick))));
    } else if (state.phase === 'drawing' && state.isDrawer) {
        panel.innerHTML = `你要画的是：<b>${state.word}</b> <button data-done>画完了</button>`;
        panel.querySelector('button[data-done]').addEventListener('click', doneDrawing);
    } else if (state.phase === 'answering' && !state.isDrawer) {
        panel.innerHTML = '答案：<input id="answerinput"> <button data-submit>提交</button>';
        const input = panel.querySelector('#answerinput');
        panel.querySelector('button[data-submit]').addEventListener('click', () => submitAnswer(input));
    } else if (state.phase === 'voting' && state.voteData) {
        const targets = [];
        for (const a of state.voteData.answers) {
            if (a.playerId !== state.myId) {
                targets.push({ id: a.playerId, label: `${a.name} 的答案是：${a.text}` });
            }
        }
        if (state.voteData.drawerId !== state.myId) {
            const drawer = state.players.find(p => p.id === state.voteData.drawerId);
            targets.push({ id: state.voteData.drawerId, label: `${drawer ? drawer.name : '画师'} 的画` });
        }
        panel.innerHTML = `<b>标准答案是：${state.voteData.word}</b><br>` +
            targets.map(t => `
                <div style="margin:4px 0">
                    ${t.label}，合理吗？
                    <button data-target="${t.id}" data-yes="true" ${state.myVotes[t.id] === true ? 'disabled' : ''}>合理</button>
                    <button data-target="${t.id}" data-yes="false" ${state.myVotes[t.id] === false ? 'disabled' : ''}>不合理</button>
                </div>`).join('');
        panel.querySelectorAll('button[data-target]').forEach(btn =>
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const yes = btn.dataset.yes === 'true';
                vote(targetId, yes);
                state.myVotes[targetId] = yes;
                renderPanel();
            }));
    } else if (state.phase === 'roundEnd' && state.reveal) {
        panel.innerHTML = `答案是：<b>${state.reveal.word}</b><br>` +
            state.reveal.answers.map(a => `${a.name}：${a.text}`).join('<br>') +
            '<br>' + state.reveal.scores.map(s => `${s.name} 本回合 +${s.gained}`).join('<br>') +
            '<br>6秒后开始下一轮';
    }
}

function renderScores() {
    const list = document.getElementById('scorelist');
    list.innerHTML = state.players.slice().sort((a, b) => b.score - a.score)
        .map(p => `<li>${p.name}: ${p.score}</li>`).join('');
}

export { updateStatus, renderPanel, renderScores };
