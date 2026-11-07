# PK-P38q: Windows checks after wave P38 (pig presence)

- Build & Tests: PASS (tools/build.ps1 -Config Release; 1119 tests PASS, exit 0).
- Presence test: PASS (ux-p38-presence.js: 7/7 PASS Pr1-Pr7).
- UX All Suite: 13/15 PASS (ux-p38-presence PASS; ux-p1-lifecycle and ux-p3-places obsolete after P35/P37 changes).
- Web Smoke: 21/21 core PASS matching baseline-smoke.txt (old failures in mock-missing/removed plan).
- Assets & Icons: PASS (check-assets.js, check-icons.js both exit 0).
- EXE Smoke: PASS (run-exe-smoke.ps1 -Seconds 25: selftest passed, EXE SMOKE OK, exit 0).
- A11Y Check: PASS (node tools/qa/a11y-check.js: A11Y OK, exit 0).
- Shots in wave: None added in wave P38 (existing docs/qa/shots/ retained from earlier waves).
- Decisions: No product code changes; documented test results in UX_WAVE_CHECKS.md and log.
