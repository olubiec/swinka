# PK-P40c: Edit mode: move, flip and remove placed items
- `CanvasPig`: attached `setSelection(uid|null)`, selection outline layer (z=99, `#ffd166` 1 px), `debug().selected`.
- `edit-panel.js`: clicking placed item in edit mode selects it; clicking empty canvas or outside edit mode deselects.
- Floating toolbar `#editItemToolbar`: library buttons `Flip` (`#editItemFlipBtn`) and `Remove` (`#editItemRemoveBtn`).
- Drag-to-move: ghost during drag; valid drop dispatches `room_move { place, uid, x, y }` (snapped to 4 px grid).
- Invalid move returns item to original coordinates without sending a move message.
- Dropping on stash drawer (`#editDrawer`) or Delete/Backspace key dispatches `room_remove { place, uid }`.
- `Flip` button dispatches `room_flip { place, uid }`; Escape key deselects without closing the stash drawer.
- Verified with Playwright in `tools/qa/ux-p40-edit-move.js` (scenarios M1-M8 passing).
