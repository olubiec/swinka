# PK-P45c1: Art: baseboard strip (wave P45a)
Zmieniaj: tools/art/room_trim_baseboard.py, assets/world/house/trim_baseboard.png, tools/qa/ux-p45-trim-baseboard.js, docs/opt/log/PK-P45c1.md
Wymagane: tools/art/room_trim_baseboard.py, tools/qa/ux-p45-trim-baseboard.js
Weryfikacja: python3 tools/art/room_trim_baseboard.py assets && node --check tools/qa/ux-p45-trim-baseboard.js && node tools/qa/ux-p45-trim-baseboard.js && python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Replace the hard-coded off-palette wall trim (`#c98d50`, `#6e4424`) in `drawHabitat` with a 16x8 palette sprite that tiles along the wall/floor line.
Depends on: Nothing (art only; wired in by PK-P45e2).
Produces (names other packages rely on): `assets/world/house/trim_baseboard.png` 16x8, tile repeats on x. Tile id `trim_baseboard` (group `tiles`) is added to `tiles.json` by PK-P45c3, not here.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`). Po P45 fala P47 zmienia okno na 640x400 i dopasowanie `contain` w `canvas-pig.js` (mapowanie wskaźnika `toScene`): tu go nie ruszaj i nie zakładaj szerokości okna 370 px.
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. Look at `assets/world/house/house_frame.png`, one wallpaper and one floor tile in `assets/world/tiles/` (view them) and `drawHabitat` in `web/home/canvas-pig.js` (grep `Horizontal wall trim`) so the strip matches the neighbours. Do not edit canvas-pig.js.
2. `tools/art/room_trim_baseboard.py <assets dir>` (Python 3 + Pillow). Use the palette-checked helper `tools/art/handart.py` (`from handart import put, rect, hline, save_png`; colour specs like `'wood.2'`, an off-palette colour raises); write with `save_png(im, Path(assets)/'world/house/trim_baseboard.png')`. Do NOT use `tiles_art.py` (it has its own colours) and do NOT call `register_tile` (PK-P45c3 registers). Draw EXACTLY this 16x8 tile (wood ramp = `wood.0`..`wood.4`: w0 `#47281c`, w1 `#6f4328`, w2 `#9b6238`, w3 `#c58a52`, w4 `#e3b27a`):
   - row 0: all w4 (light top edge); row 1: all w3.
   - rows 2-5: base w2; row 6: all w1 (underside of the board); row 7: all w0 (dark contact line with the floor).
   - nail: pixel (4,4) w0, pixel (3,4) w3 (tiny highlight), pixel (4,3) w3.
   - knot (slightly crooked, hand-made): (11,3) w1, (11,4) w1, (12,4) w1, (12,5) w1.
   - grain: (1,3) w1, (7,5) w1, (8,5) w1, (14,2) w1, (6,2) w3.
   - columns 0 and 15 get NO feature pixels (only the row colours above), so neighbouring tiles join without a seam. Fully opaque, no alpha.
   Output `assets/world/house/trim_baseboard.png`. The script is idempotent (running twice gives identical bytes) and prints the path.
3. Test `tools/qa/ux-p45-trim-baseboard.js`: B1 the file exists and is 16x8; B2 every pixel colour is in the palette (flatten `ramps` + outline `fg`/`deep`); B3 every pixel has alpha 255; B4 columns 0 and 15 are identical; B5 no `#ffffff`/`#000000`; B6 the python script run twice leaves the file byte-identical (run it with a temp assets dir). Pixels in the test: `save_png` writes an indexed PNG (bit depth < 8), so do NOT hand-roll a zlib reader; decode with `child_process.execFileSync('python3', ['-c', ...])` using Pillow (`Image.open(p).convert('RGBA')`) and print the pixels as JSON.
4. Run Weryfikacja; fix until green. View the 8x enlargement and write one sentence in the log about how it looks.

## Zasady grafiki (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów, rozmycia i półprzezroczystych cieni (cień = dither 2 kolorów palety). Skala tylko całkowita, pozycje w pełnych pikselach.
- Nowy sprite tylko skryptem w `tools/art/`, rysującym wyłącznie kolorami palety. Po narysowaniu OBEJRZYJ PNG powiększony 8x (zapisz kopię w scratchpadzie, nie w repo) i potwierdź w logu jednym zdaniem, że wygląda jak listwa/cień, a nie jak szum.
- Kontrola: `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45c1.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
