# Task F5-02: Minigame "Hay Maze"

Read `AGENTS.md` first and follow it. Requires F4-08 merged.

## Goal
New Phaser 3 minigame in ONE new file `web/home/minigames/hay-maze.js` (already listed in `games.json`). Follow the
structure of `veggie-rain.js` (read it first): `Minigry.register({ id: 'hay_maze', name: 'Hay Maze', icon: '🌀', desc, start })`.

## Library (R9, R10.3)
- Phaser 3.90.0 pinned locally; pass `pixelArt: true` and `roundPixels: true` explicitly; no Phaser 4; no maze or path-finding library:
  the maze is a hand-written recursive backtracker (about 20 lines, always solvable, roughly 10-12 % of cells are dead ends by
  our own measurement) and the click-to-walk path is a plain BFS. Run the game once after the framework replacement and say so in the PR.

## Rules of the game
- Top-down maze of hay-bale walls, random every run, recursive backtracker. Level 1 is 9x9 cells, every next level is 2 cells
  bigger per side (11x11, 13x13 ... max 21x21); cell size shrinks so the maze always fits 360x290 (draw with rectangles,
  pixelArt on, no external assets).
- The pig is a simple top-down sprite: draw a 12x8 px pig from rectangles (body ginger 0xd98c3a, ears, eye, nose), flipped
  by direction. Move with arrow keys / WASD, or by dragging the pig / clicking a target cell (walks along the shortest
  path, BFS). Movement is cell-to-cell with a short tween, never through walls.
- Goal: the bell pepper icon (icons16 index 0) at the far end. Time: 60 s per level, the remaining time carries a bonus.
  Clover icons (index of `clover` in `icons.json`) lie in 3 random dead ends, +10 points each.
- Score = level * 10 + seconds left + clovers collected * 10, summed over levels. The run ends when time runs out; the
  levels cleared so far count. `config.updateScore(score)` after every change, `config.endGame(score)` at the end.
- Add a small HUD: level, time, score (style from `veggie-rain.js`).

## Checks
`node --check`; `node tools/qa/web-smoke.js`; in the PR say that a generated maze is always solvable (add a tiny
self-check in code under `if (window.__CUY_TEST__)` that verifies it for 50 seeds and logs `maze ok`).

## Gotowe pliki
None: no ready-made file; write the generator yourself (no external maze library).

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC (`TESTY_RECZNE.md` PHASER-01): play Hay Maze once in the real WebView2 Home (movement, drag-to-walk, timer).

When done, open a pull request against `main` titled `F5-02: Minigame Hay Maze`.
