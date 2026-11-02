# W12-04: LegendRoll: random legend threshold per pig
Zmieniaj: src/Cuy.Core/Pigs/LegendRoll.cs, tests/Cuy.Core.Tests/LegendRollTests.cs
Wymagane: src/Cuy.Core/Pigs/LegendRoll.cs, tests/Cuy.Core.Tests/LegendRollTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/pigs_named.json
Goal: A pure helper draws each pig's own legend threshold from its range, once, deterministically for a given Random.
Depends on: W11 merged (NamedPigCatalog with legend ranges, PigProfile.LegendAtYears).
Facts: Design: docs/NAMED_PIGS.md section 2.2. Ranges: kuki 6.0-7.5, ned 7.0-9.5, default 6.5-9.5 years. The result is stored in `PigProfile.LegendAtYears` and never rolled again. Pigs that are not named keep `null` (the game default of 8 years). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `public static class LegendRoll`: `static double Roll(double minYears, double maxYears, Random rng)` uniform, rounded to 2 decimals, min > max is swapped, equal bounds return the bound; `static double? RollFor(NamedPigDefinition def, Random rng)` uses the definition's own range or the catalog default; `static bool Assign(PigProfile pig, NamedPigDefinition def, Random rng)` sets `LegendAtYears` only when it is null and returns whether it did.
2. Tests (`LegendRollTests.cs`): 1000 seeds keep every kuki value in 6.0-7.5 and every ned value in 7.0-9.5; for 1000 seeded pairs kuki is below ned in at least 95 percent; james/glen/racuch values are in 6.5-9.5; same seed gives the same value; `Assign` does not overwrite an existing value; a non-named pig (null definition) is left null; swapped or equal bounds behave as described.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
