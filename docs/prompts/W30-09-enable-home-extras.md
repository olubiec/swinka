# W30-09: GameSession.Open switches roaming, run and props on
Zmieniaj: src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionHomeExtrasTests.cs
Wymagane: tests/Cuy.Core.Tests/GameSessionHomeExtrasTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: Roaming, the run and desktop props become active in the real game.
Depends on: W29 merged.
Facts: Add `HomesActive`, `RunActive`, `PropsActive` to the flags set in `GameSession.Open` (both branches) and call the migration of W29-04. Existing tests must keep passing; record any that break only because of the flags. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement.
2. Tests: a new session has the three flags true; an old save with toys in the inventory puts them on the desktop once; the run is unavailable until the garden and a fence exist; every pig has a location.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
