# RF5: Market Stall Categories, Signboards, Order Board & Outside-Click Close

## 1. Current market stalls and order board state (`market/feature.js`, `hotspots.js`, `scenes.js`)

### `web/home/features/market/feature.js` (541 lines)
- **Category tabs (`TABS`, L7-12)**: Currently defines 4 tabs:
  - `{ id: 'seeds', label: 'Seeds & tools', category: 'seed' }`
  - `{ id: 'home', label: 'Home & garden', category: 'decor' }`
  - `{ id: 'pantry', label: 'Pantry', category: 'pantry' }`
  - `{ id: 'sell', label: 'Sell', category: null }`
  - `buyRows(st, category)` (L219-232) filters `st.market.buyable` strictly by `b.category === category`. There are no `'food'` or `'toys'` categories yet; food/treats use `'pantry'` (or `'seed'`/`'decor'`) and craft/decor items use `'decor'`.
- **Stall-to-tab mapping (`resolveTab`, L130-136)**:
  - `pantry`, `stall:pantry`, `*stall_pantry`, `stall:center`, `*stall_center` -> `'pantry'`
  - `home`, `decor`, `stall:decor`, `*stall_decor`, `stall:right`, `*stall_right` -> `'home'`
  - `sell`, `stall:own`, `*stall_own` -> `'sell'`
  - Fallback (including `stall:left`, `fx:market:stall_left`, `seeds`) -> `'seeds'`.
  - No mapping exists for `order_board`, `fx:market:order_board`, `stall:orders`, or `orders`.
- **Hotspot hook (`handleHotspot`, L179-193)**:
  - Subscribes via `window.CanvasPig.onHotspot(handleHotspot)` (guarded by `P.hotspotSubscribed`).
  - Accepts hotspots only when `isMarketScene()` is true and `hs.kind === 'stall' || /^stall[:_]|^fx:market:stall_/.test(id)`.
  - Calls `openPanel(id || hs.label, hs.rect, hs.uid || hs.id)`.
- **Scene-anchored floating panel (`openPanel`, `renderPanel`, `closePanel`, L359-508)**:
  - `openPanel` creates `<section class="feature-market market-scene-panel ui-panel-wood" role="dialog" aria-label="Market stall">` on `document.body`. It has **no** `id="marketStallPanel"`.
  - `renderPanel()` renders `.market-scene-head` (`.market-scene-title` showing `'My stall'` or `tabDef.label`, `.market-clovers`, and `<button class="ui-close market-scene-close">`), `.market-tabs` with `[data-panel-tab]` buttons (no `.stall-cat-tab` or `.stall-mode-tab`), and `.market-scene-body` (`sellRows` + daily cap + stall upgrade for `'sell'`, `buyRows` otherwise).
  - **Orders gap**: Unlike the sidebar `render()` (L306, L315-320), which renders `<section id="market-extras">` and loads `features/market/orders.js` (`window.MarketExtras`), `renderPanel()` never renders orders or loads `orders.js`.
  - **Outside-click close (L497-505)**: Registers `Escape` `keydown` and uses `setTimeout(..., 0)` to register a **bubble-phase** `document.addEventListener('pointerdown', P.onDocDown)` checking `P.el && !P.el.contains(e.target)`. There is no capture phase and no `performance.now() - openedAt > 80` guard.
  - **Positioning (`resolveAnchorClientRect`, `positionPanel`, L359-411)**: Scales `[x0, y0, x1, y1]` from `256x144` scene space onto `#sceneCanvas, canvas.scene-canvas, #pigCanvas, canvas` `getBoundingClientRect()` and anchors the `310px` panel (`feature.css` L64) left or right of the stall with `8px` margin/gap.

### `web/home/features/market/feature.css` (101 lines)
- `.feature-market .market-tabs` (L14) hardcodes `grid-template-columns: repeat(4, minmax(0, 1fr))`.
- `.feature-market.market-scene-panel` (L61-77) defines fixed pixel-wood modal styling (`z-index: 900`, `width: 310px`). No styles exist for `.stall-cat-tab`, `.stall-mode-tab`, specialty badges, or orders inside `.market-scene-panel`.

