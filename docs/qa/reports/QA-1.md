# QA-1 – Static and build baseline

Date: 2026-11-05. Base: `main` at 2706e57. Linux, .NET SDK 10 with `DOTNET_ROLL_FORWARD=Major`, Chrome via `CHROMIUM_PATH`.

## Commands and results
| Check | Result |
|---|---|
| `dotnet test tests/Cuy.Core.Tests` | 1002 total, 998 pass, **4 fail** (5 s) |
| `dotnet build src/Cuy/Cuy.csproj -c Release` (EnableWindowsTargeting) | OK, 0 warnings, 0 errors |
| `node --check` on all tracked `web/home/**/*.js` and `tools/qa/*.js` (phaser.min excluded) | 0 failures |
| JSON.parse on all tracked `*.json` | 1 file fails in node: `assets/data/diary.json` (UTF-8 BOM, present since W18; C# loads it) |
| `tools/qa/data-check.js` | OK (5 pigs, 15 crops, 55 placeables, 5 room themes) |
| `check-assets.js` | 2 errors, both `icon-pig` (no icons.json entry, no CSS rule) |
| `check-icons.js` | 1 missing: `icon-pig` |
| `check-css-vars.js` | 6 distinct undefined vars in `store/feature.css`: `--panel --accent --line --muted --focus` (+ `--text`) |
| `plan-audit.js` | OK (71 prompts, 34 packages) |
| `layout.selftest.js`, `palette-test.js`, `a11y-check.js`, `lights-test.js` | all OK |
| `economy-sim.js` | runs; numbers recorded in QA-2 |

Note: the Playwright scripts need `CHROMIUM_PATH=/usr/bin/google-chrome`; without it they fail with the install banner (environment, not a defect).

## Findings
| ID | Sev | Area | Description |
|---|---|---|---|
| F1-01 | S2 | Core/test | `PigRoomsMigrationTests.ThreeRosterPigsGetThreeRooms_AndSecondCallCreatesNone` fails: expects room keys by `pig.Id`, code keys by `NamedId ?? Id` (PK-24a/26). Needs an owner decision on the key. |
| F1-02 | S2 | Core/test | `WorldAssetsTests.FloorTiles_ExistInTilesWithSixteenPixelFrames` fails: `floor_wood`, `floor_straw`, `floor_fleece`, `floor_grass`, `floor_soil` ... not in `tiles.json` (floor art missing). Pre-existing. |
| F1-03 | S2 | Core/test | `WorldAssetsTests.WorldAndPlaceIcons_ExistInIconsJson` fails: world item icons (`sofa_cosy`, `armchair`, `bookshelf`, `side_table`, `cushion_big`, ...) missing from `icons.json`. Pre-existing. |
| F1-04 | S2 | Core/test | `GameSessionWorldTests.Open_OldSaveWithEquippedDecor_PlacesLegacyItems_AndReopenKeepsThem` fails (line 74). Pre-existing. Touches old-save migration: check in QA-2/3 whether real legacy saves lose decor. |
| F1-05 | S3 | Web/CSS | `icon-pig` missing in `icons.json` and style.css; pigs feature shows no icon. |
| F1-06 | S3 | Web/CSS | `store/feature.css` uses undefined CSS variables; store panel will render with browser defaults/transparent. |
| F1-07 | S4 | Data | `diary.json` has a UTF-8 BOM; harmless in C#, breaks plain `JSON.parse` tooling. |

## Baseline red list (for QA-6 re-run)
Tests: F1-01..F1-04. Tools: `check-assets`, `check-icons`, `check-css-vars`. Everything else green.

## Verdict
Build and static checks healthy. 4 known test failures, no new regressions from W24-W33 other than F1-01. Proceed to QA-2.
