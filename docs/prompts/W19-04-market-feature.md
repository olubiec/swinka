# W19-04: MarketFeature: quotes, specials, orders and the daily cap
Zmieniaj: src/Cuy/dotNet/Features/MarketFeature.cs
Wymagane: src/Cuy/dotNet/Features/MarketFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home page can show the market and run buying, selling and orders.
Depends on: W18 merged.
Facts: Pattern: `PigsFeature.cs` / `ShopFeature.cs` (class derives `HomeFeatureBase`, `Id`, `AddState`, `HandleMessage`, `Tick`; features are found by reflection; the page gets state via `AddState` and toasts via `HomeWindow.PostToPage`). JS never computes prices, times or rewards: publish ready numbers. Core API names are from W18 (`Pet.*`); if a name differs use the real one and list it. Contract text is written in W19-05. Property names in the state are camelCase. Quotes use `MarketPricing.Quote`: show the total for the count the page asks about by adding an optional `count` to `market_quote { itemId, count }` which answers with a `market_quote_result` page message. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. State key `market`: `{ capLeft, cap, sellable: [ { itemId, name, owned, unitNow, demand } ], buyable: [ { itemId, name, category, price } ], specials: [ { index, itemId, name, price, was } ], orders: [ { index, cropId, count, reward, done } ], stall: { level, nextCost }, clovers }`
2. Messages: `market_sell { itemId, count }`, `market_buy { itemId, count }`, `market_special { index }`, `market_order { index }`, `market_stall {}`.
3. Unknown ids and indices are ignored; every result maps to a short English toast ('Not enough clovers', 'Not ready yet', ...); after each message post fresh state. Returns true for handled messages only.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
