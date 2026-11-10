# PK-P40q: Windows checks after wave P40
- Shots: tools/qa/ux-p40-shots.js captured salon with Edit drawer and garden with item ghost to docs/qa/shots/p40-*.png.
- Documentation: appended Wave P40 section and manual checklist to docs/qa/UX_WAVE_CHECKS.md.
- build.ps1: FAIL (MSBuild not found in runner environment; known limitation from earlier waves).
- ux-all.js: FAIL (38/48 PASS; 6/6 P40 tests PASS; 10 failed are known pre-existing regressions from earlier refactors).
- web-smoke.js: FAIL (new: features folder mismatch due to P40 retiring rooms/garden and adding edit-panel; pre-existing tests in baseline).
- check-assets.js: PASS (ASSETS OK).
- check-icons.js: PASS (ICONS OK).
- run-exe-smoke.ps1: PASS (selftest passes, 25s desktop run OK, EXE SMOKE OK).
- Verification line failed due to build.ps1 and web-smoke.js; product code untouched per rules.
