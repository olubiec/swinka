# PK-P45a1 Log
- Decisions: offscreen canvas created inside Home webview page; room scene renders `CuyScenes.def('salon')` at 240x130 filled with linen[1] without floor/wall tiles; palette colors read directly from assets/data/style_palette.json; integer fillRect used for outline borders and 4 px dithered grid lines to ensure pixel-perfect and deterministic byte-identical output across runs.
- API produced: `renderOverlay(sceneId, outPath, opts)` with opts: `layers` (array of 'walk'|'blockers'|'exits'|'grid'|'crop'|'pig'), `grid` (boolean), `page` (optional Playwright page reuse).
- Exports: `renderOverlay`, `LAYERS`, `DEFAULT_LAYERS`, `DEFAULT_SCENES`.
- CLI: `node tools/qa/scene-overlay.js [sceneId...] [--out dir] [--layers a,b] [--grid]`.
- Tests: `tools/qa/ux-p45-overlay.js` passes checks O1-O5, writing only to os.tmpdir().
- Differences: none.
- Status: DONE.
