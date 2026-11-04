# PK-23a: Pig room config, world-state fields, flags, home economy config, invariants test
Zmieniaj: src/Cuy.Core/World/PigRoomConfig.cs, tests/Cuy.Core.Tests/PigRoomConfigTests.cs, src/Cuy.Core/World/WorldState.cs, tests/Cuy.Core.Tests/WorldStatePigFieldsTests.cs, src/Cuy.Core/Balance.cs, assets/data/achievements.json, tests/Cuy.Core.Tests/PigRoomFlagsTests.cs, src/Cuy.Core/World/HomeEconomyConfig.cs, tests/Cuy.Core.Tests/HomeEconomyConfigTests.cs, tests/Cuy.Core.Tests/PigRoomInvariantsTests.cs
Wymagane: src/Cuy.Core/World/PigRoomConfig.cs, tests/Cuy.Core.Tests/PigRoomConfigTests.cs, tests/Cuy.Core.Tests/WorldStatePigFieldsTests.cs, tests/Cuy.Core.Tests/PigRoomFlagsTests.cs, src/Cuy.Core/World/HomeEconomyConfig.cs, tests/Cuy.Core.Tests/HomeEconomyConfigTests.cs, tests/Cuy.Core.Tests/PigRoomInvariantsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PigRoomConfigTests|FullyQualifiedName~WorldStatePigFieldsTests|FullyQualifiedName~PigRoomFlagsTests|FullyQualifiedName~HomeEconomyConfigTests|FullyQualifiedName~PigRoomInvariantsTests"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W23-01, W23-02, W23-06, W23-07, W23-08
Goal: Pig room config, world-state fields, flags, home economy config, invariants test.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W23-01: PigRoomConfig (loader for pig_rooms.json)
Files of this item: src/Cuy.Core/World/PigRoomConfig.cs, tests/Cuy.Core.Tests/PigRoomConfigTests.cs
Goal: Core loads the pig room template, comfort weights, variants, the shared bedroom and the per-pig themes.
Depends on: W22 merged.
Facts: Pattern: AGENTS.md 'Data tables' (`EconomyConfig`: `Current`, `Load(string)`, `LoadDefault()`, errors via `ItemCatalog.ErrorLogger`). File `assets/data/pig_rooms.json` (design: docs/PIG_ROOMS.md): `template{id_prefix,name,memorial_name,max_name_len,levels[{cols,rows,cost}]}`, `comfort{own,common,others,common_places[]}`, `variants{count,names[],ramp{source,targets[]}}`, `dorm{id,name,unlock_cost,requires_pigs,max_residents,bond_gain_bonus,levels[]}`, `default_themes[]` and `themes{<pigId>:{wallpaper,floor,wall_tile,floor_tile,starter[3],signature,mood}}` (`wall_tile`/`floor_tile` are optional tile ids of the dedicated art in `assets/world/tiles.json`; the page uses them when the file exists, the decor skin otherwise). Skins are ids of `items_decor.json`, starter and signature items are ids of `world_items.json`.
Steps:
1. `PigRoomTheme` (`Wallpaper`, `Floor`, `WallTile`, `FloorTile`, `Starter`, `Signature`, `Mood`) and `PigRoomConfig` (sealed) with `Current/Load/LoadDefault`, `RoomId(pigId)` (`pig:<id>`), `TryParseRoomId(string, out pigId)`, `Levels`, `NameFor(string pigName, bool memorial)`, `MaxNameLen`, `ComfortOwn/Common/Others`, `CommonPlaces`, `VariantCount`, `Dorm` (typed: `Id`, `Name`, `UnlockCost`, `RequiresPigs`, `MaxResidents`, `BondGainBonus`, `Levels`), `ThemeFor(string pigId, int randomIndex)` (named theme, else `DefaultThemes[randomIndex % count]`).
2. Load rules (log each): bad JSON gives code defaults equal to the file's numbers; first level cost forced to 0; levels must not shrink (a shrinking level is dropped); comfort weights clamped to 0-1 and ordered own >= common >= others; `variants.count` clamped 1-8; `max_residents` clamped 2-6; a theme with other than 3 starter items is padded or cut to 3 from the default theme.
3. Tests: real file values (3 levels 10x6/12x7/14x8 costs 0/400/900; dorm 16x8, 20x9, 24x10 costs 0/1100/1800, unlock 1500); `RoomId('kuki') == 'pig:kuki'` and round trip parse; five named themes; unknown pig gets a default theme by index; every theme skin exists in `items_decor.json` and every starter and signature id exists in `world_items.json` (read the files); broken JSON gives defaults; weights are clamped and ordered.

