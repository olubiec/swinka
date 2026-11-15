# PK-P4q: Windows checks after wave P4 (Identity & Adoption)
- JS syntax checks: PASS (node --check on feature.js, adoption-popup.js, canvas-pig.js, ux-p4-adoption.js).
- ux-p4-adoption: PASS (6/6 D1-D6: hidden-before, popup-shows, accept, no-rename, same-look, random-adoption).
- Core adoption tests: PASS (dotnet test Adoption: 22/22 passed).
- Cuy.csproj build: PASS (dotnet build -c Release -p:EnableWindowsTargeting=true, 0 errors, 0 warnings).
- Assets & Icons: PASS (check-assets.js ASSETS OK, check-icons.js ICONS OK).
- Regression P1-P4: FAIL (ux-all.js: 28 scripts failed; 26 due to host missing chromium, W8/G4 old scene tests).
- Extra (info): a11y-check.js FAIL (browserType.launch: headless_shell.exe missing in environment).
- Decisions: Documentation updated in UX_WAVE_CHECKS.md; product code unchanged per instructions.
