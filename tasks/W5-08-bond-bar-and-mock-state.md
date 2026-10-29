# W5-08: Bond bar under the name, and mock state for the new Home screens
Zmieniaj: web/home/app.js, web/home/style.css, web/home/bridge.js
Wymagane: web/home/app.js, web/home/bridge.js
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/app.js web/home/bridge.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/index.html, web/home/features/*, web/home/minigames/*, tools/qa/*, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The player sees bond progress to the next unlock under the pig's name, and the browser mock knows every state key later screens need, so W6/W7 screens never touch `bridge.js`.
Depends on: W2-10 (state keys `bondNext`, `hayRack`, `diary`, `albumDates`) and W3-04 (mock keys for diary and album) merged.
Facts: Today `app.js` writes `❤️ Bond: Lv. N` into `#bondIndicator` (`elements.bondIndicator`). Real state: `bond: { level, points, pointsToday, maxPointsToday }` and `bondNext: { level, id, title, pointsToNext } | null` (null = nothing left to unlock). The window is 420x640 and the smoke test checks the layout.
Steps:
1. Bond bar: keep `#bondIndicator` and its place; render the level and a thin pixel-style progress bar (fill = `points / (points + pointsToNext)`), with a short line "next: <title>" and the points still missing. When `bondNext` is null show a full bar and "all unlocked". No new element ids in `index.html` (build the bar from JS inside `#bondIndicator`). Style with CSS variables from `style.css`; the layout must still fit 420x640 without overflow.
2. Mock state in `bridge.js`: add only the keys that are still missing: `bond`, `bondNext`, `hayRack: { value, max }`, `tricks: [ { id, title, unlocked, unlockLevel, readyIn } ]` (4 tricks: spin lvl 5, stand_up 9, popcorn 12, hurdle 15; two unlocked), `achievements: [ { id, title, text, category, reward, earned, date, hidden } ]` (8 entries: 3 earned, 1 hidden, categories care/play/growth/social), `minigames: { records, dailyRewardedCount, dailyMax: 10, plays, lastResult: null }`, `settings.monitors: [ { index, name, width, height, primary } ]` and `settings.monitor`. Mock handlers: `trick { id }` sets `readyIn` and pushes a toast; `settings_monitor { index }` updates `settings.monitor`; everything else may be ignored.
3. These shapes are the contract for later waves (C# halves in W6/W7 produce exactly these): write them as comments next to the mock data.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
