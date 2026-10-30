# W8-02: Final wiring and smoke test for every screen and game
Zmieniaj: tools/qa/web-smoke.js, web/home/features/index.json, web/home/app.js, web/home/style.css
Wymagane: tools/qa/web-smoke.js
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check tools/qa/web-smoke.js web/home/app.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/bridge.js, web/home/minigames/*, web/home/features/*/feature.js, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: One smoke run opens every screen and starts every game, and the More grid fits the window.
Depends on: W6-07 (achievements), W7-05 (tricks), W3-04 (diary), W5-07 (hay maze), W4-06 (veggie memory) merged. W2-02 made the smoke test strict (console errors, 404, layout, `ALLOWED_MISSING`).
Steps:
1. `features/index.json` order: daily, shop, calendar, vet, coloring, decor, tricks, diary, achievements, settings (only ids whose folder exists; the list must equal the folder names). Check that the More grid with 10 tiles fits the 420x640 window without scrolling the page; fix with the smallest CSS change.
2. Smoke additions: open diary, tricks and achievements with the mock state (bond level high enough that two tricks are unlocked, 3 diary entries, 3 earned achievements); take a screenshot of each; click an unlocked trick and assert that a message `trick` was sent.
3. Start every minigame (`veggie_rain`, `veggie_memory`, `hay_maze`) for 2 s and assert no console error and no page error.
4. First-run flow: with mock `needsNaming: true` only the welcome and naming view shows and no feature opens over it.
5. Release safety: with `window.chrome.webview` mocked as in the real app, assert `#btnDevTest` is not visible.
6. Fix every page error, overflow, cut-off text or unreachable button the checks find, only in `app.js` / `style.css` (smallest change). If the cause lies in a feature file outside "Zmieniaj", list it in the PR and add it to `ALLOWED_MISSING`-style known-issues in the test only if it is cosmetic.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
