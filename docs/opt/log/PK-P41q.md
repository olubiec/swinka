# PK-P41q: Windows checks after wave P41 (UX fixes)
- Build + Core tests: PASS (tools/build.ps1 -Config Release, 1119/1119 tests PASS, exit 0).
- P41 UX tests: 5/5 PASS (ux-p41-bond, ux-p41-maze, ux-p41-audio, ux-p41-coloring, ux-p41-gramophone).
- UX All Suite: 18/20 PASS (exit 1; only old stale tests ux-p1-lifecycle and ux-p3-places failed, no new errors).
- Web Smoke: 21/21 core PASS matching baseline-smoke.txt (old failures in missing mocks and removed #roomPlanBtn).
- Assets & Icons: PASS (check-assets.js, check-icons.js both exit 0).
- EXE Smoke: PASS (run-exe-smoke.ps1 -Seconds 25, SELFTEST OK, EXE SMOKE OK, exit 0).
- Decisions: No product code changes; documented test results and manual checklist in docs/qa/UX_WAVE_CHECKS.md.
