# W29-06: Contracts and validation for props
Zmieniaj: docs/contracts.md, src/Cuy.Core/Input/MessageValidator.cs, tests/Cuy.Core.Tests/PropsMessageTests.cs
Wymagane: tests/Cuy.Core.Tests/PropsMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, web/*, AGENTS.md, tasks/*
Goal: The `props` state and messages are documented and validated.
Depends on: W29-05 merged (read it).
Facts: Add a `props` section to `docs/contracts.md`; validator entries for the four messages (ids <= 64, `x`/`y` numbers: fractions 0..1 for desktop messages, -1..200 for room messages). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write the doc and entries.
2. Tests: good payloads, out-of-range numbers, missing fields.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