### `web/home/lib/hotspots.js` (278 lines) & `assets/data/scene_hotspots.json` (18 lines)
- `KINDS` (L7): `['stall', 'plot', 'orchard', 'shop', 'decor', 'lamp']`.
- `classifyInstance(inst, catalog)` (L40-83): Maps `fx:market:stall_*` `uid`s to `kind: 'stall'`, `id: 'stall:<suffix>'` (i.e. `stall:left`, `stall:center`, `stall:right`) and `stall_basic`/`stall_big` items to `kind: 'stall'`. Slices `label` to `14` chars (L80). **Gap**: `fx:market:order_board` / `itemId: 'order_board'` is unhandled and returns `null`.
- `fromScene(sceneId, staticData, instances, catalog)` (L85-128) merges instance-derived hotspots first, then static entries from `staticData.scenes[sceneId]` whose `id` is not already seen.
- `assets/data/scene_hotspots.json` (L16) currently has `"market": []` (no static hotspots).

### `web/home/features/places/scenes.js` (not inspected)
- Not read (excluded by `Czytaj tylko`). Exact stall canopy pixel coordinates, order board instance metadata (`uid`, `rect`), and existing market render layer structure in `scenes.js` must be verified during implementation.

## 2. Compatibility requirements from `ux-p43-market.js` and `ux-p60-hotspots-adv.js`

