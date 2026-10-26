# Task F3-03: Self-test, package and docs for the new content

Read `AGENTS.md` first. All F1/F2 tasks are merged.

## Files you may change
`src/Cuy/dotNet/SelfTest.cs`, `src/Cuy/dotNet/Program.cs` (step 7 only), `tools/package.ps1`, new `tools/package-velopack.ps1` (step 8),
`tools/package/README.txt`, `THIRD_PARTY_NOTICES.md`, `README.md`, `ARCHITECTURE.md`, `TESTING.md`.

## Steps
1. `SelfTest.cs` (`Cuy.exe --selftest`): add checks – every `assets/data/*.json` parses; `items*.json` ids unique;
   `care.json`, `health.json`, `economy.json` load through the Core loaders; every `assets/music` file listed in
   `tracks.json` exists and is > 10 KB; `assets/coloring/index.json` packs exist and every picture has
   `len(cells) == w*h`; every `web/home/features/*/feature.js` exists for the ids in `features/index.json`; icons.json
   indexes < icon sheet width / 16. Same PASS/FAIL output format as the existing checks.
2. `package.ps1`: make sure `assets/LICENSES` is in the package; the package size is printed; fail if > 80 MB.
3. `tools/package/README.txt` (for the player, short, English): add 6 lines about the new things: care calendar
   reminders (Done / Later), vet clinic, colouring, shop & decorations, daily gift, settings (music, size).
4. `THIRD_PARTY_NOTICES.md`: add the music (Juhani Junkala, CC0, URL) and Twemoji (CC-BY 4.0, attribution text, URL)
   sections, pointing to `assets/LICENSES/`.
5. `ARCHITECTURE.md`: a section "Home features" (web modules + C# IHomeFeature + contracts in `jules/contracts.md`),
   the new Core systems (Economy, Care, Health, Coloring, Decor) and data files. `README.md`: update the table.
6. `TESTING.md`: a manual Windows checklist for the new features (one line each: what to do, what should happen):
   first run, edge peek (`--peek-test`), poops while sleeping, shadow while dragging, Home toys, Play menu, shop buy
   limits, decor equip, colouring save/restart/reward, care reminder Done/Later, weight alert, illness + vet cure (60x
   clock), daily gift, settings (music, size, autostart), package + self-test.

7. Missing WebView2 runtime (R7.2): at start, before the Home window is created, call
   `CoreWebView2Environment.GetAvailableBrowserVersionString()` inside try/catch (works on .NET Framework 4.8; a missing runtime
   throws `WebView2RuntimeNotFoundException`). If it throws or returns empty: log `[WebView2] runtime missing`, show one
   `MessageBox` (English, friendly) with the page https://developer.microsoft.com/microsoft-edge/webview2/ and exit the Home
   feature gracefully (the pig on the desktop keeps working). Use no `fwlink` short link and no silent installer (the bootstrapper
   URL is not verified; a silent `/silent /install` run stays an optional later step). Add the same check to `--selftest`
   as a WARN, not a FAIL. Whether `EnsureCoreWebView2Async` throws the same exception is UNVERIFIED: also catch it there.
8. Velopack stays OPTIONAL next to the ZIP (the ZIP is the default and `package.ps1` is not changed to depend on it). Add
   `tools/package-velopack.ps1` from the pattern file (see below). Do not add the Velopack NuGet package to `Cuy.csproj` in this
   task (the runtime hook is F7-03, optional). Never change `--packId` after the first release (it is the install identity);
   vpk version must equal the Velopack NuGet version.
9. Docs (R4): `tools/package/README.txt` and `README.md`: a section "Windows warns me" for an unsigned app (no code-signing
   certificate: Azure Trusted Signing is for individuals only in the US/Canada, so not possible for a private person in
   Poland): SmartScreen shows "Windows protected your PC" with More info > Run anyway; with Smart App Control turned On the
   file can be blocked completely (no Run anyway); the only ways are turning Smart App Control off in Windows Security or
   Microsoft recognising the file; false positives can be reported at https://www.microsoft.com/en-us/wdsi/filesubmission.
   Also: Cuy needs the WebView2 runtime (Windows 11 has it; most Windows 10 PCs have it) and where to get it (link above).
   Do not claim exact dialog wording beyond "Windows protected your PC" (not verified).

## Checks
`dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; Core tests.

## Gotowe pliki
- `research/gotowce/tools/package-velopack.ps1` → `tools/package-velopack.ps1` (pattern, never run on Windows; fix on first run). It
  calls `package.ps1`, then `vpk pack --packId Cuy.DesktopPet --framework net48,webview2`.
- `research/gotowce/src/Cuy/dotNet/Platform/Updater.cs`: pattern for F7-03 only; do not copy in this task.

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC (`TESTY_RECZNE.md` WV-01..WV-04, VEL-01..VEL-07, SAC-01): behaviour on a Windows 10 machine without the WebView2
  runtime; whether `EnsureCoreWebView2Async` throws the same exception; Velopack install/uninstall on a clean VM and the HKCU
  Run key; Setup.exe without internet; Setup.exe size; what Smart App Control shows for the unsigned exe.

When done, open a pull request against `main` titled `F3-03: Self-test, package and docs`.
