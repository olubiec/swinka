# W19-03: FarmFeature: plots, orchard, tools and harvest
Zmieniaj: src/Cuy/dotNet/Features/FarmFeature.cs
Wymagane: src/Cuy/dotNet/Features/FarmFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can show the farm and run planting, watering and harvesting.
Depends on: W18 merged.
Facts: Pattern: `PigsFeature.cs` / `ShopFeature.cs` (class derives `HomeFeatureBase`, `Id`, `AddState`, `HandleMessage`, `Tick`; features are found by reflection; the page gets state via `AddState` and toasts via `HomeWindow.PostToPage`). JS never computes prices, times or rewards: publish ready numbers. Core API names are from W18 (`Pet.*`); if a name differs use the real one and list it. Contract text is written in W19-05. Property names in the state are camelCase. Seconds left are computed on the C# side from the clock; `Tick` posts a fresh `farm` state at most every 30 seconds while the Home page is open. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. State key `farm`: `{ unlocked, plots: [ { index, cropId, state: empty|growing|ripe, watered, secondsLeft, yield } ], orchard: [ { slot, cropId, stock, secondsToNext } ], crops: [ { id, name, icon, kind, unlocked, seedItem, seedOwned, growMinutes, yield, sellPrice, unlockHarvests } ], tools: { canId, plotsPerWater, sprinkler }, upgrades: { nextPackCost, nextOrchardCost, nextCanCost, sprinklerCost }, harvests }`
2. Messages: `farm_plant { plot, cropId }`, `farm_water { plot }`, `farm_harvest { plot }`, `farm_harvest_all {}`, `orchard_plant { slot, cropId }`, `orchard_harvest { slot }`, `farm_buy { what: pack|orchard|can|sprinkler, id }`.
3. Unknown ids and indices are ignored; every result maps to a short English toast ('Not enough clovers', 'Not ready yet', ...); after each message post fresh state. Returns true for handled messages only.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