## Item W23-02: WorldState fields for pig rooms and the shared bedroom
Files of this item: src/Cuy.Core/World/WorldState.cs, tests/Cuy.Core.Tests/WorldStatePigFieldsTests.cs
Goal: The saved world state can hold item variants, room names, parked layouts and shared-room membership.
Depends on: W22 merged.
Facts: Save rule (AGENTS.md): only add fields with safe defaults, never rename or delete. Add: `PlacedItem.Variant` (int, default 0), `RoomLayout.Name` (string, default null = use the catalog name), `WorldState.Parked` (`Dictionary<string,RoomLayout>`, pig id -> the pig's own layout while it lives in the shared bedroom), `WorldState.RoomShare` (`Dictionary<string,string>`, pig id -> shared room id, absent = own room), `WorldState.PigRoomsEnsured` (`HashSet<string>` of pig ids whose room was created), `WorldState.UnlockedVariants` (`HashSet<string>` of `<itemId>:<variant>` keys bought with clovers), `WorldState.StorageVersion` not needed. All collections non-null after access (same lazy pattern as the existing ones). Design: docs/PIG_ROOMS.md section 6.
Steps:
1. Add the fields and keep `Version` of `WorldState` at 1 (additive).
2. Tests: defaults; JSON round trip of a layout with a variant and a name; an old world JSON (written by the W16-06 shape, build it as a string in the test) loads with variant 0, name null and empty new collections; setting a new collection to null in JSON gives an empty one on access.

## Item W23-06: Flags and achievements for pig rooms and the shared bedroom
Files of this item: src/Cuy.Core/Balance.cs, assets/data/achievements.json, tests/Cuy.Core.Tests/PigRoomFlagsTests.cs
Goal: Two flags (off) and three achievements exist.
Depends on: W22 merged.
Facts: Flags: `PigRoomsActive`, `DormActive` (bool, default false; do not switch them on in `GameSession.Open`, that is W26-08). Achievements (format as W11-05 and W16-08, `rule: {kind: counter, name, atLeast}`): `own_room` (counter `pig_room_items` >= 5, reward 25), `every_pig_home` (counter `pig_rooms_furnished` >= 5, reward 100), `shared_nest` (counter `dorm_unlocked` >= 1, reward 75). Counters are incremented in W24 and W26. Total 200 clovers.
Steps:
1. Add the flags with XML doc lines and the three entries (English titles/descriptions, category `care` or `social`).
2. Tests: flags default false and are independent of the older flags; the three ids exist once with the exact rules and rewards; each is earned and paid once at its threshold (follow `AchievementTests.cs`).

## Item W23-07: HomeEconomyConfig (loader for home_economy.json)
Files of this item: src/Cuy.Core/World/HomeEconomyConfig.cs, tests/Cuy.Core.Tests/HomeEconomyConfigTests.cs
Goal: Core loads the rules and prices of item colours, the run, desktop props and roaming.
Depends on: W22 merged.
Facts: Pattern as W16-01. File `assets/data/home_economy.json` (design: docs/PIG_ROOMS.md sections 7-9): `variants{unlock_percent,min_price}`, `skins{pig_skin_price}`, `resale{allowed}`, `roam{slot_minutes,night_from_hour,night_to_hour,default_mode}`, `run{min_cells,cells_per_pig,gate_item,blockers[],max_hours_per_day,day_from_hour,day_to_hour,min_temp_c,max_temp_c,allowed_conditions[],mood_per_hour,mood_cap_per_day}`, `props{max_on_desktop}`. Decorations are never resold: `resale.allowed` must stay false and no code path in this wave sells placeables back.
Steps:
1. `HomeEconomyConfig` (sealed; `Current/Load/LoadDefault`; typed properties; `int VariantPrice(int itemPrice)` = 0 when the price is 0, otherwise `max(min_price, ceil(price * percent / 100.0))`; `bool ResaleAllowed`).
2. Load rules (log each): bad JSON gives code defaults equal to the file; percent clamped 1-50; `cells_per_pig` 3-20; `min_cells` at least twice `cells_per_pig`; hours clamped 0-23; temperatures ordered; `mood_per_hour` 0-3, `mood_cap_per_day` 0-10; `blockers` always contain `gate_item`; `max_on_desktop` 1-12; `resale.allowed` forced to false (log if the file says true).
3. Tests: real file values; `VariantPrice(320) == 48`, `VariantPrice(0) == 0`, `VariantPrice(10) == 5`; each clamp; resale forced off; unknown fields ignored.

## Item W23-08: Test: pig room data keeps the economy invariants
Files of this item: tests/Cuy.Core.Tests/PigRoomInvariantsTests.cs
Goal: A test reads the real data and enforces the same sink totals and price relations as the simulator.
Depends on: W22 merged.
Facts: The simulator `tools/qa/economy-sim.js` (variants `pigrooms`, `full`, with `--check`) already exists and measured: new sinks 23603 clovers for `full` (levels of 5 pig rooms 6500, furnishing 5 x 1980, shared bedroom 4400 + furnishing 1980, colours 543, run 280), 16400 for `pigrooms`; do not edit the simulator here. This task puts the same numbers under a C# test so that a data change that breaks the economy fails `dotnet test`. Read the data with `RepoFile` and the real loaders (`PigRoomConfig`, `HomeEconomyConfig`, `WorldItemCatalog`, `PlaceCatalog`).
Steps:
1. Write `PigRoomInvariantsTests`. No production code.
2. Tests: (1) the sum of pig room level costs for 5 pigs is between 5000 and 8000; (2) furnishing sum = sum of prices of the house items that are not free, not signature and not props, times 6 rooms (5 pig rooms + the shared bedroom), is between 10000 and 14000; (3) shared bedroom: unlock + level costs between 3500 and 5000; (4) the whole new sink (1 + 2 + 3 + colour prices of `recolor` items at `HomeEconomyConfig.VariantPrice` x 3 + gate and 16 fence pieces) is between 15000 and 30000; (5) levels grow in size and in cost, the first level of every room is free; (6) comfort weights are ordered and own is 1.0; (7) the best comfort per clover of the purchasable house items is not above 0.06 comfort per clover (so comfort stays a long-term sink); (8) no free item has a variant price above 0; (9) `resale.allowed` is false; (10) the maximum possible mood slow-down in `PlaceCatalog` is still 0.15.
