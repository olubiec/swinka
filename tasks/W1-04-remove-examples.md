# W1-04: Remove the example feature and fix the feature list
Goal: the Home "More" menu shows only real features and the feature list matches the folders.
Depends on: nothing (wave start). Facts: in the real app the page loads every folder found in `web/home/features` (`HomeWindow.cs` builds the list from `Directory.GetDirectories`); `features/index.json` is read only in mock mode (normal browser).
Change: `web/home/features/index.json`, delete `web/home/features/hello/`, delete `src/Cuy/dotNet/Features/PingFeature.cs`
Do not touch: `tools/qa/web-smoke.js`, `app.js`, any other C# file.
Steps:
1. `features/index.json` becomes exactly `["daily","shop","calendar","vet","coloring","decor","settings"]` (one id per real folder; check that each of those folders exists and that no other folder exists).
2. Delete `web/home/features/hello/` and `PingFeature.cs`. Run `grep -rIn -i "hello\|PingFeature" web src tools` and remove only references to these two examples (illustrative mentions in `web/home/features/README.md` and `src/Cuy/dotNet/Features/README.md` may stay).
3. In the PR confirm that `HomeWindow.cs` builds the feature list from folders, so the C#-only feature `toys` (no web folder) causes no page request.
Verify: `node tools/qa/web-smoke.js` prints `WEB SMOKE OK` and `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
