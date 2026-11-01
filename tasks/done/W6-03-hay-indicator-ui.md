# W6-03: Hay rack meter next to the Feed button
Zmieniaj: web/home/app.js, web/home/style.css, web/home/index.html
Wymagane: web/home/app.js
Weryfikacja: node tools/qa/web-smoke.js (wynik: WEB SMOKE OK); node --check web/home/app.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/bridge.js, web/home/features/*, web/home/minigames/*, src/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The player sees how full the hay rack is without opening anything.
Depends on: W5-08 (mock `hayRack` key and the bond bar) merged; W2-10 (`state.hayRack: { value, max }` from `ProgressFeature`) merged.
Facts: `elements.btnFeed` exists in `app.js` (click handler around the feed button). The window is 420x640 and the smoke test checks layout and console errors.
Steps:
1. Add a small pixel-style meter next to or under the Feed button showing `hayRack.value / max`; below 25 % it uses the warning colour from the CSS variables and the tooltip says "Hay rack is almost empty". Hide the meter when `state.hayRack` is missing (old builds).
2. Update it on every state push. No new dependencies; no layout overflow at 420x640.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
