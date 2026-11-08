# PK-P45q2: Owner test sheet and screenshots for wave P45 (wave P45q)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p45-shots.js, docs/qa/shots, docs/opt/log/PK-P45q2.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md, tools/qa/ux-p45-shots.js
Weryfikacja: node --check tools/qa/ux-p45-shots.js && node tools/qa/ux-p45-shots.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Give the owner a short test sheet with five screenshots, one per scene, so P45 can be judged by eye in minutes.
Depends on: All other packages of wave P45 merged. Runs BEFORE PK-P45q1 (own wave P45q; q1 is in wave P45q2). P47 (window 640x400) re-shoots later; the viewport here is only for this wave.
Produces (names other packages rely on): Section "Wave P45" in `docs/qa/UX_WAVE_CHECKS.md`; `docs/qa/shots/p45-<scene>-top.png` and `-bottom.png` (10 files).

## Steps
1. Add a section "Wave P45" to `docs/qa/UX_WAVE_CHECKS.md` in the format of the earlier sections: one row per `ux-p45-*` test file that exists in `tools/qa/` (list the names), the Weryfikacja line of PK-P45q1 (PK-P45q1 runs after you: write the command, say "result: see `docs/opt/log/PK-P45q1.md`", do not read that log), and these manual points: (a) salon in the main window: furniture stands ON the floor, not on the wall, and looks the same as in the edit drawer; (b) a 10x6 pig room fits the window whole; (c) the pig in garden, park, farm, market is neither a giant nor an ant next to a bench or a stall and has a shadow sprite; (d) the baseboard has no white or black line; (e) the pig does not shimmer (no 1-pixel size jumps) while walking top to bottom.
2. `tools/qa/ux-p45-shots.js` takes one screenshot per scene (room, garden, park, farm, market) into `docs/qa/shots/p45-<scene>.png` (Playwright via `tools/qa/lib/ux.js` `openHome`, mock `seven`, then `page.setViewportSize({width:420,height:720})`; go to each scene with `CuyHome`/places feature `applyScene` or `CanvasPig.setScene(CuyScenes.def(id))`; pig placed with `CuyPig.mainInstance.pigY = walk[1]` / `walk[3]`: two PNGs per scene named `p45-<scene>-top.png`, `p45-<scene>-bottom.png`; the file runs inside `ux-all`, so it must be deterministic and exit 0).
3. Run the Weryfikacja line (also confirm that 10 PNGs were written), then VIEW two of the screenshots and note in the log (max 10 lines) one thing that looks wrong, if any.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45q2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
