# RF6: Farm Plot Popover Close UX, Inventory Stock Counts, and Farm-Market Loop

Scope: `web/home/features/farm/feature.js` (724 lines), `web/home/features/farm/feature.css` (69 lines), `docs/contracts/farm.md` (81 lines), and `tools/qa/ux-p43-farm.js` (missing in repo). Target package: `PK-PF-FRM`.

## 1. Current farm popover structure and why closing & planting are confusing (`farm/feature.js`)

`web/home/features/farm/feature.js` renders two farm UI surfaces:

1. **In-scene anchored overlay (`renderScenePanel`, lines 495-599; `S.overlayEl` on `document.body`)**, opened by `CanvasPig.onHotspot` -> `handleHotspot(hs)` (lines 601-634):
   - `spec.kind === 'plant'`: `<div class="farm-scene-panel" role="dialog" aria-label="Plant on plot N">` with `.farm-menu-head` (`Plot N` + `<button class="farm-btn farm-close" data-scene-close="1">Close</button>`) and `<ul class="farm-crops">`.
   - `spec.kind === 'tooltip'`: `<div class="farm-scene-tooltip" role="status">` with crop timer and `[data-scene-close="1"]`.
   - `spec.kind === 'orchard'` / `'shop'`: `.farm-scene-panel` with `.farm-menu-head` and `[data-scene-close="1"]`.
   - Quick-action strip `#farmSceneStrip.farm-scene-strip.feature-farm` (lines 429-463) sits in `.stage-viewport` with `[data-scene-harvest-all="1"]` and `[data-scene-water-all="1"]`.
2. **Feature-drawer panel (`render`, lines 229-386; inside `S.container`)**:
   - `.farm-panel[data-place="farm"]`, `.farm-grid`, and inline `.farm-menu` (`S.menuPlot !== null`) with `[data-close="1"]` and `[data-plant]`.

### Why closing & planting are confusing
- **Wordy close button**: `.farm-menu-head` uses a text `"Close"` button in a narrow `min-width: 150px; max-width: 240px` (`feature.css` line 60) panel instead of a compact `&times;` icon button.
- **No outside-click or Escape dismissal**: `closeScenePanel()` (lines 465-471) only runs on `[data-scene-close="1"]`, `[data-plant]`, watering/harvesting a plot, or leaving `'farm'` (`syncSceneUI()`, line 658). Clicking `#pigCanvas` empty ground, `.stage-viewport`, or outside `.farm-scene-panel` leaves the `z-index: 40` overlay stuck open.
- **Ambiguous seed count & missing bag stock**: Line 539 renders `${owned} · ${c.growMinutes}m` (only `c.seedOwned`, omitting `"seeds"`). `feature.js` reads `st.clovers` (lines 245, 511) and `c.seedOwned`, never `st.inventory`, so players cannot see how many harvested crops they hold (`In bag: X`) before planting.
- **Dead-end at 0 seeds**: When `seedOwned === 0`, `Plant` is `disabled` with no Market guidance or button to switch to `'market'`.

## 2. Compatibility requirements from `tools/qa/ux-p43-farm.js`

- **Missing file**: `tools/qa/ux-p43-farm.js` does **not** exist in the repo (`read_file` failed: `file does not exist`), so no assertions exist in that file to preserve.
- **Actual vs assumed selectors**: The real PK-P43d code uses different IDs/classes than the `PK-RF6` prompt assumed:

| Prompt-assumed selector | Real selector in `feature.js` | Action for `PK-PF-FRM` |
| --- | --- | --- |
| `#farmPopover`, `.farm-popover` | `.farm-scene-panel` / `.farm-scene-tooltip` in `S.overlayEl` | Keep `.farm-scene-panel` / `.farm-scene-tooltip`; add `id="farmPopover"` and class `farm-popover`. |
| `.farm-popover-head` | `.farm-menu-head` | Keep `.farm-menu-head`; add `farm-popover-head`. |
| `.farm-seed-btn` | `li.farm-crop` + `.farm-btn[data-plant]` | Keep `li.farm-crop` & `[data-plant]`; add `farm-seed-btn` to the plant button. |
| `#farmStripOverlay`, `#farmHarvestAllBtn`, `#farmWaterAllBtn` | `#farmSceneStrip`, `[data-scene-harvest-all="1"]`, `[data-scene-water-all="1"]` | **Keep unchanged**; preserve all `data-*` hooks and `window.CuyFarm` methods (`handleHotspot`, `closePanel`, `drawMarkers`, `syncSceneUI`). |

## 3. Close button (`×`) + outside-click / canvas-click dismissal specification

