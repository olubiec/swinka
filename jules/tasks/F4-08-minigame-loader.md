# Task F4-08: Minigames are loaded from a list - new games never touch shared files

Read `AGENTS.md` first and follow it. Requires waves 0-3 merged.

## Goal
Each minigame is one JS file calling `Minigry.register(...)`, but `web/home/index.html` has one `<script>` tag per game.
Several agents will add games in parallel, so make the list data-driven.

## Files you may change
`web/home/index.html`, `web/home/minigames/minigames-api.js`, new `web/home/minigames/games.json`, `tools/qa/web-smoke.js`.

## Specification
1. `games.json`: `["veggie-rain.js", "hay-hop.js", "hay-maze.js", "veggie-memory.js"]` (the last three do not exist yet).
2. After Phaser and `minigames-api.js` load, the page fetches `minigames/games.json` (relative URL; inside WebView2
   this is `https://cuy.home/minigames/games.json`) and appends one `<script>` per file in order. A 404 or a script
   error is ignored (logged with `console.warn`) so games that are not written yet never break the hub. Remove the
   static `veggie-rain.js` tag.
3. The hub shows each registered game as a tile with name, icon, description, best score
   (`state.highScores[id]`), and "More games soon" only if fewer than 4 games are registered.
4. Smoke test: after loading Home, assert that `Minigry.list().length >= 1`, open the Games screen and screenshot it;
   for every registered game start it, wait 2 s, call its end, assert no console error. (Use
   `window.Minigry.start(id)` / the existing API; read `minigames-api.js` first.)

## Checks
`node --check`, `node tools/qa/web-smoke.js` pass.

When done, open a pull request against `main` titled `F4-08: Data-driven minigame list`.
