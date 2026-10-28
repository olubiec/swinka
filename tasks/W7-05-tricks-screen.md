# W7-05: Tricks screen in Home
Zmieniaj: web/home/features/tricks/feature.js, web/home/features/tricks/feature.css, web/home/features/index.json
Wymagane: web/home/features/tricks/feature.js
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/features/tricks/feature.js
Nie ruszaj: web/home/app.js, web/home/bridge.js, web/home/style.css, web/home/features/achievements/*, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The player sees all four tricks, which are unlocked, and can ask the pig to perform one.
Depends on: W5-08 (mock key `tricks`), W6-04 (real state and message), W6-07 (`index.json` already lists `achievements`) merged. Module pattern: see `web/home/features/diary/feature.js` and `features/README.md`.
Facts: Contract: `state.tricks: [ { id, title, unlocked, unlockLevel, readyIn } ]` (`readyIn` in seconds), `state.bond.level`; message `window.bridge.send({ type: 'trick', id })`. The app answers with a toast ("Too tired for tricks", ...) and plays the animation; the page does not decide results.
Steps:
1. `feature.js`: id `tricks`, title "Tricks". Cards for spin, stand up, popcorn jump and hurdle jump. Unlocked: a Perform button that sends the message; while `readyIn > 0` the button is disabled and shows a countdown that ticks locally and resyncs on every state. Locked: greyed with "Unlocks at bond level N" and the current level.
2. `feature.css`: pixel style from the CSS variables of `style.css`, readable at 420 px, no horizontal scroll.
3. `features/index.json`: add `tricks` keeping the existing entries and order.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
