# W22-01: GameSession.Open switches the world flags on
Zmieniaj: src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionWorldTests.cs
Wymagane: tests/Cuy.Core.Tests/GameSessionWorldTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: The world features become active in the real game.
Depends on: W21 merged.
Facts: Add `PlacesActive`, `FarmActive`, `MarketActive`, `WorldDecorActive` to the flags set in `GameSession.Open` (both branches), and call `State.EnsureWorld(...)` after loading (W18-07). Existing tests must keep passing; if one breaks only because of the flags, record it in the PR. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement; tests: a session on an empty directory has the four flags true and a salon layout; a session on an old save with decor equipped has the legacy items placed; reopening keeps them; the market is usable at once and the farm is locked.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
