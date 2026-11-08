# PK-P45a2: Overlay tool: window crop and pig silhouette (wave P45b)
Zmieniaj: tools/qa/scene-overlay.js, tools/qa/ux-p45-overlay-pig.js, docs/opt/log/PK-P45a2.md
Wymagane: tools/qa/ux-p45-overlay-pig.js
Weryfikacja: node --check tools/qa/scene-overlay.js && node --check tools/qa/ux-p45-overlay-pig.js && node tools/qa/ux-p45-overlay-pig.js && node tools/qa/ux-p45-overlay.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Add the two layers that answer the owner's questions: what part of the scene the 370 px Home window really shows, and how big the pig is at the top and bottom of the walk band.
Depends on: PK-P45a1 merged (`renderOverlay`, `LAYERS`). Overlap: P39b (whole scene at integer `--scene-k`) and P47 (window 640x400, `contain`) decide the visible area; this layer only measures it.
Produces (names other packages rely on): Layers `crop` and `pig` in `renderOverlay` and in the CLI default layer list.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`). Po P45 fala P47 zmienia okno na 640x400 i dopasowanie `contain` w `canvas-pig.js` (mapowanie wskaźnika `toScene`): tu go nie ruszaj i nie zakładaj szerokości okna 370 px.
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. Read `tools/qa/scene-overlay.js` (your own earlier work, whole file) and grep `--scene-k` in `web/home/style.css` and `web/home/*.js`. Never hard-code a window width: after `openHome` + `CanvasPig.setScene(def)` measure the stage/canvas box (`getBoundingClientRect` of the canvas wrapper) and `--scene-k` (P39b), and compute the visible scene rectangle from them. If the page does not expose `--scene-k`, use `k = max(1, floor(boxWidth / sceneWidth))` and say so in the log. Support `opts.window = [w, h]` (CSS px) that overrides the measured box, so the test is deterministic.
2. `crop` layer: compute the scene rectangle that the window shows; outside it draw a 2-colour dither (palette `plum[0]` and `plum[1]`, 4 px cells on the 4x canvas) over the bg; outline the visible rectangle in `flame[1]`. If the whole scene is visible (the normal case after P39b) draw only the outline.
3. `pig` layer: a rectangle 46x29 scene px (the body) scaled by `depth_scale[0]` at the TOP edge of the walk band and by `depth_scale[1]` at the BOTTOM edge (both from the JSON; if the scene has `pigWidthFrac` from P39e, the bottom scale is `round(pigWidthFrac*sceneWidth/46*16)/16` and the top scale is bottom x `depth_scale[0]/depth_scale[1]`: check `docs/opt/log/PK-P39e.md` for the real formula and use it), feet on the band edge (feet y = band edge), centre x = band centre, outline in `rose[1]`, with the text-free label made of two 4 px ticks. Scale is rounded to 1/16 (`Math.round(s*16)/16`), drawn size is integer.
4. Add `crop,pig` to the default layers. Do not change the other layers' output (the O3 test of PK-P45a1 must stay green).
5. Test `tools/qa/ux-p45-overlay-pig.js` (tmpdir only): OP1 `crop` with `opts.window=[200,300]` differs from the no-crop run for the park and is identical to it for a scene that fits whole (`opts.window` larger than the scene); OP2 the pig rectangle height in the PNG equals `round(29*s)` x 4 at both band edges (count rows of the outline colour in the column through the centre); OP3 byte-identical on re-run.
6. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45a2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
