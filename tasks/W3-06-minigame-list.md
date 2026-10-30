# W3-06: Minigames are loaded from a list: new games never touch shared files
Zmieniaj: web/home/index.html, web/home/minigames/minigames-api.js, web/home/minigames/games.json
Wymagane: web/home/minigames/games.json
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/minigames/minigames-api.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/minigames/veggie-rain.js, tools/qa/*, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: each minigame is one JS file named in `games.json`; adding a game never edits `index.html` or `minigames-api.js` again.
Depends on: W2-02 (strict smoke test) merged. Read `web/home/index.html` (script tags around line 252), `web/home/minigames/minigames-api.js` (`register`, the hub rendering, the "More games soon" tile) and `web/home/minigames/veggie-rain.js` first. In the real app the page is served from `https://cuy.home/` or `https://cuy.assets/` (see `minigames-api.js` base path logic); in the browser mock from relative paths.
Steps:
1. `games.json`: `["veggie-rain.js"]` (the list of existing game files only; later tasks append their file name: `hay-maze.js`, `veggie-memory.js`, `hay-hop.js`).
2. After Phaser and `minigames-api.js` have loaded, the page fetches `minigames/games.json` (relative URL, so it works in the mock and inside WebView2) and appends one `<script>` per file, in order, waiting for each to load or fail before the next. A 404 or a script error is logged with `console.warn` and skipped, so a game that does not exist yet never breaks the hub. Remove the static `veggie-rain.js` tag from `index.html`. Make sure nothing in the page assumes the game scripts already ran at parse time (the hub renders when the Games screen opens).
3. Hub tiles: each registered game shows name, icon, description and the best score from `state.minigames.records[id]` (the real key name today; use `records`, not `highScores`). The "More games soon" tile is shown only while fewer than 4 games are registered.
4. No `console.error` and no page error for the missing optional files (use `console.warn`; the smoke test treats `warn` as fine).
Verify: `node tools/qa/web-smoke.js` prints `WEB SMOKE OK`; `node --check` on every changed JS file; open `web/home/index.html` through the smoke server and confirm `Minigry.list().length` is 1.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; a screenshot of the Games screen.
