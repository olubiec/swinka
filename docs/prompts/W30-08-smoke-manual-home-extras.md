# W30-08: Smoke test and manual steps for roaming, run, props and the store
Zmieniaj: tools/qa/web-smoke.js, TESTY_RECZNE.md
Wymagane: tools/qa/web-smoke.js, TESTY_RECZNE.md
Weryfikacja: node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The smoke test covers the new screens and the human has a checklist.
Depends on: W29 merged. Sub-wave W30c: start only after W30-05, W30-03 are merged (this task uses their code).
Facts: Smoke (mock, `?world=1`): the house plan opens, shows one window per room, selecting a window switches the tab; pigs are drawn in the room (canvas not empty); the home switch changes the mock mode; the garden run panel shows 'Close a fence line with a gate' when empty and capacity after the mock fence exists, `?weather=rain` shows the gentle message; the tray shows the desktop props, dragging a chip into the canvas moves it to the room (count changes); the store lists categories, the search box filters, buying an item lowers the clovers; no console errors; `layoutProblems` empty. `TESTY_RECZNE.md` (Polish): section 'Dom: wędrowanie, wybieg, rzeczy z pulpitu, sklep' with numbered steps: tie a pig to a room and see it stay; roam and check the schedule (night in own room); build a fence with a gate, let two pigs out, rain rule, auto return in the evening; move the ball from the desktop to a room and back, restart, check it persisted; open Home with a prop on the desktop and see the chip; buy things in the store and see clovers; no way to sell. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add scenarios and the manual section; edit nothing else.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
