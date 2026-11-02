# W17-08: LegacyDecorMigration: slot decorations become placed items
Zmieniaj: src/Cuy.Core/World/LegacyDecorMigration.cs, tests/Cuy.Core.Tests/LegacyDecorMigrationTests.cs
Wymagane: src/Cuy.Core/World/LegacyDecorMigration.cs, tests/Cuy.Core.Tests/LegacyDecorMigrationTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: Old slot decorations (wallpaper, floor, rug, plant, picture, lamp) move into the Living room layout, once.
Depends on: W16 merged.
Facts: Today: `GameState.Decor.Equipped` maps slot -> item id (`wallpaper`, `floor`, `rug`, `plant`, `picture`, `lamp`); the items live in `assets/data/items_decor.json` and were bought into `Inventory`. Nothing may be deleted from the save. New: `WorldState.Rooms["salon"].Wallpaper/Floor` take the equipped wallpaper and floor ids; rug/plant/picture/lamp become `PlacedItem`s at fixed default cells (rug on the ground layer centre, plant right of the sofa area bottom row, picture and lamp on the wall rows), and every legacy item counts as owned (`OwnedItems`). The old slot items need entries in the placeable catalog: treat them as 1x1 (plant, lamp), 2x1 (picture, wall), 3x2 (rug, ground) items with comfort 2/1/2/1 and the price from `items_decor.json`; build these definitions in this class from `items_decor.json` data (a `LegacyItems(ItemCatalog)` method) rather than editing `world_items.json`. Idempotent: a flag `LegacyDecorMigrated` is added to `WorldState` (bool, default false). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `static bool Migrate(GameState state, WorldItemCatalog items, ItemCatalog catalog)` returns true when it changed anything; second call returns false.
2. Tests: an empty `Decor` migrates to an empty salon and sets the flag; a decor with all six slots yields wallpaper and floor ids plus four placed items inside the 12x7 grid without overlaps; items are in `OwnedItems`; the old `Decor.Equipped` is unchanged; calling twice does not duplicate; unknown item ids are skipped.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
