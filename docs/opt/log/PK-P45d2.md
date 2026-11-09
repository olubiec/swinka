# PK-P45d2: Scene data: calibrate walk bands from overlay
- Measured same-object width ratios (flower beds, benches, fence posts, stall counters); all 1.000 in MEASURED.md.
- Re-tuned walk bands in `assets/data/place_scenes.json`: park [10, 112, 374, 186], farm [8, 82, 248, 138].
- Preserved garden [8, 80, 248, 138], market [8, 120, 248, 140], and room [8, 40, 184, 110]; depth_scale untouched.
- Generated final calibration PNGs in `docs/qa/calibration/` using `scene-overlay.js`.
- Implemented `tools/qa/ux-p45-walk-bands.js` checking WB1 (bounds/height/bottom), WB2 (width>=60), WB3 (MEASURED.md).
- Verification: node --check tools/qa/ux-p45-walk-bands.js && node tools/qa/ux-p45-walk-bands.js && node tools/qa/place-scenes-check.js && node tools/qa/ux-p45-scene-data.js.
