# PK-P39q: Windows checks after wave P39
- Shots: tools/qa/ux-p39-shots.js captured 7 scenes to docs/qa/shots/p39-<scena>.png (salon, room/pig_1, dorm, garden, park, farm, market).
- Documentation: added Wave P39 section to docs/qa/UX_WAVE_CHECKS.md with test table and manual checklist.
- build.ps1: FAIL (MSBuild not found on runner; known environment limitation, human tests on Windows).
- ux-all.js: FAIL (22/29 PASS; 6/6 P39 PASS including ux-p39-shots; 7 failures are known baseline regressions from earlier refactors).
- web-smoke.js: FAIL (21/21 core PASS; all reported failures match baseline-smoke.txt: my_pigs, places_bar, roaming_house_plan).
- check-assets.js: PASS (ASSETS OK).
- check-icons.js: PASS (ICONS OK).
- run-exe-smoke.ps1: PASS (selftest passes, 25s desktop run OK, 0 errors in cuy.log).
- Overall: all P39 tests and assets pass; failures are old baseline issues / missing MSBuild.
