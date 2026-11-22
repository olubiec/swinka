# PK-PE3 Log
Status: DONE (`node --check web/home/features/places/edit-panel.js`, `node --check tools/qa/ux-p119-edit-wiring.js`, `node tools/qa/ux-p119-edit-wiring.js`: 10/10 PASS).
Decisions:
- Since `web/home/index.html` is outside Zmieniaj, `edit-panel.js` dynamically injects `features/places/edit-history.js` in `ensureEditHistoryLoaded()` if `window.EditHistory` is missing, and lazily instantiates `_history`.
- Every `room_*` edit action (`room_place`, `room_move`, `room_remove`, `room_flip`) pushes to `_history`; `render(state)` compares scene layout signatures to `acknowledge()`, `resolvePlacedUid()` (including cell-to-pixel fallback + awaiting resolution queue for Core/mock coordinate conversion), or `rollbackPending()` / `resyncCanvasThings()` on rejection or error toast.
- Added `#editUndoBtn`, `#editRedoBtn`, `#editResidentsBtn`, `#editComfortMeter`, `Ctrl+Z`/`Ctrl+Y` shortcuts, `Buy` button (`room_buy`) on `owned === 0` cards, `WorldSounds.play(...)` hooks (no-op until `world-sounds.js` is wired), and `CuyEdit.{getShowResidents,setShowResidents,undo,redo,clearHistory,getHistoryCounts}`.
- Styled header with flex-wrap and `--ui-*` / `style_palette.json` colors so `#editDrawer` fits `420x640` without horizontal overflow; preserved `#placesEditBtn` (`Edit`).
Gaps/Deferred: `<script src="features/places/edit-history.js">` and `world-sounds.js` in `web/home/index.html` and `canvas-pig.js` wiring belong to the integration step (`index.html`/`canvas-pig.js` not in Zmieniaj).
