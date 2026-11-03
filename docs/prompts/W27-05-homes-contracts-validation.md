# W27-05: Contracts and validation for homes
Zmieniaj: docs/contracts.md, src/Cuy.Core/Input/MessageValidator.cs, tests/Cuy.Core.Tests/HomesMessageTests.cs
Wymagane: tests/Cuy.Core.Tests/HomesMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, web/*, AGENTS.md, tasks/*
Goal: The `homes` state and `pig_home` message are documented and validated.
Depends on: W27-04 merged (read it).
Facts: Add a `homes` section to `docs/contracts.md` (format of the others). Validator entry like W19-06: `pig_home { pigId <= 64, mode in free|room, room string <= 64 required when mode is room }`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write the section and the entry.
2. Tests: good payloads; missing fields; mode `other`; room missing for `room`; over-long ids.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
