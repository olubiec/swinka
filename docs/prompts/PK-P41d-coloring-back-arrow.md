# PK-P41d: Coloring: one working Back arrow
Zmieniaj: web/home/features/coloring/feature.js, web/home/features/coloring/feature.css, tools/qa/ux-p41-coloring.js, docs/opt/log/PK-P41d.md
Wymagane: tools/qa/ux-p41-coloring.js
Weryfikacja: node --check web/home/features/coloring/feature.js && node --check tools/qa/ux-p41-coloring.js && node tools/qa/ux-p41-coloring.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Going back from a pixel-art coloring picture shows TWO back arrows and one does nothing. Exactly one, from the library, working, one level per click.
Depends on: PK-P37a merged.


## Steps
1. grep in `coloring/feature.js` for `back`, `modal-back`, `ui-back`, `btnBack`, `<button`. Also look at what the global modal header adds (`app.js` `modal-back`). Identify the duplicate: one from the global modal header, one drawn by the feature.
2. Keep the global `.modal-back` (library `back_btn.png`, from P37). Remove the feature's own back button; route its logic through the global one: if the feature needs to intercept Back (picture -> list), register it through the existing per-window back hook (grep `onBack`, `backHandler` in `app.js`; if none exists add the smallest hook).
3. Tests FIRST, `tools/qa/ux-p41-coloring.js` (Playwright): C1 `list-one-back` (coloring list: exactly 1 visible back element), C2 `picture-one-back` (inside a picture: exactly 1), C3 `back-chain` (picture -> Back -> list -> Back -> More grid, one level each), C4 `x-closes-all` (X closes the whole window from the picture), C5 `same-asset` (back element uses `back_btn.png`).
4. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41d.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
