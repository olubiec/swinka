# W3-01: Smoke test: walk through the whole Home (More menu, album, games, toast, first start)
Zmieniaj: tools/qa/web-smoke.js
Wymagane: tools/qa/web-smoke.js
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/*, tools/qa/lib/*, tools/qa/package.json, src/*
Goal: the smoke test visits every screen a player can reach and fails when one of them breaks, overflows or logs an error.
Depends on: W2-02 (strict smoke test with `assertLayout`, `ALLOWED_MISSING`) merged. Read `tools/qa/web-smoke.js`, `web/home/app.js` (`CuyHome`, `openAlbumModal`, the More menu around `data-open-feature`) and `web/home/bridge.js` (mock mode) first.
Steps:
1. More menu: open it, assert that it contains one tile per entry of `CuyHome.listFeatures()` plus the Album tile; open every tile in turn (feature screens, Album), screenshot each as `20_more_<id>.png`, close it with `#modalCloseBtn`; `assertLayout` after each.
2. Minigames hub: open it, assert `window.Minigry.list().length >= 1`; for every registered game start it (use the `Minigry` API as `minigames-api.js` defines it), wait 2 s, assert a `canvas` exists inside the game container and no console error appeared, then end/close it. If starting a game is not possible headless, skip only that game with a printed `SKIP game <id>: <reason>` line and list it in the PR.
3. Toast: trigger a page message `{ type: 'toast', text: 'Smoke toast' }` through the same path the C# side uses (read `bridge.js` to see how page messages reach `CuyHome.api.onMessage` in mock mode); assert the toast element is visible, then gone within 4 s.
4. First start: in a fresh page, before load, set the mock state with `needsNaming: true` (see how `bridge.js` stores `cuy_mock_state_v1` in localStorage; use `page.addInitScript`); assert the name dialog shows, type a name, click `#btnNameGo`, click through the intro (`#btnIntroNext`, `#btnIntroSkip`) and assert the main screen is shown with that name. Screenshots `30_firststart_*.png`.
5. Any problem found in `web/home/*` that is not fixed here: add it to the PR table (file, what, who fixes) and, if the step must keep passing, skip only that assertion with a `TODO: <problem>` comment. Do not edit `web/home/*` in this task.
Verify: `node tools/qa/web-smoke.js` exits 0 and prints `WEB SMOKE OK`; `node --check tools/qa/web-smoke.js`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; the table of every problem found with its owner; the list of screenshots; screenshot if the change is visual.
