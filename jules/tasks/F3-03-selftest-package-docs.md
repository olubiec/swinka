# Task F3-03: Self-test, package, licence notices and docs for the new content

Read `AGENTS.md` first and follow it.

## Preconditions (check before changing anything)
Run `ls src/Cuy/dotNet/Features/CalendarFeature.cs src/Cuy/dotNet/Features/ToysFeature.cs`. If either is missing, F2-02 or F2-07 is not
merged: STOP, open no pull request, and say which one is missing in the Jules thread (the checklist in step 7 covers both).

## Research status (read this, it limits what you may write in docs)
- Verified (R3, R20.1; Velopack docs and source tag 1.2.161): `--framework` takes a comma list that includes `webview2` and `net45`..`net481`; the listed dependencies are installed BEFORE the app
  and re-checked before updates; without internet Setup shows an error dialog and installs nothing; uninstall never removes the HKCU `Run` value. NOT verified: Setup.exe size and whether the
  root stub is named like `--mainExe`. Do not write a claim about those two anywhere; they are manual tests (VEL-01, VEL-02). Do not add the exact error text to any document (it depends on the HTTP library).
- Smart App Control (R4.3, R18.4): only third-party sources (a forum guide, tech press, one technical blog) were found; Microsoft pages were not
  reachable. Do not add new SAC or Mark-of-the-Web claims. Keep the wording that already exists in `README.md` ("not verified").
- No schema library or licence tool was verified (R18.1, R18.2): this task adds NO new NuGet/npm package. Validation is written by hand.

## Facts about the repo (checked on main, 26.10.2026; do not re-derive)
- `src/Cuy/dotNet/SelfTest.cs` (`Cuy.exe --selftest`): `Check(name, action)` writes `PASS name` / `FAIL name: reason`; existing checks in order: assets
  folder, actions.json, items.json, actions animations, sprite sheets, icons.json, icons_16.png, sounds, WebView2, save folder writable.
  The WebView2 check currently FAILS when the runtime is missing (`GetAvailableBrowserVersionString` throws).
- `HomeWindow.cs` already handles a missing runtime lazily (only when Home is opened): it catches `WebView2RuntimeNotFoundException` around
  `CoreWebView2Environment.CreateAsync`, sets `HomeWindow.WebView2Missing`, disables the tray "Home" item and shows a `MessageBox` with the const
  `WebView2MissingMessage`, which points to a `go.microsoft.com/fwlink/p/?LinkId=2124703` short link. The project decision (DECYZJE.md, R7.2)
  is to show the full developer.microsoft.com page in the message (user-facing). Velopack's own source uses the same `go.microsoft.com/fwlink/p/?LinkId=2124703` Evergreen bootstrapper link
  (R20.1), so it is a known link, but keep the message text as specified in step 5.
- Data files: `assets/music/tracks.json` (array of `{id, file, title, author, license, url, use}`, `file` relative to `assets/`);
  `assets/coloring/index.json` (`{version, packs:[{id, title, price, count, thumb}]}`) and one `assets/coloring/<packId>.json` per pack
  (`{id, title, pictures:[{id, title, w, h, palette, cells}]}` where `cells` is a string of `w*h` characters); `assets/icons/icons.json`
  (`{size: 16, icons: {id: index}}`) with `assets/icons/icons_16.png`.
- `THIRD_PARTY_NOTICES.md` has sections 1-13. There is NO section for the music or for Twemoji yet. `assets/LICENSES/music.md` and
  `assets/LICENSES/twemoji.md` exist and hold the exact titles, authors, licences and URLs.
- `tools/package.ps1` copies the Release build, `assets`, `web`, `tools/package/README.txt`, `THIRD_PARTY_NOTICES.md`, runs `--selftest`, then
  zips to `dist/Cuy_v1.zip`. It prints the zip size but has no size limit. The released zip (`releases/1.0.0`) is 4.8 MB; `assets` is 15 MB, `web` 1.7 MB.
