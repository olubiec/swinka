# W6-07: Achievements screen in Home
Zmieniaj: web/home/features/achievements/feature.js, web/home/features/achievements/feature.css, web/home/features/index.json
Wymagane: web/home/features/achievements/feature.js
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/features/achievements/feature.js
Nie ruszaj: web/home/app.js, web/home/bridge.js, web/home/style.css, web/home/features/diary/*, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: A grid of achievement cards: earned ones coloured with their date, locked ones greyed, hidden ones as "???".
Depends on: W5-08 (mock key `achievements`) merged; the real state comes from W6-05 in the same wave (same contract). Look at `web/home/features/diary/feature.js` (W3-04) and `features/README.md` for the module pattern.
Facts: Contract: `state.achievements: [ { id, title, text, category: "care|play|growth|social", reward, earned, date, hidden } ]`. Module pattern: `CuyHome.registerFeature({ id, title, icon, order, open(container, api), onState(state) })`. Icons: `trophy` (CSS `.icon-trophy`), optional per-category `badge_care`, `badge_play`, `badge_growth`, `badge_social`, all in `assets/icons` (fall back to `trophy` if a class is missing).
Steps:
1. `feature.js`: id `achievements`, title "Achievements", icon `trophy`. A header with "N / M earned" and the clovers earned from them; a card grid. Earned card: coloured, shows title, text, reward and date. Not earned: greyed, shows title and text. `hidden` and not earned: title "???" and no text. Re-render on every `onState`.
2. `feature.css`: pixel style from the CSS variables of `style.css`, cards readable at 420 px width, no horizontal scroll.
3. `features/index.json`: add `achievements` (the smoke test requires the list to equal the folder names); keep the existing order and entries.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
