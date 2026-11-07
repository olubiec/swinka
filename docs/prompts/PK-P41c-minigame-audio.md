# PK-P41c: Music state around minigames
Zmieniaj: web/home/minigames/minigames-api.js, web/home/minigames/nyan-audio.js, web/home/minigames/veggie-memory.js, web/home/minigames/veggie-rain.js, web/home/minigames/nyan-cuy.js, tools/qa/ux-p41-audio.js, docs/opt/log/PK-P41c.md
Wymagane: tools/qa/ux-p41-audio.js
Weryfikacja: node --check web/home/minigames/minigames-api.js && node --check web/home/minigames/nyan-audio.js && node --check tools/qa/ux-p41-audio.js && node tools/qa/ux-p41-audio.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Music keeps playing after leaving a minigame. A minigame must stop all its own audio when it ends or the player leaves it (Back, X, Esc, window close), and the home music must be exactly as before entering.
Depends on: PK-P37a merged.


## Steps
1. grep `Audio(`, `AudioContext`, `.play(`, `.pause(`, `start(`, `stop(`, `suspend`, `destroy`, `shutdown`, `unload` in `web/home/minigames/*.js` (not `lib/`). List every place audio starts and every place a game is torn down (read only those ranges). Check how home music is controlled (grep `music` in `minigames-api.js` and `bridge.js`).
2. Add ONE teardown path in `minigames-api.js`: `MiniGames.leave()` (or the existing exit function) that (a) stops and disconnects every audio source the game created (keep a registry: each game registers its Audio objects/nodes through a helper `MiniGames.track(audio)`), (b) closes AudioContexts, (c) restores the home music volume/play state that was saved on entry. It must run on Back, X, Esc, `visibilitychange` to hidden and `pagehide`.
3. Make `nyan-audio.js` and the other games register their audio through the helper (smallest edits).
4. Tests FIRST, `tools/qa/ux-p41-audio.js` (Playwright or Node with a fake `Audio`/`AudioContext` that counts live instances):
   - A1 `start-registers`: entering each of the games creates >= 0 tracked sources and records the home music state.
   - A2 `leave-silences`: after leave, live (playing) tracked sources == 0 for every game.
   - A3 `home-music-restored`: playing/volume/position state of the home music equals the state before entering (if home music was off, it stays off).
   - A4 `leave-paths`: Back, X, Esc and `pagehide` each trigger the teardown exactly once (spy).
   - A5 `reenter`: entering again after leaving works and does not double-play.
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41c.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
