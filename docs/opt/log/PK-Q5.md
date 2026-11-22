# PK-Q5 Final Gate (Waves 3 & 4)

| Step | Result | DEFECT / SKIP |
| --- | --- | --- |
| `dotnet test Cuy.Core.Tests -c Release` | FAIL (1413 pass, 18 fail, 6 skip / 1437) | 6 SKIP (`WeatherAdversarialTests` x4, `OutdoorSeedAdversarialTests` x1, `RunAdversarialTests` x1) |
| `dotnet build Cuy.csproj -c Release` | PASS (0 warnings, 0 errors) | - |
| `node tools/qa/ux-all.js` -> `F4-gate.txt` | PARTIAL FAIL (26 PASS, 49 FAIL of 75/123; cancelled at ~40m) | 48 Playwright `waitForFunction` 30s timeouts + `ux-p39-blockers.js` R1 `depth_scale` |
| `STRICT=1` (`ux-p130..p144`, Wave 3/4) | FAIL (4 scripts failed under `STRICT=1`) | 6 DEFECT, 0 SKIP (see below); `ux-p143-weather-privacy.js`: 6 PASS, 0 DEFECT, 0 SKIP |
| `data-check.js` / `home-behavior-check.js` / `hotspots-check.js` / `economy-sim.js --check` / `plan-audit.js` | PASS (all 5 exit 0) | - |

## Privacy / Weather Consent DEFECTs (Priority)
- None in UX (`ux-p143-weather-privacy.js`: 6 PASS, 0 DEFECT, 0 SKIP). Core `WeatherAdversarialTests` has 4 `[SKIP]` tests.

## DEFECTs Found (`STRICT=1` on `ux-p130..p144`)
- `HOP-console-clean` (`ux-p140-hayhop-adv.js`): 41 `WebGLRenderingContext.getProgramParameter` errors.
- `COM-draw-order-with-furniture` (`ux-p141-companion-adv.js`): Companion did not spawn in garden after `setCompanion({ enabled: true })`.
- `DAN-click-interrupts-and-resumes` (`ux-p142-dance-adv.js`): `started=true, interrupted=false, resumed=true, finalAnim=dance`.
- `DAN-two-pigs-both-dance` (`ux-p142-dance-adv.js`): `main=idle(synced=false), companion=none`.
- `STG-regression-all-7-scenes-sleep-eat-walk` (`ux-p144-stage-regression.js`): walk/eat/sleep failed across 7 scenes (`salon`, `pig:pig_1`, `dorm`, `garden`, `park`, `farm`, `market`).
- `STG-regression-edit-undo-still-works` (`ux-p144-stage-regression.js`): `undoWorked=false, canUndoBefore=false`.

## Other Failures to Fix (No Edits Made)
- Core tests (18 FAIL): `LampPlacementTests` (4), `LampPlacementAdversarialTests` (6), `NewFeaturesAdversarialTests.S10` (1), `PigPinMessagesTests` (4), `WorldMessageTests.OutOfRangeInt` (1), `WorldAssetsTests` (`tunnel`, `tunnel_playground` icons missing), `WorldItemCatalogTests` (expected 75, actual 101).
- UX suite: `web/home` fails to initialize in Playwright (`waitForFunction` 30s timeout across 48 scripts); `ux-p39-blockers.js` R1 `depth_scale` out of `[0.9, 1.0]` range.
