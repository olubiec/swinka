# PK-P39e: Pig scale and passing behind objects
Zmieniaj: web/home/canvas-pig.js, web/home/features/places/scenes.js, tools/qa/ux-p39-depth.js, docs/opt/log/PK-P39e.md
Wymagane: tools/qa/ux-p39-depth.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p39-depth.js && node tools/qa/ux-p39-depth.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The pig is proportional to each scene, smaller higher up, and objects whose base is above its feet cover it (it walks behind them).
Depends on: PK-P39c merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. grep the depth scale code in `canvas-pig.js` (`depthScale`, `scaleAt`, `renderOrder`, `renderList`; log `docs/opt/log/PK-P34a.md`). `scenes.js` `def()` returns `depthScale`.
2. Scale: add per scene optional `pigWidthFrac` (default 0.17): the pig's drawn body width at the bottom edge of the walk band equals `pigWidthFrac * sceneWidth` px rounded to a whole number of source pixels multiples (1/8 steps as now); at the top edge it is `depthScale[0]/depthScale[1]` of that. Document chosen defaults per scene in the log (room larger than outdoors). Add `pigWidthFrac` values to `place_scenes.json` ONLY if needed: that file is not in this package's list, so instead read optional `def.pigWidthFrac` and default.
3. Behind objects: background blockers with `behindLine` or a rect whose base y1 < pig feet y are drawn AFTER the pig only for their upper part: implement by drawing the background in two layers - the full background first, and for each blocker with an associated sprite region (`rect` extended upward by its `height` field if present, else by 40 px) redraw that background slice over the pig when pig feet y < blocker y1. Keep y-sort of placed items unchanged.
4. Tests FIRST, `tools/qa/ux-p39-depth.js` (Playwright, mock `seven`):
   - D1 `scale-monotonic`: scale at top < at bottom, both within `depthScale`, in every scene.
   - D2 `proportion`: pig drawn width at the bottom is 14-20% of the scene width outdoors and 16-24% in rooms.
   - D3 `behind-covers`: put the pig directly above the garden fountain's base (feet y < base y1): sampled pixels where the fountain top overlaps the pig equal the background pixels (the pig is hidden there); put it below: pig pixels visible.
   - D4 `whole-pixels`: pig x/y and drawn size are integers, no blur (alpha edge test).
   - D5 `no-regression-room`: salon still passes `ux-p34-walk` expectations (depth scale within [0.88,1.0]).
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P39e.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
