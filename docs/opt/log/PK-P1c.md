# PK-P1c: "Decorate" opens the room editor log
- Cause: decor_equip had no web mock handler, and owned decor items had no placement action wired to rooms feature.
- Scenarios failed before fix: decorate-opens-room-editor (label "Mushroom lamp" instead of "Place in room"), place-and-save (room editor not opening from decor), no-dead-buttons (no state/canvas/DOM change on decor_equip).
- Fix decor/feature.js: owned unplaced decor shows "Place in room" and opens rooms feature with {edit: true, place: id, from: 'decor'}; added mock handler for decor_equip.
- Fix rooms/feature.js: handles arg.from === 'decor' and arg.place, opens pig room with item preselected and .placing-item marker; Back button returns to Decorate; pointerdown allows placing on free/occupied cells with toast.
- Fix rooms/mock.js: added lamp_mushroom to CATALOG, syncs inventory to owned items, equips lamp on room_place.
- Left undone: full stash, physics and free placement are deferred to waves P6/P7.
