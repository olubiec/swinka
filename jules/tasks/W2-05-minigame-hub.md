# Task W2-05: Minigame hub: data-driven list, rewards, records

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: wave 1 merged.
Replaces old task(s): F4-08 + F5-04. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

One PR, one owner for all hub files. Do Part A first, then Part B on top of it. `games.json` lists `veggie-rain.js`, `hay-maze.js`, `veggie-memory.js` (Hay Hop is in the backlog); a missing file is ignored by design.

## Part A: data-driven list (from F4-08)

### Goal
Each minigame is one JS file calling `Minigry.register(...)`, but `web/home/index.html` has one `<script>` tag per game.
Several agents will add games in parallel, so make the list data-driven.

### Files you may change
`web/home/index.html`, `web/home/minigames/minigames-api.js`, new `web/home/minigames/games.json`, `tools/qa/web-smoke.js`.

### Specification
1. `games.json`: `["veggie-rain.js", "hay-maze.js", "veggie-memory.js"]` (the last two may not be merged yet).
2. After Phaser and `minigames-api.js` load, the page fetches `minigames/games.json` (relative URL; inside WebView2
   this is `https://cuy.home/minigames/games.json`) and appends one `<script>` per file in order. A 404 or a script
   error is ignored (logged with `console.warn`) so games that are not written yet never break the hub. Remove the
   static `veggie-rain.js` tag.
3. The hub shows each registered game as a tile with name, icon, description, best score
   (`state.highScores[id]`), and "More games soon" only if fewer than 3 games are registered.
4. Smoke test: after loading Home, assert that `Minigry.list().length >= 1`, open the Games screen and screenshot it;
   for every registered game start it, wait 2 s, call its end, assert no console error. (Use
   `window.Minigry.start(id)` / the existing API; read `minigames-api.js` first.)

### Checks
`node --check`, `node tools/qa/web-smoke.js` pass.

## Part B: rewards, daily limit and records (from F5-04)

### Goal
The shared result screen and Core rules exist (`Pet.RecordMinigameResult`: clovers = min(40, points / 10), mood +15 for
rewarded games, +3 over the daily limit, 0 for score 0; `GameState.HighScores`, `MinigamesDailyCount`). Make the
hub honest and fun now that there are several games.

### Files you may change
`web/home/minigames/minigames-api.js`, `web/home/app.js` (games screen only), `web/home/style.css`,
`web/home/bridge.js` (mock), `src/Cuy/dotNet/HomeWindow.cs` (state fields only), `src/Cuy.Core/Pet.cs` /
new `src/Cuy.Core/Pet.Minigames.cs` (read-only helpers), `tests/Cuy.Core.Tests/MinigameRewardTests.cs`.

### Specification
1. State key `minigames`: `{ "dailyCount": 3, "dailyMax": 10, "highScores": { "veggie_rain": 140 }, "plays": { "veggie_rain": 6 } }`.
   Add the play counter (`GameState.MinigamePlays`, new property with default empty dictionary via a partial file).
2. Hub header: "Rewarded games today 3 / 10" with 10 small paw/clover dots. When the limit is reached, a tile note
   "Over the daily limit: only a little mood" (no reward claims).
3. Result screen: shows points, the record (with "New record!" flash), clovers earned, mood gained (from the Core result,
   not recomputed in JS), and two buttons Play again / Back. Never show a reward when the Core returned 0.
4. Per game "How to play" one-liner (from `desc`) shown on a first-play overlay (remember in `localStorage` in try/catch).
5. Unit tests for the new counter and for the first game of the day vs the 11th.

### Checks
`dotnet test ... -c Release`, `node --check`, smoke test, Cuy.csproj builds.

When done, open a pull request against `main` titled `W2-05: Minigame hub`.
