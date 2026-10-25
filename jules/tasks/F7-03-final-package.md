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
3. Licences: music (Juhani Junkala, CC0), Twemoji (CC-BY 4.0), NAudio (MIT), Phaser (MIT), Open-Meteo (CC BY 4.0, attribution
   shown in Settings), Pixelify Sans (OFL), sprites and sounds (own work). Verify each file under `assets/LICENSES/`.
4. `README.txt` for the player (English, short, no project name in the file name of the ZIP): add the new things in one line each
   (diary, album, birthday, bond and tricks, companion, weather city, music dance, three more games, sound settings).
5. `ARCHITECTURE.md`: sections for life stages on the desktop, behaviour plug-ins, weather (the one network use), the companion.
   `TESTING.md`: a final manual checklist of 40 numbered steps for the Windows tester, grouped as: first run (corner peek, naming,
   tutorial), walking and surfaces, food and poops, Home, care calendar, vet, colouring, shop and decor, minigames, tricks and
   bond, companion, reactions (music, mouse, fullscreen, weather), settings, package on a clean account.

## Checks
Build passes; `Cuy.exe --selftest` compiles; Core tests pass.

When done, open a pull request against `main` titled `F7-03: Final self-test, package and docs`.
