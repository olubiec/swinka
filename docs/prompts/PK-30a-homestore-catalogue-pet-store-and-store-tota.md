# PK-30a: HomeStore catalogue, Pet.Store and store totals test
Zmieniaj: src/Cuy.Core/World/HomeStore.cs, tests/Cuy.Core.Tests/HomeStoreTests.cs, src/Cuy.Core/Pet.Store.cs, tests/Cuy.Core.Tests/PetStoreTests.cs, tests/Cuy.Core.Tests/HomeStoreTotalsTests.cs, docs/opt/log/PK-30a.md
Wymagane: src/Cuy.Core/World/HomeStore.cs, tests/Cuy.Core.Tests/HomeStoreTests.cs, src/Cuy.Core/Pet.Store.cs, tests/Cuy.Core.Tests/PetStoreTests.cs, tests/Cuy.Core.Tests/HomeStoreTotalsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~HomeStoreTests|FullyQualifiedName~PetStoreTests|FullyQualifiedName~HomeStoreTotalsTests"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W30-01, W30-02, W30-06
Goal: HomeStore catalogue, Pet.Store and store totals test.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-30a.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W30-01: HomeStore: one catalogue of everything the player can buy
Files of this item: src/Cuy.Core/World/HomeStore.cs, tests/Cuy.Core.Tests/HomeStoreTests.cs
Goal: A pure helper lists every purchasable thing of the home with price, owned count and the reason it is locked.
Depends on: W29 merged.
Facts: Rows (all from existing data and rules, nothing new is invented): rooms and levels (`PlaceUnlock`: bedroom, playroom, each level of every room incl. pig rooms and the dorm), places and their levels (garden, farm, park), placeable items by place (`WorldItemCatalog`, price, `free`, `signature_of` excluded from sale), item colours (`HomeEconomyConfig.VariantPrice` for variants 1-3, only for items with `recolor: true`), old shop decor (`items_decor.json`: wallpapers, floors, rugs, plants, pictures, lamps), farm upgrades (`FarmExpansion`: plot packs, orchard slots, cans, sprinkler), the big market stall. Each row: `Kind`, `Id`, `Name`, `Category`, `Place`, `Price`, `Owned`, `Placed`, `Locked` (bool), `LockedReason` (`needs_place:garden`, `needs_pigs`, `needs_room_level`, `max_level`, ...). No decoration is ever sold back.
Steps:
1. `static class HomeStore`: `IReadOnlyList<StoreRow> Rows(GameState, PlaceCatalog, WorldItemCatalog, FarmConfig, MarketConfig, PigRoomConfig, HomeEconomyConfig, ItemCatalog)` and `StoreRow Row(string kind, string id, ...)`.
2. Tests: a fresh state lists the bedroom at 470, playroom at 660, garden at 400, pig room level 2 at 400 for an adopted pig, dorm at 1500 locked with `needs_pigs`; the farm is locked with `needs_place:garden`; owned and placed counts follow the state; a signature item is not a row; every row price equals the value in its data file; the total of all rows is within 5 percent of the sink table in `docs/WORLD.md` plus the new pig room sinks (print the total in the test name or message; assert it is above 35000).
Package override (wins over anything above): SCOPE CHANGE: the garden run (W28) and desktop props (W29) are deferred. Leave out of the store rows every item with `prop_of` and `gate_garden`. Keep the asserted total above 35000 only if it still holds without them; otherwise lower the bound to the real total minus 5 percent and say so in the PR.

## Item W30-02: Pet.Store: one purchase entry for the home store
Files of this item: src/Cuy.Core/Pet.Store.cs, tests/Cuy.Core.Tests/PetStoreTests.cs
Goal: A pet routes every home purchase through one method that returns a clear result.
Depends on: W29 merged.
Facts: A thin facade, no new rules: `StoreResult Purchase(string kind, string id, int count)` calls the existing methods: `BuyItem` (W18-02), `UnlockPlace`/`UnlockRoom`/`UpgradePlace` (W18-01), `UnlockDorm`/`UpgradeDorm` (W26-02), `UnlockVariant` (W24-03), farm upgrades (`BuyPlotPack`, `BuyOrchardSlot`, `BuyCan`, `BuySprinkler`, W18-03), `BuyBigStall` (W18-04), and the old decor purchase (`Buy` of `items_decor`). `StoreResult { Ok, NotEnoughClovers, Locked, MaxLevel, Unknown, Disabled }` with the clovers spent. A purchase that costs the player nothing else changes nothing else. No selling.
Steps:
1. Implement and test one purchase of each kind.
2. Tests: each kind succeeds with enough clovers and leaves the right balance; locked rows refuse with `Locked`; unknown kind/id `Unknown`; selling is impossible (no method), asserted by reflection that no public method name starts with `Sell` in this file.

## Item W30-06: Test: the store total matches the simulator and nothing can be sold
Files of this item: tests/Cuy.Core.Tests/HomeStoreTotalsTests.cs
Goal: A test checks that the home store lists exactly what the simulator counts and that there is no way to sell a decoration.
Depends on: W29 merged.
Facts: The simulator `tools/qa/economy-sim.js --variant full` (already complete, with `--check`) counts total purchasable content of about 48653 clovers (stress and sane models give the same total). `HomeStore.Rows` (W30-01) lists the purchasable things of one save. A save with all five pigs adopted, the garden unlocked and every room present should list rows whose prices (counting one furnishing set per pig room and for the shared bedroom, as the simulator does: the 14 purchasable house items without signature and prop items) sum to within 3 percent of 48653 minus the stall, farm and market rows that the store does not list in the simulator's `world` part (compute the expected number in the test from the data files with the same rule as the simulator; document the formula in a comment).
Steps:
1. Write `HomeStoreTotalsTests`. No production code.
2. Tests: the computed total is within 3 percent of 48653; every row price equals the data value; no row has a negative or zero price unless it is `free`; there are no rows for signature or prop items; reflection finds no public method on `Pet` or `HomeStore` whose name contains `Sell` and takes a placeable id (selling crops at the market is allowed and is the only `Sell`); a purchase of any row followed by the inverse is impossible (no refund API).
Package override (wins over anything above): SCOPE CHANGE: the run and desktop props are deferred; the totals test must exclude `prop_of` items and `gate_garden` from the expected sums, consistently with HomeStore.
