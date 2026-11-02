# W18-03: Pet.Farm: plant, water, harvest into the inventory
Zmieniaj: src/Cuy.Core/Pet.Farm.cs, tests/Cuy.Core.Tests/PetFarmTests.cs
Wymagane: src/Cuy.Core/Pet.Farm.cs, tests/Cuy.Core.Tests/PetFarmTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Pet.cs
Goal: A pet can plant crops, water them and harvest into the inventory with counters and achievements.
Depends on: W17 merged.
Facts: Behind `Balance.FarmActive`. Seeds are items (`seed_<crop>`, `sapling_<crop>`) in `Inventory` bought at the market (W18-04) or granted by W18-01; planting consumes one. Harvest adds the crop's `Item` to `Inventory` and counts `harvests`. `FarmEngine` needs the clock: use the pet's clock (`IClock`). Diary: one line on the first harvest per day (use the existing diary entry points; templates come in W18-06). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `FarmResult Plant(int plot, string cropId)`, `bool Water(int plot)` (uses cans: `PlotsPerWaterUse`; the sprinkler waters once a day on `FarmTick`), `HarvestSummary Harvest(int plot)`, `HarvestSummary HarvestAll()`, `bool PlantOrchard(int slot, string cropId)`, `HarvestSummary HarvestOrchard(int slot)`, `int BuyPlotPack()`/`BuyOrchardSlot()`/`BuyCan(string id)`/`BuySprinkler()` (spend through `TrySpendClovers`), `void FarmTick()`.
2. Tests: planting without the seed is refused and with it consumes one; harvest after the time gives items and counts `harvests`; the achievement `first_harvest` pays 25 once; a plot pack costs 200 and adds 4 plots; watering with `can_2` waters 4 plots; sprinkler waters all plots once per day; flag off disables everything.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
