# PK-P45c2: Art: floor-edge dither shadow (wave P45a)
Zmieniaj: tools/art/room_trim_shadow.py, assets/world/house/trim_floor_shadow.png, tools/qa/ux-p45-trim-shadow.js, docs/opt/log/PK-P45c2.md
Wymagane: tools/art/room_trim_shadow.py, tools/qa/ux-p45-trim-shadow.js
Weryfikacja: python3 tools/art/room_trim_shadow.py assets && node --check tools/qa/ux-p45-trim-shadow.js && node tools/qa/ux-p45-trim-shadow.js && python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Replace the alpha shadow under the wall trim (`rgba(0,0,0,0.15)`) with a 16x4 dithered palette sprite that sits right under the baseboard.
Depends on: Nothing (art only; wired in by PK-P45e2).
Produces (names other packages rely on): `assets/world/house/trim_floor_shadow.png` 16x4, tile repeats on x. Tile id `trim_floor_shadow` (group `tiles`) is added to `tiles.json` by PK-P45c3.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`). Po P45 fala P47 zmienia okno na 640x400 i dopasowanie `contain` w `canvas-pig.js` (mapowanie wskaźnika `toScene`): tu go nie ruszaj i nie zakładaj szerokości okna 370 px.
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. View `assets/world/house/house_frame.png` and one floor tile in `assets/world/tiles/`, and grep `Shadow under wall trim` in `web/home/canvas-pig.js` to see what is replaced. Do not edit canvas-pig.js.
2. `tools/art/room_trim_shadow.py <assets dir>` (Python 3 + Pillow). Use `tools/art/handart.py` (`from handart import put, save_png`; `put(im,x,y,'plum.1')`; `save_png(im, Path(assets)/'world/house/trim_floor_shadow.png')`; do NOT call `register_tile`). Draw EXACTLY this 16x4 tile on an `Image.new('RGBA',(16,4),(0,0,0,0))` with plum A = `plum.1` `#382538` and plum B = `plum.2` `#54394f`; everything else is fully transparent (alpha 0), painted pixels alpha 255, NO partial alpha:
   - row 0: all 16 pixels opaque, x even = A, x odd = B.
   - row 1: x odd = A, x even transparent.
   - row 2: only x in {2,6,10,14} = A, rest transparent.
   - row 3: fully transparent.
   (All patterns have a period dividing 16, so the tile repeats on x without a seam.) Output `assets/world/house/trim_floor_shadow.png`. Idempotent.
3. Test `tools/qa/ux-p45-trim-shadow.js`: S1 file exists and is 16x4; S2 every non-transparent pixel colour is A or B; S3 no pixel has alpha strictly between 0 and 255; S4 row 3 is fully transparent and opaque-pixel count per row is 16, 8, 4, 0; S5 script twice = identical bytes. Pixels in the test: `save_png` writes an indexed PNG with transparency (bit depth < 8), so do NOT hand-roll a zlib reader; decode with `child_process.execFileSync('python3', ['-c', ...])` using Pillow (`convert('RGBA')`) and print the pixels as JSON.
4. Run Weryfikacja; fix until green. View the 8x enlargement over a floor tile colour (scratchpad copy) and write one sentence in the log.

## Zasady grafiki (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów, rozmycia i półprzezroczystych cieni (cień = dither 2 kolorów palety). Skala tylko całkowita, pozycje w pełnych pikselach.
- Nowy sprite tylko skryptem w `tools/art/`, rysującym wyłącznie kolorami palety. Po narysowaniu OBEJRZYJ PNG powiększony 8x (zapisz kopię w scratchpadzie, nie w repo) i potwierdź w logu jednym zdaniem, że wygląda jak listwa/cień, a nie jak szum.
- Kontrola: `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45c2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
