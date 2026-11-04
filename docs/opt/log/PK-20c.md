# PK-20c: market view, orders board, daily specials
- Done: W20-06 (`features/market/feature.js`, `feature.css`): tabs Seeds & tools / Home & garden / Pantry / Sell, steppers, quotes debounced 150 ms, demand meter, cap bar ("will buy N more clovers' worth today" / "has enough for today"), stall level with upgrade, item icon spans.
- Done: W20-07 (`features/market/orders.js`): `window.MarketExtras.render(state, container)` with specials (struck old price), two orders with progress, Deliver enabled only when owned >= needed and the cap leaves room, locked board text with 30-harvest progress. `feature.js` loads orders.js like the loader does and mounts it into `#market-extras`.
- Deviation: the banner is `assets/world/market/stall_basic.png`; `market_stall.png` is not in the repo and the smoke test counts a 404 as an error.
- Deviation: `icon-<id>` classes exist only for some items; the name is always shown next to the icon span.
- Stall upgrade button is included (market_stall is in the state); the spec did not name it.
- Verified: `node --check`; `node tools/qa/web-smoke.js` WEB SMOKE OK; `check-css-vars` and `a11y-check` OK; browser run: sell 1 carrot -> +9 clovers, cap 30 -> 21, demand 1.0 -> 0.9; orders appear at 30 harvests; placing a pot in the living room works.
- Pre-existing, not from W20: `check-icons` reports `icon-pig` missing (pigs feature).
