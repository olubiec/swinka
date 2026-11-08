# PK-P45f1: Pig depth scale in 1/16 steps (wave P45c)
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p45-pig-depth.js, docs/opt/log/PK-P45f1.md
Wymagane: tools/qa/ux-p45-pig-depth.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p45-pig-depth.js && node tools/qa/ux-p45-pig-depth.js && node tools/qa/ux-p34-pig-walk.js && node tools/qa/ux-p39-depth.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The pig always lands on a whole-pixel grid at every depth: the depth scale is quantised to 1/16 so `64*k/16` is an integer.
Depends on: PK-P45d1 merged (`depth_scale [0.9375,1]`) and the whole P39 wave. Overlap: P39e rewrote the scale logic in `getDrawScale` (`pigWidthFrac`, 1/8 steps) and P39c touched `canvas-pig.js` walking; both come first. P45e2 and P45f2 edit other parts of the same file after this package.
Produces (names other packages rely on): `getDrawScale()` returns a multiple of 1/16; `debug().pig.scale` keeps its name.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`). Po P45 fala P47 zmienia okno na 640x400 i dopasowanie `contain` w `canvas-pig.js` (mapowanie wskaźnika `toScene`): tu go nie ruszaj i nie zakładaj szerokości okna 370 px.
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. grep `canvas-pig.js` for `getDrawScale`, `/ 8`, `* 8`, `depthScale`, `pigWidthFrac` and read only those ranges. Do NOT touch the shadow code (PK-P45f2).
2. Tests FIRST, `tools/qa/ux-p45-pig-depth.js` (Playwright via `ux.js`, mock `seven`, every scene): PD1 at 20 sampled depths `pig.scale*16` is an integer and `64*pig.scale` is an integer; PD2 scale is monotonic non-decreasing with y; PD3 scale at the top and at the bottom of the band equals what the P39e formula gives, quantised to 1/16 (when the scene has no `pigWidthFrac`: `depthScale[0]` and `depthScale[1]` within 1/32; read the real formula in `docs/opt/log/PK-P39e.md`); PD4 `64 * debug().pig.scale` is an integer for 100 random pig positions in every scene.
3. Change the quantiser in `getDrawScale` (today `return Math.round(raw * 8) / 8;`, about line 439; P39e may have changed the lines above it) from 1/8 to 1/16 (`Math.round(raw * 16) / 16`). Keep the lerp from `depthScale` and the `pigWidthFrac` logic exactly as P39e left them. `drawPig` already rounds `FRAME_SIZE * scale` (`Math.round`); with 1/16 steps and FRAME_SIZE 64 that product is an integer by construction, so add no guard, counter or helper.
4. Run Weryfikacja. The older tests `ux-p34-pig-walk.js` W3 (tolerance 1/8) and `ux-p39-depth.js` D1-D5 must stay green without changing assertions (1/16 refines 1/8: the old values stay valid); if one conflicts, record it in the log and stop (BLOCKED), do not edit it.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45f1.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
