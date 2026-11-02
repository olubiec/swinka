# W15-01: GameSession.Open switches the named-pig flags on
Zmieniaj: src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionFlagsTests.cs
Wymagane: tests/Cuy.Core.Tests/GameSessionFlagsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: The collection features become active in the real game.
Depends on: W14 merged.
Facts: `GameSession.Open` (line ~45) builds a `Balance` with `HayRackActive`, `DiaryActive`, `BirthdayRewardsActive` set to true. Add `PerPigAgeActive`, `PigModifiersActive`, `ArrivalsActive` the same way (also when a Balance is passed in). Then call `CheckOffers` once after loading so offers announced while the app was closed appear. Existing tests that open sessions must keep passing; if one breaks only because of the new flags, record it in the PR rather than editing assertions. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Switch the three flags on in both branches (null balance and passed balance).
2. Tests (`GameSessionFlagsTests.cs`): a session opened on an empty temp directory has the three flags true and Kuki and Ned in the roster; a session opened on a save with an old single pig keeps it and shows the pair as unlocked offers; reopening does not announce the same offer twice.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
