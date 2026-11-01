# W5-07: Minigame Hay Maze: drawing and controls
Zmieniaj: web/home/minigames/hay-maze.js, web/home/minigames/games.json
Wymagane: web/home/minigames/hay-maze.js, web/home/minigames/games.json
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/minigames/hay-maze.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/minigames/hay-maze-logic.js, tools/qa/maze-test.js, web/home/minigames/minigames-api.js, web/home/index.html, AGENTS.md, docs/PLAN.md, tasks/*
Goal: A Phaser minigame where the pig walks a hay-bale maze to a bell pepper, built on the tested generator.
Depends on: W3-11 (`hay-maze-logic.js`: `HayMazeLogic.generate(width, height, seed)` and `solve(maze)`), W3-06 (`games.json` loader), W4-06 (copy its structure) merged.
Facts: Read `veggie-rain.js` and `veggie-memory.js` for the register / `config` / pig pattern. Phaser 3.90 pinned locally, `pixelArt: true` and `roundPixels: true` set explicitly. Read `hay-maze-logic.js` for the exact shape of the maze object it returns.
Steps:
1. `games.json`: append `"hay-maze-logic.js"` and then `"hay-maze.js"` (in this order; the logic file registers no game). Keep valid JSON.
2. Register `{ id: 'hay_maze', name: 'Hay Maze', icon: '🌀', desc, start }`. Level 1 is 9x9 cells, every next level 2 cells bigger per side (max 21x21); the cell size shrinks so the maze always fits 360x290. Use `HayMazeLogic.generate` with a random seed; draw walls as hay-bale rectangles, no external assets.
3. The pig is a 12x8 px top-down sprite drawn from rectangles (ginger body 0xd98c3a, ears, eye, nose), flipped by direction. Move with arrow keys / WASD, or drag the pig / click a target cell (walks along the shortest path: write a small BFS from the pig's current cell; `solve` may only cover start to goal). Movement is cell to cell with a short tween, never through walls.
4. Goal: the bell pepper icon at the far end (`assets/icons/icons.json`). 60 s per level, the remaining time is a bonus. Clover icons lie in 3 random dead ends, +10 points each. Score = level * 10 + seconds left + clovers * 10, summed over levels; the run ends when time runs out. `config.updateScore(score)` after every change, `config.endGame(score)` at the end. HUD: level, time, score in the style of `veggie-rain.js`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; screenshot of a level in the mock page; "play once in the real Home" goes to TESTY_RECZNE.md PHASER-01..
