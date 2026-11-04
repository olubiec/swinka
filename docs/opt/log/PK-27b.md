# PK-27b log
- W27-06 done: web/home/features/rooms/plan.js and plan.css created. window.HousePlan.mount(container, ctx) draws a canvas cutaway; rooms and pigs are real buttons (keyboard), Enter selects, hover/focus shows name and comfort (sum of catalog comfort unless rooms.comfort[id] is set).
- Decision: items in miniatures are coloured blocks, not atlas sprites (allowed by the item; avoids loading atlas per window). Palette copied from feature.js; style_palette.json and STYL_SWIATA.md not read (package scope).
- Difference: plan pig dots use homes.pigs[].location (per W27-06); the chip uses pigs[].room/mode (per W27-08, contract docs/contracts/homes.md).
- Difference: ctx carries extra keys state (= st.rooms), homes, places, dorm, assetUrl (optional), select. Needed for locks and prices, which live outside the rooms object.
- W27-08 done in feature.js: 'House plan' button; plan.js and plan.css loaded on demand; overlay (Esc closes card, then plan); pig click (document event room-pig) opens a card with portrait, activity, and the switch 'Roam the house' / 'Stay in <room>' sending pig_home.
- Skipped per package override: RoomResidents.attach and residents.js (W27-07 deferred); bridge.js not touched.
- mock.js: state homes (adopted pigs, slot-based location and activity, choices in st.homeModes) and pig_home with validation; recomputed on each rooms mock message. Memorial and unknown pigs ignored silently; unusable room gets toast 'That room is not available'.
- Not done: no in-browser check of the overlay itself beyond web-smoke; no arrow-key navigation between windows (Tab order only).
- Verification: node --check passed for plan.js, feature.js, mock.js; web-smoke WEB SMOKE OK (exit 0).
