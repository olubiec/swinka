# W8-01: Self-test: release tray menu, runtime DLLs and shipped files
Zmieniaj: src/Cuy/dotNet/SelfTest.cs
Wymagane: src/Cuy/dotNet/SelfTest.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Nie ruszaj: src/Cuy/dotNet/ContextMenus.cs, src/Cuy/dotNet/Program.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: `Cuy.exe --selftest` of the Release package proves the gift build has no developer menu items and ships what it needs.
Depends on: W5-02 (data checks) and W7-04 (debug audit) merged.
Facts: In Debug the tray menu may have developer items; in Release it must not. `Check(name, action)` prints PASS/FAIL; WARN does not fail the run (see the WebView2 check).
Steps:
1. Release-only check (`#if !DEBUG`) `release menu`: read the text of every item of the tray context menu (find how `ContextMenus` exposes the `ContextMenuStrip`; read it through the existing public member, and if there is none say so in the PR and use reflection) and FAIL when any contains "Clock", "Debug", "Diagnostics" or "Test" (case-insensitive). In Debug print `PASS release menu (skipped in Debug)`.
2. Check `runtime files`: `Newtonsoft.Json.dll` and `NAudio.dll` exist next to the exe (FAIL). For `README.txt`, `THIRD_PARTY_NOTICES.md` and `assets\LICENSES` next to the exe print WARN when missing (they exist only in the packaged copy).
3. Check `games`: every id registered through `games.json` has its file (already covered by W5-02 for existence; here only assert that `games.json` lists at least `veggie-rain.js`, `veggie-memory.js`, `hay-maze.js`).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
