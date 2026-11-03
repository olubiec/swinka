# W30-06: Economy simulator: every home sink, with checks
Zmieniaj: tools/qa/economy-sim.js
Wymagane: tools/qa/economy-sim.js
Weryfikacja: node tools/qa/economy-sim.js --runs 12 --variant baseline --check && node tools/qa/economy-sim.js --runs 12 --variant pigrooms --check && node tools/qa/economy-sim.js --runs 12 --variant full --check
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The simulator includes the pig rooms, shared bedroom, item colours and run items and enforces the global invariants.
Depends on: W29 merged.
Facts: Build on the `pigrooms` variant of W23-08. Add variant `full`: item colours (only items with `recolor: true`; a player unlocks variants for about 25 percent of those it owns, at `unlock_percent` of price), the run (gate + fence pieces from `world_items.json` cost about 400 clovers once the garden exists), the dorm for profiles with 3 or more pigs, and the farm/market/world sinks. No resale. Print per profile: day of 25/50/75 percent of all purchasable content (compute the total from the data files), the final share of income per sink group, and the clover balance curve summary. Checks (`--check`): nobody owns all content within 365 days; heavy needs at least 150 days for half of all content; regular needs at least 220 days for half; casual at least 300 days for half; the farm benefit shares from the world sim stay within their old limits; total purchasable content is above 40000 clovers. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement and report; on a failing check print numbers and the data values that would fix it, never edit data in this task.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
