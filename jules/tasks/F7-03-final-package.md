# Task F7-03: Final self-test, package, licences and documentation

Read `AGENTS.md` first. All other tasks are merged. Extends F3-03 (do not redo it, update it).

## Files you may change
`src/Cuy/dotNet/SelfTest.cs`, `tools/package.ps1`, `tools/package/README.txt`, `THIRD_PARTY_NOTICES.md`, `README.md`,
`ARCHITECTURE.md`, `TESTING.md`, `assets/LICENSES/*`.

## Steps
1. Self-test: add checks for everything new: all four life-stage sheets and both companion coats load through
   `SpriteSheetLoader` (64x64 frames, row/col count), `diary.json` has >= 48 valid templates, `bond.json`, `tricks.json`,
   `hay.json`, `companion.json`, `weather.json` parse, every minigame in `games.json` exists, NAudio DLL present, Release
   menu has no developer items (F4-10).
2. Package: print size, fail if > 100 MB or if a forbidden path is inside (see F4-10); check NAudio, Newtonsoft and the
   assets folder are included; ZIP name unchanged.
3. Licences: music (Juhani Junkala, CC0), Twemoji (CC-BY 4.0), NAudio (MIT), Phaser 3.90.0 (MIT), Open-Meteo (data CC BY 4.0 + GeoNames,
   attribution shown next to the weather in Settings), ZzFX (MIT), Tracery (Apache-2.0: concept and syntax only, own implementation),
   Velopack (MIT, only if step 6 is done), eSheep (MIT since 2026-10-14, attribution kept), `ourcade/infinite-jumper-template-phaser3` (MIT, only if
   code was copied), Pixelify Sans (OFL), sprites and sounds (own work). Verify each file under `assets/LICENSES/`.
4. `README.txt` for the player (English, short, no project name in the file name of the ZIP): add the new things in one line each
   (diary, album, birthday, bond and tricks, companion, weather city, music dance, three more games, sound settings).
5. `ARCHITECTURE.md`: sections for life stages on the desktop, behaviour plug-ins, weather (the one network use), the companion.
   `TESTING.md`: a final manual checklist of 40 numbered steps for the Windows tester, grouped as: first run (corner peek, naming,
   tutorial), walking and surfaces, food and poops, Home, care calendar, vet, colouring, shop and decor, minigames, tricks and
   bond, companion, reactions (music, mouse, fullscreen, weather), settings, package on a clean account.

6. OPTIONAL (do it only if the human wrote "yes, Velopack" in the task thread; otherwise skip and say so in the PR): Velopack next to the ZIP
   (the ZIP stays the default, no installer is required). Add the NuGet package `Velopack` to `Cuy.csproj` (the version must equal the `vpk` tool
   version, issue #195); `VelopackApp.Build().Run();` as the VERY FIRST line of `Main()`, before the `Mutex` and before `Application.Run`
   (the order versus the Mutex is the docs' "first code" rule plus our inference, UNVERIFIED); in
   `VelopackApp.Build().OnBeforeUninstallFastCallback(v => ...)` delete the HKCU `...\Run` value of Cuy (not removed by uninstall; the callback has 30 s and
   must show no UI); add `src/Cuy/dotNet/Platform/Updater.cs` (background check 2 min after start, `GithubSource(repoUrl, null, false)`,
   `WaitExitThenApplyUpdates(asset, silent, restart)`); the autostart Run entry must point to the root stub exe of the install, never `Update.exe`;
   `--packId` must never change.
7. README.md: section "Dane pogodowe" is written in English as "Weather data" (attribution + non-commercial use only); sections about
   SmartScreen/Smart App Control and the WebView2 runtime (see F3-03) are kept up to date.

## Checks
Build passes; `Cuy.exe --selftest` compiles; Core tests pass.

## Gotowe pliki
- `research/gotowce/src/Cuy/dotNet/Platform/Updater.cs` → `src/Cuy/dotNet/Platform/Updater.cs` (only for the optional step 6; pattern).
- `research/gotowce/tools/package-velopack.ps1` → `tools/package-velopack.ps1` (already added by F3-03; check it still matches).
- Files under `research/gotowce/src/Cuy/` were never compiled (they need Windows + .NET Framework 4.8): use them as the starting point and fix compile errors in this task. Files already copied into `src/Cuy.Core/` and `tests/Cuy.Core.Tests/` by the rebuild session compile and are tested.

## Testy ręczne (ZWERYFIKUJ NA PC)
UNVERIFIED (R3.1-R3.4), done by the human on a clean Windows 10/11 VM (`TESTY_RECZNE.md` VEL-01..VEL-07):
- Install with Setup.exe, run, enable autostart, uninstall: is the HKCU Run value left behind without the hook? Does the hook remove it?
- Setup.exe without internet and without the WebView2 runtime: what happens? Setup.exe size. Does the Run entry on the root stub keep working after an update?

When done, open a pull request against `main` titled `F7-03: Final self-test, package and docs`.
