# PK-20b: garden and park view, farm view
- Done: W20-04 (`features/garden/feature.js`, `feature.css`): Garden and Park tabs (locked one shows padlock + price, two taps to open), decorations by click/drag/right-click/Delete/F with a keyboard cursor, sky colour by local hour, memory corner from `roster` pigs with `memorial`, "Go for a walk" sends `walk {place}`.
- Done: W20-05 (`features/farm/feature.js`, `feature.css`): 6-column plots with farm.png sprites, planting menu (locked crops show "N more harvests"), water / harvest on click, Harvest all, Water all (one message per plot, up to can capacity), upgrades with prices, orchard with Collect and Plant sapling. Countdown is local; no timer sends a message.
- Deviation: farm.json frames are `bed_empty`, `bed_wet`, `soil`, `crop_<id>` (not `plots.*`); the code uses the real names.
- Deviation: `assets/world/walk_scenes.*` is not in the repo and the smoke test counts a 404 as an error, so the walk panel shows a text and sky fallback without requesting the file.
- Open: Cuy.Core has no `walk` handler and sends no `walk_result`; the walk button is UI only until the walk work lands.
- Fix in farm mock (PK-20a file): handlers read `ensureFarm(st)` correctly now; planting, growth and harvest checked in the browser.
- Index: `garden` and `farm` added to `features/index.json` (smoke requires a registered folder with feature.js).
- Verified: `node --check` on changed JS; `node tools/qa/web-smoke.js` WEB SMOKE OK; browser run: plant -> growing -> ripe (mock clock) -> harvest adds 2 to inventory.
