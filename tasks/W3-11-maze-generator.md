# W3-11: Maze generator for the Hay Maze minigame (pure logic + test)
Goal: a tested, UI-free maze generator that the Hay Maze game can use later.
Depends on: nothing. Facts: plain ES2020, no modules bundler; files are loaded with script tags or Node `require`, so use a UMD-style tail (`if (typeof module !== 'undefined') module.exports = ...; else window.HayMazeLogic = ...`). QA scripts live in `tools/qa/` and run in CI from `.github/workflows/ci.yml`.
Change: new `web/home/minigames/hay-maze-logic.js`, new `tools/qa/maze-test.js`, `.github/workflows/ci.yml` (one new step)
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `index.html`, `games.json`, `minigames-api.js`.
Steps:
1. `hay-maze-logic.js`: `generate(width, height, seed)` returns `{ width, height, cells, start, goal }` using a seeded PRNG (mulberry32) and an iterative recursive backtracker (no recursion, so 40x40 is safe). `cells[y][x]` has booleans `n, e, s, w` meaning an open passage. `start` is `{x:0,y:0}`, `goal` the farthest cell from the start found by BFS. Also `solve(maze)` returns the shortest path as a list of `{x,y}` (BFS). Same seed gives the same maze.
2. `tools/qa/maze-test.js` (plain Node, `assert`): 50 seeds at sizes 6x6, 10x10 and 20x20: every cell is reachable from the start, passages are symmetric (if a cell is open to the east, its east neighbour is open to the west), `solve` returns a path from start to goal whose steps are all open passages, and the same seed gives an identical maze. Print `MAZE TEST OK` and exit 0, else exit 1.
3. `ci.yml`: one step `node tools/qa/maze-test.js` next to the existing web-smoke step (same job; do not reformat the file).
Verify: `node tools/qa/maze-test.js` prints `MAZE TEST OK`; `node --check web/home/minigames/hay-maze-logic.js`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand.
