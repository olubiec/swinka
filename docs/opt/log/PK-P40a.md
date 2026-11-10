# PK-P40a: Edit mode: Edit button and stash drawer
- Added `window.CuyEdit`: `toggle()`, `isOpen()`, `render(state)`, `itemsFor(state, sceneId)`.
- Added `Edit` button (`.places-edit-btn.ui-btn`) to `#placesBar`, disabled with hint in locked scenes.
- Created `#editDrawer` (`.edit-drawer.ui-panel-wood`) sliding from bottom (1/3 window height) with item cards strip.
- Item cards display resolved sprite `img` from atlas/world assets, item name, and owned count (dimmed when 0 owned).
- `itemsFor` partitions items by scene kind: indoor for rooms/dorm, outdoor for garden/park/farm/market.
- Handled empty state displaying `Nothing to place yet`; Escape key closes drawer; verified no modal created.
- Added `places/edit-panel` to `web/home/features/index.json`.
- Verified with `tools/qa/ux-p40-edit-drawer.js` (all E1-E6 scenarios passing).
