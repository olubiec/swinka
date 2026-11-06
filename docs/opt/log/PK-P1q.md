# PK-P1q Windows checks after wave P1
- tools/build.ps1: FAIL (vswhere not found: install Visual Studio 2022 with .NET desktop development).
- dotnet build (Cuy.exe) & dotnet test (Core): PASS (1102 tests passed, 0 failed, Cuy.exe 0 errors).
- ux-all.js p1: PASS (ux-p1-buttons.js, ux-p1-decorate.js, ux-p1-lifecycle.js - 3/3 passed).
- web-smoke.js: PASS (WEB SMOKE OK, wszystkie scenariusze zielone).
- check-assets.js: PASS (ASSETS OK).
- run-exe-smoke.ps1: PASS (Cuy.exe --selftest OK, 25s run OK, 0 błędów w logu).
- Extra: data-check.js PASS, check-icons.js PASS, a11y-check.js PASS.
- Podsumowanie: cały kod produktu i testy działają; tools/build.ps1 wymaga ścieżki vswhere w VS2022.
FAIL tools/build.ps1: C:\Users\m.olubiec\Desktop\formatki\ai\swinka\swinka\tools\build.ps1 : vswhere not found: install Visual Studio 2022 with .NET desktop development

