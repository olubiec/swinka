PK-25b log: items W25-07, W25-04, W25-05, W25-06 done in order. node --check OK on all 4 JS files; web-smoke: WEB SMOKE OK (exit 0).
- Pig rooms: rooms.pigRooms for 5 named pigs (kuki, ned adopted); layouts 'pig:<pigId>' 10x6 with a starter plant_pot and a signature catalog item at fixed cells; ?memorial=1 makes Ned a memorial. PIG_LEVELS costs 400, 900 for place_upgrade. Owned counts are raised once so placed and storage items fit.
- Messages: room_place x,y=-1 means first free cell; room_skin reads `room` or `place`; new room_variant_unlock {itemId, variant}, room_rename {place, name} (24 chars), room_transfer {from, place, uid}. Field names of the last three are my choice.
- Tabs: the app has no Bedroom/Playroom ids, so shared tabs are Living room, Garden, Park (when unlocked). Pig tabs show adopted pigs only.
- Customize gets the full state (it reads state.rooms), not the rooms object as the W25-05 text says. Selection uses document 'room-select'.
- app.js was not read (out of scope): My Pigs calls CuyHome.openFeature('rooms', { room }); rooms open accepts a string or {room}. Unverified that openFeature forwards a second argument.
- palette.js was not read: swatches are plain chips from --c-* variables. Storage is a fixed mock list; placing does not change it.
- Level button is only for pig rooms; house upgrade not shown (mock nextLevelCost stays null).
- Left undone: customize.js and customize.css are not in any page include list (index.html is not in Zmieniaj). RoomCustomize is optional, so nothing breaks, but the panel will not show until the host loads them.
