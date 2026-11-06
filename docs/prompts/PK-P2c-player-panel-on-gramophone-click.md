# PK-P2c: Player controls only after clicking the gramophone (package, wave P2)
Zmieniaj: web/home/features/music/player.js, web/home/features/music/player.css, web/home/app.js, web/home/index.html, web/home/features/rooms/feature.js, tools/qa/ux-p2-player.js, docs/opt/log/PK-P2c.md
Wymagane: tools/qa/ux-p2-player.js
Weryfikacja: node --check web/home/features/music/player.js && node --check web/home/app.js && node --check web/home/features/rooms/feature.js && node --check tools/qa/ux-p2-player.js && node tools/qa/ux-p2-player.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report: "Player controls should appear only after clicking the gramophone/player, not permanently." Today `web/home/features/music/player.js` mounts a panel that is always visible. Hide it by default; show it when the player/gramophone object in the room is clicked; hide it again on a second click, on Escape, or on a click outside.
Depends on: P1 merged. The music engine and audio keep running while the panel is hidden (do not stop playback).

## Steps
1. Find where the panel is mounted (grep `CuyMusicPlayer`, `player.js` usage in `app.js`/`index.html`) and where the gramophone item is drawn in the room (grep `gramophone` in `rooms/feature.js`; the item id is in `assets/data/world_items.json`). If the room view has no hit-testing for placed items, add the smallest hit test for the gramophone only.
2. Test first: `tools/qa/ux-p2-player.js` with `tools/qa/lib/ux.js` (PASS/FAIL, exit 1 on FAIL or page error). Run before the fix, note failures in the log.
   - M1 `hidden-by-default`: fresh page: the player panel is not visible (`display:none` or not in the DOM; `getBoundingClientRect` width 0), and main-screen layout has no gap where it was.
   - M2 `click-gramophone-shows`: open the room that contains the gramophone (mock state with the gramophone placed; use `?world=1` as `web-smoke.js` does), click the gramophone: the panel is visible within 500 ms and its Play/Pause button works (state toggles in the mock engine).
   - M3 `hide-paths`: second click on the gramophone, Escape, and click outside each hide the panel; playback state is unchanged by hiding.
   - M4 `no-gramophone-no-panel`: with no gramophone owned/placed the panel cannot be opened, and a hint is shown where the item is sold ("Buy a gramophone in the shop") only if such a message already exists in the codebase; otherwise show nothing.
   - M5 `keyboard`: the gramophone hit area is focusable; Enter/Space toggles the panel.
3. Implement in `player.js`/`player.css` (`hidden` class, ARIA: `aria-expanded` on the trigger, panel `role="region"` with `aria-label="Music player"`), the trigger in `rooms/feature.js`, and the wiring in `app.js` if the panel is created there. Remember the last state only for the session (no save change).
4. Verification line; fix until green. Log (max 10 lines).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", changing the music engine behaviour.
Log: write `docs/opt/log/PK-P2c.md` (max 10 lines). Do not run git.
