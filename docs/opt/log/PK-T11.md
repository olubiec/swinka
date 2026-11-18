# PK-T11: End-to-end player journeys on the mock
Result: 5 PASS (J4, J6, J7, J8, J10), 4 DEFECT (J1, J2, J5, J9), 1 SKIP (J3).
- DEFECT J1: Buying `lamp_floor` and sending `room_place` in `salon` did not place or persist the lamp after reload (`placed=false, after=false`).
- DEFECT J2: Sending `room_skin` for `salon` (`wall: 'sage'`) did not update or persist `layouts.salon.wall` (`undefined`).
- DEFECT J5: Sending `buy_item` (`hay`, qty 1) did not change `clovers`/`coins` (remained `48 -> 48`).
- DEFECT J9: `ux.openMore(page)` timed out because `#modalBackdrop.active` was already open and intercepted pointer events.
- SKIP J3: `CuyPlaces.setScene` is not available on `window.CuyPlaces`.
Decisions: Used `{ channel: 'msedge', headless: true }` fallback in `ux-p67-journeys.js` and `window.bridge.mockReset()` at start.
