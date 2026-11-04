# W17-06: MarketStock: daily specials and orders
Zmieniaj: src/Cuy.Core/World/MarketStock.cs, tests/Cuy.Core.Tests/MarketStockTests.cs
Wymagane: src/Cuy.Core/World/MarketStock.cs, tests/Cuy.Core.Tests/MarketStockTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: A pure generator makes the day's special offers and the two orders deterministically from the date.
Depends on: W16 merged.
Facts: Specials: `special_offers.slots` (3, plus `extra_special_slots` of the big stall), 20 percent off, chosen from `pool` categories (decor/placeable items, seeds, toys) by a `Random` seeded from the date; the discounted price never goes below the item's sell value (placeables are not sellable; seeds: not below `seed_price * 0.5`). Orders: `orders.per_day` (2) once harvests >= `unlock_harvests` (30): each asks for 2 units of a random unlocked annual crop, pays `round(sell_price * count * reward_factor)` (1.15), orders do not lower demand but count toward the daily cap. Generating the same date twice gives the same result. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `static class MarketStock`: `IReadOnlyList<SpecialOffer> Specials(string localDate, MarketConfig, int stallLevel, WorldItemCatalog, FarmConfig, ItemCatalog)`, `IReadOnlyList<OrderState> Orders(string localDate, MarketConfig, FarmConfig, int harvestsDone)`, `int OrderReward(OrderState, FarmConfig, MarketConfig)`.
2. Tests: determinism per date, different dates differ for at least one of 30 dates; slot counts 3 and 5 with the big stall; discount 20 percent; no orders below 30 harvests, two at 30; reward for 2 parsley (sell 4) is 9; orders only for unlocked annual crops; no duplicates in one day's specials.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
