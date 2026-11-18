# PK-P5a Log
- Status: OK
- Created `web/home/lib/scene-pigs.js` (UMD: `window.CuyScenePigs` / `module.exports`) and `tools/qa/ux-p5-scene-pigs.js` (S1-S11).
- API: `CuyScenePigs.create({ rng, bounds, minGap, speed })` -> `{ sync, step, entries, remove, setBounds, setPinned, debug }`.
- Entry fields: `{ id, x, y, facing, anim, frame, look, stage, pinned }`, sorted by `y` asc then `id`.
- Decisions: capped total `step(dtMs)` at 2000ms (with <=50ms substeps) to prevent hang on huge `dtMs` (e.g. `1e8`); `setBounds` clamps existing pigs and targets; initial unpinned `idleTimer` uses `rng()*400` so pigs start walking promptly.
- Differences from R29/R5: followed R29 sec 3 + Prompt fixes (pure `scene-pigs.js` only; `canvas-pig.js` and `places/feature.js` from R5 untouched per Zmieniaj).
- STUBs: `isFree` obstacle function injected directly in S5/S9 (`ux-p5-scene-pigs.js`).
- Verification: `node --check web/home/lib/scene-pigs.js && node --check tools/qa/ux-p5-scene-pigs.js && node tools/qa/ux-p5-scene-pigs.js` -> PASS (S1-S11, 4 pigs x 10000 steps: 79ms).
