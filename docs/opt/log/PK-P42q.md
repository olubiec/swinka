# PK-P42q: Windows checks after wave P42 (Pig looks & countdown)
- Build + Core tests: PASS (tools/build.ps1 -Config Release, 1119/1119 tests PASS, exit 0).
- P42 UX tests: 3/3 PASS (ux-p42-pig-look-core, ux-p42-countdown, ux-p42-web-look).
- UX All Suite: 17/23 PASS (stare testy ux-p1/p2/p3/p41 zdezaktualizowane, 0 nowych błędów w P42).
- Web Smoke: 21/21 core PASS zgodne z baseline-smoke.txt (brak nowych błędów).
- Assets & Icons: PASS (check-assets.js, check-icons.js oba exit 0).
- EXE Smoke: PASS (run-exe-smoke.ps1 -Seconds 25, SELFTEST OK, EXE SMOKE OK, exit 0).
- Decisions: Dokumentacja testów i wymogu identycznych skór na pulpicie i w Home w UX_WAVE_CHECKS.md.
