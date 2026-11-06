# PK-P2b
- Item icons: implemented CuyItemIcon with fallback order (atlas file -> look/floor color swatch -> pixel-icon).
- Integer pixel scaling: scaled with crisp pixelated rendering avoiding blur or stretching.
- Duplicates before: store had 100% duplicates (generic icon-item); shop decor shared 6 generic icons across 20 items (14 duplicates); decor buttons had no icons.
- Duplicates after: 0 duplicates in shop, store, or decor (11/20 decor items use distinct atlas sprites, 9/20 use unique color swatches, all world items have unique sprites).
- Decisions: exposed window.CuyItemIcon with ready() callback so shop, store, and decor re-render once atlas.json finishes loading.
- Verification: node --check web/home/features/shop/feature.js && node --check web/home/features/store/feature.js && node --check web/home/features/decor/feature.js && node --check tools/qa/check-assets.js && node --check tools/qa/ux-p2-icons.js && node tools/qa/ux-p2-icons.js && node tools/qa/check-assets.js && node tools/qa/web-smoke.js
- Undone: None.
