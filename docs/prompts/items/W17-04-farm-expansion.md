# W17-04: FarmExpansion: plot packs, orchard slots, cans, sprinkler
Zmieniaj: src/Cuy.Core/World/FarmExpansion.cs, tests/Cuy.Core.Tests/FarmExpansionTests.cs
Wymagane: src/Cuy.Core/World/FarmExpansion.cs, tests/Cuy.Core.Tests/FarmExpansionTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: A pure helper prices and applies farm upgrades.
Depends on: W16 merged.
Facts: Data: `farm.json` `plot_packs` (4 plots each: 200/400/660/1060/1600), `orchard_slots` (130/200/270/400), `water.cans` (`can_1` free, `can_2` 150 waters 4 plots per use, `sprinkler` 650 waters everything once a day). The farm starts with `start_plots` (4) when the farm place is unlocked. The helper only validates and mutates farm state and returns the cost; the caller spends clovers. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `static class FarmExpansion`: `int NextPackCost(FarmConfig, FarmState)` (-1 when none left), `bool ApplyPack(FarmConfig, FarmState)`, `int NextOrchardCost(...)`, `bool ApplyOrchardSlot(...)`, `bool CanBuyCan(...)`/`ApplyCan(string canId)`, `ApplySprinkler`, and `int PlotsPerWaterUse(FarmState, FarmConfig)`.
2. Tests: costs follow the file in order; after five packs `NextPackCost` is -1 and plots total 24; four orchard slots then -1; `can_2` is not available before `can_1`... (can_1 is the default); sprinkler needs nothing but is applied once; `PlotsPerWaterUse` is 1, 4 after `can_2`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
