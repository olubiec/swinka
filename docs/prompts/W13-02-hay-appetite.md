# W13-02: Appetite multiplier in hay consumption
Zmieniaj: src/Cuy.Core/Pet.Hay.cs, tests/Cuy.Core.Tests/HayAppetiteTests.cs
Wymagane: tests/Cuy.Core.Tests/HayAppetiteTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/hay.json
Goal: The hay rack empties and fullness changes faster or slower according to the active pigs' appetite.
Depends on: W12 merged (Pet.ActiveModifiers).
Facts: `Pet.ConsumeHay(gameHours, offline)` uses `rate = offline ? OfflineEatPerHour : EatPerGameHour`. Appetite multiplies that rate (not the fullness per hay unit). `ActiveModifiers` is neutral unless `PigModifiersActive` is on, so existing tests keep their numbers. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Multiply `rate` by `ActiveModifiers.Appetite`. Nothing else changes.
2. Tests (`HayAppetiteTests.cs`): flag off gives the old result; flag on with Ned (appetite 1.3) active eats 30 percent more hay in one game hour than with Glen (0.7) active in proportion 1.3 / 0.7; offline consumption is scaled the same way; the rack never goes below 0 and fullness never above 95.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
