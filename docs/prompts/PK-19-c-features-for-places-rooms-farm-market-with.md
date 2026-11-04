# PK-19: C# features for places, rooms, farm, market with contracts and validation
Zmieniaj: src/Cuy/dotNet/Features/PlacesFeature.cs, src/Cuy/dotNet/Features/RoomsFeature.cs, src/Cuy/dotNet/Features/FarmFeature.cs, src/Cuy/dotNet/Features/MarketFeature.cs, docs/contracts/places.md, docs/contracts/rooms.md, docs/contracts/farm.md, docs/contracts/market.md, src/Cuy.Core/Input/Validation/PlacesMessages.cs, src/Cuy.Core/Input/Validation/RoomsMessages.cs, src/Cuy.Core/Input/Validation/FarmMessages.cs, src/Cuy.Core/Input/Validation/MarketMessages.cs, tests/Cuy.Core.Tests/WorldMessageTests.cs
Wymagane: src/Cuy/dotNet/Features/PlacesFeature.cs, src/Cuy/dotNet/Features/RoomsFeature.cs, src/Cuy/dotNet/Features/FarmFeature.cs, src/Cuy/dotNet/Features/MarketFeature.cs, docs/contracts/places.md, docs/contracts/rooms.md, docs/contracts/farm.md, docs/contracts/market.md, src/Cuy.Core/Input/Validation/PlacesMessages.cs, src/Cuy.Core/Input/Validation/RoomsMessages.cs, src/Cuy.Core/Input/Validation/FarmMessages.cs, src/Cuy.Core/Input/Validation/MarketMessages.cs, tests/Cuy.Core.Tests/WorldMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W19-01, W19-02, W19-03, W19-04, W19-05, W19-06
Goal: C# features for places, rooms, farm, market with contracts and validation.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W19-01: PlacesFeature: places, rooms and unlocks
Files of this item: src/Cuy/dotNet/Features/PlacesFeature.cs
Goal: The Home page can read the state of the places and unlock or upgrade them.
Depends on: W18 merged.
Facts: Pattern: `PigsFeature.cs` / `ShopFeature.cs` (class derives `HomeFeatureBase`, `Id`, `AddState`, `HandleMessage`, `Tick`; features are found by reflection; the page gets state via `AddState` and toasts via `HomeWindow.PostToPage`). JS never computes prices, times or rewards: publish ready numbers. Core API names are from W18 (`Pet.*`); if a name differs use the real one and list it. Contract text is written in W19-05. Property names in the state are camelCase.
Steps:
1. State key `places`: `{ places: [ { id, name, unlocked, level, maxLevel, unlockCost, nextLevelCost, requires: [ids], cols, rows } ], rooms: [ { id, name, unlocked, level, unlockCost, nextLevelCost, cols, rows } ], clovers }`
2. Messages: `place_unlock { id }`, `room_unlock { id }`, `place_upgrade { id }`.
3. Unknown ids and indices are ignored; every result maps to a short English toast ('Not enough clovers', 'Not ready yet', ...); after each message post fresh state. Returns true for handled messages only.

## Item W19-02: RoomsFeature: layouts, owned items and comfort
Files of this item: src/Cuy/dotNet/Features/RoomsFeature.cs
Goal: The Home page can read and edit the layout of every place and room.
Depends on: W18 merged.
Facts: Pattern: `PigsFeature.cs` / `ShopFeature.cs` (class derives `HomeFeatureBase`, `Id`, `AddState`, `HandleMessage`, `Tick`; features are found by reflection; the page gets state via `AddState` and toasts via `HomeWindow.PostToPage`). JS never computes prices, times or rewards: publish ready numbers. Core API names are from W18 (`Pet.*`); if a name differs use the real one and list it. Contract text is written in W19-05. Property names in the state are camelCase. Rejected placements return a toast with the reason ('Something is in the way', 'Too close to the wall').
Steps:
1. State key `rooms`: `{ layouts: { <placeOrRoomId>: { cols, rows, wallRows, wallpaper, floor, items: [ { uid, itemId, x, y, flip } ] } }, catalog: [ { id, name, places, w, h, price, comfort, layer, icon, owned, placed, repeatable, free } ], comfort: { score, cap, moodFactor }, skins: { wallpapers: [..], floors: [..] } }`
2. Messages: `room_buy { itemId }`, `room_place { place, itemId, x, y, flip }`, `room_move { place, uid, x, y }`, `room_flip { place, uid, flip }`, `room_remove { place, uid }`, `room_skin { room, slot, itemId }` (wallpaper/floor).
3. Unknown ids and indices are ignored; every result maps to a short English toast ('Not enough clovers', 'Not ready yet', ...); after each message post fresh state. Returns true for handled messages only.

