# PK-18a: Pet.World, Pet.Rooms and diary lines for the world
Zmieniaj: src/Cuy.Core/Pet.World.cs, src/Cuy.Core/Events.cs, tests/Cuy.Core.Tests/PetWorldTests.cs, assets/data/diary.json, tests/Cuy.Core.Tests/WorldDiaryTests.cs, src/Cuy.Core/Pet.Rooms.cs, src/Cuy.Core/Pet.cs, tests/Cuy.Core.Tests/PetRoomsTests.cs
Wymagane: src/Cuy.Core/Pet.World.cs, tests/Cuy.Core.Tests/PetWorldTests.cs, tests/Cuy.Core.Tests/WorldDiaryTests.cs, src/Cuy.Core/Pet.Rooms.cs, tests/Cuy.Core.Tests/PetRoomsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PetWorldTests|FullyQualifiedName~WorldDiaryTests|FullyQualifiedName~PetRoomsTests"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W18-01, W18-06, W18-02
Goal: Pet.World, Pet.Rooms and diary lines for the world.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W18-01: Pet.World: unlock and upgrade places and rooms
Files of this item: src/Cuy.Core/Pet.World.cs, src/Cuy.Core/Events.cs, tests/Cuy.Core.Tests/PetWorldTests.cs
Goal: A pet can unlock places and rooms and raise their levels, paying clovers.
Depends on: W17 merged.
Facts: `Pet` is partial (follow `Pet.Economy.cs`). Spend with `TrySpendClovers`, count with `Count(name, by)` (`places_unlocked`, `plots_owned` is set elsewhere). Everything is behind `Balance.PlacesActive` (off: methods return `Disabled`). The farm gives its `welcome_items` (starter seeds) when first unlocked. Holds `PlaceCatalog`, `WorldItemCatalog`, `FarmConfig`, and `MarketConfig` as injectable properties with lazy defaults (like `HayTable`), plus helper `internal WorldState EnsureWorld() => State.World ?? (State.World = new WorldState());` so subsequent W18 tasks (`Pet.Rooms.cs`, `Pet.Farm.cs`, `Pet.Market.cs`, `Pet.Walk.cs`) can use them directly without redeclaring duplicate properties.
Steps:
1. Events: `PlaceUnlockedEventArgs(string id)`, `PlaceUpgradedEventArgs(string id, int level)`.
2. `WorldResult UnlockPlace(string id)`, `UnlockRoom(string id)`, `UpgradePlace(string id)` mapping `PlaceUnlock` results and clovers (`Ok`, `NotEnoughClovers`, `Locked`, `MaxLevel`, `Unknown`, `Disabled`); on success spend, raise the event, count, and for the farm set `FarmState.PlotsOwned = StartPlots` and add starter seeds to `Inventory`.
3. Tests: unlocking the garden with 399 clovers fails and with 400 succeeds and leaves 0; the farm without the garden is `Locked`; unlocking the farm grants 4 plots and 2+2+2 seeds; upgrading the salon twice costs 530 + 1200; max level is refused; with the flag off nothing changes.

## Item W18-06: Diary templates for the farm, garden and market
Files of this item: assets/data/diary.json, tests/Cuy.Core.Tests/WorldDiaryTests.cs
Goal: The diary has at least 12 new lines about harvests, walks, the market and the home.
Depends on: W17 merged.
Facts: `assets/data/diary.json` holds Tracery-style templates (`docs/diary-grammar.md` explains the grammar and tags; `DiaryTemplatesTests.cs` shows the validations: min counts, no unknown symbols, no Polish words). Add new templates keyed to events: first harvest of the day, a great harvest, a sale at the market, a full order, a walk in the garden, a new decoration placed, a new place unlocked, a rare veg eaten fresh from the farm. English, warm tone, the pig's voice, no mention of money amounts.
Steps:
1. Append at least 12 templates (and the symbols they need) without changing existing ones.
2. Tests (`WorldDiaryTests.cs`): the 12 new ids exist, parse with the real grammar, produce non-empty text for 50 random seeds, contain no unresolved `#symbol#`, and no Polish letters.

## Item W18-02: Pet.Rooms: buy, place, move and remove items; comfort in mood decay
Files of this item: src/Cuy.Core/Pet.Rooms.cs, src/Cuy.Core/Pet.cs, tests/Cuy.Core.Tests/PetRoomsTests.cs
Goal: A pet can buy placeable items and arrange them; comfort slows the decay of mood.
Depends on: W17 merged, W18-01 merged.
Facts: W18-02 runs in sub-wave W18b after W18-01 (`Pet.World.cs`), so `PlaceCatalog` and `WorldItemCatalog` properties on `Pet` and `EnsureWorld()` already exist in `Pet.World.cs` — do NOT redeclare them in `Pet.Rooms.cs`. Behind `Balance.WorldDecorActive`. Buying adds to `WorldState.OwnedItems` (price from the catalog, `free` items cost 0, `memory_corner` requires a memorial pig in the roster). Placing needs `owned - placed >= 1` except `repeatable` items (any number once owned). Uses `RoomLayoutOps` with the grid from `PlaceUnlock.GridSize`. Counter `items_placed` counts every successful placement. Mood decay: where the needs decay is applied (find `DecayPerHour` in `Pet`), multiply the Mood decay by `Comfort.MoodDecayFactor` when the flag is on; hook this into `Pet.cs`.
Steps:
1. `BuyResult BuyItem(string id)`, `PlaceResult PlaceItem(string placeOrRoomId, string itemId, int x, int y, bool flip)`, `PlaceResult MoveItem(string place, string uid, int x, int y)`, `bool FlipItem(...)`, `bool RemoveItem(string place, string uid)`, `int ComfortScore()`. Note: W18-02 runs in sub-wave W18b after W18-01 (`Pet.World.cs`), so `PlaceCatalog` and `WorldItemCatalog` properties on `Pet` and `EnsureWorld()` already exist in `Pet.World.cs` — use them directly, do NOT redeclare duplicate properties on `partial class Pet`.
2. Tests: buying twice a 1-per item and placing both; placing without owning is refused; a repeatable fence can be placed 10 times after one purchase; memory corner is refused without a memorial pig and free with one; `items_placed` counts; removing returns the item to the free pool; mood decay is 15 percent slower at the comfort cap in a 10-hour simulated decay and unchanged with the flag off.
