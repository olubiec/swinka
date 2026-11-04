# PK-18b: Pet.Farm, Pet.Walk and world save migration
Zmieniaj: src/Cuy.Core/Pet.Farm.cs, tests/Cuy.Core.Tests/PetFarmTests.cs, src/Cuy.Core/Pet.Walk.cs, tests/Cuy.Core.Tests/PetWalkTests.cs, src/Cuy.Core/GameState.World.cs, tests/Cuy.Core.Tests/WorldMigrationTests.cs
Wymagane: src/Cuy.Core/Pet.Farm.cs, tests/Cuy.Core.Tests/PetFarmTests.cs, src/Cuy.Core/Pet.Walk.cs, tests/Cuy.Core.Tests/PetWalkTests.cs, tests/Cuy.Core.Tests/WorldMigrationTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PetFarmTests|FullyQualifiedName~PetWalkTests|FullyQualifiedName~WorldMigrationTests"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W18-03, W18-05, W18-07
Goal: Pet.Farm, Pet.Walk and world save migration.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W18-03: Pet.Farm: plant, water, harvest into the inventory
Files of this item: src/Cuy.Core/Pet.Farm.cs, tests/Cuy.Core.Tests/PetFarmTests.cs
Goal: A pet can plant crops, water them and harvest into the inventory with counters and achievements.
Depends on: W17 merged, W18-01 merged.
Facts: Behind `Balance.FarmActive`. Seeds are items (`seed_<crop>`, `sapling_<crop>`) in `Inventory` bought at the market (W18-04) or granted by W18-01; planting consumes one. Harvest adds the crop's `Item` to `Inventory` and counts `harvests`. `FarmEngine` needs the clock: use the pet's clock (`IClock`). Diary: one line on the first harvest per day (use the existing diary entry points; templates come in W18-06).
Steps:
1. `FarmResult Plant(int plot, string cropId)`, `bool Water(int plot)` (uses cans: `PlotsPerWaterUse`; the sprinkler waters once a day on `FarmTick`), `HarvestSummary Harvest(int plot)`, `HarvestSummary HarvestAll()`, `bool PlantOrchard(int slot, string cropId)`, `HarvestSummary HarvestOrchard(int slot)`, `int BuyPlotPack()`/`BuyOrchardSlot()`/`BuyCan(string id)`/`BuySprinkler()` (spend through `TrySpendClovers`), `void FarmTick()`. Note: W18-01 (`Pet.World.cs`) is already merged before this task runs, so `FarmConfig`, `MarketConfig`, `PlaceCatalog`, `WorldItemCatalog` properties on `Pet` and `EnsureWorld()` already exist on `Pet` — use them directly and do NOT redeclare duplicate properties on `partial class Pet`.
2. Tests: planting without the seed is refused and with it consumes one; harvest after the time gives items and counts `harvests`; the achievement `first_harvest` pays 25 once; a plot pack costs 200 and adds 4 plots; watering with `can_2` waters 4 plots; sprinkler waters all plots once per day; flag off disables everything.

## Item W18-05: Pet.Walk: garden/park walk and the varied-diet bonus
Files of this item: src/Cuy.Core/Pet.Walk.cs, tests/Cuy.Core.Tests/PetWalkTests.cs
Goal: A pig can go for a walk (humor bonus, limited per day) and a varied diet gives a small one-time mood bonus.
Depends on: W17 merged, W18-01 merged.
Facts: Design: docs/WORLD.md sections 3 and 4.1. Walk: up to `walk.per_day` (3) per local day, +`walk.mood` (6) mood, needs the garden or park unlocked and garden comfort >= `min_comfort_garden` (10); no clovers. Varied diet: when the third different vegetable (category `vegetable`) is fed in one local day, +5 mood once per day; hook into feeding by subscribing to the existing feed event, or add a public `OnFed(string itemId)` that the feeding code can call later (check how `Pet.Feed` raises events; do not edit `Pet.cs`: if no event exists, expose `OnFed` and list the missing call in the PR). Day tracking uses small in-memory plus `WorldState` fields: add `WalksToday` (int) and `WalkDate` (string) to `MarketState`? No - to `WorldState` as `WalksToday`/`WalkDate` and `FedVegToday` (HashSet) with the same pattern as `EconomyState.DayLocalDate`; since `WorldState.cs` is not in this task's files, keep the counters in a private nested `Dictionary` in this class and persist through `State.Stats.Counters` keys (`walks_today`, `walk_date_ordinal`) instead. Behind `PlacesActive`.
Steps:
1. `WalkResult Walk(string placeId)` (Ok, TooManyToday, PlaceLocked, NeedsComfort, Disabled), `void OnFed(string itemId)`, `int WalksLeftToday()`. Note: W18-01 (`Pet.World.cs`) is already merged before this task runs, so `FarmConfig`, `MarketConfig`, `PlaceCatalog`, `WorldItemCatalog` properties on `Pet` and `EnsureWorld()` already exist on `Pet` — use them directly and do NOT redeclare duplicate properties on `partial class Pet`.
2. Tests: three walks then `TooManyToday`; a new local day resets; a locked garden refuses; comfort 9 refuses and 10 allows; mood rises by 6 capped at 100; three different vegetables in a day give +5 once, the fourth does nothing; a treat does not count.

## Item W18-07: Save: world state version, memory corner unlock, migration on open
Files of this item: src/Cuy.Core/GameState.World.cs, tests/Cuy.Core.Tests/WorldMigrationTests.cs
Goal: Opening any older save yields a valid world state; the memory corner unlocks with the first memorial pig.
Depends on: W17 merged.
Facts: Add to `GameState.World.cs` (it holds the lazy property from W16-06): `public void EnsureWorld(WorldItemCatalog items, ItemCatalog catalog)` that runs `LegacyDecorMigration.Migrate` once, makes sure the salon layout exists, and (when any roster pig has `Memorial`) grants one `memory_corner` into `OwnedItems`. Do not bump `GameState.CurrentVersion`. Call sites come later (W22-01); tests call it directly.
Steps:
1. Implement `EnsureWorld` idempotently.
2. Tests: an old save JSON (from `tests/Cuy.Core.Tests` fixtures, e.g. a save with decor equipped) loads, `EnsureWorld` produces the salon with the placed legacy items; running it twice changes nothing; a roster with a memorial pig grants exactly one memory corner and a non-memorial roster none; a very old save without any new fields loads and round-trips.
