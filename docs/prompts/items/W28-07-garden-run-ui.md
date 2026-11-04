# W28-07: Garden: show the run, let pigs out and bring them in
Zmieniaj: web/home/features/garden/run.js, web/home/features/garden/feature.js
Wymagane: web/home/features/garden/run.js, web/home/features/garden/feature.js
Weryfikacja: node --check web/home/features/garden/run.js && node --check web/home/features/garden/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js, web/home/features/rooms/*
Goal: The garden page highlights the fenced run, shows the pigs in it and has the out/in buttons.
Depends on: W27 merged; messages from W28-05. Sub-wave W28a: no dependency on other tasks of the wave.
Facts: `run.js` exports `window.GardenRun = { mount(container, ctx), draw(ctx2d, cell, state, t) }` (`state` = the `run` object). `draw` paints a soft translucent overlay on `run.cells` (palette colours) and the pigs that are out, walking inside the cells (reuse the module `RoomResidents` from `rooms/residents.js` if loaded, otherwise draw standing portraits 16x16). `mount` builds a panel: capacity 'Run: 14 cells, room for 2 pigs', chips of `candidates` with 'Let out' / 'Bring in' (`run_out`/`run_in`), the verdict message in a calm tone when not ok ('It is a bit wet outside today') and, when the run is invalid, the plain hint 'Close a fence line with a gate to make a run' with the reason. `feature.js` (garden): call `GardenRun.mount` and `draw`; the existing walk button and layout editing stay. Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement both files; keyboard accessible; no console errors in the mock.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
