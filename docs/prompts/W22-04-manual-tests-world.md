# W22-04: Manual test steps for the world (TESTY_RECZNE.md)
Zmieniaj: TESTY_RECZNE.md
Wymagane: TESTY_RECZNE.md
Weryfikacja: git diff --stat
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The human has a numbered Windows checklist for the world.
Depends on: W21 merged.
Facts: The file is Polish; add the section 'Świat: dom, ogród, park, farma, targ' with numbered steps and expected results: arrange the living room and see mood decay slower after reaching high comfort; buy a bedroom; unlock the garden and send the pig for a walk (three times, then the refusal); unlock the farm, plant, water, wait (describe how to set the clock back in the save to skip waiting), harvest, feed the pig with the harvest; sell at the market until the cap message; deliver an order; see the daily specials; restart the app and check everything persisted; memory corner appears with a memorial pig; notification 'Something is ready on the farm!'. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write the section; do not edit others.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
