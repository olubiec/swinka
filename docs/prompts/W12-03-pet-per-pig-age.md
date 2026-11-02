# W12-03: Per-pig age and life stage in Pet (flag PerPigAgeActive)
Zmieniaj: src/Cuy.Core/Pet.cs, src/Cuy.Core/Pet.PigAge.cs, tests/Cuy.Core.Tests/PetPerPigAgeTests.cs
Wymagane: src/Cuy.Core/Pet.PigAge.cs, tests/Cuy.Core.Tests/PetPerPigAgeTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: With the flag on, `Pet.Age` and `Pet.Stage` follow the first active pig's own birth moment and legend threshold.
Depends on: W11 merged (PigLife, PigProfile.BornAtUtc/LegendAtYears/Memorial, Balance.PerPigAgeActive).
Facts: Today the whole game shares `GameState.BirthDateUtc`; `Pet.Age` and `Pet.Stage` derive from it, and a stage change raises `StageChanged`. Find them with grep and change as little of `Pet.cs` as possible (route through one new private method in `Pet.PigAge.cs`). `PigLife.AgeOf/StageOf(pig, now, pigDaysPerRealDay, fallbackBirthUtc)` already exist. With the flag off every existing test must keep its numbers. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. In `Pet.PigAge.cs` add `private PigProfile LeadPig()` (first id of `State.ActivePigIds` found in the roster, or null) and `private DateTime? LeadBirthUtc()`.
2. In `Pet.cs` make the age/stage computation use `PigLife` when `Balance.PerPigAgeActive` is true and a lead pig exists; otherwise the old path. Make sure `StageChanged` fires exactly once when switching the active pig changes the stage, and not at all when the stage is the same.
3. Tests (`PetPerPigAgeTests.cs`): flag off behaves as before (a pet born 3 real days ago is Junior); flag on with two roster pigs, one born a week ago (Junior) and one born 30 real days ago (Adult), shows the stage of the active one; switching `ActivePigIds` changes `Stage` and raises `StageChanged` once; a memorial lead pig is `Legend`; a pig with `LegendAtYears = 6.0` born 6 years ago in pig time is `Legend` and one with 9.5 at the same age is `Senior`; a pig without `BornAtUtc` falls back to the game's birth date.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
