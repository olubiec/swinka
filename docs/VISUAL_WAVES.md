# Visual waves V0-V8 (executed by Claude Code, not by Jules)

Goal: close the whole visual topic (sprites, breeds, coats, animations, icons, minigame and screen graphics) without interruption. Context and audit: `docs/AUDYT_GRAFIKI_2026-11-02.md`, `docs/PLAN_WIZUALNY.md`. These files live in `docs/` on purpose: the Jules Loop starts waves only from `tasks/`, so it will not touch them.

## Decisions (final, do not reopen)
1. **Coats = runtime palette swap** (colour remap of the ginger sheet), not separate sheets. Palettes: `tricolor`, `dutch`, `agouti`, `albino`, `cinnamon`.
2. **Breeds = separate sheets per breed and stage** drawn by `tools/art/pig.py` (body-level features, so all 60 animations follow): `smooth` (existing), `chubby`, `skinny`, `rosette`, `peruvian` (simplified: fringe over the eyes plus a hair skirt down to the floor, done in the body renderer).
3. **Senior and legend are visibly aged** (grey muzzle and brows, faded patches, lower posture).
4. Everything is generated procedurally by Python scripts in `tools/art/` (numpy + Pillow). No AI image models for sprites. Third-party art only CC0/CC-BY with a file in `assets/LICENSES/`.
5. The existing rule "do not touch binary assets" (GOALS.md, CLAUDE.md) is lifted for this work: regenerating and adding PNGs under `assets/sprites/` and `assets/icons/` is the job. Never edit `Resources/animations.xml`; new sheets keep the 1024x3840 size so `Xml.UseExternalSheet` accepts them.

## Working rules
- Work autonomously and do not stop between waves. Nobody answers questions: decide, record the decision in the commit message and in `docs/VISUAL_LOG.md`, continue.
- One wave = one or more small commits straight to `main` (or one branch per wave merged when checks are green). Run the wave's checks before each commit. Commit trailer: `Co-Authored-By: Claude`.
- You may and must look at images: render contact sheets/GIF frames into a scratch folder (not committed) and open them to judge the look. This overrides "do not read assets binaries" for visual work only.
- Windows: build and test with `powershell -ExecutionPolicy Bypass -File tools/build.ps1`; also run `Cuy.exe --selftest` and do the desktop checks yourself when a wave says so. Web: `node tools/qa/web-smoke.js` (Chromium path via `CHROMIUM_PATH` if needed).
- Do not change or weaken existing test assertions. No new NuGet/npm dependencies. Texts in the game are English.
- Conflict guard with Jules wave W9: W9 edits `canvas-pig.js`, `minigames-api.js`, `app.js`, `minigames/*.js`, `features/pigs/*`, `features/vet/feature.js`, `tools/qa/web-smoke.js`, `tools/qa/sprite-check.js`. Waves V1, V2, V3, V5 do not touch these. Before V4 and V6 run `git pull` and check `ls tasks/` and `docs/PROJECT_STATE.md`: if W9 tasks are still open, do the other waves first, then come back. If W9 is merged, build on its code (do not redo it).
- When a wave is done append a block to `docs/VISUAL_LOG.md` (what, decisions, checks, date) and update `BRAKUJACA_GRAFIKA.md`.

## V0. Baseline (30 min)
Pull, run web-smoke, `tools/build.ps1`, `Cuy.exe --selftest`, `python tools/art/export.py <scratch>` and compare with the committed sheets (must be pixel-identical; if not, record why). Create `docs/VISUAL_LOG.md`. Add the line "Visual work is done by Claude Code per docs/VISUAL_WAVES.md; the loop must not plan visual or asset tasks" to `docs/GOALS.md`.

## V1. Coats: palette data, remap libraries, verification
Files: `tools/art/pig.py` (COATS), new `tools/art/palettes.py`, `tools/art/verify_palettes.py`, `assets/sprites/palettes.json`, `web/home/lib/palette.js`, `src/Cuy.Core/Pigs/Palettes.cs`, `src/Cuy/dotNet/Graphics/PaletteRemap.cs`, tests.
1. Add coats `tricolor` (ginger plus near-black patches: `rust` -> dark), `dutch` (chestnut brown body, white kept), `albino` (white-cream body, pale patches, pink-red eye colour), `cinnamon` (warm cinnamon) next to the existing `agouti`; keep `czarno-biala` and `kremowa`. Each coat only remaps the `orange` and `rust` ramps (and the eye colour for albino).
2. `palettes.py` writes `assets/sprites/palettes.json`: for each palette a list of `[fromHex, toHex]` pairs derived from `RAMP` versus the coat ramps (+ eye pair).
3. `verify_palettes.py` is the proof: for every stage x palette, render the full sheet with `set_style(age, coat)` and compare it pixel for pixel with the remap of the ginger sheet. Zero differing pixels, else fix the palette table or the renderer. Also confirm that remapped `agouti` equals the existing `companion_agouti` sheet.
4. JS: `palette.js` exposes `CuyPalette.apply(image, paletteId) -> canvas` (cached per image+palette), exact-match remap with `getImageData`. C#: `PaletteRemap.Apply(Bitmap, paletteId)` (LockBits, exact match) and a Core class that parses `palettes.json`. xUnit tests for the colour mapping; a Playwright test `tools/qa/palette-test.js` that remaps a sheet and checks pixel counts.
Done when: verify_palettes reports 0 differences, C#/JS tests green.

