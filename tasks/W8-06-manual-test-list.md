# W8-06: Final manual test list (40 steps) for the Windows tester
Zmieniaj: TESTING.md
Wymagane: TESTING.md
Weryfikacja: git diff shows only the files listed in "Zmieniaj"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, TESTY_RECZNE.md, AGENTS.md, docs/PLAN.md, tasks/*
Goal: One numbered checklist covers the whole game on a clean Windows account.
Depends on: all earlier waves merged.
Steps:
1. Rewrite `TESTING.md` as one table `| # | Step | Expected |` with exactly 40 numbered steps, keeping every check of the current 15 rows (merge duplicates). Group in this order: first run (corner peek, naming, intro), walking and surfaces, food and poops, Home basics, care calendar, vet, colouring, shop and decor, minigames (all three), tricks and bond, birthday, achievements, reactions (music, mouse shake, fullscreen), settings (sound, size, monitor, new pig), diary and album, package on a clean account (`Cuy.exe --selftest`, size, no developer items).
2. Each Expected cell is observable (what the tester sees). Use only features that exist in the code; do not list weather, companion or dancing.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
