# PK-T5 Log: Edit drawer adversarial tests
Results: 14 PASS, 0 DEFECT, 0 SKIP (`D1`..`D14` in `tools/qa/ux-p62-drawer-adv.js`).
Defects: none.
Decisions:
- Used `msedge` channel fallback when launching Playwright Chromium on this machine.
- In D7, tested both stash block (toolbar `#editItemRemoveBtn` + `Delete` key showing fixture toast with 0 `room_remove`) and pointer drag on canvas above `#editDrawer` sending `room_move`.
- In D13, tracked event listeners attached to `window`, `document`, and connected DOM nodes across 30 rapid `CuyEdit.toggle()` cycles.
Status: OK
