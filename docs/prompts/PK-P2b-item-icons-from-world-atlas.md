# PK-P2b: Unique item icons in shop, store and decor (package, wave P2)
Zmieniaj: web/home/features/shop/feature.js, web/home/features/store/feature.js, web/home/features/decor/feature.js, web/home/style.css, tools/qa/check-assets.js, tools/qa/ux-p2-icons.js, docs/opt/log/PK-P2b.md
Wymagane: tools/qa/ux-p2-icons.js
Weryfikacja: node --check web/home/features/shop/feature.js && node --check web/home/features/store/feature.js && node --check web/home/features/decor/feature.js && node --check tools/qa/check-assets.js && node --check tools/qa/ux-p2-icons.js && node tools/qa/ux-p2-icons.js && node tools/qa/check-assets.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report: "All item icons in the shop look the same." Diagnosis: in `assets/data/items_decor.json` and `items_farm.json` many items share one icon id (`wallpaper` x5, `floor` x4, `rug` x3, `plant` x3, `picture_frame` x3, `lamp` x2, `seed` x11, `sapling` x4), so the shop shows identical pictures. Give every item its own picture without drawing new art: use the item's sprite from `assets/world/atlas.json` (`items.<id>.file`, e.g. `house/sofa_cosy.png`) when it exists, and the item's `look` colour (wallpaper/floor/rug) otherwise.
Depends on: P1 merged.

## Steps
1. Test first: `tools/qa/ux-p2-icons.js` using `tools/qa/lib/ux.js` (PASS/FAIL, exit 1 on FAIL or page error). Run before the fix and note failures in the log.
   - I1 `shop-icons-unique`: openShop (`#btnShop`), for each tab (Food, Toys, Home, Care) collect each row's icon descriptor (`<img src>` or canvas `toDataURL` or CSS class + inline colour); within a tab no two rows with different item ids share the same descriptor, except items explicitly listed in `docs/qa/` ... (none: if two items truly must share, list them in the log and make the test accept exactly that list).
   - I2 `store-icons-unique`: same for the store/stash feature (`store`) rows.
   - I3 `decor-icons-unique`: same for the Decorate panel item buttons.
   - I4 `no-broken-images`: every `<img>` in those views has `naturalWidth > 0`, no 404.
   - I5 `icon-scale`: icons are pixel-art, `image-rendering: pixelated`, rendered at an integer multiple of the source size (e.g. 32x32 box for a 32x32 PNG, never a fractional scale), centred, not cropped.
2. Add one shared helper in `shop/feature.js` (exported as `window.CuyItemIcon.html(item, size)`): resolve order: (1) world atlas sprite for `item.id` (fetch `assets/world/atlas.json` once, cache; use `api.assetUrl('world/' + file)`), (2) `item.look` swatch (small coloured square with the colour from the item's `look`/palette: wallpaper, floor, rug), (3) existing `pixel-icon` class by `item.icon`. `store/feature.js` and `decor/feature.js` use the same helper (they load after `shop`; guard `if (!window.CuyItemIcon)` with the old behaviour). CSS in `web/home/style.css` under a new block `/* item icons */`: box, `image-rendering: pixelated`, `object-fit: contain`.
3. `tools/qa/check-assets.js`: add a check "item icons": every item in `assets/data/items*.json` and `world_items.json` resolves to a picture by the order above, and report (as a failure) two different items of the same category whose resolved picture is the same file/colour. Add it as a separate function with its own `--icons` flag AND run it in the default run. Do not weaken existing checks; `known-missing-assets.json` is not edited.
4. Verification line; fix until green. Log (max 10 lines): how many items had duplicates before, after.
Prohibited: changing or deleting existing test assertions, new dependencies, new PNG files, editing `assets/data/*.json`, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P2b.md` (max 10 lines). Do not run git.
