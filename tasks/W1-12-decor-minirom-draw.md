# W1-12: Decor preview calls a PigCanvas method that does not exist
Goal: the decor preview renders its mini room without throwing, so the Home smoke test can open the Decor screen.
Depends on: nothing. Facts: `web/home/features/decor/feature.js` (about line 446) calls `miniRoom.draw(null, st)`; `PigCanvas` in `web/home/canvas-pig.js` has `updateState(state)` (about line 315) and `render()` (about line 494), and no `draw`. The constructor takes only the canvas element.
Change: `web/home/features/decor/feature.js` (only the three lines around the `miniRoom` call)
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `canvas-pig.js`, `tools/qa/*`, C#.
Steps:
1. Replace `miniRoom.draw(null, st);` with `miniRoom.updateState(st);` followed by `miniRoom.render();`. Keep the surrounding `if (window.PigCanvas)` structure.
2. Do not change any other behavior of the decor screen.
Verify: `node tools/qa/web-smoke.js` prints `WEB SMOKE OK` and the console has no `[feature decor] TypeError`; `node --check web/home/features/decor/feature.js`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, why `draw` was wrong, how to check by hand.
