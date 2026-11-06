# PK-P2q Windows checks after wave P2
- tools/build.ps1: FAIL (vswhere not found: install Visual Studio 2022 with .NET desktop development).
- dotnet build (Cuy.exe) & dotnet test (Core): PASS (1102 tests passed, 0 failed, Cuy.exe 0 errors).
- ux-all.js (p1 + p2): PASS (6/6 scripts passed: portraits, icons, player + p1 buttons, decorate, lifecycle).
- P1 regression: PASS
- web-smoke.js: PASS (WEB SMOKE OK, exit code 0).
- check-assets.js: PASS (ASSETS OK) & check-icons.js: PASS (ICONS OK).
- run-exe-smoke.ps1: PASS (Cuy.exe --selftest OK, 25s run OK, EXE SMOKE OK).
- Extra (info): check-css-vars.js PASS; a11y-check.js FAIL (Tab step 12: focus lost to body or null).
FAIL tools/build.ps1: C:\Users\m.olubiec\Desktop\formatki\ai\swinka\swinka\tools\build.ps1 : vswhere not found: install Visual Studio 2022 with .NET desktop development
FAIL a11y-check.js: Tab step 12: focus lost to body or null
