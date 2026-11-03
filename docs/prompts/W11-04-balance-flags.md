# W11-04: Balance flags for the named-pig features (all off)
Zmieniaj: src/Cuy.Core/Balance.cs, tests/Cuy.Core.Tests/BalanceFlagsTests.cs
Wymagane: tests/Cuy.Core.Tests/BalanceFlagsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/pigs_named.json, src/Cuy.Core/GameSession.cs
Goal: Three new `Balance` flags exist and are off by default, so every existing test keeps its numbers until the final wave switches them on.
Depends on: nothing (wave start).
Facts: AGENTS.md: new Core behavior that changes numbers is behind a `Balance` flag (default off, switched on in `GameSession.Open`). Existing examples in `Balance.cs`: `HayRackActive`, `DiaryActive`, `BirthdayRewardsActive`. Do not switch the new flags on in `GameSession.Open`: that is W15-01.
Steps:
1. `Balance.cs`: add `public bool PerPigAgeActive { get; set; } = false;` (the active pig's own age and stage drive the game), `public bool PigModifiersActive { get; set; } = false;` (named-pig multipliers apply), `public bool ArrivalsActive { get; set; } = false;` (the arrival schedule runs). Each with an XML doc line in the style of the neighbors. Nothing else changes.
2. Tests (`BalanceFlagsTests.cs`): `new Balance()` has the three flags false; `GrowthActive` is still true and `PigDaysPerRealDay` still 21 (guards against accidental edits); the three flags can be set independently.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