### 3.1 Markup & CSS
Replace the `"Close"` text button in `renderScenePanel()` (`'plant'`, `'orchard'`, `'shop'`, `'tooltip'`) and in `render()` (`.farm-menu`) with `&times;`:
```html
<!-- In .farm-scene-panel (plant / orchard / shop) -->
<div id="farmPopover" class="farm-scene-panel farm-popover" role="dialog" aria-label="...">
  <div class="farm-menu-head farm-popover-head">
    <span class="farm-popover-title">${title}</span>
    <button type="button" class="farm-popover-close farm-close" data-scene-close="1" aria-label="Close" title="Close">&times;</button>
  </div>
  ...
</div>
<!-- In .farm-scene-tooltip -->
<div id="farmPopover" class="farm-scene-tooltip farm-popover" role="status">
  <span>${esc(name)} &middot; ${fmt(p.secondsLeft)} left</span>
  <button type="button" class="farm-popover-close farm-close" data-scene-close="1" aria-label="Close" title="Close">&times;</button>
</div>
<!-- In drawer .farm-menu: keep data-close="1" with class="farm-popover-close farm-close" -->
```
CSS (`web/home/features/farm/feature.css`, scoped under `.feature-farm`):
```css
.feature-farm .farm-popover-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.feature-farm .farm-popover-title { font-weight: 700; color: var(--ui-wood-1); }
.feature-farm .farm-popover-close {
  width: 22px; height: 22px; min-width: 22px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  border: 2px solid var(--ui-wood-2); border-radius: 4px;
  background: var(--ui-linen-2); color: var(--ui-wood-1);
  font: inherit; font-size: 14px; line-height: 1; font-weight: 700; cursor: pointer;
}
.feature-farm .farm-popover-close:hover { background: var(--ui-linen-1); border-color: var(--ui-wood-1); }
.feature-farm .farm-popover-close:focus-visible { outline: 3px solid var(--ui-moss-1); outline-offset: 2px; }
```

### 3.2 Capture-phase `pointerdown` & `Escape` dismissal
Add `openedAt: 0` and `outsideBound: false` to `S`.
- Stamp `S.openedAt = performance.now()` **only** in `handleHotspot()` when setting `S.scenePanel` (lines 611, 620, 626, 631), **never** inside `renderScenePanel()` (which `syncSceneUI()` re-calls on every `onState`).
- Clear `S.scenePanel = null; S.openedAt = 0;` in `closeScenePanel()`.
- Bind once via `bindOutsideDismiss()` (called from `bindCanvasPig()` and `renderScenePanel()`):
```js
function onOutsidePointerDown(ev) {
  if (!S.scenePanel || !S.overlayEl || !S.overlayEl.isConnected) return;
  if (performance.now() - S.openedAt <= 80) return;
  const popover = S.overlayEl.querySelector('#farmPopover, .farm-popover, .farm-scene-panel, .farm-scene-tooltip');
  if (popover && ev.target instanceof Node && popover.contains(ev.target)) return;
  closeScenePanel();
}
function onDismissKeyDown(ev) {
  if (ev.key !== 'Escape') return;
  if (S.scenePanel) closeScenePanel();
  if (S.menuPlot !== null) { S.menuPlot = null; render(); }
}
function bindOutsideDismiss() {
  if (S.outsideBound) return;
  S.outsideBound = true;
  document.addEventListener('pointerdown', onOutsidePointerDown, true);
  document.addEventListener('keydown', onDismissKeyDown);
}
```
Because `pointerdown` runs in capture phase (`true`), clicking anywhere outside `#farmPopover`—including `#pigCanvas`, `.stage-viewport`, or `#farmSceneStrip`—closes it after the `> 80ms` open guard. Clicking inside `#farmPopover` is ignored; clicking another plot hotspot runs capture `pointerdown` (closes old) then hotspot `click` (opens new with fresh `openedAt`).

## 4. Owned inventory count (`In bag: X`) + `"Go to Market"` specification

### 4.1 Reading `state.inventory` and `state.farm.crops`
Per `docs/contracts/farm.md`, `crops[]` defines `{ id, name, icon, kind, unlocked, seedItem, seedOwned, growMinutes, yield, sellPrice, unlockHarvests }` (planting spends `seedOwned`, not clovers). Support both `{ [itemId]: count }` and `[{ id, count }]` shapes of `st.inventory`:
```js
function inventoryCount(st, itemId) {
  if (!st || !st.inventory || !itemId) return 0;
  const inv = st.inventory;
  if (Array.isArray(inv)) {
    const row = inv.find(x => x && (x.id === itemId || x.itemId === itemId));
    return row ? Math.max(0, Number(row.count != null ? row.count : row.qty) || 0) : 0;
  }
  return typeof inv === 'object' ? Math.max(0, Number(inv[itemId]) || 0) : 0;
}
```
For each unlocked crop `c`:
- `seeds = c.seedOwned != null ? Math.max(0, Number(c.seedOwned) || 0) : inventoryCount(st, c.seedItem)`
- `inBag = inventoryCount(st, c.id)`
- Optional clover cost (`const cost = c.cost != null ? c.cost : c.seedCost`): render/check only if `cost > 0`; otherwise show `Sell ${c.sellPrice}` when `c.sellPrice > 0`.

