# PK-U1 Log
- Implemented pure UMD `web/home/features/places/edit-history.js` (`window.EditHistory` / `module.exports`).
- API: `MAX_HISTORY=50`, `create(opts)` -> `{ push, resolvePlacedUid, undo, redo, acknowledge, rollbackPending, clear, counts }`, `snapCell`, `computeComfortDisplay`.
- Message shapes verified against `edit-panel.js`: `room_place`, `room_move`, `room_remove`, `room_flip` (`place`, `uid`/`itemId`, `x`, `y`).
- Decision: `resolvePlacedUid` updates both pending `place` (in undo stack) and undone `remove` (in redo stack), returning `[{ type: 'room_flip', place, uid }]` when `flip: true`.
- Decision: `rollbackPending()` follows R40 (restores entry to prior stack, returns `true`), and supports `{ drop: true }` to skip an unrecoverable op (U8).
- Decision: `snapCell` matches `edit-panel.js:93-136` (wall clamps `[0, cols-cw]` and `y <= floorY0`; floor/outdoor un-clamped, non-finite coords sanitized to `0`).
- Differences: Prompt PK-U1 lists only `edit-history.js` (pure module; wiring into `edit-panel.js`/`edit-panel.css`/`mock.js` listed in R40 §6 is deferred to wiring step).
- Stubs: none needed (pure Node module); verification: `ux-p114-edit-history.js` 11/11 passed.
