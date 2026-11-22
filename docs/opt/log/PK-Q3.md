# PK-Q3: Stage Gate (Wave 3)

| Step | Command | Result | DEFECT / SKIP |
| --- | --- | --- | --- |
| 1a | `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` | FAIL (1296/1305 passed, 7 failed) | 0 DEFECT / 2 SKIP |
| 1b | `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` | PASS (0 warnings, 0 errors) | 0 / 0 |
| 2 | `node tools/qa/ux-all.js` -> `docs/opt/log/F3-gate.txt` | FAIL (111 scripts, 36 failed) | 0 DEFECT / 0 SKIP |
| 3 | `STRICT=1 node tools/qa/ux-all.js` | FAIL (111 scripts, 51 failed) | 1 DEFECT / 0 SKIP |
| 4a | `node tools/qa/data-check.js` | PASS (5 pigs, 15 crops, 101 placeables, 5 themes) | 0 / 0 |
| 4b | `node tools/qa/home-behavior-check.js` | PASS (28 actions, 54 ANIM_DEFS) | 0 / 0 |

## DEFECT list (STRICT=1)
- `DEFECT V1` (`ux-p69-visual-baseline.js`): Expected 28 deterministic 256x144 baselines, but 5 scenes (`salon-morning`, `salon-day`, `salon-evening`, `salon-night`, `pig_1-morning`) rendered non-deterministically.

## Items to fix (report only)
- **Core tests (7 failures):** `WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50` (expected 75, got 101); `WorldMessageTests.OutOfRangeInt_ReturnsInvalid` (`room_place` x=201); `PigPinMessagesTests` (4 failures: `PlacesPigPin_*` and `PigsDesktopPet_*` unknown field / very long pigId); `WorldAssetsTests.WorldAndPlaceIcons_ExistInIconsJson` (missing `tunnel`, `tunnel_playground`).
- **Core skips (2):** `RunAdversarialTests.RUN_AssignOverCapacity_PetRunDeferred`, `OutdoorSeedAdversarialTests.A8_UnknownItemIdInData_IsSkippedAndLogged`.
- **UX scripts (36 failed in normal mode, 51 in STRICT=1):**
  - Legacy P1-P3/P26/P34-P39/P42-P46/P50/P52 UI & scene tests (`ux-p1-decorate`, `ux-p1-lifecycle`, `ux-p2-player`, `ux-p26-night`, `ux-p3-icons`, `ux-p3-places`, `ux-p34-pig-walk`, `ux-p35-cleanup`, `ux-p36-bar`, `ux-p36-rooms-scroll`, `ux-p38-presence`, `ux-p39-blockers/depth/grid`, `ux-p42-web-look`, `ux-p43-market-scene`, `ux-p44-drag-edge/switch`, `ux-p45-overlay/overlay-pig/pig-depth/pig-shadow/room-draw/room-scene/scene-data`, `ux-p46-regress/render`, `ux-p50-canvas-wiring` (STRICT), `ux-p52-edit-wiring`, `ux-p76-fix5`).
  - Wave 3 STRICT=1 failures: `ux-p116-run` (both), `ux-p120-behavior-parity`, `ux-p122-reactions`, `ux-p123-editor-adv`, `ux-p124-run-adv`, `ux-p126-day-journey`, `ux-p127-perf-leaks`, `ux-p60`..`ux-p67`, `ux-p69-visual-baseline`.
- **Decision:** `ux-p110`..`ux-p115`, `ux-p117`..`ux-p119`, `ux-p121`, `ux-p125` passed in both modes; `ux-p120/122/123/124/126/127` failed only under `STRICT=1`.
