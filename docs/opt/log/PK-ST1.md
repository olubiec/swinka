# PK-ST1 Log
- Status: PASS (`node --check` + `node tools/qa/ux-p134-stage-looks.js`: 9/9 passed).
- Implemented UMD module `web/home/lib/stage-looks.js` (`window.StageLooks` / `module.exports`) with `STAGES`, `NAMED_PIGS`, `normStage`, `normBreed`, `setData`, `getData`, `lookFor`, `badge`, `housePlate`.
- Added `assets/data/stage_looks.json` matching R50.md section 3 schema (5 stages, `young` -> `junior` alias, `adult` fallback).
- Added `tools/qa/ux-p134-stage-looks.js` covering L1..L9 and verifying all 70+ sprite files exist under `assets/sprites/`.
- Decisions: `housePlate` promotes stage to `legend` when any roster pig is `legend` or all pigs are `memorial`; `normBreed` also maps `teddy` -> `teddy_normal` per `CuyLook.normBreed`.
- Differences from R50.md: none.
- Stubs used: none (pure Node unit tests against `assets/data/stage_looks.json` and `assets/sprites/`).
- Left undone: wiring into `index.html`, `app.js`, and `canvas-pig.js` (deferred to PK-CV4).
