# W18-04: Pet.Market: buy, sell, orders, daily rollover
Zmieniaj: src/Cuy.Core/Pet.Market.cs, src/Cuy.Core/Pet.Economy.cs, tests/Cuy.Core.Tests/PetMarketTests.cs
Wymagane: src/Cuy.Core/Pet.Market.cs, tests/Cuy.Core.Tests/PetMarketTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Pet.cs
Goal: A pet can buy from and sell to the market with the demand meter, the daily cap and orders.
Depends on: W17 merged.
Facts: Behind `Balance.MarketActive`. Selling takes crop items from `Inventory` (only crops from `FarmConfig`), pays `MarketPricing.Sell` clovers with `AddClovers`, counts `units_sold`. Buying: seeds, saplings, foods, placeable items (delegates to `BuyItem` from W18-02 for placeables, so call it through a small interface or just by name), and specials at their discounted price. Orders: `FulfillOrder(int index)` removes the items, pays the reward through the daily cap rules (counts toward `SalesToday`). Daily rollover: `Pet.Economy.cs` already resets daily counters at the local date change; call `MarketPricing.NewDay` from there with a single line. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `SellResult Sell(string itemId, int count)`, `BuyResult Buy(string itemId, int count)`, `BuyResult BuySpecial(int index)`, `bool FulfillOrder(int index)`, `MarketView GetMarketView()` (quotes for each owned crop: unit price now, cap left, demand, specials, orders, big stall level), `bool BuyBigStall()`.
2. Tests: selling 3 dandelions pays the quote and removes them; selling more than owned sells only owned; the daily cap stops at 30; a new local date restores demand by 0.1 and clears `SalesToday`; an order is refused without items and paid with them; specials are 20 percent below the price; flag off disables; `units_sold` counts and `market_regular` pays after 20.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
