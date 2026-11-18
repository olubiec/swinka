# PK-P43c: Market stalls interact in the scene
- API: `window.CuyMarket = { openPanel(stallIdOrCategory, anchorRect, stallUid), closePanel() }`.
- Mapping: `fx:market:stall_seeds`/`stall:seeds`->`seeds`, `stall_pantry`->`pantry`, `stall_decor`->`home`, `stall_own`->`sell` (`market_stall`).
- Panel: floating 9-slice wood frame (`.market-scene-panel.ui-panel-wood`, `.ui-close`), not `.modal`, clamped inside viewport, follows `CanvasPig.getHotspots()` on `onState`.
- Subscribes to `CanvasPig.onHotspot` (in feature, not canvas); More tile `market` entry kept intact sharing `bindMarketEvents`.
- Verification: `node --check web/home/features/market/feature.js`, `node --check tools/qa/ux-p43-market-scene.js`, `node tools/qa/ux-p43-market-scene.js` -> ALL 9 CHECKS PASSED (K1..K9, with `{ channel: 'msedge', headless: true }` fallback and `STUB onHotspot`).
