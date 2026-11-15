# PK-P8q: Windows checks after wave P8 (Care Calendar)
- JS syntax checks: PASS (node --check on calendar/feature.js and tools/qa/ux-p8-calendar.js).
- ux-p8-calendar: PASS (8/8 T1-T8: tabs, manual opt-in, enable reminder, profile, weight entry, complete reminder, validation, no errors).
- Core Care tests: PASS (dotnet test FullyQualifiedName~Care: 75/75 passed, 0 failed).
- Cuy.csproj build: PASS (dotnet build -c Release -p:EnableWindowsTargeting=true, 0 errors, 0 warnings).
- Regression: `node tools/qa/ux-all.js` FAIL (29/53 failed; 26 due to missing chromium headless_shell, W1/W8, G4, T5).
- Extra (info): `node tools/qa/a11y-check.js` FAIL (browserType.launch: headless_shell.exe missing in environment).
- Documentation: appended Wave P8 section and manual checklist to docs/qa/UX_WAVE_CHECKS.md.
- Verification line: PASS (all five verification commands passed); product code untouched.
