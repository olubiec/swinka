# PK-31a log
- W31-01 done (check-assets.js). Farm crops pass via atlas or icons.json id; items_farm `icon` checked against icons.json; world_items need an atlas entry or a DESIGNER_BRIEF line with "fallback"/"glyph"; pig sheets = sprites/pigs/<id>/<stage>/spritesheet.png + portraits/<id>.png; props relative to assets/.
- Real failures left unfixed (outside the item, art/icon decisions): `icon-shop` has no CSS rule in style.css (icon exists as "shop"); `icon-pig` in features/pigs/feature.css is not in icons.json and has no rule. check-assets exits 1 until those are fixed.
- W31-04 done (lights.js, lights-test.js: LIGHTS OK). No garden period hours found in web/home, so morning 06-10, day 10-17, evening 17-21, night 21-06 constants are used.
- Differences from plan: lights.json has no `window.window_tods` (window has toggle false, no tods), so it is not read; sources match a placed item by key or by `item`; fields keep the spec names (radiusCells, on_file).
- W31-03 done (ui-assets.js: UiAssets.apply(rootElement) returns a promise; 9 --ui-* vars with `initial` + 6 classes in style.css). Separators use background-image, not border-image, because slice is 0 (tiled). shop_panel has no class (not in the list).
- check-css-vars.js fails before and after this change: features/store/feature.css uses undefined --text, --line, --panel, --accent, --muted, --focus (outside Zmieniaj).
- web-smoke OK; its 404 list (feature mock.js files) was already there.
- Nothing undone in the three items except the two icon findings above.
Main agent: added .icon-shop rule to style.css (check-assets finding fixed).
OPEN (outside W31 FILES, not fixed): check-assets: icon-pig used in pigs/feature.css has no icons.json entry and no CSS rule. check-css-vars: store/feature.css uses undefined --text/--line/--panel/--accent/--muted/--focus (from W30b). Both need an owner decision; verify for PK-31a is therefore red on these two.
