# W26-05: Contracts and validation for the shared bedroom
Zmieniaj: docs/contracts.md, src/Cuy.Core/Input/MessageValidator.cs, tests/Cuy.Core.Tests/DormMessageTests.cs
Wymagane: tests/Cuy.Core.Tests/DormMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, web/*, AGENTS.md, tasks/*
Goal: The `dorm` state and messages are documented and validated.
Depends on: W26-04 merged (read it).
Facts: Add a `dorm` section to `docs/contracts.md` in the existing format. Validator entries as W19-06: `dorm_unlock {}`, `dorm_upgrade {}`, `dorm_move_in { pigIds: string[] }` (1-6 ids, each <= 64 chars, no duplicates), `dorm_move_out { pigId }`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write the doc section and the validator entries.
2. Tests: good payloads pass; missing field, wrong type, 0 or 7 ids, duplicates and over-long ids fail.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
