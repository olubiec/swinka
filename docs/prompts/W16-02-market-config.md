# W16-02: MarketConfig (loader for market.json)
Zmieniaj: src/Cuy.Core/World/MarketConfig.cs, tests/Cuy.Core.Tests/MarketConfigTests.cs
Wymagane: src/Cuy.Core/World/MarketConfig.cs, tests/Cuy.Core.Tests/MarketConfigTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Core loads the market numbers: demand meter, daily cap, wiggle, specials, orders, stall upgrade.
Depends on: W15 merged.
Facts: Pattern as W16-01. Keys of `assets/data/market.json`: `unlocked_at_start`, `daily_sales_cap_clovers` (30), `demand{drop_per_unit 0.10, recover_per_day 0.10, floor 0.05}`, `price_wiggle_percent` (15), `restock_hour_local` (6), `special_offers{slots 3, discount_percent 20, pool[]}`, `stall_upgrades[{id,extra_special_slots,cost}]`, `orders{per_day 2, reward_factor 1.15, counts_toward_sales_cap, unlock_harvests 30}`. Design: docs/WORLD.md section 5. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `MarketConfig` (sealed) with `Current/Load/LoadDefault` and typed properties for every key (`DailySalesCapClovers`, `DemandDropPerUnit`, `DemandRecoverPerDay`, `DemandFloor`, `PriceWigglePercent`, `RestockHourLocal`, `SpecialSlots`, `SpecialDiscountPercent`, `SpecialPool`, `StallUpgrades`, `OrdersPerDay`, `OrderRewardFactor`, `OrdersCountTowardCap`, `OrdersUnlockHarvests`).
2. Load rules: bad JSON gives code defaults equal to the file's values (comment: used only when the file is missing); clamp `demand.floor` to 0.01-0.5, `drop_per_unit` and `recover_per_day` to 0.01-0.5, wiggle to 0-20, cap to 5-200, restock hour to 0-23 (log each clamp).
3. Tests: real file values; defaults equal the file; each clamp; unknown fields ignored; `recover/drop` ratio between 0.5 and 4 for the real file.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
