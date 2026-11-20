# PK-RF5 Log
- Status: OK-WITH-NOTE (docs/opt/foundations/RF5.md written; foundation-check.js passed: 5 sections, 15894 chars).
- Missing/excluded inputs: tools/qa/ux-p43-market.js does not exist; places/scenes.js, ux-p60-hotspots-adv.js, and orders.js were excluded by Czytaj tylko.
- Scope note: market/feature.js (541L vs 1-370) and hotspots.js (278L vs 1-100) exceeded stated line ranges; read completely without opening any file outside Czytaj tylko.
- Naming/DOM differences: feature.js uses .market-scene-panel, .market-tab, .market-scene-close, and categories seed/pantry/decor rather than #marketStallPanel, .stall-cat-tab, .stall-mode-tab, .stall-close-btn, food, toys.
- Decisions: preserve dual CSS/DOM selectors for backwards compatibility and filter buyable items via category alias arrays (food->[food,pantry], decor->[decor,toy,toys]).
- Order board & close behavior: classifyInstance in hotspots.js omits fx:market:order_board and scene_hotspots.json has market:[]; designed stall:orders plumbing and capture-phase pointerdown close (>80ms openedAt guard).
- Deferred to implementation: measure exact canopy/order_board coordinates in places/scenes.js for drawMarketSignboards(ctx, state) and verify state.market.orders / market_fill_order in orders.js & C#.
