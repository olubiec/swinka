# W23-08: Economy simulator: pig rooms variant and checks
Zmieniaj: tools/qa/economy-sim.js
Wymagane: tools/qa/economy-sim.js
Weryfikacja: node tools/qa/economy-sim.js --runs 12 --variant baseline --check && node tools/qa/economy-sim.js --runs 12 --variant pigrooms --check
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: `economy-sim.js` models the pig rooms and the shared bedroom and enforces the invariants.
Depends on: W22 merged.
Facts: Read the file first: it has profiles (regular, casual, heavy, perfect), a shopping model with a structural list, variants and `--check`. Data: `assets/data/pig_rooms.json` (3 levels 0/400/900 per pig room, dorm unlock 1500 and levels 1100/1800), `world_items.json` (house items and 5 free signature items), `pigs_named.json` (offers: 2 pigs at day 0, then 90/105/130). Model per pig that is adopted: its room costs the level upgrades and a furnishing budget of about 1200 clovers of house items (use the same decor wallet logic, 30 percent of income) bought in the order of comfort per clover; the dorm is bought by the 'regular' profile only after day 200 when it has 3 or more pigs. Comfort uses the weights of `PigComfort` (own 1.0, common 0.5). Mood slow-down stays capped at 15 percent, so the sim's farm-benefit invariants must not move. Document the new numbers in `docs/WORLD.md`-compatible console output only (do not edit docs here). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add variant `pigrooms` (default stays `baseline` and its numbers do not change: run `--variant baseline --check` before and after and compare).
2. Report per profile: day when the pig rooms reach level 2 and 3, day the comfort cap is reached for the first pig, total sink and the share of income spent on rooms. Add checks: nobody owns all content within 365 days; the heavy profile still takes at least 120 days to furnish three pig rooms; regular reaches the cap in the first pig room between day 60 and day 200; the new sinks (rooms, furnishing, dorm, colours) stay between 15000 and 30000 clovers in total (design estimate about 24000, docs/PIG_ROOMS.md section 10).
3. If a check fails because the data are out of range, do not change the data: print the measured numbers and fail, and describe in the PR which `pig_rooms.json` values would fix it.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
