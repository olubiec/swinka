# Task F8-04: Care items that matter at each life stage

Read `AGENTS.md` first and follow it. Requires F2-05 (shop rework) and F4-01 merged.

## Goal
The plan says: seniors need soft food and a warm house; teeth need chew sticks and hay; vitamin C comes from peppers,
parsley and kale (cucumber gives little). Make these visible in the shop and in the effects.

## Files you may change
`assets/data/items_shop.json` (add items), `assets/data/items.json` (only effects that are missing), `src/Cuy.Core/ItemCatalog.cs`
only if the loader needs a new category, `src/Cuy.Core/Needs.cs` only if a stage multiplier is needed (new file preferred:
`src/Cuy.Core/Pet.StageCare.cs`), `tests/Cuy.Core.Tests/StageCareTests.cs`, `web/home/features/shop/` (show a stage badge).

## Specification
1. New items (ids in English, canonical list in AGENTS.md updated by you): `soft_pellets` (senior/legend: fullness +, no
   teeth wear), `warm_house_bed` (senior/legend: energy + sleep bonus, category decor, slot `house`), `dental_chew` (teeth +20,
   cost 20 clovers), `vitamin_mix` (vitamin_c +25, only for senior/legend and as a cheaper option than peppers).
   `carrot_top` (vitamin_c +10, price low). Prices and effects only in JSON.
2. Stage rule: items with `"stages": [...]` are visible in the shop only for those stages (others show "Available for seniors"
   as a locked tile). The check is done in Core (`ItemCatalog.IsAvailableFor(stage)`).
3. Teeth: when `teeth` need is below 30, the Feed menu puts chew sticks and dental chew first (Core ranking by need, not hard-coded).
4. Tests: stage filter, teeth ranking picks chew stick at teeth 20, senior cannot buy the junior-only item, prices are from JSON.

## Checks
`dotnet test ... -c Release`; `node --check`; smoke test; build passes.

When done, open a pull request against `main` titled `F8-04: Life stage care items`.