- **Audit gap**: `tools/qa/ux-p43-market.js` **does not exist** on disk (`file does not exist`), and `tools/qa/ux-p60-hotspots-adv.js` was excluded by `Czytaj tylko`.
- **DOM & behavior contract required by `PK-RF5` (preserving backwards compatibility with existing `feature.js` selectors and `window.CuyMarket` callers)**:
  - **Panel root**: Add `id="marketStallPanel"` to the `<section>` while keeping classes `feature-market market-scene-panel ui-panel-wood` and `role="dialog"`.
  - **Close triggers**: Close button must carry both `.market-scene-close` and `.stall-close-btn` (plus `.ui-close`). `Escape` key and outside pointerdown must invoke `closePanel()`.
  - **Category tabs (`.stall-cat-tab`)**: Keep all buy category tabs present in the DOM simultaneously (required by `PK-RF5` test `M3` so switching categories inside any opened stall continues to work). Each category button carries `.market-tab.stall-cat-tab`, `role="tab"`, `aria-selected`, `data-panel-tab="<id>"`, and `data-cat="<id>"`.
  - **Mode tabs (`.stall-mode-tab`)**: Provide mode switches (`Buy`, `Sell`, `Orders`) carrying `.stall-mode-tab` and `data-mode="buy"|"sell"|"orders"` (plus `data-panel-tab="sell"` compatibility on `Sell` so existing `P.tab === 'sell'` checks keep working).
  - **Bridge messages**:
    - `market_buy`: `{ type: 'market_buy', itemId, count }` on `[data-buy]` click; `.market-step` clamps `1..10`.
    - `market_sell` + `market_quote`: `{ type: 'market_sell', itemId, count }` on `[data-sell]` click; debounced `150ms` `{ type: 'market_quote', itemId, count }` updating `[data-total="<itemId>"]` from `market_quote_result`.
    - `market_stall`: `{ type: 'market_stall' }` on `[data-stall]`.
    - `market_fill_order`: `{ type: 'market_fill_order', orderIndex }` from the `Orders` view (per `PK-RF5`; exact payload/state shape in `orders.js` and C# `MarketMessages.cs` to be verified during implementation).
- **Hotspot engine requirements (`hotspots.js`)**:
  - Preserve `stall:left`, `stall:center`, `stall:right` IDs and `kind: 'stall'` for `fx:market:stall_*`.
  - Any added `order_board` hotspot must use a valid `kind` in `KINDS` (`'stall'`), valid integer `[x0, y0, x1, y1]` rect (`isValidRect`), <= 14-char `label`, and non-overlapping bounds so `hit()` (`y1` descending, smallest `area`) does not lose it behind `stall_left`.

## 3. Per-stall specialization design (`seeds`, `food`, `toys`/`decor`, plus `orders` board) and outside-click close

### Stall definitions & category normalization
Introduce a `STALLS` descriptor map in `market/feature.js` keyed by normalized stall role, while keeping all category tabs accessible in the DOM:

| Hotspot IDs / Aliases | Stall Title (`market-scene-title`) | Subtitle | Default Mode | Default Category | `buyable` Category Filter |
| --- | --- | --- | --- | --- | --- |
| `fx:market:stall_left`, `stall:left`, `stall:seeds`, `seeds` | `Seed Stall — Farm Seeds` | `Farm Seeds` | `buy` | `seeds` | `['seed', 'seeds']` |
| `fx:market:stall_center`, `stall:center`, `stall:food`, `stall:pantry`, `pantry`, `food` | `Food Stall — Fresh Veggies & Treats` | `Fresh Veggies & Treats` | `buy` | `food` | `['food', 'pantry']` |
| `fx:market:stall_right`, `stall:right`, `stall:craft`, `stall:toys`, `stall:decor`, `decor`, `home`, `toys` | `Craft Stall — Toys & Decor` | `Toys & Decor` | `buy` | `decor` | `['decor', 'toy', 'toys']` |
| `fx:market:order_board`, `stall:orders`, `order_board`, `orders` | `Orders Board — Farm Requests` | `Harvest Orders` | `orders` | `seeds` | n/a (`orders` view) |
| `sell`, `stall:own`, `stall_own` | `My Stall — Sell from Bag` | `Bag & Upgrades` | `sell` | `seeds` | n/a (`sell` view) |

- **Why array category filters**: Existing `feature.js` `TABS` uses `'seed'`, `'pantry'`, `'decor'`, whereas `PK-RF5` uses `'food'` and `'toys'`/`'decor'`. Filtering `buyRows` against a category alias array (`categories.includes(b.category)`) preserves 100% compatibility with existing `st.market.buyable` payloads while supporting `'food'`/`'toys'` items if present.
- **UI hierarchy inside `#marketStallPanel`**:
  1. **Header (`.market-scene-head`)**: Displays specialized signboard icon (`.pixel-icon`), stall title (`"Seed Stall — Farm Seeds"`, etc.), clover counter, and `.ui-close.market-scene-close.stall-close-btn`.
  2. **Mode bar (`.stall-modes`)**: 3 `.stall-mode-tab` buttons (`Buy`, `Sell`, `Orders`). Switching to `Buy` preserves the stall's default category (or last chosen `.stall-cat-tab`). Switching to `Orders` shows `state.market.orders` cards (each with reward clovers, item icon/required count, and `"Fill"` button sending `{ type: 'market_fill_order', orderIndex }`) plus a `"Sell from bag"` button that switches `P.mode = 'sell'` (and reuses/delegates to `window.MarketExtras` if available, or lightweight inline order renderer when `orders.js` is absent).
  3. **Category tabs (`.market-tabs`, visible in `Buy` mode; 3 columns `repeat(3, minmax(0, 1fr))` in `feature.css`)**: Renders all 3 `.market-tab.stall-cat-tab` buttons (`Seeds`, `Food`, `Toys & Decor`) in the DOM. The stall's primary category receives `.is-specialty` (visual badge/highlight) even if the player clicks another tab (`M3` compatibility). Note: keep `.market-tabs` hidden or disabled (rather than removed) only if needed, or keep `.stall-cat-tab` mounted in `Buy` mode and also expose `Buy`/`Sell`/`Orders` via `.stall-mode-tab`. Wait: to ensure `M3` tests can click any `.stall-cat-tab` immediately after opening any stall—including if a test opens `order_board` and clicks a `.stall-cat-tab`—clicking a `.stall-cat-tab` should automatically switch `P.mode = 'buy'` and `P.cat = tabId`, and `.market-tabs` should remain rendered in the DOM across all modes!

### Order board hotspot plumbing (`hotspots.js`, `scene_hotspots.json`, `feature.js`)
1. **`web/home/lib/hotspots.js`**: In `classifyInstance(inst, catalog)`, add a branch before returning `null`:
   - `if (uid === 'fx:market:order_board' || itemId === 'order_board') { kind = 'stall'; id = 'stall:orders'; }`
2. **`assets/data/scene_hotspots.json`**: Under `"market"`, add a static fallback entry `{ "id": "stall:orders", "uid": "fx:market:order_board", "kind": "stall", "rect": [x0, y0, x1, y1], "label": "Orders board" }` (with `[x0, y0, x1, y1]` measured against `places/scenes.js` beside `stall_left`). `fromScene` deduplicates by `id`, so a dynamic instance overrides the fallback if present.
3. **`web/home/features/market/feature.js`**: Extend `handleHotspot` regex to `/^stall[:_]|^fx:market:(stall_|order_board)|^order_board$/` so clicking `order_board` always calls `openPanel`.

### Outside-click close (`feature.js`)
- In `openPanel(...)`:
  - Record `P.openedAt = performance.now();` (remove the `setTimeout(..., 0)` timer).
  - Attach a capture-phase listener on `document` (covers `#pigCanvas` background and all DOM outside `#marketStallPanel`, even if `#pigCanvas` stops propagation):
    ```js
    P.onDocDown = (e) => {
      if (!P.el) return;
      if (performance.now() - P.openedAt <= 80) return;
      if (P.el.contains(e.target)) return;
      closePanel();
    };
    document.addEventListener('pointerdown', P.onDocDown, { capture: true });
    ```
  - In `closePanel()`: remove with `document.removeEventListener('pointerdown', P.onDocDown, { capture: true });`.
  - If the user clicks another stall while `#marketStallPanel` is open and `> 80ms` has passed, capture `pointerdown` closes the old panel and the canvas hotspot handler (`click` / `pointerup`) opens the new stall cleanly.

## 4. Canvas signboard ("szyld") rendering specification in `scenes.js`

- **Placement & call site**: Add `drawMarketSignboards(ctx, state)` in `web/home/features/places/scenes.js`, invoked inside the `market` scene render layer immediately after drawing `stall_left`, `stall_center`, and `stall_right` (before foreground pig/UI overlays). Exact canopy `[x0, y0, x1, y1]` bounds must be read from `scenes.js` during implementation.
- **Shared wooden plaque (`14x12` logical pixels, `256x144` space)**:
  - Compute integer origin per stall: `sx = Math.round((stallRect[0] + stallRect[2]) / 2) - 7`, `sy = Math.round(canopyTopY + fasciaOffsetY)`. Set `ctx.imageSmoothingEnabled = false`.
  - Draw 1px shadow bar below (`rgba(30, 16, 8, 0.35)` at `(sx, sy + 12, 14, 1)`).
  - Draw 1px dark frame (`#3b2416` around `14x12`), warm plank fill (`#9c6b3f`, `12x10`), 1px top highlight (`#b98756` at `y = sy + 1`), 1px bottom bevel (`#744a28` at `y = sy + 10`), and 2 dark nail pixels (`#3b2416`) at `(sx + 2, sy + 2)` and `(sx + 11, sy + 2)`.
  - **Active/hover feedback**: When the stall matches hovered hotspot or open `CuyMarket` stall, draw a 1px `#ffe89a` perimeter highlight around the `14x12` signboard.
- **Per-stall pixel-art emblem (`8x8` centered at `(sx + 3, sy + 2)`)**:
  - **`stall_left` (Seed Stall — green sprout/leaf)**: `2x2` dark soil base (`#4e301b`), 3px green stem (`#2f7d32`), two angled leaf clusters (`#52b748` mid green with `#9be068` top highlight pixels).
  - **`stall_center` (Food Stall — orange carrot)**: 3px green leafy crown (`#3d943c` / `#7cd458`) over a tapered diagonal/vertical carrot body (`#e86f1c` base, `#ff9b3d` highlight edge, `#b84b10` shade edge).
  - **`stall_right` (Craft & Decor Stall — pink ball/star)**: `7x7` rounded play-ball / star ornament in pink (`#e85a90` body, `#ff9ec4` top-left shine, `#a8325f` bottom-right shadow, `#fff0c2` accent stripe/sparkle).

## 5. Prompt fixes

1. **Missing `tools/qa/ux-p43-market.js`**: Referenced as an existing read target and compatibility anchor in `PK-RF5`, but the file does not exist in the repository. Downstream implementation/QA tasks must locate the true market QA script or create `tools/qa/ux-p43-market.js`.
2. **Truncated `Czytaj tylko` line ranges**: `PK-RF5` listed `market/feature.js` `1-370` (actual: `541` lines; `openPanel`/`renderPanel`/`closePanel` live in `371-541`) and `lib/hotspots.js` `1-100` (actual: `278` lines; `fromScene`/`hit` live in `101-278`). Implementation prompts must list full files.
3. **Outdated DOM & category names in `PK-RF5` Step 1**: `feature.js` uses `.market-scene-panel`, `.market-tab`, `.market-scene-close`, and buyable categories `'seed'`, `'pantry'`, `'decor'` — not `#marketStallPanel`, `.stall-cat-tab`, `.stall-mode-tab`, `.stall-close-btn`, `'food'`, or `'toys'`. Downstream prompts should explicitly instruct dual-class compatibility and inspect `assets/data/items_*.json` / C# market definitions for true `buyable` categories.
4. **Missing read targets for implementation**: `PK-RF5` required specs for `scenes.js`, `ux-p60-hotspots-adv.js`, and `orders` (`state.market.orders` / `market_fill_order`) while forbidding reading `places/scenes.js`, `features/market/orders.js`, `tools/qa/ux-p60-hotspots-adv.js`, and C# `MarketMessages.cs`. Implementation packages must allow reading all four.
5. **Missing `Zmieniaj` targets for order board**: Because `hotspots.js` drops `fx:market:order_board` and `assets/data/scene_hotspots.json` has `"market": []`, implementation prompts must include `web/home/lib/hotspots.js` and `assets/data/scene_hotspots.json` alongside `market/feature.js`, `market/feature.css`, and `places/scenes.js`.
