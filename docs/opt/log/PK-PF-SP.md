# PK-PF-SP Log
- Status: OK. Implemented obstacle-aware spawning, segment line-of-sight targeting, and X/Y slide deflection in `web/home/lib/scene-pigs.js`.
- Added `isSegmentFree(x0, y0, x1, y1, isFreeFn)` (4 px step, exported on `CuyScenePigs` and used by `pickTarget`).
- `create(opts)` and `sync(list, isFreeFn)` support `isFree`; `pickSpawnPoint` skips blocked samples, falls back to a 4 px spiral scan `findNearestFree` inside `bounds`, and `stepPig` rescues unpinned pigs stuck on blocked cells while keeping pinned props fixed.
- `stepPig` uses `trySlideStep` (X/Y slide ordered by larger `|dx|` vs `|dy|` when delta >= 0.5 px), resetting to `idle` if neither axis can move.
- Differences from prompt names (per RF4): walk stepper is `stepPig` (called by `step`), sync is `sync`, and `pickTarget(pig, b, isFreeFn)` closes over `pigs`/`rng`.
- Exposed `targets` in `debug()` (without changing `entries()`) so QA tests can inspect `pickTarget` outputs directly.
- Added QA tests S12-S14 in `tools/qa/ux-p5-scene-pigs.js` without altering existing assertions; verification (`node --check` + `node tools/qa/ux-p5-scene-pigs.js`) passed S1-S14.
