# W16-07: Balance flags for the world (all off)
Zmieniaj: src/Cuy.Core/Balance.cs, tests/Cuy.Core.Tests/WorldFlagsTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldFlagsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/GameSession.cs
Goal: Four new flags exist and are off by default, so existing tests keep their numbers.
Depends on: W15 merged.
Facts: Same pattern as W11-04. Do not switch the flags on in `GameSession.Open` (that is W22-01). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add `PlacesActive`, `FarmActive`, `MarketActive`, `WorldDecorActive` (bool, default false) with XML doc lines.
2. Tests: a new `Balance` has all four false; the earlier flags (`PerPigAgeActive`, `PigModifiersActive`, `ArrivalsActive`) are untouched; the four can be set independently.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
