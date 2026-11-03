# W23-07: HomeEconomyConfig (loader for home_economy.json)
Zmieniaj: src/Cuy.Core/World/HomeEconomyConfig.cs, tests/Cuy.Core.Tests/HomeEconomyConfigTests.cs
Wymagane: src/Cuy.Core/World/HomeEconomyConfig.cs, tests/Cuy.Core.Tests/HomeEconomyConfigTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Core loads the rules and prices of item colours, the run, desktop props and roaming.
Depends on: W22 merged.
Facts: Pattern as W16-01. File `assets/data/home_economy.json` (design: docs/PIG_ROOMS.md sections 7-9): `variants{unlock_percent,min_price}`, `skins{pig_skin_price}`, `resale{allowed}`, `roam{slot_minutes,night_from_hour,night_to_hour,default_mode}`, `run{min_cells,cells_per_pig,gate_item,blockers[],max_hours_per_day,day_from_hour,day_to_hour,min_temp_c,max_temp_c,allowed_conditions[],mood_per_hour,mood_cap_per_day}`, `props{max_on_desktop}`. Decorations are never resold: `resale.allowed` must stay false and no code path in this wave sells placeables back. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `HomeEconomyConfig` (sealed; `Current/Load/LoadDefault`; typed properties; `int VariantPrice(int itemPrice)` = 0 when the price is 0, otherwise `max(min_price, ceil(price * percent / 100.0))`; `bool ResaleAllowed`).
2. Load rules (log each): bad JSON gives code defaults equal to the file; percent clamped 1-50; `cells_per_pig` 3-20; `min_cells` at least twice `cells_per_pig`; hours clamped 0-23; temperatures ordered; `mood_per_hour` 0-3, `mood_cap_per_day` 0-10; `blockers` always contain `gate_item`; `max_on_desktop` 1-12; `resale.allowed` forced to false (log if the file says true).
3. Tests: real file values; `VariantPrice(320) == 48`, `VariantPrice(0) == 0`, `VariantPrice(10) == 5`; each clamp; resale forced off; unknown fields ignored.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
