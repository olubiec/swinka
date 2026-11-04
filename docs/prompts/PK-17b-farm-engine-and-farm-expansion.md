# PK-17b: Farm engine and farm expansion
Zmieniaj: src/Cuy.Core/World/FarmEngine.cs, tests/Cuy.Core.Tests/FarmEngineTests.cs, src/Cuy.Core/World/FarmExpansion.cs, tests/Cuy.Core.Tests/FarmExpansionTests.cs
Wymagane: src/Cuy.Core/World/FarmEngine.cs, tests/Cuy.Core.Tests/FarmEngineTests.cs, src/Cuy.Core/World/FarmExpansion.cs, tests/Cuy.Core.Tests/FarmExpansionTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~FarmEngineTests|FullyQualifiedName~FarmExpansionTests"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W17-03, W17-04
Goal: Farm engine and farm expansion.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W17-03: FarmEngine: plant, water, grow, harvest (real time, offline)
Files of this item: src/Cuy.Core/World/FarmEngine.cs, tests/Cuy.Core.Tests/FarmEngineTests.cs
Goal: A pure engine runs the farm from timestamps: planting, watering, ripening, harvesting, great harvests and the orchard.
Depends on: W16 merged (FarmConfig, FarmState).
Facts: Design: docs/WORLD.md section 4. A plot is ripe when `now - PlantedUtc >= GrowMinutes * (Watered ? 1 - cut : 1)`, ripe plots wait forever (no spoiling). Harvest of an annual crop gives `Yield` (+`ExtraYield` with `GreatHarvestChancePercent` chance from a seeded `Random(plotIndex * 7919 + PlantedUtc.Ticks)` so repeating the call gives the same result), empties the plot, and counts one harvest. Perennials (orchard): `NextUtc` advances by `GrowMinutes` per ripened cycle while `Stock < MaxStock`; harvesting takes the whole stock. A crop can be planted only if its `UnlockHarvests` is <= the harvests counter passed in. No clovers here: this engine only changes the farm state and returns items.
Steps:
1. API (static class `FarmEngine`, all take `FarmConfig`, `FarmState`, `DateTime nowUtc`): `PlantResult Plant(int plot, string cropId, int harvestsDone)` (Ok, NoSuchPlot, Occupied, UnknownCrop, Locked, NotAnnual), `bool Water(int plot)` (once per cycle, only when planted and not ripe), `int WaterMany(int firstPlot, int count)`, `bool IsRipe(int plot)`, `TimeSpan? TimeLeft(int plot)`, `HarvestResult Harvest(int plot, ...)` returning item id and count (0 when not ripe), `IReadOnlyList<HarvestResult> HarvestAll(...)`, `PlantOrchard(int slot, string cropId)`, `Tick(...)` for the orchard and `HarvestOrchard(int slot)`.
2. Tests: planting unlocked/locked crops; ripe after the exact time (59 min no, 60 min yes for dandelion); watering cuts 20 percent and cannot be repeated in one cycle; harvesting a not-ripe plot gives 0; the same call twice gives the same great-harvest outcome; a 400-day jump does not give more than one harvest per annual plot and no more than `MaxStock` for an orchard; HarvestAll collects every ripe plot; planting on an occupied plot is refused; a plot index beyond `PlotsOwned` is `NoSuchPlot`.

## Item W17-04: FarmExpansion: plot packs, orchard slots, cans, sprinkler
Files of this item: src/Cuy.Core/World/FarmExpansion.cs, tests/Cuy.Core.Tests/FarmExpansionTests.cs
Goal: A pure helper prices and applies farm upgrades.
Depends on: W16 merged.
Facts: Data: `farm.json` `plot_packs` (4 plots each: 200/400/660/1060/1600), `orchard_slots` (130/200/270/400), `water.cans` (`can_1` free, `can_2` 150 waters 4 plots per use, `sprinkler` 650 waters everything once a day). The farm starts with `start_plots` (4) when the farm place is unlocked. The helper only validates and mutates farm state and returns the cost; the caller spends clovers.
Steps:
1. `static class FarmExpansion`: `int NextPackCost(FarmConfig, FarmState)` (-1 when none left), `bool ApplyPack(FarmConfig, FarmState)`, `int NextOrchardCost(...)`, `bool ApplyOrchardSlot(...)`, `bool CanBuyCan(...)`/`ApplyCan(string canId)`, `ApplySprinkler`, and `int PlotsPerWaterUse(FarmState, FarmConfig)`.
2. Tests: costs follow the file in order; after five packs `NextPackCost` is -1 and plots total 24; four orchard slots then -1; `can_2` is not available before `can_1`... (can_1 is the default); sprinkler needs nothing but is applied once; `PlotsPerWaterUse` is 1, 4 after `can_2`.