### 4.2 Planting row + Market loop footer (for both `renderScenePanel` `'plant'` and `render` `.farm-menu`)
```js
const canAfford = cost == null || cost <= 0 || clovers >= cost;
const canPlant = seeds > 0 && canAfford;
const priceMeta = cost > 0 ? ` &middot; ${cost} clovers` : (c.sellPrice > 0 ? ` &middot; Sell ${c.sellPrice}` : '');
return `<li class="farm-crop${seeds === 0 ? ' is-no-seeds' : ''}">
  <div class="farm-crop-info">
    <div class="farm-crop-top"><span class="farm-crop-name">${esc(c.name)}</span> <span class="farm-crop-time">${c.growMinutes}m</span></div>
    <div class="farm-crop-meta"><span class="farm-crop-seeds${seeds === 0 ? ' is-empty' : ''}">Seeds: ${seeds}</span> &middot; <span class="farm-crop-bag">In bag: ${inBag}</span>${priceMeta}</div>
  </div>
  <button type="button" class="farm-btn farm-seed-btn" data-plant="${esc(c.id)}" ${canPlant ? '' : 'disabled'}>Plant</button>
</li>`;
```
Footer below `<ul class="farm-crops">`:
```html
<div class="farm-popover-footer">
  <span class="farm-loop-hint">Harvest crops here &rarr; sell or buy more at Market</span>
  <button type="button" class="farm-btn farm-market-btn" data-go-market="1">Go to Market</button>
</div>
```
Handler on `[data-go-market="1"]`:
```js
closeScenePanel();
S.menuPlot = null;
if (window.CuyPlaces && typeof window.CuyPlaces.setCurrentPlace === 'function') {
  window.CuyPlaces.setCurrentPlace('market');
}
```
CSS (`feature.css`):
```css
.feature-farm .farm-scene-panel { min-width: 220px; max-width: 280px; }
.feature-farm .farm-crop { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.feature-farm .farm-crop-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.feature-farm .farm-crop-top { display: flex; align-items: baseline; gap: 6px; }
.feature-farm .farm-crop-time, .feature-farm .farm-crop-meta { font-size: 11px; color: var(--ui-wood-2); margin-right: 0; }
.feature-farm .farm-crop-seeds.is-empty { color: var(--ui-berry-1, #9b3b3b); font-weight: 700; }
.feature-farm .farm-popover-footer { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 2px dashed var(--ui-wood-3); }
.feature-farm .farm-loop-hint { font-size: 11px; line-height: 1.25; color: var(--ui-wood-2); }
.feature-farm .farm-market-btn { width: 100%; text-align: center; }
```
`positionScenePanel(panel, spec.rect)` runs after `innerHTML` assignment, keeping the widened `280px` panel clamped within `4px` of viewport edges.

## 5. Prompt fixes

1. **`tools/qa/ux-p43-farm.js` does not exist**: Do not instruct `PK-PF-FRM` to check or run `tools/qa/ux-p43-farm.js`; verify syntax (`node --check web/home/features/farm/feature.js`) and actual selectors instead.
2. **File sizes & selector mismatches**: `feature.js` is 724 lines and `feature.css` is 69 lines using `#farmSceneStrip`, `.farm-scene-panel`, `.farm-scene-tooltip`, `.farm-menu-head`, `[data-scene-close]`, `.farm-crop`, `[data-plant]`. Preserve all existing selectors/attributes while adding `#farmPopover`, `.farm-popover`, `.farm-popover-head`, `.farm-popover-close`, `.farm-seed-btn`.
3. **No clover `cost` in `docs/contracts/farm.md`**: Planting consumes `seedOwned` (`seedItem`), not `clovers`; `crops[]` has `sellPrice`. Guard `cost` as optional so `Plant` is not broken by `undefined` cost.
4. **Show both `Seeds` and `In bag`**: Display `Seeds: X` (`c.seedOwned`) alongside `In bag: Y` (`state.inventory[c.id]`) so disabled `Plant` at `0` seeds is clear.
5. **Do not reset `openedAt` on `onState`**: Only stamp `S.openedAt = performance.now()` in `handleHotspot()` so background state pushes do not disrupt the `> 80ms` capture-dismissal guard.
6. **Update both `.farm-scene-panel` and `.farm-menu`**: Keep the scene overlay and feature-drawer planting UI aligned.
