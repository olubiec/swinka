# W30-04: Contracts and validation for the store
Zmieniaj: docs/contracts.md, src/Cuy.Core/Input/MessageValidator.cs, tests/Cuy.Core.Tests/StoreMessageTests.cs
Wymagane: tests/Cuy.Core.Tests/StoreMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, web/*, AGENTS.md, tasks/*
Goal: The `store` state and messages are documented and validated.
Depends on: W30-03 merged (read it). Sub-wave W30c: start only after W30-03 is merged (this task uses their code).
Facts: Document `store` in `docs/contracts.md`; validator: `store_open {}`, `store_buy { kind (one of room|place|item|variant|decor|farm|stall|dorm), id <= 64, count 1-99 }`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write doc and entries.
2. Tests: good and bad payloads, unknown kind, count 0 and 100.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
