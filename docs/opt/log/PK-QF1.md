# PK-QF1 Gate F2-FIX Log
| Check | Result | Details | Time |
| --- | --- | --- | --- |
| build.ps1 Release / Debug | FAIL (exit 1) | Binaries built OK; internal Core tests 1236/1244 (7 fail, 1 skip) | 71.3s / 57.4s |
| dotnet test Core (Release) | FAIL (exit 1) | 1236 pass, 7 fail (PigPin x4, WorldMsg x1, Catalog 101!=75, Icons tunnel*), 1 skip | 25.4s |
| ux-p71..p74 (STRICT=1) | PASS (exit 0) | p71:6/6 (1st run 5/6 L4=28px, 2nd 6/6); p72:6/6; p73:6/6; p74:7/7 (0 defects) | 16.4/17.0/12.8/12.5s |
| ux-all.js (STRICT=1) | FAIL (exit 1) | 89 scripts, 36 failed (legacy suites); p71..p74 all PASS | 1121.7s |
| web-smoke.js | FAIL (exit 1) | 404 mock.js x11, 26_my_pigs, layout/selector timeouts in world/dorm/roaming | 168.9s |
| check-assets / icons / plan-audit | PASS (exit 0) | ASSETS OK, ICONS OK, PLAN AUDIT OK (71 prompts, 101 placeables) | 0.4s / 0.2s / 0.4s |
| run-exe-smoke.ps1 -Seconds 25 | PASS (exit 0) | SELFTEST OK (WebView2 157.0.4341.60), 28 log lines, EXE SMOKE OK | 34.3s |
