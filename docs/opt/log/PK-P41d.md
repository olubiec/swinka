# PK-P41d: Coloring: one working Back arrow
- Decisions: Removed custom `.back-btn` and `.back-gallery` from Coloring (`renderPack` and `renderShell`); hid classes in `feature.css`.
- Back routing: Intercepted `.modal-back` clicks in capture phase inside `coloring/feature.js` to navigate subviews (picture -> pack/list, pack -> list), allowing root-level Back clicks to bubble to `app.js` (list -> More).
- Differences from plan: Intercepted Back via DOM capture listener inside `coloring/feature.js`, avoiding modifying `app.js` which is outside `Zmieniaj`.
- Test suite: Created `tools/qa/ux-p41-coloring.js` implementing C1 (`list-one-back`), C2 (`picture-one-back`), C3 (`back-chain`), C4 (`x-closes-all`), C5 (`same-asset`).
- Status: All 5 scenarios pass cleanly.