- `README.md` already contains the sections "Windows warns me when I start Cuy (SmartScreen, Smart App Control)", "WebView2 runtime" and
  "Weather data". `tools/package/README.txt` already tells the player to click "More info" > "Run anyway".
- `research/gotowce/tools/package-velopack.ps1` exists (pattern, never run on Windows).

## Files you may change / add
`src/Cuy/dotNet/SelfTest.cs`, `src/Cuy/dotNet/HomeWindow.cs` (only the missing-runtime message and the try/catch in step 5),
`tools/package.ps1`, new `tools/package-velopack.ps1`, `tools/package/README.txt`, `THIRD_PARTY_NOTICES.md`, `README.md` (table only),
`ARCHITECTURE.md`, `TESTING.md`, new `tests/Cuy.Core.Tests/NoticesTests.cs`.
Conflict note: F3-04 also edits `SelfTest.cs`. Add YOUR new checks directly after `Check("sounds", CheckSounds);` and change the WebView2 check in
place; F3-04 adds its check directly before `Check("save folder writable", ...)`, so the edits do not overlap.

## Steps
1. `SelfTest.cs`, new checks (hand-written, no library, same PASS/FAIL format):
   - `data json`: every `assets/data/*.json` parses (`JToken.Parse`).
   - `item ids`: ids in `assets/data/items.json`, `items_shop.json`, `items_decor.json` are unique across the three files.
   - `care/health/economy data`: `care.json`, `health.json`, `economy.json` load through the Core code that reads them (find it with
     `grep -rn "care.json\|health.json\|economy.json" src`; `EconomyConfig.LoadFromFile` exists).
   - `music`: every `file` in `tracks.json` exists under `assets/` and is larger than 10 KB.
   - `coloring`: every pack in `coloring/index.json` has its `<id>.json`, `pictures.Count == count`, and every picture has
     `cells.Length == w * h`.
   - `features`: every folder in `web/home/features` has a `feature.js`, and the ids in `web/home/features/index.json` equal the folder names (this passes only once
     F3-01 is merged: it removes `hello/` and completes `index.json`; the check is for the Windows self-test, CI does not run it).
   - `icon indexes`: every index in `icons.json` is `< icons_16.png width / 16 * height / 16`.
2. WebView2 check becomes a WARN, not a FAIL: catch `WebView2RuntimeNotFoundException` and an empty version, add the line
   `WARN WebView2: runtime not installed (Home will not open)`; WARN does not set the failed flag and does not change the exit code. Keep printing
   `     version <x>` when the runtime exists (this is the value to compare with the CI Chromium, see TESTING.md CI-01).
3. `package.ps1`: after zipping, print the zip size in MB and fail (`PACKAGE STOPPED: zip larger than 80 MB`, exit 1) if it is above 80 MB;
   fail if `assets\LICENSES` or `THIRD_PARTY_NOTICES.md` is missing from the package folder.