## V2. Senior and legend look old
Files: `tools/art/pig.py` (the `senior` branches at the existing lines), `tools/art/anims*.py` if needed, regenerated `assets/sprites/senior/*` and `legend/*` (via `export.py` then `english_assets.py`).
1. Strengthen senior: grey muzzle and brows, slightly desaturated/faded patches, lower back line, a few white whisker pixels. Legend = senior plus the gold outline already present, keep it distinct from senior.
2. Check on contact sheets of idle, walk, eat, sleep, popcorn, sit, sleep_house at x4. Adult vs senior must differ in at least 4 percent of opaque pixels of the idle frame and be obviously older at a glance. No clipping (bbox inside 64x64), floor stays at y=59.
3. Re-run `tools/qa/sprite-check.js` (from W9-09 if merged) and the audit metrics.

## V3. Breeds
Files: `tools/art/pig.py` (STYLE gets `breed`), new `tools/art/export_breeds.py`, `assets/sprites/breeds/<breed>/<stage>/{spritesheet.png,spritesheet_x2.png,animations.json,animations_x2.json}`, `assets/sprites/breeds.json`.
1. `chubby`: kb x1.12, kh x1.06, rounder belly; `skinny`: kb x0.92, kh x0.96, slimmer legs. Scale on top of each stage's own kb/kh.
2. `rosette`: two or three swirl tufts (darker/lighter pixel clusters) on the back and shoulder plus a small crest on the head, drawn inside the body renderer.
3. `peruvian`: fringe over the eyes and a hair skirt along the belly to the floor that hides most of the feet; the floor line stays at y=59; feet pixels may be hidden but animations must still read (walk, run, popcorn show the skirt moving).
4. Generate all 4 breeds x 5 stages x two scales. `smooth` keeps the current paths. `breeds.json` maps breed -> folder. Every sheet 1024x3840 (x2: 2048x7680), 60 animations, 592 frames.
5. Checks: extended sprite-check (sizes, tables equal to baby's, no clipped frames except the known prop animations `peek` and `sleep_house`), plus a review of a GIF or contact sheet for every one of the 60 animations of every breed at adult stage; fix what looks broken. Total added assets must stay small (package under 60 MB unzipped).
Done when: all sheets pass the checks and the contact-sheet review has no open defect.

## V4. Wire breeds and palettes everywhere (after W9 is merged)
Files: `web/home/canvas-pig.js`, `web/home/features/pigs/feature.js` and `.css`, `web/home/minigames/minigames-api.js`, `web/home/app.js` (album), `src/Cuy/dotNet/Xml.cs`, `src/Cuy/dotNet/FormPet.cs`, `src/Cuy/dotNet/BrainController.cs`, `src/Cuy/dotNet/SelfTest.cs`, `docs/contracts.md`.
1. One sheet resolver per platform: `(breed, stage) -> path`, then apply `paletteId` remap. Unknown ids fall back to `smooth` and `tricolor` without errors.
2. Home canvas and minigame pig use the active pig's breed and palette. The My Pigs card portrait draws the idle frame of that pig (replaces the W9-08 interim mapping); the card shows `breed · palette`.
3. Desktop: each `FormPet` loads the sheet and palette of its own `PigProfile` (two pets can look different). Cache remapped bitmaps per (breed, stage, palette). `SelfTest` verifies that every breed x stage sheet exists and has the expected size, and that every palette id remaps without exception.
4. Build with `tools/build.ps1`, run `Cuy.exe --selftest` (all PASS), start the app with two pigs of different breed and palette and confirm both look right on the taskbar at 1x, 1.5x and 2x. Add the visual steps to `TESTY_RECZNE.md`.

## V5. Icons (16x16, appended at the end of `icons_16.png`, indexes of existing icons unchanged)
Files: `tools/art/icons_extra.py`, `assets/icons/icons_16.png`, `assets/icons/icons.json`, `web/home/style.css` (`.icon-*` rules), `assets/data/items*.json` (icon fields), feature CSS where emoji are replaced.
1. Own icons for `soft_pellets`, `warm_house_bed`, `dental_chew`, `vitamin_mix`, `carrot_top`; switch their items from the borrowed icon to their own.
2. Trait icons: `trait_cuddly`, `trait_glutton`, `trait_explorer`, `trait_sleepyhead`, `trait_popcorning`, `trait_vocal` (shown on pig cards in V4).
3. Game icons: `game_veggie_rain`, `game_nyan_cuy`, `game_veggie_memory`, `game_hay_maze` replacing the emoji in the games hub and headers.
4. Coat swatches: `coat_tricolor`, `coat_dutch`, `coat_agouti`, `coat_albino`, `coat_cinnamon`.
5. Style rules from `BRAKUJACA_GRAFIKA.md` (outline `#3a1d17`, 2-4 shades, top-left light). Check with `tools/qa/check-icons.js` if present, web-smoke, and a contact sheet at x8.

## V6. Screens, scenes and minigames review (after W9 is merged)
1. Take screenshots of every Home screen and feature (the smoke test already writes them to `tools/qa/out/`) and of the four games at 420x640. Write a defect list with severity into `docs/VISUAL_LOG.md`, then fix everything visual: clipped text, misaligned icons, inconsistent borders, emoji used as UI icons, low contrast, wrong colours.
2. Hay Maze: pig from the pig sheet (stage and breed of the active pig) instead of rectangles; hay-bale wall tiles drawn pixel-style. Nyan Cuy: judge obstacles and background against the house style and redraw what does not fit. Check Veggie Rain and Veggie Memory the same way.
3. Home room: review `drawHabitat` and every decor item (rug, wooden house, etc.), the 9 colouring packs (readable outlines, no broken pages), the update badge and Settings, the app icon (`assets/app-icon`) and the installer text/graphics. Redraw or fix what is inconsistent.
4. Re-run the Playwright fit check (W10-01 if merged) and web-smoke.

## V7. Animation closure
1. Create `docs/ANIMATIONS.md`: for each of the 60 animations the trigger (Brain action, trick, toy, UI), the platforms where it plays (desktop, Home), and the status. Use the real code, not guesses.
2. Wire every animation that has a natural trigger but none in code (candidates found by the audit: dance, party, groom_other, sleep_together, drink, chin_rub, nose_touch, held, stand_up, sad, sick, shiver, heat_flop, front_happy). Respect needs and bond unlocks; numbers go to `assets/data`. Animations that do not fit any behaviour are marked "unused by design" in the doc.
3. Frame-by-frame review of loops and transitions: house_enter -> sleep_house -> house_exit, tunnel_in/out, lie_down -> sleep, peek (empty frames 0 and 11: decide and fix or document), fall -> land, front_look 5 frames for cursor tracking. Fix anything that jumps or pops.
4. Test on Windows: eye tracking, tricks (spin, stand up, popcorn, hurdle), sleep, peek on start, two pigs interacting.

## V8. Final acceptance
Run every check: `dotnet test`, `tools/build.ps1`, `Cuy.exe --selftest`, web-smoke, palette test, sprite-check, fit check, `verify_palettes.py`. Verify release package size under 60 MB. Walk through `TESTING.md` steps 2-6, 28 and 34-37 on the real desktop. Write `docs/AUDYT_WIZUALNY_FINAL.md` with the definition-of-done below, each item checked with evidence. Update `BRAKUJACA_GRAFIKA.md`, `docs/PROJECT_STATE.md` is maintained by the loop (do not edit its Log).

Definition of done:
1. All 60 animations play in Home and on the desktop for every stage; each has a trigger or a "unused by design" note.
2. Every breed x stage sheet exists and passes the checks; every palette is verified pixel-exact.
3. Breed and palette are visible on the pig card, in Home, in minigames and on the desktop; two pets can differ.
4. No borrowed icons, no emoji as UI icons.
5. Minigames and screens have no clipped or inconsistent elements.
6. All automated checks green and the Windows desktop walk-through passed.

## V9-V15 (second round, 2026-11-02)
Rotation, real breeds and build, pattern-based coats, light ageing, the named collection (Ned, Kuki, Glen, James, Racuch) and the decor shop: see `docs/PLAN_WIZUALNY_V2.md`. Same rules as above. Decisions 1-2 of this file are superseded where the plan says so (coats become pattern + palette, `chubby`/`skinny` become a build axis).
