# PK-P46q2: Owner test sheet and screenshots for wave P46 (wave P46q)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p46-shots.js, docs/qa/shots, docs/opt/log/PK-P46q2.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p46-shots.js
Weryfikacja: node --check tools/qa/ux-p46-shots.js && node tools/qa/ux-p46-shots.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Give the owner a short test sheet with screenshots so wave P46 can be judged by eye in minutes.
Depends on: All other packages of wave P46 merged.
Produces (names other packages rely on): Section "Wave P46" in `docs/qa/UX_WAVE_CHECKS.md`; `docs/qa/shots/p46-<scene>-edit.png`.

## Steps
1. Add a section "Wave P46" to `docs/qa/UX_WAVE_CHECKS.md` in the format of the earlier sections: one row per `ux-p46-*` test file that exists in `tools/qa/` (list the names), the Weryfikacja line of PK-P46q1 (result in `docs/opt/log/PK-P46q1.md`), and these manual points: (a) in garden, park, farm, market press Edit: every object that is a separate instance highlights and can be dragged; (b) a decorative object (bench, fountain) can be stashed and comes back from the drawer tab Outdoor; (c) a market stall or farm plot can be moved but not stashed and the game says why; (d) after switching scenes and restarting the game the moved objects are where you left them; (e) NOTE: scenes whose background is not yet clean (`bg_clean:false`) still show the old painted objects: that is expected until wave P47.
2. `tools/qa/ux-p46-shots.js`: one screenshot per outdoor scene in Edit mode with `bg_clean:true` forced in the mock, viewport 420x720, into `docs/qa/shots/p46-<scene>-edit.png` (Playwright, mock `seven`).
3. Run the Weryfikacja line, then VIEW two of the screenshots and note in the log (max 10 lines) one thing that looks wrong, if any.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P46q2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