## Item W19-03: FarmFeature: plots, orchard, tools and harvest
Files of this item: src/Cuy/dotNet/Features/FarmFeature.cs
Goal: The Home page can show the farm and run planting, watering and harvesting.
Depends on: W18 merged.
Facts: Pattern: `PigsFeature.cs` / `ShopFeature.cs` (class derives `HomeFeatureBase`, `Id`, `AddState`, `HandleMessage`, `Tick`; features are found by reflection; the page gets state via `AddState` and toasts via `HomeWindow.PostToPage`). JS never computes prices, times or rewards: publish ready numbers. Core API names are from W18 (`Pet.*`); if a name differs use the real one and list it. Contract text is written in W19-05. Property names in the state are camelCase. Seconds left are computed on the C# side from the clock; `Tick` posts a fresh `farm` state at most every 30 seconds while the Home page is open.
Steps:
1. State key `farm`: `{ unlocked, plots: [ { index, cropId, state: empty|growing|ripe, watered, secondsLeft, yield } ], orchard: [ { slot, cropId, stock, secondsToNext } ], crops: [ { id, name, icon, kind, unlocked, seedItem, seedOwned, growMinutes, yield, sellPrice, unlockHarvests } ], tools: { canId, plotsPerWater, sprinkler }, upgrades: { nextPackCost, nextOrchardCost, nextCanCost, sprinklerCost }, harvests }`
2. Messages: `farm_plant { plot, cropId }`, `farm_water { plot }`, `farm_harvest { plot }`, `farm_harvest_all {}`, `orchard_plant { slot, cropId }`, `orchard_harvest { slot }`, `farm_buy { what: pack|orchard|can|sprinkler, id }`.
3. Unknown ids and indices are ignored; every result maps to a short English toast ('Not enough clovers', 'Not ready yet', ...); after each message post fresh state. Returns true for handled messages only.

## Item W19-04: MarketFeature: quotes, specials, orders and the daily cap
Files of this item: src/Cuy/dotNet/Features/MarketFeature.cs
Goal: The Home page can show the market and run buying, selling and orders.
Depends on: W18 merged.
Facts: Pattern: `PigsFeature.cs` / `ShopFeature.cs` (class derives `HomeFeatureBase`, `Id`, `AddState`, `HandleMessage`, `Tick`; features are found by reflection; the page gets state via `AddState` and toasts via `HomeWindow.PostToPage`). JS never computes prices, times or rewards: publish ready numbers. Core API names are from W18 (`Pet.*`); if a name differs use the real one and list it. Contract text is written in W19-05. Property names in the state are camelCase. Quotes use `MarketPricing.Quote`: show the total for the count the page asks about by adding an optional `count` to `market_quote { itemId, count }` which answers with a `market_quote_result` page message.
Steps:
1. State key `market`: `{ capLeft, cap, sellable: [ { itemId, name, owned, unitNow, demand } ], buyable: [ { itemId, name, category, price } ], specials: [ { index, itemId, name, price, was } ], orders: [ { index, cropId, count, reward, done } ], stall: { level, nextCost }, clovers }`
2. Messages: `market_sell { itemId, count }`, `market_buy { itemId, count }`, `market_special { index }`, `market_order { index }`, `market_stall {}`.
3. Unknown ids and indices are ignored; every result maps to a short English toast ('Not enough clovers', 'Not ready yet', ...); after each message post fresh state. Returns true for handled messages only.

