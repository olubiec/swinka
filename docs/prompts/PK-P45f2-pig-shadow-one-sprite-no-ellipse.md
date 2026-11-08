# PK-P45f2: Pig shadow: one sprite, no ellipse (wave P45e)
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p45-pig-shadow.js, docs/opt/log/PK-P45f2.md
Wymagane: tools/qa/ux-p45-pig-shadow.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p45-pig-shadow.js && node tools/qa/ux-p45-pig-shadow.js && node tools/qa/ux-p45-pig-depth.js && node tools/qa/ux-p34-pig-walk.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: One contact shadow for the pig: the existing `fx/shadow_pig_*.png` sprite at the same 1/16 step, no alpha ellipse and no hard-coded `119 - pigY`.
Depends on: PK-P45e2 and PK-P45f1 merged.
Produces (names other packages rely on): Shadow draw = sprite only; `debug().shadowDraws` counter (1 per frame).

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. grep `canvas-pig.js` for `ellipse`, `PIG_SHADOW_WIDTH`, `shadow_pig_`, `119`, `rgba(70` and read only those ranges.
2. Today there are TWO shadows: an alpha `ctx.ellipse` with `rgba(70, 45, 30, a)` and a hard-coded `119 - this.pigY` (wrong in every scene except the old room), and a sprite shadow (`PIG_SHADOW_WIDTH[key] * scale`, `world/fx/shadow_pig_<stage>.png`) used in the lit branch. Remove the ellipse branch entirely.
3. Always draw the sprite shadow: centred on the feet x, at feet y, scale from the same 1/16-quantised pig scale, whole pixels, BEFORE the pig and after the floor/flat things. If the image is not loaded yet draw nothing. Count draws in `debug().shadowDraws`. No new art.
4. Tests FIRST, `tools/qa/ux-p45-pig-shadow.js` (Playwright via `ux.js`, mock `seven`, every scene; wrap `ctx.ellipse` to count calls): PS1 no `ellipse` call is made with a pig present in 10 s; PS2 exactly 1 shadow draw per frame; PS3 the shadow centre is within 1 px of the feet x; PS4 shadow width is an integer; PS5 baby, junior and adult stage pigs each draw their own `shadow_pig_<stage>.png` (check the loaded image URL list in `debug()`).
5. Run Weryfikacja; fix until green. If `style_check.py` flags a `shadow_pig_*` file, only note it in the log (a later art package fixes it).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45f2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
