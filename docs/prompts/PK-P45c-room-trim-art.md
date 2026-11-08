# PK-P45c: Room trim and floor-edge shadow art (wave P45a)
Zmieniaj: tools/art/room_trim_art.py, assets/world/house/trim_baseboard.png, assets/world/house/trim_floor_shadow.png, assets/world/tiles.json, tools/qa/ux-p45-trim-art.js, docs/opt/log/PK-P45c.md
Wymagane: tools/art/room_trim_art.py, tools/qa/ux-p45-trim-art.js
Weryfikacja: python3 tools/art/room_trim_art.py assets && node --check tools/qa/ux-p45-trim-art.js && node tools/qa/ux-p45-trim-art.js && python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Replace the hard-coded off-palette trim in `drawHabitat` (`#c98d50`, `#6e4424`, `rgba(0,0,0,0.15)`) with two palette sprites: a baseboard strip along the wall/floor line and a dithered floor-edge shadow.
Depends on: nothing (art only; wired in by PK-P45e).

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich.

## Steps
1. Look at `assets/world/house/` (view `house_frame.png` and one wallpaper and one floor tile from `assets/world/tiles/`) and `drawHabitat` in `web/home/canvas-pig.js` (grep `Horizontal wall trim`) to see what is replaced. Read `docs/STYL_SWIATA.md` points 0-2 and 5 only.
2. `tools/art/room_trim_art.py <assets dir>` (Python 3 + Pillow, same style as `tiles_art.py`/`worldart`; use only palette colors from `style_palette.json`, outline `#3a1d17`):
   - `world/house/trim_baseboard.png`: 16x8 tile that repeats horizontally. Top 2 px light wood edge (wood ramp), 5 px skirting board with one slightly crooked nail and one knot (hand-made look, no perfect symmetry across the 16 px, but the left and right edges must tile seamlessly), bottom 1 px dark wood line (`wood` darkest) as the contact line with the floor.
   - `world/house/trim_floor_shadow.png`: 16x4 tile, repeats horizontally, a 2-colour checker dither (plum/wood shades, fully opaque or fully transparent pixels only, NO partial alpha), densest at the top row, fading to transparent by row 4. It sits right under the baseboard.
   - Add `"trim": {"baseboard": {"file":"house/trim_baseboard.png","size":[16,8]}, "floor_shadow": {"file":"house/trim_floor_shadow.png","size":[16,4]}}` to `assets/world/tiles.json` (keep every existing key).
3. Test `tools/qa/ux-p45-trim-art.js` (Node, read PNG with the same helper `place-scenes-check.js` uses for headers, or parse via `zlib` if pixels are needed): T1 both files exist with the stated size; T2 every opaque pixel colour is in the palette (+ the two outline colours); T3 no pixel has alpha strictly between 0 and 255; T4 the left and right edge columns of the baseboard differ by at most 1 pixel (tileable); T5 `tiles.json` still has all old keys.
4. Run Weryfikacja; fix until green. Log the drawing choices and the two tile keys.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów, rozmycia i półprzezroczystych cieni (cień = dither 2 kolorów palety). `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko skryptem w `tools/art/` rysującym wyłącznie kolorami palety, plus kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Reguła zamykania: jeśli nie wiesz, jak coś ma wyglądać, otwórz najbliższy istniejący element gry i skopiuj jego klasy i zasoby.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P45c.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
