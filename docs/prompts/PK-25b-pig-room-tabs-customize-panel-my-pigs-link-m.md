# PK-25b: Pig room tabs, customize panel, My Pigs link, mock
Zmieniaj: web/home/features/rooms/mock.js, web/home/features/rooms/feature.js, web/home/features/rooms/feature.css, web/home/features/rooms/customize.js, web/home/features/rooms/customize.css, web/home/features/pigs/feature.js
Wymagane: web/home/features/rooms/mock.js, web/home/features/rooms/feature.js, web/home/features/rooms/customize.js, web/home/features/pigs/feature.js
Weryfikacja: node --check web/home/features/rooms/mock.js && node --check web/home/features/rooms/feature.js && node --check web/home/features/rooms/customize.js && node --check web/home/features/pigs/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W25-07, W25-04, W25-05, W25-06
Goal: Pig room tabs, customize panel, My Pigs link, mock.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W25-07: Mock bridge: pig rooms, variants, storage, transfer
Files of this item: web/home/features/rooms/mock.js
Goal: The browser mock reproduces the pig rooms.
Depends on: W24 merged.
Facts: Extend the mock of W20-08. Add `rooms.pigRooms` for the five named pigs (Kuki and Ned adopted, one memorial in a `?memorial=1` switch), their layouts (10x6, starter items and the signature item at fixed cells), `variantNames`, `storage` with 3 spare items, and handlers `room_variant`, `room_rename` (24 chars), `room_transfer`, `place_upgrade` for `pig:` ids (costs 400, 900). Keep `?world=1` working and add the same state to it.
Steps:
1. Implement without changing existing mock keys.
Package override (wins over anything above): Do this FIRST. Do not edit `bridge.js`: extend `features/rooms/mock.js` (created in PK-20a) with `registerMockHandler` / `registerMockState`.

## Item W25-04: Rooms page: one tab per room with portraits and level-up
Files of this item: web/home/features/rooms/feature.js, web/home/features/rooms/feature.css
Goal: The rooms page shows tabs for the shared rooms and for every pig's room.
Depends on: W24 merged; state from W25-01 is planned (`rooms.pigRooms`).
Facts: The page `features/rooms/feature.js` (W20-02) draws one room at a time. Add a tab row above the canvas: shared rooms first (Living room, Bedroom, Playroom when unlocked), then one tab per entry of `rooms.pigRooms` (portrait 24x24 circle from `portrait`, name from `displayName`; memorial rooms get a small candle icon `.icon-candle`, quiet colours). Tab click switches the edited layout (`rooms.layouts[roomId]`). Above the canvas show the room name (click opens rename in `customize.js`) and a level button 'Bigger room - N clovers' that sends `place_upgrade { id: roomId }` (disabled with the missing amount). The customize panel is loaded from `customize.js` (W25-05, same wave): call `window.RoomCustomize && RoomCustomize.mount(container, ctx)` after each render, `ctx = { state, roomId, send }`; when it does not exist nothing breaks. Keyboard accessible (arrow keys between tabs, `role='tablist'`). Text English.
Steps:
1. Implement the tabs, name header and level button; keep all existing behaviour of the editor.
2. No layout problems at the smoke sizes.

## Item W25-05: Customize panel: skins, item colours, name, storage and transfer
Files of this item: web/home/features/rooms/customize.js, web/home/features/rooms/customize.css
Goal: The player can recolour any placed item, change wallpaper and floor from owned skins, rename the room and move items between rooms.
Depends on: W24 merged; mounted by W25-04 in the same wave through `window.RoomCustomize.mount(container, ctx)`.
Facts: Export `window.RoomCustomize = { mount(container, ctx) }` (`ctx = { state, roomId, send }`, state is the `rooms` object). Panels: (1) Selected item: four colour swatches (`variantNames` from state; a locked variant shows a small padlock and its price `variantPrices[itemId][variant]` and the click sends `room_variant_unlock { itemId, variant }` after a confirm; the swatch shows the ramp colours from `lib/palette.js` if available, else plain squares) sending `room_variant { place, uid, variant }`, plus Flip/Remove. The selected uid is announced by the editor through a `CustomEvent('room-select', { detail: { uid } })` on `document` (feature.js dispatches it in W25-04; if no event arrives show 'Click an item to change it'). (2) Walls and floor: owned wallpapers/floors (from `rooms.skins`) as small swatches, send `room_skin { room, slot, itemId }`. (3) Name: text input (24 chars) sending `room_rename { place, name }`; reset button. (4) Storage: list of `storage` with counts and a 'Put in this room' button (sends `room_place` at the first free cell the C# side finds: send `x: -1, y: -1` meaning auto, document it in the PR) and a 'Move here from ...' select for placed items of other rooms (`room_transfer`). Text English, escape all text.
Steps:
1. Implement the four panels and the styles (palette variables only).
2. The module must be harmless when a message is rejected (the server toasts).

## Item W25-06: My Pigs: 'Visit room' link
Files of this item: web/home/features/pigs/feature.js
Goal: Every pig card links to its own room (or memory room).
Depends on: W24 merged.
Facts: State `pigs.roster[]` gets `roomId` from `rooms.pigRooms` (join by pigId in JS). Add a small link 'Visit my room' (for memorial pigs 'Visit the memory room') that opens the rooms feature on that tab (use the navigation call used by the places bar in `app.js`, W20-01, with `{ feature: 'rooms', room: roomId }`; read `app.js` for the real call). Hide the link when `rooms.pigRooms` is missing.
Steps:
1. Add the link; text English, warm.
