# W28-06: Contracts and validation for the run
Zmieniaj: docs/contracts.md, src/Cuy.Core/Input/MessageValidator.cs, tests/Cuy.Core.Tests/RunMessageTests.cs
Wymagane: tests/Cuy.Core.Tests/RunMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, web/*, AGENTS.md, tasks/*
Goal: The `run` state and messages are documented and validated.
Depends on: W28-05 merged (read it).
Facts: Add a `run` section to `docs/contracts.md`; validator entries `run_out { pigId <= 64 }`, `run_in { pigId <= 64 }`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write the doc and the entries.
2. Tests: good, missing, wrong type, over-long.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
