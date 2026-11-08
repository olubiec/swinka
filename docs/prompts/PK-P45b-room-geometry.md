# PK-P45b: Room geometry from the layout grid (wave P45a)
Zmieniaj: web/home/features/places/room-geometry.js, web/home/index.html, tools/qa/ux-p45-room-geometry.js, docs/opt/log/PK-P45b.md
Wymagane: tools/qa/ux-p45-room-geometry.js
Weryfikacja: node --check web/home/features/places/room-geometry.js && node --check tools/qa/ux-p45-room-geometry.js && node tools/qa/ux-p45-room-geometry.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: One pure module that turns a room layout (`cols`, `rows`, `wallRows`) into pixel geometry, used by the canvas, the item list and the editor so all three agree.
Depends on: PK-P39q merged.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich.

## Steps
1. Create `web/home/features/places/room-geometry.js` (IIFE + `module.exports` like `scenes.js`; `window.CuyRoomGeometry`). No DOM, no state. Constant `CELL = 16`.
2. API: `geometry(layout)` -> `{size:[w,h], wallH, floor:[0,wallH,w,h], walk:[x0,y0,x1,y1], cell:16}` with `w=cols*16`, `h=rows*16`, `wallH=wallRows*16`, `walk=[8, wallH+8, w-8, h-2]`. Missing or invalid fields fall back to `cols 12, rows 7, wallRows 2` (the salon default, so the result is 192x112, wall 32, floor 80). `cellToPx(layout, cx, cy, cw, ch)` -> `{x, y}` = bottom centre `{x:(cx+cw/2)*16, y:(cy+ch)*16}` (exactly the formula now in `CuyScenes.placedThings`). `pxToCell(layout, x, y)` is the inverse, clamped to the grid.
3. Add `<script src="features/places/room-geometry.js">` to `web/home/index.html` next to `scenes.js` (grep `scenes.js`; keep the order: geometry BEFORE scenes.js).
4. Test `tools/qa/ux-p45-room-geometry.js` (Node): G1 default layout -> size [192,112], wallH 32; G2 12x8 wallRows 3 -> [192,128], wallH 48; G3 `cellToPx` of a 3x2 sofa at cell (1,3) equals the old formula; G4 `pxToCell(cellToPx(c))` round-trips for 20 random cells; G5 garbage input (null, strings, 0, negative) returns the default geometry; G6 `walk` is inside `size` with width >= 60 and height >= 12 for 12x7 and 10x6.
5. Run Weryfikacja; fix until green. Log the exact function names.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P45b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
