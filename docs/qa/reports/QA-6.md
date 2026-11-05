# QA-6 – Synthesis and release readiness

Date: 2026-11-05. Full register: `docs/qa/FINDINGS.md` (27 rows, 1 withdrawn).

## Baseline re-run (compare with QA-1)
Core tests: 1026 total, 1021 pass, 4 fail (identical to QA-1: F1-01..F1-04), 1 skipped (F3-01, intentionally). Release build 0 warnings/0 errors. `data-check`, `plan-audit`, `lights-test`, `a11y-check`, `layout.selftest`, `palette-test` OK. `check-assets`, `check-icons`, `check-css-vars` exit 1 on the same known findings. Nothing regressed during testing; no product code was changed by QA (only new tests/tools).

New in this QA run: `tests/Cuy.Core.Tests/QaInvariantFuzzTests.cs` (8), `QaSaveRobustnessTests.cs` (16 incl. 1 skipped), `tools/qa/soak.js`, `tools/qa/visual-matrix.js`.

## Severity count
S1: 1 (F3-01). S2: 9 groups (store UI, dorm bond, customize panel, room key, art/data, legacy decor, sim profiles, flaky test, ...). S3: 10. S4: 6.

## Proposed fix packages (not generated; for approval, files disjoint)
| Pkg | Items | Files (main) |
|---|---|---|
| A | F3-01 guard in load, unskip test, BOM | `GameState.Pigs.cs` (or `SaveSystem.cs`), tests, `diary.json` |
| B | F4-01 store vars, F3-06 load customize, F1-05 `icon-pig`, F4-04 touch targets, F4-06 chip, F3-03 flaky test, F3-04 probes | `store/feature.css`, `rooms/feature.js`, `icons.json`, `style.css`, `web-smoke.js` |
| C | F5-04 apply bond bonus, F5-03 `OnMemorialChanged`, F5-05 `ApplyTime` hook | `Pet.Bond.cs`, `Pet.cs`, `Pet.MemoryRoom.cs` |
| D | F1-01/F2-01 room key: owner decides; update the W24 assertion and add a NamedId-late test | `PigRoomsMigrationTests.cs` |
| E | Art: floor tiles, item icons, 3 light textures (visual wave V*) | `assets/` |
| F | Economy tuning review of sim profiles and early reward | `economy.json`, `economy-sim.js` |
| G | Update check: real version, opt-in note in CONCEPT | `SettingsFeature.cs`, `CONCEPT.md` |
| H | Docs: contracts for 13 features, PROJECT_STATE, language policy | `docs/` |
| I | Windows manual pass: SelfTest, DPI, install/upgrade, 30-min soak, day/night, long names | `TESTY_RECZNE.md` |

## Go / no-go
| Area | Verdict | Evidence |
|---|---|---|
| Core logic | GO | 1021 pass; fuzz + hostile input clean |
| Persistence | NO-GO until A | F3-01 (S1) |
| Bridge/contracts | GO | smoke passes; docs gap only |
| UI/visuals | CONDITIONAL | Store screen broken (F4-01); missing art degrades gracefully |
| Concept fit | CONDITIONAL | dorm bond bonus and memorial hook unwired (F5-03/04) |
| Windows-only | NOT TESTED | needs a Windows run (package I) |

Overall: not release-ready until packages A and B (small) are done and C decided; D needs the owner.
