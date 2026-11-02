# W16-05: Load items_farm.json together with the other item files
Zmieniaj: src/Cuy.Core/ItemCatalog.cs, src/Cuy/dotNet/ItemCatalogLoader.cs, tests/Cuy.Core.Tests/ItemsFarmTests.cs
Wymagane: tests/Cuy.Core.Tests/ItemsFarmTests.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/*, AGENTS.md, docs/*, tasks/*
Goal: Seeds, saplings and the 7 new foods exist in the item catalog and can be bought, stored and eaten.
Depends on: W15 merged.
Facts: `items_shop.json` and `items_decor.json` are loaded next to `items.json` (find how in `ItemCatalog.cs` `LoadDefault`/`Load` and `ItemCatalogLoader.cs`); `SelfTest.cs` lists the files to parse (changed in W22-05, not here). `assets/data/items_farm.json` holds 7 foods (`cilantro`, `basil`, `romaine_lettuce`, `zucchini`, `cherry_tomato`, `blueberry`, `pear`) and 15 seed/sapling items with category `seed`. Treats keep `daily_limit` 1. Category `seed` must not break code that switches on categories (check `ShopFeature` reports unknown categories as 'food'? - read it; only change Core and the loader here, list needed UI changes in the PR). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add `items_farm.json` to the list of loaded files in Core and in the desktop loader the same way as `items_shop.json`.
2. Tests: the catalog contains `seed_parsley`, `sapling_apple`, `blueberry` and `romaine_lettuce` with the file's prices; a vegetable from the new file applies its effects when fed (use the existing feeding API); a treat from the new file respects `daily_limit`; seeds are not edible (feeding a seed returns the same result as an unknown food: read how `Feed` reports it).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
