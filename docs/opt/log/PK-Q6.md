# PK-Q6: Wave 4 Owner Sheet & Release Readiness

- Created `docs/qa/F4_OWNER_SHEET.md` (35 steps across A–F: Hay Hop, Companion, Dance, Live Weather & Privacy, Growth Stages, Full Playthrough), mapped to `ux-p130..p144`, `ux-p126-day-journey.js`, and `manual only`.
- Decisions: Matched `docs/qa/F3_OWNER_SHEET.md` table format (`# | Step | How to check | Expected result | Automated test | OK / NO`).

## Remaining Before Release
- Manual Windows owner gates after waves: W22, W26, W30, Wave 2, Wave 3 (`F3_OWNER_SHEET.md`), and Wave 4 (`F4_OWNER_SHEET.md`).
- Unfinished/blocked scope: `PK-23b` BLOCKED; `PK-21` partial.
- PK-Q5 UX DEFECTs (`docs/opt/log/PK-Q5.md`): `HOP-console-clean` (`ux-p140-hayhop-adv.js`), `COM-draw-order-with-furniture` (`ux-p141-companion-adv.js`), `DAN-click-interrupts-and-resumes` & `DAN-two-pigs-both-dance` (`ux-p142-dance-adv.js`), `STG-regression-all-7-scenes-sleep-eat-walk` & `STG-regression-edit-undo-still-works` (`ux-p144-stage-regression.js`).
- PK-Q5 other failures: 18 `Cuy.Core.Tests` failures (+ 6 `[SKIP]` in `WeatherAdversarialTests`, `OutdoorSeedAdversarialTests`, `RunAdversarialTests`); `ux-all.js` 49 failures (48 Playwright `waitForFunction` 30s timeouts + `ux-p39-blockers.js` R1 `depth_scale`).
- Verification: `node tools/qa/plan-audit.js` PASS.
