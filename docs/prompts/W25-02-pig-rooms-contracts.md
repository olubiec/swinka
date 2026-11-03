# W25-02: docs/contracts.md: pig rooms
Zmieniaj: docs/contracts.md
Wymagane: docs/contracts.md
Weryfikacja: git diff --stat
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, tasks/*
Goal: The contract describes the new state and messages exactly as published.
Depends on: W25-01 merged (read it).
Facts: Extend the `rooms` section written in W19-05 (field table, messages, toasts) with everything W25-01 added; read `RoomsFeature.cs` for the real names. Add a short subsection 'Pig rooms' that states the room id format `pig:<id>`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Edit only the `rooms` section and add the subsection.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
