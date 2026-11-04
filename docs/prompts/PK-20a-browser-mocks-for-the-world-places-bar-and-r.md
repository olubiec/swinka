# PK-20a: Browser mocks for the world, places bar and room editor
Zmieniaj: web/home/features/rooms/mock.js, web/home/features/farm/mock.js, web/home/features/market/mock.js, web/home/app.js, web/home/style.css, web/home/features/rooms/feature.js, web/home/features/rooms/feature.css, docs/opt/log/PK-20a.md
Wymagane: web/home/features/rooms/mock.js, web/home/features/farm/mock.js, web/home/features/market/mock.js, web/home/app.js, web/home/features/rooms/feature.js
Weryfikacja: node --check web/home/features/rooms/mock.js && node --check web/home/features/farm/mock.js && node --check web/home/features/market/mock.js && node --check web/home/app.js && node --check web/home/features/rooms/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W20-08, W20-01, W20-02
Goal: Browser mocks for the world, places bar and room editor.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-20a.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W20-08: Mock bridge: state and messages for places, rooms, farm, market
Files of this item: web/home/features/rooms/mock.js, web/home/features/farm/mock.js, web/home/features/market/mock.js
Goal: The browser mock reproduces the four new features so they can be tested without the desktop app.
Depends on: W19 merged.
Facts: Follow how `bridge.js` mocks the existing features (state object plus message handlers that mutate it and re-post state). Implement simplified but faithful logic for: places (garden locked 400, farm 600, park 1200), rooms (a 12x7 salon with two items, ownership, collision refusal with the toast text), farm (4 plots, crops with `secondsLeft` that elapse using `Date.now()`, watering, harvest into a mock inventory, upgrades), market (`capLeft` 30 with the demand drop 0.1 per unit and recover on reload, two orders, three specials, quote answers). Numbers can be hard-coded in the mock; the real ones come from Core.
Steps:
1. Extend the mock without changing existing mock keys; add `market_quote_result` handling.
2. Provide a `?world=1` query switch that starts the mock with everything unlocked for screenshots.
Package override (wins over anything above): Do the mock FIRST (the UI items need it). Do not edit `bridge.js`: use `bridge.registerMockHandler` / `bridge.registerMockState` (package PK-00) in `features/rooms/mock.js` (places and rooms), `features/farm/mock.js` and `features/market/mock.js`. Each mock reads `?world=1` itself for the everything-unlocked start. The farm and market UI is built in later packages against these mocks. The room editor extras (undo/redo, snapping) are deferred: do not build them.

## Item W20-01: Places bar: navigation between house, garden, farm, park and market
Files of this item: web/home/app.js, web/home/style.css
Goal: The Home page has a bar with the five places; locked ones show their price and unlock on click.
Depends on: W19 merged (state key `places`, messages `place_unlock`, `place_upgrade`).
Facts: Features are modules in `web/home/features/<id>/` registered in `features/index.json`. NOTE: do NOT edit `web/home/features/index.json` in this task! In wave W20 the directories `features/rooms`, `features/garden`, `features/farm`, `features/market` do not all exist yet; registering them before their `feature.js` files exist causes `web-smoke.js` to fail. Registration will be done in W21-01 once all four feature directories exist. Here: implement a bar element in the page chrome, built from state `places` (name, unlocked, level, unlockCost) and buttons that open the matching feature page: Home -> `rooms`, Garden/Park -> `garden` with a place argument, Farm -> `farm`, Market -> `market`. A locked place shows the padlock icon (existing `.icon-padlock`) and the price; clicking asks for confirmation then sends `place_unlock`. Text is English. Must pass `layoutProblems` at the smoke test sizes. Mock state comes in W20-08.
Steps:
1. Implement the bar and its styles (CSS variables only from the existing palette), keyboard accessible (arrow keys move between places, Enter opens), `aria-label` on every button.
2. Do not remove or rename any existing element or id used by other features or the smoke test.
3. Keep `web/home/features/index.json` untouched (registration is handled in W21-01).

## Item W20-02: Room editor: place, move, flip and remove items on the grid
Files of this item: web/home/features/rooms/feature.js, web/home/features/rooms/feature.css
Goal: The player can arrange items in a room on a visible grid with pixel-art tiles and sprites.
Depends on: W19 merged (state key `rooms`, messages `room_*`).
Facts: State: `rooms.layouts[place]` with `cols`, `rows`, `wallRows`, `wallpaper`, `floor`, `items[]`; `rooms.catalog[]` (items with `w`, `h`, `layer`, `owned`, `placed`, `price`, `icon`). Draw on a `<canvas>` at integer scale (nearest neighbour, 16 px cells).
Assets loading and rendering (incorporating G3, G4, G5 from docs/PLAN.md and docs/KONTRAKT_ASSETOW.md):
- `RoomGrid` loads and caches `../../assets/world/atlas.json` (`../../assets/world/atlas.png`), `../../assets/world/tiles.json` (`../../assets/world/tiles.png`), and pig idle sprites.
- G3 (Tiles): Paint floor tiles (`floor_wood`, `floor_straw`, `floor_fleece`, `floor_grass`, `floor_soil`, `floor_stone`) and walls/fence from `assets/world/tiles.png` + `tiles.json` (`tileSize: 16`, `imageSmoothingEnabled = false`), falling back to solid CSS colors if images aren't loaded yet in headless/mock tests.
- G4 (World items): Draw placed items (`placed: [{ itemId, x, y }]`) by looking up `sprites[itemId]` in `assets/world/atlas.json` and calling `ctx.drawImage(atlasImg, rect.x, rect.y, rect.w, rect.h, gx * tilePx, gy * tilePx, rect.w * scale, rect.h * scale)` (respecting item anchor / footprint), keeping the colored rectangle + 2-letter label as fallback if a sprite key is missing or not yet loaded.
- G5 (Pigs in room/garden): Draw `pigs: [{ id, name, x, y, stage }]` using `../../assets/sprites/portraits/${id}_32.png` or `../../assets/sprites/${stage || 'adult'}/idle.png` (first 64x32 frame scaled down with `imageSmoothingEnabled = false`) plus the name label underneath, falling back to the pixel circle if image load fails.
Interactions: click an owned item in the drawer, then click a cell to place (ghost preview green/red from a local copy of the collision rules, the server decides); drag to move; right click or `Delete` removes; `F` flips; messages `room_place`, `room_move`, `room_flip`, `room_remove`. Text English.
Steps:
1. Implement the canvas grid, drawer with owned items, ghost preview, drag-move and the four actions.
2. Implement asset loading and caching for `atlas.json` / `atlas.png`, `tiles.json` / `tiles.png`, and pig sprites with safe fallbacks (G3, G4, G5).
3. Layout must pass the smoke checks; no console errors in mock mode.
