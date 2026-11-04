# PK-22a: Switch world flags on, SelfTest, save size, asset contract tests
Zmieniaj: src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionWorldTests.cs, src/Cuy/dotNet/SelfTest.cs, tests/Cuy.Core.Tests/WorldSaveSizeTests.cs, tests/Cuy.Core.Tests/WorldAssetsTests.cs, docs/opt/log/PK-22a.md
Wymagane: tests/Cuy.Core.Tests/GameSessionWorldTests.cs, src/Cuy/dotNet/SelfTest.cs, tests/Cuy.Core.Tests/WorldSaveSizeTests.cs, tests/Cuy.Core.Tests/WorldAssetsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~GameSessionWorldTests|FullyQualifiedName~WorldSaveSizeTests|FullyQualifiedName~WorldAssetsTests" && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W22-01, W22-05, W22-06, W22-07
Goal: Switch world flags on, SelfTest, save size, asset contract tests.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-22a.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W22-01: GameSession.Open switches the world flags on
Files of this item: src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionWorldTests.cs
Goal: The world features become active in the real game.
Depends on: W21 merged.
Facts: Add `PlacesActive`, `FarmActive`, `MarketActive`, `WorldDecorActive` to the flags set in `GameSession.Open` (both branches), and call `State.EnsureWorld(...)` after loading (W18-07). Existing tests must keep passing; if one breaks only because of the flags, record it in the PR.
Steps:
1. Implement; tests: a session on an empty directory has the four flags true and a salon layout; a session on an old save with decor equipped has the legacy items placed; reopening keeps them; the market is usable at once and the farm is locked.

## Item W22-05: SelfTest: world data files
Files of this item: src/Cuy/dotNet/SelfTest.cs
Goal: The desktop self-test parses and cross-checks the world data.
Depends on: W21 merged.
Facts: Add `Check` entries (neighbours show the style): `farm.json`, `market.json`, `places.json`, `world_items.json`, `items_farm.json` parse (`ParseData`); every crop `item` and `seed_item` exists in the item catalog; every placeable `icon` is non-empty; the list `files` at line ~304 (`items.json`, `items_shop.json`, `items_decor.json`) includes `items_farm.json`.
Steps:
1. Add the checks and the file in the list; nothing else.

## Item W22-06: Test: save size and load time with a full world
Files of this item: tests/Cuy.Core.Tests/WorldSaveSizeTests.cs
Goal: A full world (24 plots, orchard, 300 placed items) saves under 200 KB and loads fast.
Depends on: W21 merged.
Facts: Build a `GameState` with the maximum world (all places unlocked, 5 rooms/places with up to 60 items each totalling 300, 24 plots planted, 4 orchard slots, market state with demand for all crops, 7 pigs in the roster), serialize with the same settings as `SaveSystem`, assert length < 200 KB, deserialize and compare key counts, and assert the whole round trip takes less than 500 ms (generous). Use a temp directory from the existing test helpers.
Steps:
1. Write the test only; do not change production code.

## Item W22-07: World and portrait assets contract tests
Files of this item: tests/Cuy.Core.Tests/WorldAssetsTests.cs
Goal: Automated contract tests in xUnit verify that all world art, tiles, crops, portraits, and icons referenced by game data exist on disk with correct dimensions.
Depends on: W22-05 merged.
Facts: Contract tests protect the game assets from missing files or wrong sprite bounds. In `tests/Cuy.Core.Tests/WorldAssetsTests.cs`, implement tests that find repo files by walking up from `AppContext.BaseDirectory` to the repository root with `Cuy.sln` (using the existing `RepoFile` helper in tests).
Implement the 5 contract assertions:
1. Every `id` in `assets/data/named_pigs.json` (or `assets/data/pigs_named.json`) has `assets/sprites/portraits/<id>_32.png` (or `<id>.png`) with PNG dimensions verified from the PNG IHDR header (bytes 16..23 contain width and height as big-endian 32-bit integers).
2. Every `id` in `assets/data/world_items.json` exists in `sprites` (or `items`) of `assets/world/atlas.json`, has `w == tileW * 16` and `h == tileH * 16`, and fits inside the bounds of `atlas.png`.
3. Every crop `id` in `assets/data/farm.json` exists in `crops` (or `frames["crop_" + id]`) of `assets/world/farm/farm.json` with 4 frames of `32x32` inside `farm.png`, and every crop `item` exists in `assets/icons/icons.json`.
4. Every `floor_wood`, `floor_straw`, `floor_fleece`, `floor_grass`, `floor_soil`, `floor_stone` exists in `tiles` of `assets/world/tiles.json` with `16x16` frames inside `tiles.png`.
5. Every `icon` referenced by `world_items.json` or `places.json` exists in `assets/icons/icons.json`.
Test rules: do NOT modify production code or asset files. Keep tests deterministic, self-contained, and fast.
Steps:
1. Create `tests/Cuy.Core.Tests/WorldAssetsTests.cs` implementing the 5 contract assertions described above.
2. Verify with `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter WorldAssetsTests`.
