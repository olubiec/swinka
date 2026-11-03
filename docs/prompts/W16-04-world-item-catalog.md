# W16-04: WorldItemCatalog (loader for world_items.json)
Zmieniaj: src/Cuy.Core/World/WorldItemCatalog.cs, tests/Cuy.Core.Tests/WorldItemCatalogTests.cs
Wymagane: src/Cuy.Core/World/WorldItemCatalog.cs, tests/Cuy.Core.Tests/WorldItemCatalogTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Core loads the placeable items with footprints, layers, prices and comfort and validates them.
Depends on: W15 merged.
Facts: Pattern as W16-01. `assets/data/world_items.json`: `layers` [ground, floor, wall], `items[]` (`id`, `name`, `place[]` of house/garden/park/farm, `w`, `h`, `price`, `comfort` 0-10, `layer`, `icon`, optional `free`, `requires`, `repeatable`, `note`). 45 items; `memory_corner` is free and requires a memorial pig. Existing slot items (`items_decor.json`) are handled by the migration in W17-08, not here. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `WorldItemDefinition` and `WorldItemCatalog` (`Current/Load/LoadDefault`, `Items`, `Find(id)`, `ForPlace(placeId)`, `Layers`).
2. Rules: duplicate ids keep the first; unknown layer or place ids drop the item (logged); `w`/`h` outside 1-6 drop it; `comfort` clamped 0-10; negative price becomes 0.
3. Tests: 45 items; `fence_wood` and `path_stone` are repeatable (set `repeatable` true for layer `ground` and for fences in the loader if the file has no flag: decide, document in the PR); `memory_corner` is free; every item fits at least one grid of its place (verify every room item has W <= 4 and H <= 4, and every garden item has W <= 5 and H <= 4 (read max dimensions directly from assets/data/places.json via JObject.Parse or use constants 4x4 and 5x4; do NOT reference the PlaceCatalog C# class since it is created in parallel task W16-03)); ids unique; comfort of the whole catalog per place is at least 20 (so the cap is reachable).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
