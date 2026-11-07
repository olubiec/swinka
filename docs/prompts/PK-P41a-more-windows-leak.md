# PK-P41a: More windows: stray Bond window
Zmieniaj: web/home/app.js, web/home/features/tricks/feature.js, tools/qa/ux-p41-more-windows.js, docs/opt/log/PK-P41a.md
Wymagane: tools/qa/ux-p41-more-windows.js
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p41-more-windows.js && node tools/qa/ux-p41-more-windows.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Entering Bond (More) shows a stray window (the same kind that earlier appeared after Weight) that then opens on top of every other More window. Find the leak (a modal/overlay that is not removed or not hidden on navigation) and fix it at the root, for ALL More windows.
Depends on: PK-P37a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. Tests FIRST, `tools/qa/ux-p41-more-windows.js` (Playwright, helpers in `tools/qa/lib/ux.js`, browser mock): for EVERY tile of the More grid (read the list from the page, not hardcoded): open it, count visible `.modal`/overlay elements, press Back, count again.
   - M1 `one-window`: after opening a tile exactly one modal is visible.
   - M2 `back-clean`: after Back only the More grid is visible, no extra overlay.
   - M3 `bond-then-others`: open Bond, Back, then open 5 other tiles: none shows a Bond (or any foreign) window.
   - M4 `esc-and-x`: Esc and the X close the tile and leave no overlay.
2. Run it, see which tile fails (Bond first). grep for how Bond (pigs/tricks feature) opens its window (`openModal`, `showModal`, `classList.add('open'`). Fix: close/remove the stray element in the navigation/close path in `app.js`, and make Bond open through the same function as the other tiles.
3. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
