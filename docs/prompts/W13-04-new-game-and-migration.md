# W13-04: New game starts with Kuki and Ned; old saves get the pair offer
Zmieniaj: src/Cuy.Core/GameState.Pigs.cs, tests/Cuy.Core.Tests/NewGameMigrationTests.cs
Wymagane: tests/Cuy.Core.Tests/NewGameMigrationTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Save/SaveSystem.cs, src/Cuy.Core/Pet.Adoption.cs
Goal: A fresh game starts with Kuki and Ned already in the family; a game with another pig keeps it and gets the pair as an offer.
Depends on: W12 merged (offer state fields); W13-03 can run in the same wave (different files).
Facts: `GameState.EnsureRosterInitialized()` today creates one pig named after `Name` (default 'Cuy', smooth/tricolor, cuddly) when the roster is empty. New rule when the roster is empty: create Kuki and Ned from `NamedPigCatalog` (profiles with `NamedId`, `BornAtUtc` from `PigLife.BornAtFor`, `LegendAtYears` from `LegendRoll` with a `Random` parameter), both active, `OffersStartUtc = now`. When the roster is not empty nothing is added (the old pig stays; the pair is an offer). The method signature must stay compatible: add an optional `NamedPigCatalog catalog = null, Random rng = null, DateTime? nowUtc = null` parameters. Old behaviour must be unchanged for callers that pass nothing and tests that assert the single default pig: keep that path when the catalog has no start offers (so existing tests keep passing). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement as described; `GameState.Name` is used only for legacy single-pig saves.
2. Tests (`NewGameMigrationTests.cs`): empty roster + real catalog gives Kuki and Ned, both active, offers clock set, legend thresholds in range; a save with one old pig keeps exactly that pig, `NamedId == null`, no Kuki/Ned in the roster, `OffersStartUtc` set; calling twice changes nothing; an empty catalog keeps the old single default pig; `ActivePigIds` has at most 2 entries.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
