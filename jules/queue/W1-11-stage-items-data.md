Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>".

# W1-11: New life-stage care items (data)
Goal: seniors and teeth care get their own items, defined only in data.
Depends on: nothing (wave start; the shop rework is on main). Facts: `ItemDefinition` has no `Stages` property yet (W2-07 adds it and the filter), so the `stages` field is plain data for now and the test reads it from the JSON directly. There is no decor slot called `house` (slots: wallpaper, floor, rug, plant, picture, lamp), so `warm_house_bed` is an equipment item like `house`, not a decor item.
Change: `assets/data/items_shop.json` (add items), `assets/data/items.json` (only missing effects), `BRAKUJACA_GRAFIKA.md` (list of art wanted), new `tests/Cuy.Core.Tests/StageItemsDataTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, any C# in `src/`.
Steps:
1. Add five items to `items_shop.json`, each copying the shape of the closest existing item (ids, prices and effects only in JSON):
   - `soft_pellets` (like `pellets`): category `food`, fullness up, no teeth effect, `"stages": ["senior", "legend"]`.
   - `warm_house_bed` (like `house`): category `equipment`, `"permanent": true`, animation `sleep_house`, energy and mood up, price above `house`, `"stages": ["senior", "legend"]`.
   - `dental_chew` (like `chew_stick`): category `chew_stick`, `uses` 3, teeth +20, price 20.
   - `vitamin_mix` (like `vitamin_drops`): vitamin_c +25, cheaper than `bell_pepper`, `"stages": ["senior", "legend"]`.
   - `carrot_top` (like `carrot`): category `vegetable`, vitamin_c +10, low price.
   Valid stage ids: `baby`, `junior`, `adult`, `senior`, `legend`. Items without a `stages` field stay available at every stage.
2. Icons: use an existing icon id from `assets/icons/icons.json` (closest match: `pellets`, `house`, `chew_stick`, `vitamin_drops`, `carrot`). Do not draw art. In `BRAKUJACA_GRAFIKA.md` add a short section "Wanted later: own icons" listing the five items and the icon each one borrows.
3. `items.json`: touch it only if a needed effect key is missing there; otherwise leave it unchanged and say so in the PR.
4. `StageItemsDataTests.cs` (use the `RepoFile` helper from AGENTS.md): load `items.json` + `items_shop.json` + `items_decor.json` through `ItemCatalog.LoadJsonFiles` (as `ItemCatalogMultiFileTests.cs` does) and assert the five items exist and have a price (or are marked unbuyable on purpose), their `icon` key exists in `assets/icons/icons.json` (`icons` object), and no id is duplicated. Parse `items_shop.json` with `Newtonsoft.Json.Linq` to check that every `stages` value is one of the five valid stage ids and that the three senior items list exactly `senior` and `legend`.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; the table of the five items (id, price, effects, icon used); screenshot if the change is visual.