## Item W19-05: docs/contracts.md: places, rooms, farm, market
Files of this item: docs/contracts/places.md, docs/contracts/rooms.md, docs/contracts/farm.md, docs/contracts/market.md
Goal: The contract document describes the state and messages of the four new features exactly as they are published.
Depends on: W19-01..04 merged (read the four feature files).
Facts: Follow the existing format of the `shop`, `decor`, `pigs` sections (state key, field table, messages with payload shapes, toasts). Read the four new `*Feature.cs` files for the real field names, and `docs/WORLD.md` for the meaning. The `decor` section stays but gets a note that it is superseded by `rooms` once `WorldDecorActive` is on.
Steps:
1. Add four sections (`places`, `rooms`, `farm`, `market`), including the quote messages and every toast text; do not edit other sections except the one-line note in `decor`.
Package override (wins over anything above): Write four separate files `docs/contracts/<feature>.md` (not sections of `docs/contracts.md`; do not edit `contracts.md`). Put the one-line 'superseded by rooms once WorldDecorActive is on' note at the top of `docs/contracts/rooms.md`.

## Item W19-06: Validation and name mapping for the new messages
Files of this item: src/Cuy.Core/Input/Validation/PlacesMessages.cs, src/Cuy.Core/Input/Validation/RoomsMessages.cs, src/Cuy.Core/Input/Validation/FarmMessages.cs, src/Cuy.Core/Input/Validation/MarketMessages.cs, tests/Cuy.Core.Tests/WorldMessageTests.cs
Goal: The Home messages of the new features are validated and mapped (camelCase to the C# names) with tests.
Depends on: W19-01..04 merged.
Facts: Messages from JS are validated against a table before they reach the features. If `src/Cuy.Core/Input/MessageValidator.cs` does not exist yet, create it in namespace `Cuy.Core.Input` with `public static class MessageValidator` and `public static bool IsValid(string json, out string reason)` (supporting existing message types plus the new world message types from `W19-01..04`). Add the message types and their required fields and types from `docs/contracts.md` (written in W19-05, or the lists in the four feature files): `place_unlock`, `room_unlock`, `place_upgrade`, `room_buy`, `room_place`, `room_move`, `room_flip`, `room_remove`, `room_skin`, `farm_plant`, `farm_water`, `farm_harvest`, `farm_harvest_all`, `orchard_plant`, `orchard_harvest`, `farm_buy`, `market_sell`, `market_buy`, `market_special`, `market_order`, `market_stall`, `market_quote`, plus `adopt_named`, `adopt_group`, `set_memorial` if not yet present.
Steps:
1. If `src/Cuy.Core/Input/MessageValidator.cs` does not exist yet, create it in namespace `Cuy.Core.Input` with `public static class MessageValidator` and `public static bool IsValid(string json, out string reason)` (supporting existing message types plus the new world message types from `W19-01..04`). Add the entries; reject negative or non-integer counts, empty ids, coordinates outside -1..200, and unknown `what` values for `farm_buy`.
2. Tests: each message type validates with a good payload and fails with a missing field, a wrong type, a negative count and an over-long id (> 64 chars).
Package override (wins over anything above): `MessageValidator` and `IMessageRuleSet` already exist (package PK-00): do not create or edit `MessageValidator.cs`. Implement one `IMessageRuleSet` class per feature (places+rooms message types split between `PlacesMessages` and `RoomsMessages`, farm and orchard types in `FarmMessages`, market types in `MarketMessages`) and test through `MessageValidator.Validate(type, JObject)`. Ignore the `IsValid(string json, ...)` signature mentioned in the item.
