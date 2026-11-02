# W14-01: bond_gain and minigame_score multipliers
Zmieniaj: src/Cuy.Core/Pet.cs, src/Cuy.Core/Pet.Bond.cs, tests/Cuy.Core.Tests/PigModifiersEconomyTests.cs
Wymagane: tests/Cuy.Core.Tests/PigModifiersEconomyTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: Petting/care bond points and minigame scores are scaled by the active pigs' multipliers; the limits stay.
Depends on: W13 merged.
Facts: Bond points are added in `Pet.Bond.cs` (daily limit `BondDailyLimit` 30 stays); the minigame reward conversion is in `Pet.cs` (~line 409, `points_per_clover`, `max_per_game`, daily cap 150 from `economy.json`). Multiply the bond points before the daily limit; multiply the raw score before the conversion. Modifiers are neutral when `PigModifiersActive` is off. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Apply `ActiveModifiers.BondGain` and `ActiveModifiers.MinigameScore` as described, rounding the multiplied value to the nearest integer where the old code used integers.
2. Tests (`PigModifiersEconomyTests.cs`): flag off, same numbers as before; Glen (1.25) gains more bond per pet than James (0.7); the daily bond limit 30 is never exceeded; a score of 100 with James (1.2) pays the same as 120 with neutral; the per-game cap 40 and daily cap 150 still hold with the multiplier at 1.5 (feed many results).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
