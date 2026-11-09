# PK-P45q1: Stage gate for wave P45 (full checks)
- Build + Core tests: PASS (tools/build.ps1 -Config Release, 1120/1120 tests PASS, exit 0).
- P45 UX tests: 12/12 PASS (all ux-p45-* tests passed: overlay, pig-depth, pig-shadow, room-draw, room-geometry, room-scene, scene-data, trim-art, trim-baseboard, trim-shadow, walk-bands; 0 failed).
- UX All Suite: FAIL (19/41 PASS; 22 failed due to missing host Playwright chromium executable, 0 P45 regressions).
- Web Smoke: FAIL (missing host Playwright chromium executable at ms-playwright, pre-existing environment issue, no wave P45 errors).
- Check Assets & Icons: PASS (check-assets.js ASSETS OK, check-icons.js ICONS OK, both exit 0).
- EXE Smoke: PASS (run-exe-smoke.ps1 -Seconds 25, SELFTEST OK, EXE SMOKE OK, exit 0).
- Decisions: Wave P45 verified; all P45 rooms, geometry, trim, shadows and overlays pass with 0 regressions.
