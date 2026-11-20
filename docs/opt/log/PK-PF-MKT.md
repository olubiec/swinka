# PK-PF-MKT Log
- Modified: `web/home/features/market/feature.js`, `web/home/features/market/feature.css`.
- Specialized `#marketStallPanel` headers with pixel-art SVG badges for `seeds`, `food`, `toys`/`craft`/`decor`, `orders` (`stall:orders`), and `sell`.
- Added `.stall-mode-tab` (`Buy`/`Sell`/`Orders`), preserved `.stall-cat-tab` with `.is-specialty` marker, and added `Toys`/`Decor` sub-toggle (auto-selects `decor` when `buyable` has no `toy`/`toys` items).
- Added Market Orders view (`state.market.orders`, `In bag: X/Y`, clover reward, `Deliver` sending `market_fill_order`) plus `Orders` tab in the sidebar market panel.
- Added `In bag: X` display to all buy and sell rows via defensive inventory/sellable lookup.
- Added capture-phase `document` `pointerdown` outside-click close with `nowMs() - openedAt > 80` guard.
- Verify: `node --check web/home/features/market/feature.js` PASS (exit 0); `node tools/qa/ux-p60-hotspots-adv.js` exit 0 (10 PASS, 6 DEFECTs: H1 expects legacy titles `'Seeds & tools'`/`'Pantry'`/`'Home & garden'`/`'My stall'`; H2/H8/H9/H12/H13 outside scope).
- Gap: `tools/qa/ux-p43-market.js` does not exist on disk (`MODULE_NOT_FOUND`, exit 1); not created as outside `Zmieniaj`.
