# PK-P36q: Windows checks after wave P36
- tools/build.ps1: PASS (Build Release OK, 1119/1119 Core tests passed).
- ux-all.js: FAIL (ux-p36-bar PASS, ux-p36-rooms-scroll PASS; 3 failed: ux-p1-lifecycle, ux-p3-places, ux-p34-pig-walk).
- web-smoke.js: FAIL (missing /web/assets/ui/*, missing #roomPlanBtn from P35 cleanup, layout/tiles diffs).
- check-assets.js & check-icons.js: PASS (ASSETS OK, ICONS OK).
- run-exe-smoke.ps1: PASS (Selftest OK, EXE SMOKE OK 25s, no errors/crashes).
- Informational a11y-check.js: FAIL (focus not visible on placesPrevBtn/placesNextBtn).
- Screenshots in docs/qa/shots/: none added in P36 (p35a-ui-pieces.png retained).
- docs/qa/UX_WAVE_CHECKS.md: updated with Wave P36 verification table and manual checklist.
