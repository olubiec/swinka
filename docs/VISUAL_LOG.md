# Visual log

Log of waves V0-V8 (`docs/VISUAL_WAVES.md`), newest at the bottom.

## V0 Baseline (2026-11-02)
- `python tools/art/export.py <scratch>` reproduces all 8 committed `spritesheet.png` files pixel-identically (0 differing pixels).
- `node tools/qa/web-smoke.js`: OK (first run had one flaky `20_more_menu` click timeout on a detached element; second run clean).
- Environment limits (decision): this session is Linux without .NET and without Windows. `dotnet`, `tools/build.ps1`, `Cuy.exe --selftest` and desktop walk-throughs cannot run here (dotnet download is blocked by the proxy, 403). C# changes are written carefully but are unverified until the human runs `tools/build.ps1` on Windows; each wave lists what is unverified. Web checks run with `CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
- `english_assets.py` needs the old Polish export (icons .ico, sounds, data) that is not in the repo, so sprite sheets are written by a new `tools/art/export_sprites.py` that reproduces the same file layout.

## V1 Coats (2026-11-02)
- New coats in `tools/art/pig.py`: `tricolor` (ginger body, near-black rust patches/ears), `dutch` (dark chestnut), `albino` (cream-white, pale-pink patches, red eyes via `eyec()`), `cinnamon` (warm red-brown). Kept `agouti`, `czarno-biala` (palette id `black_white`), `kremowa` (`cream`); the last two exist so the companion sheets can be verified.
- `tools/art/palettes.py` writes `assets/sprites/palettes.json` (exact [from,to] pairs, orange+rust ramps and albino eye). Default palette `tricolor`; unknown ids fall back to it.
- Decision: dutch is a uniform chestnut body with the white band kept (a real dutch pattern would need a patch mask; out of scope per VISUAL_WAVES).
- `tools/art/verify_palettes.py`: 5 stages x 7 palettes, remap of ginger vs rendered: 0 differing pixels; remapped agouti/black_white/cream equal the committed companion sheets.
- JS `web/home/lib/palette.js` (`CuyPalette.apply`, cached) + Playwright `tools/qa/palette-test.js`: OK. C# `Palettes.cs`, `PaletteRemap.cs`, xUnit `PaletteTests.cs` written but NOT compiled here (no .NET in this session): to be confirmed by `tools/build.ps1` on Windows.

## V2 Senior and legend (2026-11-02)
- `pig.py` senior branch: lower sagging back (body height x0.93, head 1px lower), frosted back (cream checker strip along the top plus sparse speckles, faded rump patch), solid grey brows, larger grey cheek/muzzle area (side and front views), opaque white whiskers. Legend = senior plus the existing gold outline (still distinct).
- Metric (idle frame 0): adult vs senior differ in 39.7% of opaque pixels (target >= 4%); senior vs legend 12.7%. Reviewed contact sheets of idle, walk, popcorn, eat, sleep, sit, sleep_house at x3-x6.
- New `tools/art/export_sprites.py` (writes sheet, x2, json; baby re-export is byte-identical to the committed files) and `tools/art/check_sprites.py` (sizes, x2 equality, tables, empty frames, border clipping; `tools/qa/sprite-check.js` from W9-09 is not merged yet). All 8 variants pass; only prop animations (ball_push, house_*, tunnel_*, peek, sleep_house) clip by design, same as before.
- `verify_palettes.py` re-run on the new senior/legend: 0 differences.

## V3 Breeds (2026-11-02)
- `pig.py` STYLE has `breed`; `set_style(age, coat, breed)`. Breeds are body-level so all 60 animations follow:
  - `chubby`: kb x1.07, kh x1.05, body height extra x1.05 (total about x1.12), rounder belly (superellipse power 2.3). Decision: width is scaled less than 1.12 and body is shifted 1 px left because x1.12 made `chew_stick` and `heat_flop` clip the 64 px frame; head offset is not scaled.
  - `skinny`: kb x0.92, kh x0.96, thinner legs.
  - `rosette`: three swirl tufts (dark ring with gap plus light centre) on back/shoulder in body-local coordinates, plus a small crest on the head (side and front views).
  - `peruvian`: fringe strands over the eyes (side and front) and a hair skirt from the belly to 2 px above the floor line that hides most of the feet; the hem lifts where a foot is raised so walk, run and popcorn still read. Floor line stays at y=59.
