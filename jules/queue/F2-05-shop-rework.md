# Task F2-05: Shop rework – categories, new items, prices from the catalog, toasts

Read `AGENTS.md` and `jules/contracts.md` (sections **shop** and **generic**) first and follow them exactly.
Requires F1-01 (items_*.json + plugins), F1-06 (economy), F1-08 (RefusesTreats/RecordTreat), F1-13 (icons) merged.

## Goal
"There is nothing to spend clovers on." Give the shop real depth: categories, more food, toys with lasting effects,
care products, and later decor (F2-06 adds decor items; this shop shows them automatically via the catalog).

## Files you may change / add
new `assets/data/items_shop.json`, new `src/Cuy/dotNet/Features/ShopFeature.cs`, new `web/home/features/shop/feature.js`,
new `web/home/features/shop/feature.css`, `web/home/app.js`, `src/Cuy/dotNet/HomeWindow.cs`.

## New items (items_shop.json, same fields as items.json; icons from F1-13)
| id | category | price | effects / rules |
| --- | --- | --- | --- |
| dandelion | vegetable | 6 | fullness 6, vitamin_c 12, mood 3 |
| apple | treat | 10 | fullness 6, mood 8, daily_limit 1 (sweet) |
| strawberry | treat | 15 | fullness 4, mood 12, vitamin_c 10, daily_limit 1 (sweet) |
| vitamin_drops | care | 25 | vitamin_c 40 (into the water), daily_limit 1 |
| hay_ball | toy | 80 | one-time; unlocks play: mood 10, teeth 5 (cooldown 900 s) |
| chew_bridge | toy | 120 | one-time; teeth decay -25 % (Balance multiplier, read by Core later; for now stored) |
| cuddle_cup | equipment | 200 | one-time; sleep energy +20 % |
| hammock | equipment | 350 | one-time; sleep energy +30 %, mood +5 after naps |
Existing prices stay (items.json). Add `"one_time": true` to toys/equipment in items_shop.json; do not edit items.json.
The vitamin C values in this table are game values on the 0-100 need scale, not veterinary amounts: never show them as mg and do
not say in any description that dandelion is rich in vitamin C (R8.1 found no value for it).

## C#
1. `ShopFeature : HomeFeatureBase`, `Id = "shop"`: `AddState` → contract `shop` object built from the merged catalog
   (`ItemCatalogLoader.GetAll()` or Core `ItemCatalog.Default`), owned counts from `pet.State.Inventory`, `boughtToday`
   from a per-day counter you keep in `pet.State.Stats.Counters["bought_<id>_<yyyyMMdd>"]` (prune entries older than 7 days).
   `HandleMessage("buy")`: price from the catalog only; refuse when: unknown id, price <= 0, unlimited item, one-time item
   already owned, daily limit reached, not enough clovers (`pet.TryPay(price, "shop")`); on refusal post page message
   `{ type: 'toast', text: '<reason>' }`; on success add 1 to the inventory, `Count("purchases")`, toast
   `Bought <name>!`, save.
2. `HomeWindow.cs`: remove the old `case "buy"` and `HandleBuy` (now in ShopFeature); in `HandleFeed`: if
   `pet.RefusesTreats` and the item is a treat/vegetable → do not consume, post toast "Ouch, teeth hurt – see the vet";
   after eating a `carrot`/`apple`/`strawberry` call `pet.RecordTreat(id)`; respect `daily_limit` for eating too
   (counter like above with prefix `ate_`). Food category check: include the new categories (`care` items are given
   through Feed as well: vitamin_drops).

## Web
1. `features/shop`: tabs Food · Toys · Home · Care (from `state.shop.categories`, decor items appear under Home), item
   cards like today's shop (icon x1_5, name, description, price with clover, button Buy / Owned / Limit today), clover
   balance on top. Register `{ id: 'shop', title: 'Shop', icon: 'icon-clover', order: 5 }`. Mock: build items from
   a small demo list.
2. `app.js`: the main **Shop** button opens `CuyHome.openFeature('shop')` (remove `openShopModal` and its hardcoded
   list); the food drawer list `FOODS` gets dandelion, apple, strawberry, vitamin_drops; add a global toast:
   `CuyHome.api.onMessage('toast', m => showToast(m.text))` with a small pixel toast at the bottom of the window for 2.5 s
   (style in feature.css of shop is not global – put the toast style inline in app.js or a `<style>` it injects).
3. Home health bar: if `state.vet && state.vet.healthDisplay` exists use it instead of `needs.health` (see F2-04).
   (Read `healthDisplay` from the top-level state key `vet` if F2-04 put it there; support both `state.healthDisplay`
   and `state.vet.healthDisplay`.)

## UI and wording rules (R1, R8)
- Own CSS only (`web/home/style.css` and `features/shop/feature.css`). Do NOT add NES.css or any CSS kit (R1.2: no range slider, no
  toggle; R1.1: unmaintained).
- In the Care tab a static note "Never feed: onion, garlic, chives, leeks, chocolate, avocado, potato, rhubarb. Sweet or fatty treats
  only now and then." (R8.4: RSPCA NSW, Wood Green). Do not put spinach on this list (sources disagree).
- No mg figures and no weight-loss numbers in any shop text.

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`, Core tests, `node --check` on changed JS,
  smoke test with `"shop"` temporarily in `features/index.json` (revert before commit).

## Gotowe pliki
None: no ready-made code exists for this task.

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC: nothing UNVERIFIED depends on this task. In the PR: screenshot of the Care tab with the note.

When done, open a pull request against `main` titled `F2-05: Shop rework and new items`.
