# PK-TF2 Log
- Created `tools/qa/ux-p72-layout-bar-bgs.js` (Playwright, `mock=seven`, `420x640`, B1..B6, `STRICT=1` support).
- Decision: added `msedge`/`chrome` fallback in `launchBrowser()` when Playwright `headless_shell` binary is missing.
- Decision: `B4` checks `park_day.png` horizon foliage (`y<46`) per `RF3.md` §5.3 (`gazebo`/`bridge` are placed instances).
- Verify (`cmd /c "node --check tools/qa/ux-p72-layout-bar-bgs.js && node tools/qa/ux-p72-layout-bar-bgs.js"`): exit 0, `SUMMARY: defects=3`.
- PASS: `B1-classic-bar-edit-text` (`Edit`, `28px`), `B3-bottom-bar-fits` (`620.0px <= 640px`), `B6-no-console-errors` (`0`).
- `B4`: `garden_day.png` and `park_day.png` passed; `market_night.png` and `farm_day.png` returned HTTP 404 (actual filenames in `RF3.md` §2 are `market.png` and `farm.png`).
- `B2`/`B5`: `outdoor_defaults.json` park bounds passed; scene-cycling stopped after 5 distinct scenes (`salon, pig:pig_1, pig:pig_2, pig:pig_3, dorm`) before reaching `garden`/`farm`/`market`/`park`.
