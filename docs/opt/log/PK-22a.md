# PK-22a: world flags on, SelfTest, save size, asset contract tests
- Done W22-01: `GameSession.Open` sets PlacesActive/FarmActive/MarketActive/WorldDecorActive in both branches and calls `state.EnsureWorld(WorldItemCatalog.Current, ItemCatalog.Default)` after loading. Tests in new `GameSessionWorldTests.cs`.
- Deviation: `EnsureWorld` takes catalogs, not the planned no-arg form; `GameSessionWorldTests.cs` did not exist and was created.
- Done W22-05: SelfTest checks for farm/market/places/world_items/items_farm JSON, crop item and seed_item in catalog (`CheckFarmCropItems`), world icons non-empty (`CheckWorldItemIcons`); `items_farm.json` added to the id list. Ids checked unique in Python, not run.
- Done W22-06: `WorldSaveSizeTests.cs` max world (7 pigs, 300 items, 24 plots, 4 orchard, demand for all crops), size and 500 ms round trip.
- Done W22-07: `WorldAssetsTests.cs`, 5 contracts. Deviations from the item text: named pigs are in `pigs_named.json` under `pigs`; portraits are 128x128; atlas entries use `size`/`cells` and per-item PNGs (no atlas.png); perennial crops use `tree_<id>` frames (16x32, 3 frames); farm frames are 16x16 at 1x (32x32 in farm_x2.png).
- Expected failures (real data gaps, asserted as specified): `floor_wood/straw/fleece/grass/soil/stone` are not in tiles.json (it has `floor_bedroom_N` etc.); all 55 world_items icons are missing from icons/icons.json.
- Undone: nothing. Verification NOT run: no dotnet SDK in this environment (`dotnet: command not found`), so no test or build result is confirmed.