4. `THIRD_PARTY_NOTICES.md`: keep sections 1-13 and append
   - `14. Music`: copy every title, author, licence and URL from `assets/LICENSES/music.md` exactly (do not change the dates in that file).
   - `15. Twemoji`: copy the attribution line and version from `assets/LICENSES/twemoji.md` (CC-BY 4.0, link to
     https://creativecommons.org/licenses/by/4.0/).
   - `16. Microsoft .NET compatibility packages`: one table with EVERY package in `src/Cuy/Cuy.csproj` and `src/Cuy.Core/Cuy.Core.csproj` that is not
     already named in sections 1-12 (columns: package id, version, licence, project URL). Get the licence from the local NuGet cache after
     `dotnet restore`: `~/.nuget/packages/<lowercase id>/<version>/<id>.nuspec` (`<license type="expression">` or `<licenseUrl>`); copy what the
     nuspec says, do not guess. `Microsoft.NETFramework.ReferenceAssemblies` is build-time only: say so.
   - `17. Development tools (not shipped)`: Playwright (`tools/qa`; read the licence from `tools/qa/node_modules/playwright/LICENSE` after
     `npm ci`) and the xUnit/coverlet/Test SDK packages of `tests/Cuy.Core.Tests` (licences from their nuspec files).
5. Missing WebView2 runtime (R7.2): in `HomeWindow.cs` replace the `WebView2MissingMessage` text with a friendly English message that points to
   `https://developer.microsoft.com/microsoft-edge/webview2/` ("choose Evergreen"), no short link and no silent installer. Also put the
   `await _webView.EnsureCoreWebView2Async(env)` call inside the same `try` as `CreateAsync` so that the same catch handles it (whether it throws the
   same exception is UNVERIFIED: log `[WebView2] runtime missing` in both paths). Do not restructure anything else; the pig on the desktop must keep working.
6. `NoticesTests.cs` (xUnit, net9.0, no new package): find the repo root by walking up from `AppContext.BaseDirectory` until `Cuy.sln` exists; read all
   `<PackageReference Include="..."` ids from `src/Cuy/Cuy.csproj` and `src/Cuy.Core/Cuy.Core.csproj` with a regex; assert that each id appears in
   `THIRD_PARTY_NOTICES.md` (ordinal, case-insensitive); on failure list the missing ids in the message. This is the "a package is missing from the
   notices" gate (no NuGet licence tool was verified to do it).
7. `tools/package/README.txt` (player text, English, short): add 6 lines about care calendar reminders (Done / Later), the vet clinic, colouring, shop and
   decorations, the daily gift, and settings (music, pig size); add 2 lines: Cuy needs the WebView2 runtime (Windows 11 has it, most Windows 10 PCs have
   it, otherwise https://developer.microsoft.com/microsoft-edge/webview2/), and a Smart App Control sentence copied from `README.md`
   (same hedged wording). `README.md`: update only the table of folders if a path changed.
8. `ARCHITECTURE.md`: a section "Home features" (web modules in `web/home/features/<id>`, C# `IHomeFeature` in `src/Cuy/dotNet/Features`, the real app loads
   every folder, mock mode reads `index.json`, contracts in `jules/contracts.md`), the Core systems (Economy, Care, Health, Coloring, Decor, Input) and the
   data files in `assets/data`.
9. `TESTING.md`: continue the numbered table (rows 16 and up), one row per item: first-run check of the new features, `--peek-test` edge peek, poops while
   sleeping, shadow while dragging, Home toys, tray Play menu, shop buy limits, decor equip, colouring save/restart/reward, care reminder Done and Later,
   weight alert, illness + vet cure (60x clock, Debug build), daily gift (miss a day: no red text), settings (music, size, autostart), `Cuy.exe --selftest`
   (expect `SELFTEST OK`, WARN allowed for WebView2), package size printed, CI-01 (WebView2 version vs the CI Chromium).
10. `tools/package-velopack.ps1`: copy `research/gotowce/tools/package-velopack.ps1`. The ZIP stays the default; `package.ps1` must not depend on it; do not add
    the Velopack NuGet package to `Cuy.csproj`; `--packId` is never changed after a first release; the `vpk` version must equal the Velopack NuGet version.
    The header comment says "never run on Windows: fix on first run".

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` (includes the new `NoticesTests`);
`dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; `node tools/qa/web-smoke.js` unaffected.

## Gotowe pliki
- `research/gotowce/tools/package-velopack.ps1` -> `tools/package-velopack.ps1` (pattern; no `Updater.cs`: that is F7-03).

## Testy ręczne (ZWERYFIKUJ NA PC)
- WV-01..WV-04 (Windows 10 VM without WebView2: message and link, whether `EnsureCoreWebView2Async` throws the same exception), VEL-01..VEL-07 (clean VM,
  Run key, Setup.exe offline, Setup.exe size), SAC-01 (exact SmartScreen text with Smart App Control on), CI-01 (WebView2 version vs the CI Chromium).

When done, open a pull request against `main` titled `F3-03: Self-test, package and docs`.
