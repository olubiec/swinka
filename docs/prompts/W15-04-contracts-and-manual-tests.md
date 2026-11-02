# W15-04: Contracts and manual test steps for the collection
Zmieniaj: docs/contracts.md, TESTY_RECZNE.md
Wymagane: docs/contracts.md
Weryfikacja: git diff --stat
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, tasks/*
Goal: Docs describe the new state and messages and the steps the human tests on Windows.
Depends on: W14 merged.
Facts: Contracts format: see the existing sections (`## pigs`). Document the new `pigs` state fields (`namedId`, `ageYears`, `stage`, `memorial`, `blurb`, `modifiers`, `offers[]`) and messages (`adopt_named`, `adopt_group`, `set_memorial`) exactly as PigsFeature publishes them (read `PigsFeature.cs`). `TESTY_RECZNE.md` is Polish; add a section 'Kolekcja świnek' with numbered steps: start a new game (Kuki and Ned present), two pigs of different ages, offer toast after the clock is advanced (describe how to set the date back in the save), adopt James and see the welcome pack, switch to memorial mode and back, Ned poops more often, James startles earlier, Racuch popcorns more. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write both documents; do not touch other sections.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
