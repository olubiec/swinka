# W29-01: DesktopPropCatalog: which items can live on the desktop
Zmieniaj: src/Cuy.Core/World/DesktopPropCatalog.cs, tests/Cuy.Core.Tests/DesktopPropCatalogTests.cs
Wymagane: src/Cuy.Core/World/DesktopPropCatalog.cs, tests/Cuy.Core.Tests/DesktopPropCatalogTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Core knows which inventory items can be desktop props and which placeable stands for them in a room.
Depends on: W28 merged (read `docs/DESKTOP_PROPS.md`).
Facts: No new data file: the mapping lives in `world_items.json` (`prop_of` = inventory item id, e.g. `prop_ball` -> `ball`, `prop_tunnel` -> `tunnel`, `prop_hay_ball` -> `hay_ball`, `prop_house` -> `house`; all free). Add the optional field `PropOf` to `WorldItemDefinition` if W16-04 does not read unknown fields into a dictionary (then this task also touches `WorldItemCatalog.cs`: add it to the Zmieniaj list and say so). `DesktopPropCatalog` is built from the world catalog and `HomeEconomyConfig.Props.MaxOnDesktop` (6). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `DesktopPropCatalog`: `IsProp(string inventoryId)`, `string RoomItemFor(string inventoryId)`, `string InventoryFor(string roomItemId)`, `IReadOnlyList<string> PropIds`, `MaxOnDesktop`.
2. Tests: the four mappings from the real files, both directions; unknown ids return null; every `prop_of` names an item that exists in `items.json` or `items_shop.json`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