- `tools/art/export_breeds.py` generates 4 breeds x 5 stages (sheet, x2, json) into `assets/sprites/breeds/<breed>/<stage>/` and `assets/sprites/breeds.json` (smooth uses the root stage folders). 20 variants = 8.4 MB added (package budget 60 MB).
- Checks: `check_sprites.py` passes on all 20 (1024x3840 / 2048x7680, 60 animations, 592 frames, tables equal across breeds, no clipping except the known prop animations). Reviewed contact sheets of all 60 animations (middle frame, x2) for peruvian, rosette, chubby and skinny at adult stage, plus front views; no open defect. `verify_palettes.py` extended: every breed at adult x every palette remaps pixel-exactly.

## V5 Icons (2026-11-02)
- 20 new 16x16 icons appended to `icons_16.png` (index 61-80, existing indexes unchanged) by `tools/art/icons_extra.py`: items `soft_pellets`, `warm_house_bed`, `dental_chew`, `vitamin_mix`, `carrot_top`; traits `trait_cuddly|glutton|explorer|sleepyhead|popcorning|vocal`; games `game_veggie_rain|nyan_cuy|veggie_memory|hay_maze`; coats `coat_tricolor|dutch|agouti|albino|cinnamon` (swatches use the real coat ramps from `pig.COATS`).
- `style.css`: `--icon-count: 81` and `.icon-*` rules for all new icons. The 5 shop items now use their own icon ids (`assets/data/items_shop.json`); every item icon id exists in `icons.json`.
- Reviewed a x8 contact sheet twice; redrew dental_chew, the Nyan Cuy trail (the first version was missing) and trait_vocal.
- Decision: replacing the games-hub emoji with the new game icons touches `minigames-api.js` and `app.js` (W9 conflict zone), so it is done in V6 together with the other emoji. `tools/qa/check-icons.js` does not exist; web-smoke passes.

