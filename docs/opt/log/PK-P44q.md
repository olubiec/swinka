# PK-P44q: Windows checks after wave P44 (Pig Drag Between Scenes)
- Shots: tools/qa/ux-p44-shots.js captured edge drag, switch and moved shots to docs/qa/shots/p44-*.png.
- Documentation: appended Wave P44 section and manual checklist to docs/qa/UX_WAVE_CHECKS.md.
- build.ps1: PASS (Release build OK, Core tests 1139/1139 PASS, exit 0).
- ux-all.js: FAIL (25/53 PASS; P44: ux-p44-drag-switch and ux-p44-shots PASS, ux-p44-drag-edge FAIL G4; 26 failed due to missing chromium_headless_shell in env, W8 old test).
- web-smoke.js: FAIL (FAIL features folder mismatch: places/edit-panel, garden, rooms; pre-existing from P40).
- check-assets.js: PASS (ASSETS OK).
- check-icons.js: PASS (ICONS OK).
- run-exe-smoke.ps1: FAIL (selftest FAIL features: missing feature.js in places/edit-panel; pre-existing from P40).
- Verification line completed; product code untouched per rules.