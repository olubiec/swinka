# PK-P45f: Pig depth in 1/16 steps and a contact shadow from the sprite (wave P45d)
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p45-pig-depth.js, docs/opt/log/PK-P45f.md
Wymagane: tools/qa/ux-p45-pig-depth.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p45-pig-depth.js && node tools/qa/ux-p45-pig-depth.js && node tools/qa/ux-p34-pig-walk.js && node tools/qa/ux-p39-depth.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The pig always lands on a whole-pixel grid at every depth, and its shadow is the existing `fx/shadow_pig_*.png` sprite (no ellipse, no alpha), scaled with the same step.
Depends on: PK-P45e merged.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich.

## Steps
1. grep `canvas-pig.js` for `getDrawScale`, `/ 8`, `ellipse`, `PIG_SHADOW_WIDTH`, `shadow_pig_`, `119` and read only those ranges.
2. Scale quantiser: round the depth scale to steps of 1/16 (was 1/8). Drawn size `64*k/16` is always an integer; assert it. Keep the lerp from `depthScale` unchanged.
3. Shadow: today there are TWO shadows: an alpha `ctx.ellipse` with `rgba(70, 45, 30, a)` and a hard-coded `119 - this.pigY` (wrong in every scene except the old room), and a sprite shadow (`PIG_SHADOW_WIDTH[key] * scale`, `world/fx/shadow_pig_<stage>.png`, near `shadow_pig_`) used in the lit branch. Remove the ellipse branch; always draw the sprite shadow, centred on the feet, at the same 1/16 step scale, whole pixels, BEFORE the pig and after the floor/flat things. If the image is not loaded yet draw nothing. No new art.
4. Tests FIRST, `tools/qa/ux-p45-pig-depth.js` (Playwright, mock `seven`, every scene): PD1 at 20 sampled depths the debug `pig.scale*16` is an integer and `64*scale` is an integer; PD2 the shadow draw call count is 1 per frame and no `ellipse` call is made (wrap `ctx.ellipse` in the test); PD3 scale is monotonic with y; PD4 the shadow sprite's centre is within 1 px of the feet x; PD5 toys/drag still pass `ux-p34-pig-walk.js`.
5. Run Weryfikacja; fix until green. If `ux-p39-depth.js` D1/D4 conflicts with 1/16 steps, record it and keep their assertions (1/16 is a refinement of 1/8: the old values stay valid).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P45f.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
