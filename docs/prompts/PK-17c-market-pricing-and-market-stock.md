# PK-17c: Market pricing and market stock
Zmieniaj: src/Cuy.Core/World/MarketPricing.cs, tests/Cuy.Core.Tests/MarketPricingTests.cs, src/Cuy.Core/World/MarketStock.cs, tests/Cuy.Core.Tests/MarketStockTests.cs, docs/opt/log/PK-17c.md
Wymagane: src/Cuy.Core/World/MarketPricing.cs, tests/Cuy.Core.Tests/MarketPricingTests.cs, src/Cuy.Core/World/MarketStock.cs, tests/Cuy.Core.Tests/MarketStockTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W17-05, W17-06
Goal: Market pricing and market stock.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-17c.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W17-05: MarketPricing: demand meter, wiggle, cap, quotes
Files of this item: src/Cuy.Core/World/MarketPricing.cs, tests/Cuy.Core.Tests/MarketPricingTests.cs
Goal: A pure engine quotes and executes sales and purchases with the demand meter and the daily cap.
Depends on: W16 merged (MarketConfig, MarketState, FarmConfig).
Facts: Design: docs/WORLD.md section 5.2 and the simulator `tools/qa/economy-sim.js` (read its sell loop for the intended behaviour). Unit price = `sell_price * (1 + wiggle(date, itemId)) * demand[item]`, wiggle deterministic in -15..+15 percent from the local date string and item id; demand starts at 1.0, each sold unit lowers it by `drop_per_unit` (floor `floor`), each new day raises it by `recover_per_day` (max 1.0). The **total** of one sale is rounded down once (never per unit). The daily cap (30) limits clovers paid per day; a sale that would exceed it pays only up to the cap and sells only as many units as fit; the rest stays with the player. Purchases use the item's `Price` (no wiggle, no cap).
Steps:
1. `static class MarketPricing`: `void NewDay(MarketState state, string localDate, MarketConfig cfg)` (recovers demand, clears `SoldToday` and `SalesToday` when the date changes), `SaleQuote Quote(MarketState, MarketConfig, CropDefinition crop, int count, string localDate)` returning units that fit, total clovers, new demand; `SaleQuote Sell(...)` applying it to the state; `static double Wiggle(string localDate, string itemId, MarketConfig cfg)`; `int CapLeft(MarketState, MarketConfig)`.
2. Tests: the first unit of a fresh crop pays `floor(sell_price * (1+wiggle))`; selling 10 units lowers demand to 0.05 at the floor and the total is rounded once; a new day raises demand by 0.1; the wiggle is the same for the same date and item and always within +-15 percent; the cap stops a large sale and reports fewer units; after the cap `CapLeft` is 0 and `Quote` returns 0 units; `SaleQuote` for 0 or negative counts is empty.

## Item W17-06: MarketStock: daily specials and orders
Files of this item: src/Cuy.Core/World/MarketStock.cs, tests/Cuy.Core.Tests/MarketStockTests.cs
Goal: A pure generator makes the day's special offers and the two orders deterministically from the date.
Depends on: W16 merged.
Facts: Specials: `special_offers.slots` (3, plus `extra_special_slots` of the big stall), 20 percent off, chosen from `pool` categories (decor/placeable items, seeds, toys) by a `Random` seeded from the date; the discounted price never goes below the item's sell value (placeables are not sellable; seeds: not below `seed_price * 0.5`). Orders: `orders.per_day` (2) once harvests >= `unlock_harvests` (30): each asks for 2 units of a random unlocked annual crop, pays `round(sell_price * count * reward_factor)` (1.15), orders do not lower demand but count toward the daily cap. Generating the same date twice gives the same result.
Steps:
1. `static class MarketStock`: `IReadOnlyList<SpecialOffer> Specials(string localDate, MarketConfig, int stallLevel, WorldItemCatalog, FarmConfig, ItemCatalog)`, `IReadOnlyList<OrderState> Orders(string localDate, MarketConfig, FarmConfig, int harvestsDone)`, `int OrderReward(OrderState, FarmConfig, MarketConfig)`.
2. Tests: determinism per date, different dates differ for at least one of 30 dates; slot counts 3 and 5 with the big stall; discount 20 percent; no orders below 30 harvests, two at 30; reward for 2 parsley (sell 4) is 9; orders only for unlocked annual crops; no duplicates in one day's specials.
