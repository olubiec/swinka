# W2-06: New life-stage care items (data)
Goal: seniors and teeth care get their own items, defined only in data.
Depends on: nothing new (the shop rework is on main).
Change: `assets/data/items_shop.json`, `assets/data/items.json` (only missing effects), `BRAKUJACA_GRAFIKA.md` (list of missing icons), new `tests/Cuy.Core.Tests/StageItemsDataTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. Add items (English ids, prices and effects only in JSON): `soft_pellets` (senior/legend: fullness up, no teeth wear), `warm_house_bed` (senior/legend, category decor, slot `house`, energy and sleep bonus), `dental_chew` (teeth +20, price 20 clovers), `vitamin_mix` (vitamin_c +25, senior/legend only, cheaper than peppers), `carrot_top` (vitamin_c +10, low price). Each item gets `"stages": [...]` where the plan says so (soft_pellets, warm_house_bed, vitamin_mix: `["senior","legend"]`).
2. Icons: use an existing icon id from `assets/icons/icons.json`; if none fits, use the closest one and list the missing art in `BRAKUJACA_GRAFIKA.md` (do not draw art).
3. Test: every new item loads through the existing catalog loader, has a price or is marked unbuyable, its icon exists, and `stages` values are valid stage ids. The catalog stage filter itself is W3-06.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
