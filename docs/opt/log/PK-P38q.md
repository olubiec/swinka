# PK-P38q: Windows checks after wave P38 (pig presence)
- Build & Tests: tools/build.ps1 reported MSBuild not found; dotnet test -c Release 1120/1120 PASS (exit 0).
- Presence test: PASS (ux-p38-presence.js: 7/7 PASS Pr1-Pr7).
- UX All Suite: 16/23 PASS (ux-p38-presence PASS; old/downstream tests fail in baseline).
- Web Smoke: PASS matching baseline-smoke.txt (all failures are old/baseline).
- Assets & Icons: PASS (check-assets.js and check-icons.js exit 0).
- EXE Smoke: PASS (run-exe-smoke.ps1 -Seconds 25: selftest OK, EXE SMOKE OK, exit 0).
- A11Y Check: PASS (node tools/qa/a11y-check.js: A11Y OK, exit 0).
- Shots in wave: None added in wave P38 (existing shots in docs/qa/shots/ retained).
- Decisions: No product code changes; logged per-part results against baseline.
