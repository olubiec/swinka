# PK-P41e: Gramophone available from the start
Zmieniaj: web/home/features/music/player.js, web/home/features/music/prices.js, assets/data/world_items.json, tools/qa/ux-p41-gramophone.js, docs/opt/log/PK-P41e.md
Wymagane: tools/qa/ux-p41-gramophone.js
Weryfikacja: node --check web/home/features/music/player.js && node --check tools/qa/ux-p41-gramophone.js && node tools/qa/ux-p41-gramophone.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The owner could not test the player: no room has a gramophone (the player appears only when a placed gramophone is clicked). Make a gramophone easy to get and the player testable.
Depends on: PK-P37a merged.


## Steps
1. grep `gramophone` / `player_gramophone` in `world_items.json`, `music/player.js`, `music/prices.js`, `rooms/mock.js` and `src/Cuy.Core` (grep only; do not edit C#). Find: price, unlock level, how the player panel is shown (P2: hidden by default, click on the gramophone shows it, click aside or Esc hides it, music keeps playing).
2. Make it available: set the gramophone price to 0 and unlock level to 1 in `world_items.json` (data only) so it is the first free item in the shop's decor tab; if the item has a different id in the data than the one the player looks for, fix the lookup in `player.js`, not the data.
3. Test `tools/qa/ux-p41-gramophone.js` (Playwright, mock): Q1 `free-in-shop` (shop lists the gramophone at price 0 / unlocked), Q2 `placed-click-shows-player`, Q3 `click-aside-hides`, Q4 `music-continues-after-hide`, Q5 `no-gramophone-no-panel`.
4. Run Weryfikacja; fix until green. In the log say whether a starter gramophone is also needed in Core (the owner decides later).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41e.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
