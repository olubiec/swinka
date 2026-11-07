# PK-P41a: Stray window after Bond in More
Zmieniaj: web/home/app.js, web/home/features/tricks/feature.js, tools/qa/ux-p41-bond.js, docs/opt/log/PK-P41a.md
Wymagane: tools/qa/ux-p41-bond.js
Weryfikacja: node --check web/home/app.js && node --check web/home/features/tricks/feature.js && node --check tools/qa/ux-p41-bond.js && node tools/qa/ux-p41-bond.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Entering Bond (More tile) leaves a stray window (the same kind that earlier appeared after Weight) which then opens on top of EVERY later More window. Fix at the root for all More tiles.
Depends on: PK-P37a merged.


## Steps
1. Read `docs/opt/log/PK-P37a.md` (one line). grep in `web/home/app.js` for the modal open/close functions (`openModal`, `closeModal`, `showModal`, `.modal`, `modal-back`, `classList.add`) and in `tricks/feature.js` for how Bond renders.
2. Tests FIRST, `tools/qa/ux-p41-bond.js` (Playwright, browser mock). Read the list of More tiles from the DOM (never hardcode):
   - B1 `bond-single-window`: open Bond: exactly 1 visible modal/overlay (count elements with `.modal`, `[role=dialog]`, overlay classes whose computed display is not none and opacity > 0).
   - B2 `bond-back`: Back from Bond: only the More grid is visible, 0 extra overlays.
   - B3 `no-carry-over`: open Bond, Back, then open 6 other tiles one after another (Back each time): each shows exactly 1 modal and no Bond content (`document.body.innerText` contains no Bond title).
   - B4 `bond-close-x-esc`: X and Esc close Bond and leave 0 overlays.
   - B5 `every-tile`: loop over ALL tiles: open, count modals == 1, Back, count == grid only.
3. Run it, note which step fails first. Find the cause (typical: an element appended to `document.body` and never removed, a `hidden` toggle forgotten in the close path, a stale reference reused by the next tile, a handler registered twice). Fix at the root in the shared close/navigation path in `app.js`; make Bond open through the same function as the other tiles. No tile-specific hacks.
4. Run Weryfikacja; fix until green. Log: the root cause in one sentence.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