## V4 Breeds and palettes wired (2026-11-02)
- W9 (Jules) is still open in `tasks/` and the loop has not started W3, so waiting was not an option. Decision: V4 and V6 were done now and they include the work of W9-01 (all 60 animations in Home), W9-02/03 (junior sprites), W9-04..08, W9-10 and W10-01. The human should drop the W9/W10-01 task files (not touched here, they live in `tasks/`) or expect the loop to find them already done.
- Web: new `web/home/lib/sprites.js` (`CuySprites`: one resolver `(breed, stage) -> path`, palette remap through `CuyPalette`, `activePig(state)`, `drawPortrait`). `canvas-pig.js` now has all 60 animation rows (table generated from `animations.json`), senior/legend fps like the sheets, junior uses its own sheet, and the Home pig uses the active pig's breed and palette. Minigames: `MinigryPig.setLook` + `applyLook` swap the Phaser texture for the remapped canvas; nyan-cuy, veggie-memory and veggie-rain no longer map junior to baby. The album uses the active pig's sheet. My Pigs cards draw the idle frame of each pig and show a coat swatch icon, `breed . palette` and trait icons.
- New `tools/qa/anim-test.js`: all 60 animations x 5 stages play in Home (no fallback to idle), tables equal `animations.json` per stage, every frame has pixels (peek 0/11 empty by design): OK. `web-smoke`, `palette-test`, `maze-test`, `layout.selftest` OK.
- Desktop (C#, NOT compiled here): `SpriteSheetLoader.Load(stage, breed, palette)` with cache; `Xml.BuildStageSprites`; `PigLook` (profile per desktop slot, apply, refresh); `PigsFeature` (publishes `roster`/`activePigIds`, handles `adopt_pig` and `toggle_pig_active`, numbers in `assets/data/pigs.json`); `StartUp.AddSheep` and `BrainController.OnPetStageChanged` apply each pet's own look; `SelfTest` gained "breed sheets" and "palettes". Contract in `docs/contracts.md`. Manual steps VIS-01..09 added to `TESTY_RECZNE.md`.
- Decision: the default pig profile is `smooth`/`tricolor`, so the default adult now has near-black patches instead of rust ones (as specified for tricolor).

### Correction to V0/V1/V4 notes: the C# does compile here
`apt-get install dotnet-sdk-8.0` works in this session (apt is reachable, dot.net is not). With it: `dotnet test` (tests project temporarily retargeted from net9.0 to net8.0, reverted) = **342 passed, 0 failed** including the new `PaletteTests`; and the whole WinForms project compiles with 0 errors (checked with a throw-away csproj copy that replaces `UseWindowsForms` by plain System.Windows.Forms/System.Drawing references, because the Ubuntu SDK lacks the WindowsDesktop targets). Still impossible here: running `Cuy.exe`, `--selftest`, and any desktop walk-through (no Windows).

## V6 Screens, scenes and minigames review (2026-11-02)
Method: own Playwright screenshots (scratch, not committed) of the Home screen, all 11 features, the games hub, the four games at 420x640, the decor items, coloring packs and the app icon.

Defect list (severity) and what was done:
| # | Sev | Defect | Fix |
| --- | --- | --- | --- |
| 1 | high | All 4 games: 360 px canvas in a 320 px wrapper, HUD text and `[ Finish ]` clipped | Phaser `scale.mode = FIT` + `CENTER_BOTH` in all four `Phaser.Game` configs; `tools/qa/minigame-fit-check.js` (FIT OK) |
| 2 | high | Home room: the floor was empty/dark whenever no floor decor was equipped (the decor layers always set `skipDefaultFloor/Wall`) | `canvas-pig.js` skips the defaults only for equipped slots |
| 3 | high | Wall pictures and lamps were drawn in the top 34 px that the Home canvas crops (invisible); heart rug invisible | moved picture to y=46, lamp to (150, 36); redrew the heart rug |
| 4 | high | Emoji used as UI icons everywhere (header, stage badge, bond, features, hub, results, in-game HUDs) | 25 new 16x16 icons (stage_*, sound_on/off, gear, sparkle, flame, warning, check, star, replay, back_arrow, album_book, gamepad, trick_*, heart, heart_empty, pause, play) and all UI strings switched to `pixel-icon`; bubbles lost their emoji; Phaser HUDs use sprites from `icons16` (hearts, sparkle) |
| 5 | med | Games hub showed emoji tiles | hub uses `game_*` icons |
| 6 | med | Tricks screen used emoji | `trick_*` icons |
| 7 | med | My Pigs: Adopt button text broke across lines | nowrap, shorter label |
| 8 | med | Hay Maze: pig was a 12x8 rectangle, walls thin lines | real pig sheet sprite (breed, stage, palette of the active pig, run/idle animation); hay-bale walls (dark edge, straw body, light edge, ticks) and a checkered meadow floor |
| 9 | low | Coloring page grid threw `null.addEventListener` when the modal closed during a render (was hidden by web-smoke) | guard in `coloring/feature.js`; the swallow in `web-smoke.js` removed (it was mislabelled as a vet bug) |
Reviewed and left as is: Nyan Cuy (night sky with rainbow trail and pixel icons from the sheet; a deliberate different theme, consistent pixel style), Veggie Rain and Veggie Memory (wood and tablecloth, fine once fitted), the 9 colouring packs (silhouette thumbnails readable, no broken pages), app icon (consistent at 256/32/16), Settings and update area, installer (text-only `.cmd` scripts, no graphics).
Checks: `web-smoke`, `minigame-fit-check`, `anim-test`, `palette-test`, `maze-test` all OK.

## V7 Animation closure (2026-11-02)
- `docs/ANIMATIONS.md`: all 60 animations with the real trigger (from `actions.json`, event table, C# `RequestAnimation` calls, items, tricks), platforms and status. Only `tunnel_wiggle` is "unused by design" (geometry mismatch, reason in the doc).
- New Brain actions (data only, `assets/data/actions.json`): `following` (follow), `sleeping_together` (sleep_together), `chirping` (chirp; daily limit 0 for adult+), `dancing` (dance), `yawning` (yawn), `beaming` (front_happy). Companion ones need a companion. Core tests: 342 passed.
- Loop/transition review: `sleep_house` house geometry aligned with `house_enter` (all 28 sheets regenerated); other joins checked frame by frame, `peek` empty frames documented as intentional.
- Windows checks (eye tracking, tricks, sleep, peek, two pigs): not possible in this session; listed as VIS-06..VIS-09 in `TESTY_RECZNE.md`.

## V8 Final acceptance (2026-11-02)
- All automated checks green, see `docs/AUDYT_WIZUALNY_FINAL.md`. Added `golden_bowl` icon (own icon for the golden bowl item, was the trophy) and removed the last emoji from the standalone minigames page.
- `docs/album/index.html` (generated by `tools/art/album.py`): one self-contained page with all 60 animations (stage, breed, coat, speed, frame-by-frame view), breed x stage and coat matrices, 107 icons, screens, games, room decor, app icon.
- Not done and why: running `Cuy.exe`, `--selftest`, `tools/build.ps1` and the TESTING.md desktop steps: no Windows in this environment.

## G0-G5 Graphics round 2 (2026-11-02) - plan: `docs/PLAN_GRAFIK_V2.md`
- **Coat model (G1):** zone-coded master sheets (13 zones, 4 shades + speckle tick, unique code colours), 8 patterns x 10 palettes, `tools/art/patterns.py`; `palettes.json` stays loader-compatible (`palettes` = id -> pairs, new ids `<pattern>.<palette>`, `@senior`) with the model under `v2`. `verify_palettes.py`: direct render == remap of the master, 0 differing pixels. Existing `PaletteTests` and `palette-test.js` keep passing (rust ramp stays the legacy master colour of the saddle zone).
- **Rotation (G2):** `tools/art/yaw.py` 3D model; `turn` = 0/30/60/90 degrees (4 frames), `turn_smooth` 8 frames and `idle_34` 4 frames in `rotation.json` (strips in the free columns of row 23). `animations.json` unchanged (60 entries, 592 frames, sheet 1024x3840).
- **Breeds and builds (G3):** shapes smooth/teddy/rosette/peruvian x normal/chubby/lean (8 shipped), `docs/RASY.md`. Hairless skinny dropped (reason in RASY.md), legacy id mapped to `smooth_lean`. Old `breeds/chubby|skinny|rosette|peruvian` folders replaced.
- **Ageing (G4):** senior = light colour fade + grey muzzle, legend = peak look + gold outline + sparkles.
- **Collection (G5):** Ned, Kuki, Glen, James, Racuch looks in `docs/reference/pigs/looks.json`, photo | sprite sheets in `docs/album/compare/`.
- Checks: `check_sprites.py` (all folders), `anim-test`, `palette-test`.

## 2026-11-02 Plan wyglądu V3
Owner: wygląd świnek słaby (łaty, układ kolorów, sierść, rozetki). Napisany plan fal A0-A8 w `docs/PLAN_WYGLAD_V3.md`: analiza wzorców, silnik maści w przestrzeni tekstury, silnik sierści, rozetki, głowy, pięć świnek, maści generyczne, portrety, zamknięcie. Wykonanie w kolejnych sesjach.

## 2026-11-02 Research do planu V3
`docs/RESEARCH_WYGLAD_V3.md`: gotowce wizualne i techniczne (standardy ras, wzory, fur 2001, hue shifting, sel-out, dithering, potoki 3D, CIEDE2000), wdrożone w `docs/PLAN_WYGLAD_V3.md`. Kluczowe zmiany planu: wzór łat w 3D zamiast tekstury z szwem, rozetka = wir + grzebienie, dither w przestrzeni modelu, bez zewnętrznych bibliotek (tylko numpy + Pillow). Bez wykonania.

## 2026-11-02 A0 analiza wzorców (done)
`tools/art/colorlab.py` (sRGB<->Lab, CIEDE2000 zweryfikowany na parach Sharmy, k-means w Lab), `tools/art/ref_spec.py`, `docs/reference/pigs/spec/` (specyfikacja, lista cech, rampy kolorów regionów, zdjęcia z regionami). Odkrycia: miękki gradient u Kukiego, pas siodła u Racucha, brąz Neda sięga szyi, James bez łat, Glen czarny z bryłą tylko w kępach.

## 2026-11-02 A1 silnik maści w przestrzeni modelu (done)
`tools/art/coatgen.py`: szum 3D (numpy), warping, dither o progu stałym na powierzchni (bez migotania), sloty Q0-Q3 z własnymi rampami i wzory pięciu świnek liczone z punktu na powierzchni (ciało: u,phi; głowa: xh,yh,zh). Podpięte w `pig.py` (`set_style(named=...)`, strona boczna) i `yaw.py` (obrót). Strefy wzorów generycznych dostały organiczny warping (`body_zones`). Brak szwu, ten sam wzór w idle i turn. Dalsze dopracowanie wzorów w A5.
Eksport arkuszy pięciu świnek i regeneracja arkuszy generycznych: A5/A6 (wymaga pełnego `verify_palettes`).

## 2026-11-02 A2-A8 wygląd V3 (done z ograniczeniami)
Sierść (`fur.py`), rozetki (`whorls.py`), obrys selektywny, arkusze pięciu świnek (`export_named.py`), pięć nowych wzorów generycznych, regeneracja wszystkich kształtów. Testy: verify_palettes 0 różnic, check_sprites, anim-test, palette-test, web-smoke OK. Ocena i braki: `docs/AUDYT_WYGLAD_V3.md`.

## Paczka finalna (2.11.2026)
Plan: `docs/PLAN_PACZKA_FINAL.md`. Zrobione F1 (portrety, James rex, bez R2/R5), F2 ikony 120-160, F3 farma, F4 45 przedmiotów, F5 tła i kafelki, F6 podgląd. Testy: check_sprites, anim-test, palette-test, web-smoke OK. assets/ 51 MB.
Drugi przebieg: R2 profile głów wg rasy, R5 mocniejsze wiry, arkusze przeliczone, altana i uprawy poprawione. Testy OK.
Przegląd końcowy: licznik ikon w style.css (161) i klasy .icon-* dla 120-160, James z zakręconymi wąsami, kontrola spójności world_items/farm/ikon z plikami.

## 2026-11-03 B0 narzędzia przebudowy
handart.py (piksele w palecie, kontur, cień, recolor, rejestr atlasu), style_check.py (R1-R7, baseline: 101 plików z odstępstwami, R1=547597 px), light.py (silnik światła bez wypalenia do bieli), scena.py (bramka: świnka + 3 oświetlenia + 4 warianty), world/registry.py (55 id, 10 bez plików). Plan: docs/PLAN_PRZEBUDOWY.md.

## 2026-11-03 B1 próbki kierunku
sofa_cosy (bochenek, brick, 4 warianty), fireplace (wył + 4 klatki wł), lamp_mushroom (wył/wł), willow_tunnel, tree_small, stall_basic, wycinek tła ogrodu wieczorem. Lint 0 na nowych plikach. Zmiany silnika: kwantyzacja w YCbCr (zieleń nie brązowieje), ambient evening w lights.json [1,0.84,0.74] x 0.76. Arkusze: docs/album/przebudowa/b1-*.png.

## 2026-11-03 B2 materiały i kafle
53 kafle świata od nowa (tools/art/world/tiles.py + build_tiles.py): deski, wiklina, dzianina, siano, tapety z motywami, trawa z kępami, woda 4 klatki, 16 płotów, kamień pamięci, 10 skórek pokoi świnek, run_floor, wall/floor_memory. Lint 0. Stare _x2 kafli odświeżone nearest do czasu B13. Arkusze: docs/album/przebudowa/b2-*.png.

## 2026-11-03 B3 światło i płomienie
14 źródeł światła (wył + pasek klatek wł, atlas.items[id].light), 4 maski snopów, okno x 4 pory dnia, pyłki w świetle, lights.json v2 (item/file/on_file/frames/fps/glow/mask/window_tods/dust). Nowe id poza world_items.json: fireplace, lamp_mushroom, lamp_floor, lamp_arc, lantern_paper, lamp_salt, lamp_lava, candle, torch, lamp_oil, brazier, willow_tunnel (do przekazania w B13-5). Lint 0.

## B4 – dom (przebudowa)
- 13 przedmiotów (B4-1..3), 9 ciepłych dodatków, 5 rzeczy podpisowych 2x2 + 20 wariantów koloru, 4 rekwizyty, memory_frame, dorm_nest, 5 scen pokoi. Lint 0 (poza starym memory_corner – do B13). Gra nie uruchamiana (brak Windows).

## B5 – ogród (przebudowa)
- 17 przedmiotów ogrodu w stylu domku z siana (rośliny, konstrukcje, woda i zabawa, dodatki), nowa gate_garden, 4 tła 256x144 z tunelem z wierzby, furtką, ścieżką i oświetleniem. Lint 0 dla nowych. Nowe id: gate_garden, watering_can, hay_basket, stump_seat (hand-off B13-5).

## B6 park (przebudowa)
- 11 przedmiotów (tree_big, gazebo ze słomianym dachem, flower_arch, pond_big, bridge_wood, fountain, statue_pig, path_cobble, bench_park, picnic_blanket, tunnel_playground) i 4 tła 384x192 (strumień z mostem, altana, lampy parkowe, kosz z żarem). Lint 0. Przegląd: docs/album/przebudowa/b6-6_przeglad_parku.png.
- Gry nie uruchamiano; stare `_x2` odświeżone nearest.

## B7 farma (przebudowa)
- farm.png przerysowany w tych samych ramkach (kontrakt farm.json bez zmian): 11 upraw po 4 stadia, 4 drzewka po 3, grządki pusta/mokra/ziemia, podlewanie, wielki zbiór. scarecrow, fence_farm, wheelbarrow, signpost przerysowane; nowa `barn_hay` (stodoła ze słomą, bez źródeł ognia). Tło farmy 256x144. Lint 0 (farm.png: 181 px R4 to krawędzie kafli grządek, nie przedmiot).
- Hand-off B13-5: nowe id `barn_hay` (place farm).

## B8 targ (przebudowa)
- `stall_big` (plandeka dusk z łatami, lampiony), `order_board`, `promo_1..3` przerysowane; nowe plakaty `poster_1..3` (16x32, wpisy w `tiles.json` -> market). Tło targu 256x144, wieczór ze sznurem lampek. Lint 0. Podgląd: docs/album/przebudowa/b8-1_*.png, b8-3_targ_wieczor.png.
- Hand-off B13-5: nowe id `poster_1`, `poster_2`, `poster_3` (market, tiles.json).

## B9 dekoracje sklepu (przebudowa)
- decor.png przerysowany w całości (40 przedmiotów, 41 klatek) w tych samych ramkach co decor.json (kontrakt bez zmian): tapety, podłogi, posłania, kryjówki, płotki, karmniki, dywany, rośliny, lampki, obrazy. Generator: tools/art/world/decor_a.py (lint klatek 0, R5 jako `prop`, bo dekoracje nie leżą na siatce 16). Przegląd: docs/album/przebudowa/b9_dekoracje_sklepu.png.

## B10 ikony (przebudowa)
- Raport: 161 z 161 ikon miało piksele poza paletą (13301 px). Wszystkie 0-160 sprowadzone do palety legendy (najbliższy kolor, ciemne -> kontur #3a1d17), indeksy bez zmian. Nowe 161-173: candle, bedroom, run, gate, tray, shop, house_plan, storage, swatch, wander, bond, rename, color_lock (wpisy w icons.json). Poza paletą: 0. Generator: tools/art/world/icons_a.py. Przegląd: docs/album/przebudowa/b10_ikony.png.
- Uwaga: przemalowanie 0-160 jest automatyczne (kwantyzacja), nie ręczne; ręczne dopracowanie pojedynczych ikon w B13 jeśli trzeba.
- Hand-off B13-5: nowe ikony 161-173 (nazwy wyżej).

## Poprawki układu scen (po przeglądzie użytkownika)
- Park: `bridge_wood` przerysowany jako most poprzeczny przez strumień (rozmiar 32x32, było 64x32 - hand-off B13-5: zmiana rozmiaru). Altana i drzewa stoją na dalekim brzegu, nie w wodzie; sciezka prowadzi od mostu; kosz z żarem odsunięty od fontanny i posągu; przegląd parku bez nakładania.
- Farma: sad (drzewka owocowe) po lewej na trawie, pole z rzędami grządek po prawej (zamiast jednego bloku ziemi).
- Ogród: drzewa za płotem, nie w płocie. Targ: plakaty i tabliczki bez nakładania na stragany.
- Nowe narzędzie: tools/art/world/layout_check.py (wykrywa nakładanie nieprzezroczystych pikseli przedmiotów). Stosować przy każdym tle/scenie w B11-B13.

## B14 - sad i układ scen (3.11.2026)
- `docs/UKLAD_SCEN.md`: kolejność warstw, strefy, dozwolone nakładanie; `layout_check.py` kontroluje nakładanie, kolejność i kotwice w wodzie; raporty w `park_bg`, `garden_bg`, `market_bg`, `farm_bg`.
- Poprawki: drzewa parku wyżej nad wodą; pokoje Neda i Glena bez nachodzenia mebli.
- Farma: tło `bg/farm.png` to pusty trawnik; działki to małe pola 16x16 tworzone osobno (`plot_lawn`, `plot_orchard`; grządki `bed_empty`, mokra `bed_wet` tylko po podlaniu). `bg:orchard` jako podgląd sadu. Albumy `b14-4_farma_etapy.png`, `b14-4_sad.png`.
- B9: `fence_wire_black/white` rzadsze, `picture_pig_family` czytelny.
- Hand-off dla kodu: sekcja "Pole i sad zależne od gracza" w `docs/PLAN.md`.
