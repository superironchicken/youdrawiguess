# AGENTS.md

你画我猜 (Draw & Guess) web game. Single-process Node.js server; no build step, no framework on the frontend.

## Run / verify

- `node server.js` → serves on port **33333** (hardcoded; no env var, no `package.json` scripts).
- Requires Node 18+ (Express 5). Dev machine has Node 22.
- Syntax check: `node --check server.js src/*.js`. Frontend modules are ESM — `node --check` fails on `.js` with `import`; copy to `.mjs` to check. No linter, no test runner, no CI.
- **Editing `server.js` or anything in `src/` requires a server restart.** Editing `front/` requires only a browser refresh.
- No tests in repo. The game was verified by driving it with simulated `socket.io-client` connections (create → join → start → choose → draw → answer → vote → reveal). `socket.io-client` is not a dependency — install with `npm install --no-save socket.io-client` and run the sim script from the repo (or set `NODE_PATH=<repo>/node_modules`). Manual equivalent: open 2–3 browser tabs, host clicks 开始游戏, only the drawer's canvas edits reach others.

## Architecture (server-authoritative)

- Client is a dumb renderer. The server owns all truth: room state, drawer, word, scores, timers. Clients never decide anything game-logic.
- `rooms` is an in-memory object keyed by 4-digit code (`rooms[code]`). **Rooms are never deleted** when empty; disconnects are not handled (see Known gaps).
- Per-room state machine in `src/game.js`: `waiting → choosing → drawing → answering → voting → roundEnd → (6s pause → next round)`. `startChoosing/startDrawing/startAnswering/startVoting/finishVoting` transition phases and broadcast `game-state` (`{phase, drawerId, players}`). Phase limits live in `src/config.js`.
- Timers: `startTimer(room, seconds, onEnd)` in `src/timer.js` — server-side `setInterval`, broadcasts `countdown` every 1s, then calls `onEnd`. Per-phase limits: choosing 15s, drawing 60s, answering 30s, voting 30s.
- Scoring: `gained = round(yesVotes / (n-1) * 100 * coef)`, guesser coef 1.0, drawer coef 0.5 (`BASE_SCORE`, `DRAWER_COEF`, `TARGET_SCORE=100` in `src/config.js`).
- Next drawer = highest score (ties → earliest in `players` array); first round is always host. After `game-over`, `room.finished=true`; next `start-game` resets scores to 0.

### Rules that are easy to break (hard-won)

1. **Word secrecy.** `word-choices` and `your-word` are emitted to the **drawer's socket only** (`toSocket(room.drawerId).emit(...)` via `src/broadcast.js`), never via `toRoom(room)`. The word is not included in `game-state`. Do not leak it.
2. **Every action is validated server-side** with a phase check + identity check (`socket.id === room.drawerId`, `socket.id === room.host`, non-drawer answers only, no self-vote, no double-vote). Client-side guards are UX only.
3. **Canvas sync is command-based, not state-based.** Only the drawer draws, only during `drawing` phase. `stroke`, `undo`, `clear-board` are broadcast with `socket.to(room.code)` (excludes sender). Each client keeps a local `strokes` array and applies commands. This is safe because Socket.IO preserves per-connection message order (stroke N always arrives before its undo). Never let a client mutate canvas state silently — undo/clear must be emitted as commands, not applied locally only.

## Frontend (`front/`)

- Vanilla JS split into ES Modules under `front/js/` — **no build step, modules load natively**. `index.html` name is still load-bearing: `express.static('front')` serves `/` only if `front/index.html` exists.
- Module responsibilities: `state.js` is the single source of truth (no loose globals); `socket.js` receives pushes and updates state; `render.js` is state → DOM; `actions.js` only emits; `canvas.js` owns strokes and mouse events; `connection.js` exports the one shared socket. Keep this direction: events → state → render, never render deciding logic.
- Dynamic UI is one `#panel` div re-rendered by `renderPanel()` per phase + `isDrawer`. Since the refactor it wires buttons with `addEventListener` after setting `innerHTML` (no more inline `onclick` — module scope is not global, inline handlers would silently do nothing).
- All element ids are **lowercase** (`myroom`, `nameinput`, ...). `getElementById` is case-sensitive — mismatch is a recurring bug class here.
- Client `socket.id` is only valid after the `connect` event (`state.myId` is set there); drawing gates check `phase === 'drawing' && isDrawer` in both `mousedown` and `mouseup` (read from `state.js`).

## Style notes

- Code is beginner-level and loose on purpose: mixed tabs/spaces, Chinese console logs and UI strings (`console.log(socket.id,'来了')`, `server.listen(... 'testmessage')`). Match this — do not reformat or modernize further unless asked. (v0.2 split the code into modules and replaced inline `onclick`, but the style inside each file is unchanged.)
- Commits are sparse manual snapshots (v0.1); follow `git add` + plain commit messages when committing.

## Known gaps (don't assume these exist)

- Drawer disconnect mid-round: round runs to timeout, nobody can draw.
- Empty rooms never cleaned from `rooms`.
- No reconnection / mid-game joins (blocked once `phase !== 'waiting'`).
- Deployment is manual: `npm install` (deps: express, socket.io) then `node server.js`; friends reach it via server IP:33333 (README describes port-forwarding intent).
