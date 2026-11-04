# W20-02: Room editor: place, move, flip and remove items on the grid
Zmieniaj: web/home/features/rooms/feature.js, web/home/features/rooms/feature.css
Wymagane: web/home/features/rooms/feature.js
Weryfikacja: node --check web/home/features/rooms/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js
Goal: The player can arrange items in a room on a visible grid with pixel-art tiles and sprites.
Depends on: W19 merged (state key `rooms`, messages `room_*`).
Facts: State: `rooms.layouts[place]` with `cols`, `rows`, `wallRows`, `wallpaper`, `floor`, `items[]`; `rooms.catalog[]` (items with `w`, `h`, `layer`, `owned`, `placed`, `price`, `icon`). Draw on a `<canvas>` at integer scale (nearest neighbour, 16 px cells).
Assets loading and rendering (incorporating G3, G4, G5 from docs/PLAN.md and docs/KONTRAKT_ASSETOW.md):
- `RoomGrid` loads and caches `../../assets/world/atlas.json` (`../../assets/world/atlas.png`), `../../assets/world/tiles.json` (`../../assets/world/tiles.png`), and pig idle sprites.
- G3 (Tiles): Paint floor tiles (`floor_wood`, `floor_straw`, `floor_fleece`, `floor_grass`, `floor_soil`, `floor_stone`) and walls/fence from `assets/world/tiles.png` + `tiles.json` (`tileSize: 16`, `imageSmoothingEnabled = false`), falling back to solid CSS colors if images aren't loaded yet in headless/mock tests.
- G4 (World items): Draw placed items (`placed: [{ itemId, x, y }]`) by looking up `sprites[itemId]` in `assets/world/atlas.json` and calling `ctx.drawImage(atlasImg, rect.x, rect.y, rect.w, rect.h, gx * tilePx, gy * tilePx, rect.w * scale, rect.h * scale)` (respecting item anchor / footprint), keeping the colored rectangle + 2-letter label as fallback if a sprite key is missing or not yet loaded.
- G5 (Pigs in room/garden): Draw `pigs: [{ id, name, x, y, stage }]` using `../../assets/sprites/portraits/${id}_32.png` or `../../assets/sprites/${stage || 'adult'}/idle.png` (first 64x32 frame scaled down with `imageSmoothingEnabled = false`) plus the name label underneath, falling back to the pixel circle if image load fails.
Interactions: click an owned item in the drawer, then click a cell to place (ghost preview green/red from a local copy of the collision rules, the server decides); drag to move; right click or `Delete` removes; `F` flips; messages `room_place`, `room_move`, `room_flip`, `room_remove`. Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the canvas grid, drawer with owned items, ghost preview, drag-move and the four actions.
2. Implement asset loading and caching for `atlas.json` / `atlas.png`, `tiles.json` / `tiles.png`, and pig sprites with safe fallbacks (G3, G4, G5).
3. Layout must pass the smoke checks; no console errors in mock mode.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
