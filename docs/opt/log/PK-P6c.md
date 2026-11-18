# PK-P6c Log
- Status: OK
- Decisions: In `web/home/lib/lights.js`, `activeSources` forces `autoOn(src, period)` whenever `src.toggle === false`, ignoring `manual` and `placed.on`; exported `Lights.autoOn` and passed through `base_file`, `flame_anchor`, `flame_strip_anchor` for PK-CV2.
- Data: Added `"auto_at": "evening"` to `torch`, `lamp_oil`, `lantern`, `brazier` in `assets/data/lights.json`; added `campfire` (`6` frames, `8` fps, `garden/campfire_flame.png`, `flame_anchor: [16, 17]`) and `campfire_small` (`4` frames, `6` fps, `garden/campfire_flame_small.png`, `flame_anchor: [16, 17]`).
- Research diffs: Per `R31.md` sec 8, L1 tests `activeSources` (not `autoOn` alone) and exports `autoOn`; per `R35.md` sec 5, L4 checks PNG IHDR `width % frames === 0` (since non-square frames like `24x32` or `16x32` have `width / height !== frames`).
- Stubs: None (`tools/qa/ux-p6-lights.js` tests real `lights.js`, `lights.json`, `style_palette.json`, and PNG IHDR files).
- Verification: `node --check web/home/lib/lights.js && node --check tools/qa/ux-p6-lights.js && node tools/qa/lights-test.js && node tools/qa/ux-p6-lights.js` -> `LIGHTS OK`, `UX-P6-LIGHTS OK (L1-L7)`.
