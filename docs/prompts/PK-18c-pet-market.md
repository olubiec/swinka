# PK-18c: Pet.Market
Zmieniaj: src/Cuy.Core/Pet.Market.cs, src/Cuy.Core/Pet.Economy.cs, tests/Cuy.Core.Tests/PetMarketTests.cs, docs/opt/log/PK-18c.md
Wymagane: src/Cuy.Core/Pet.Market.cs, tests/Cuy.Core.Tests/PetMarketTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W18-04
Goal: Pet.Market.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-18c.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W18-04: Pet.Market: buy, sell, orders, daily rollover
Files of this item: src/Cuy.Core/Pet.Market.cs, src/Cuy.Core/Pet.Economy.cs, tests/Cuy.Core.Tests/PetMarketTests.cs
Goal: A pet can buy from and sell to the market with the demand meter, the daily cap and orders.
Depends on: W17 merged, W18-01 merged.
Facts: Behind `Balance.MarketActive`. Selling takes crop items from `Inventory` (only crops from `FarmConfig`), pays `MarketPricing.Sell` clovers with `AddClovers`, counts `units_sold`. Buying: seeds, saplings, foods, placeable items (delegates to `BuyItem` from W18-02 for placeables, so call it through a small interface or just by name), and specials at their discounted price. Orders: `FulfillOrder(int index)` removes the items, pays the reward through the daily cap rules (counts toward `SalesToday`). Daily rollover: `Pet.Economy.cs` already resets daily counters at the local date change; call `MarketPricing.NewDay` from there with a single line.
Steps:
1. `SellResult Sell(string itemId, int count)`, `BuyResult Buy(string itemId, int count)`, `BuyResult BuySpecial(int index)`, `bool FulfillOrder(int index)`, `MarketView GetMarketView()` (quotes for each owned crop: unit price now, cap left, demand, specials, orders, big stall level), `bool BuyBigStall()`. Note: W18-01 (`Pet.World.cs`) is already merged before this task runs, so `FarmConfig`, `MarketConfig`, `PlaceCatalog`, `WorldItemCatalog` properties on `Pet` and `EnsureWorld()` already exist on `Pet` — use them directly and do NOT redeclare duplicate properties on `partial class Pet`.
2. Tests: selling 3 dandelions pays the quote and removes them; selling more than owned sells only owned; the daily cap stops at 30; a new local date restores demand by 0.1 and clears `SalesToday`; an order is refused without items and paid with them; specials are 20 percent below the price; flag off disables; `units_sold` counts and `market_regular` pays after 20.
