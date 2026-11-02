# Final visual audit (2026-11-02)

Done in a Linux session (no Windows). Everything that can be proven by scripts, screenshots and compilation is proven below; everything that needs a running `Cuy.exe` on Windows is listed as **not done** with the exact manual steps (`TESTY_RECZNE.md` section 7).

## Checks run (all green)
| Check | Result |
| --- | --- |
| `dotnet test` (Core, run on .NET 8 because Ubuntu has no 9; csproj temporarily retargeted, reverted) | 342 passed, 0 failed |
| C# WinForms project compile (throw-away csproj copy without `UseWindowsForms`) | 0 errors |
| `node tools/qa/web-smoke.js` | OK (no swallowed errors any more) |
| `node tools/qa/anim-test.js` | 60 animations x 5 stages OK |
| `node tools/qa/palette-test.js` | OK |
| `node tools/qa/minigame-fit-check.js` | FIT OK (4 games) |
| `node tools/qa/maze-test.js`, `lib/layout.selftest.js` | OK |
| `python tools/art/verify_palettes.py` | TOTAL DIFFERENCES: 0 (5 stages x 7 palettes, 4 breeds x 7 palettes at adult, 3 companion sheets) |
| `python tools/art/check_sprites.py` on all 28 sheet folders | 28 ok |
| `node --check` of every JS file, JSON parse of all data files | OK |
| `tools/build.ps1`, `Cuy.exe --selftest`, `tools/package.ps1` | **not run** (Windows only). Package size estimate: assets 23 MB + web 2 MB + bin <= 30 MB (with pdb) = about 55 MB, under 60 MB |

## Definition of done
1. **All 60 animations play in Home and on the desktop for every stage; each has a trigger or "unused by design".**
   Home: proven (`anim-test.js`, every stage, rows/frames/fps/loop equal to `animations.json`, every frame has pixels). Desktop: all 60 names exist in `animations.xml`; triggers listed in `docs/ANIMATIONS.md` (6 new Brain actions added). Only `tunnel_wiggle` is "unused by design" (reason in the doc). *Desktop playback itself not run here (VIS-06..VIS-09).*
2. **Every breed x stage sheet exists and passes; every palette is pixel-exact.** Done: 20 breed sheets + 8 base/companion sheets pass `check_sprites.py`; `verify_palettes.py` reports 0 differences (it found and fixed one real defect, the peruvian fringe ignoring the coat).
3. **Breed and palette visible on card, Home, minigames and desktop; two pets can differ.** Card, Home, album and minigames: shown in screenshots (`docs/album`, "Ekrany i gry"), Hay Maze uses the pig sheet of the active pig. Desktop: implemented (`PigLook`, `PigsFeature`, per-pet `Profile`, selftest checks) and compiled, *not seen running* (VIS-02..VIS-05).
4. **No borrowed icons, no emoji as UI icons.** 46 own icons added (indexes 61-106); every shop item has its own icon except the shared decor slot icons (wallpaper, floor, rug, plant, frame, lamp: category icons, not borrowed); `golden_bowl` got its own. A scan of `web/home` finds no emoji; only the plain text glyph "x" (U+2715) remains on close buttons.
5. **Minigames and screens have no clipped or inconsistent elements.** Fit check green, HUD and Finish buttons fully visible, empty-room bug, invisible wall decor and heart rug fixed, defect table in `docs/VISUAL_LOG.md` (V6).
6. **All automated checks green and the Windows desktop walk-through passed.** Automated: green (table above). Windows walk-through: **not done** (no Windows machine in this session).

## What is left (needs a human on Windows)
- `powershell -ExecutionPolicy Bypass -File tools/build.ps1` and `Cuy.exe --selftest` (expect all PASS, including "breed sheets" and "palettes").
- `TESTING.md` steps 2-6, 28 and 34-37 on the real desktop, plus VIS-01..VIS-09 in `TESTY_RECZNE.md`: two pigs of different breed/coat at 1x/1.5x/2x, house and tunnel joins, tricks, eye tracking, peek.
- Decisions to confirm: default pig is `smooth`/`tricolor` (near-black patches instead of rust); `dutch` is a plain chestnut body (no patch mask); W9-01..W9-10 and W10-01 in `tasks/` overlap work done here and can be dropped.
