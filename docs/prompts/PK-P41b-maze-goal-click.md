# PK-P41b: Hay maze must not solve itself
Zmieniaj: web/home/minigames/hay-maze.js, web/home/minigames/hay-maze-logic.js, tools/qa/ux-p41-maze.js, docs/opt/log/PK-P41b.md
Wymagane: tools/qa/ux-p41-maze.js
Weryfikacja: node --check web/home/minigames/hay-maze.js && node --check web/home/minigames/hay-maze-logic.js && node --check tools/qa/ux-p41-maze.js && node tools/qa/ux-p41-maze.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: In the hay maze, clicking the goal solves the maze at once. Clicks may only steer the player one valid step at a time (or be ignored) - the maze must be played, never auto-completed.
Depends on: PK-P37a merged.


## Steps
1. grep in `hay-maze.js` for the click/pointer handler (`click`, `pointerdown`, `findPath`, `bfs`, `solve`, `autoMove`, `goal`). Read only that handler and its helper in `hay-maze-logic.js`.
2. Decide the intended control: keyboard/swipe/arrow moves one cell per input. A click/tap may move the player ONE step toward the clicked cell if that step is open; it must never start a multi-step path walk and never teleport.
3. Tests FIRST, `tools/qa/ux-p41-maze.js` (Node, require `hay-maze-logic.js`; if the click handler is only in the DOM file, test through a tiny exported pure function you add to the logic file, e.g. `stepToward(maze, pos, target)`):
   - Z1 `click-goal-no-finish`: player at start, click on the goal cell: player position changes by at most 1 cell and `finished` is false.
   - Z2 `click-wall-ignored`: click toward a wall: position unchanged.
   - Z3 `valid-steps-finish`: a scripted sequence of valid single steps (computed by BFS inside the TEST, not the game) reaches the goal and only the last step sets `finished`.
   - Z4 `no-timer-walk`: after a click no `setInterval`/`setTimeout` chain moves the player on its own (fake timers: advance 10 s, position unchanged after the one step).
4. Fix the handler and remove the auto-walk code path if nothing else uses it. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
