# RF4: Item Footprint Collision Grid, Multi-Pig Obstacle Avoidance, and Lamp Hotspot Rectangles

## 1. Grid-cells vs pixels bug in `canvas-pig.js` `rebuildGrid()`

In `web/home/canvas-pig.js` (`550-650`), `rebuildGrid()` builds two synchronized collision structures inside the walk bounds `this.walk || [10, 96, 230, 126]`:
1. `this.standingFootprints` (`560-582`), extracted from `this.things` (skipping `!t || t.flat`, using `t.footprint` directly when provided as a 4-element array).
2. `this.grid` (`585-622`), a `Uint8Array(cols * rows)` of `4x4 px` cells (`cellX0 = c * 4`, `cellY0 = r * 4`) marked `1` only when inside `this.walk` and not overlapping any `blockerRects` (`599-605`) or `standingFootprints` (`608-614`).

`isFree(x, y)` (`625-647`) rejects any point outside `this.walk`, inside `this.blockerRects`, inside `this.standingFootprints`, or on a `0` cell in `this.grid`. Downstream, `CuyPlayTargets.pickReachable` (`1182-1189`) receives `(x, y) => this.isFree(x, y)` and `(sx, sy, tx, ty) => this.findPath(sx, sy, tx, ty)`, and `setTarget(x, y)` (`1223-1260`) checks `this.isFree(clampedX, clampedY)` (`1231`) plus `isSegmentFree` / `findPath` (`1237, 1245`).

### Why `rebuildGrid()` lets pigs walk through furniture and outdoor items

1. **Grid cells treated as pixels (`570-571`)**:
   ```js
   const spw = t.w || t.width || (img && (img.naturalWidth || img.width)) || (t.anchorX ? t.anchorX * 2 : 32);
   const sph = t.h || t.height || (img && (img.naturalHeight || img.height)) || (t.anchorY ? t.anchorY : 32);
   ```
   `t.sw` and `t.sh` are never checked, while `placedThings` provides `t.w` and `t.h` in **furniture grid units** (`1..3` cells, where `1 cell = 16 px`). Because `1..3` is truthy, `spw` and `sph` evaluate to `1..3 px` instead of `16..48 px` (and short-circuit before `t.width` or `img.naturalWidth`).
   - **Concrete effect**: For a `2x2` item (`w = 2, h = 2`, real sprite `32x32 px`) placed at `(120, 110)`:
     - Without `anchorX`/`anchorY`: `ax = Math.round(2 / 2) = 1`, `ay = 2`, producing `fx0 = 119, fx1 = 121` (a `2 px` footprint instead of `32 px`, leaving `15 px` on each side walkable).
     - With pixel anchors (e.g. `anchorX = 16, anchorY = 32`): `dx = 104, fx1 = 106` (pinned to the far left edge) and `dy = 78, fy1 = 80, fy0 = 76` — the `2x4 px` footprint floats **30 px above the floor** (outside `y0 = 96`), blocking zero cells in `this.grid`.
2. **Thin `4 px` footprint height and zero horizontal body padding (`576-580`)**:
   - `fx0 = dx; fx1 = dx + spw; fy1 = dy + sph; fy0 = fy1 - 4;` creates only a `4 px` tall floor strip with `0 px` horizontal margin (`padX = 0`).
   - Because the pig's `(pigX, pigY)` position is its bottom-center anchor, `padX = 0` allows `(pigX, pigY)` up to `fx0 - 1` or `fx1 + 1`, putting roughly half of the pig sprite visually on top of the furniture edge, while a `4 px` tall strip gives minimal vertical depth around tall items.
3. **Compatibility constraint for `ux-p39-blockers.js` and `ux-p50-canvas-wiring.js`**:
   - Per the `Czytaj tylko` / `Nie czytaj` rule, `ux-p39-blockers.js` and `ux-p50-canvas-wiring.js` were not read in this research pass.
   - To remain backward-compatible with callers passing either pixel dimensions (`> 8`) or grid-cell dimensions (`1..8`), `rebuildGrid()` must prefer explicit `t.sw`/`t.sh` first and convert `t.w`/`t.h` only when `<= 8` (`t.w <= 8 ? t.w * 16 : t.w`). Before finalizing `padX` or changing `fy1 - 4`, `PK-PF-CV` must inspect those two test files so no existing test assertion is violated.

---

## 2. Obstacle avoidance gaps in `web/home/lib/scene-pigs.js`

In `web/home/lib/scene-pigs.js` (`1-200`), three gaps explain why secondary scene pigs spawn inside obstacles, aim through furniture, and stall on collisions:

1. **`pickSpawnPoint(b)` (`70-91`) ignores `isFreeFn`**:
   - `create(opts)` (`44-50`) accepts only `rng`, `bounds`, `minGap`, and `speed` (no `isFree`).
   - `sync(list)` (`120-175`) takes only `list` and calls `pickSpawnPoint(bounds)` at line `150` when `!hasPos`.
   - `pickSpawnPoint(b)` runs `SPAWN_ATTEMPTS` (`24`) trials checking only `minDistToOthers(cx, cy, null) >= minGap` (`80-83`). Its fallback (`73-75, 90`) defaults to bounds center `(b[0] + w * 0.5, b[1] + h * 0.5)` or max pig spacing, never testing `isFreeFn`. Thus secondary pigs spawn directly inside placed furniture or blockers.
   - Note: when `hasPos` is true (`146-149`), `sync` clamps explicit coordinates to `bounds`; keeping explicit positions working avoids breaking pinned pigs placed intentionally on props unless explicitly validated.

2. **`pickTarget(pig, b, isFreeFn)` (`93-104`) checks only the endpoint**:
   - Inside `TARGET_ATTEMPTS` (`16`), `pickTarget` checks `if (isFreeFn && !isFreeFn(tx, ty)) continue;` (`99`) and `minDistToOthers(tx, ty, pig.id) < minGap` (`100`).
   - It never checks whether the straight line from `(pig.x, pig.y)` to `(tx, ty)` crosses a blocked footprint or blocker rect. As a result, pigs choose targets on the far side of obstacles and walk straight into them.

3. **Walk step lacks X/Y obstacle sliding (`177-200`)**:
   - Note on symbol naming and read scope: within lines `1-200`, the per-pig step function starting at line `177` is named `stepPig(pig, subMs, b, isFreeFn)` (not `stepWalk`; lines `201-348` were outside `Czytaj tylko` and not read).
   - In `stepPig`, `canStepTo(pig, nx, ny, isFreeFn)` (`106-118`) checks `isFreeFn(nx, ny)` and `minGap` spacing.
   - At `188-199`, arrival checks `canStepTo(pig, ax, ay, isFreeFn)` and resets to `'idle'`. At `200`, mid-walk starts computing `nx = clamp(pig.x + (dx / dist) * stepDist, b[0], b[2])` along the direct vector.
   - When `(nx, ny)` fails `canStepTo`, `stepPig` does not attempt axis-aligned sliding along X `(sx, pig.y)` or Y `(pig.x, sy)` around the obstacle corner, nor does it cleanly abandon an unslideable target with idle reset to avoid freezing in place.

---

## 3. Lamp & fixture hotspot 1x2 px bug in `web/home/lib/hotspots.js` and `web/home/features/places/scenes.js`

### A. `web/home/lib/hotspots.js` (`1-160`)

1. **`1x2 px` hotspot rect in `classifyInstance` (`64-73`)**:
   Actual lines `64-67` read:
   ```js
   var sw = Number.isFinite(inst.sw) ? inst.sw : (Number.isFinite(inst.w) ? inst.w : 16);
   var sh = Number.isFinite(inst.sh) ? inst.sh : (Number.isFinite(inst.h) ? inst.h : 16);
   var ax = Number.isFinite(inst.anchorX) ? inst.anchorX : sw / 2;
   var ay = Number.isFinite(inst.anchorY) ? inst.anchorY : sh;
   ```
   When `inst.sw`/`inst.sh` are absent and `inst.w`/`inst.h` hold grid-cell counts (e.g. `w = 1, h = 2` for a `16x32 px` floor lamp), `Number.isFinite(inst.w)` is `true`, setting `sw = 1` and `sh = 2`.
   - With omitted anchors: `ax = 0.5, ay = 2`, creating `rect = [Math.round(x - 0.5), Math.round(y - 2), Math.round(x + 0.5), Math.round(y)]` — a **`1x2 px` box** instead of `16x32 px`.
   - With pixel anchors (`anchorX = 8, anchorY = 32`): `rect = [x - 8, y - 32, x - 7, y - 30]` — a `1x2 px` sliver at the sprite's top-left corner.
   - Because `hit(list, x, y)` (`142`) tests `x >= r[0] && x < r[2] && y >= r[1] && y < r[3]`, only 2 pixels out of 512 register clicks.

2. **Missing lamp IDs in `isLampItem` (`31-38`)**:
   ```js
   return itemId.indexOf('lamp_') === 0 ||
     itemId === 'fairy_lights' ||
     itemId === 'brazier' ||
     itemId === 'campfire';
   ```
   When `catalog` is omitted or lacks `kind === 'lamp'`, `garden_lantern`, `lantern_post`, and `torch_wall` all return `false`, so `classifyInstance` returns `null` (`61`) and emits no hotspot.

### B. `web/home/features/places/scenes.js` (`210-370` vs `placedThings`)

- **Observed line-drift discrepancy**: In `web/home/features/places/scenes.js` (`795` lines total), lines `210-370` currently contain `load()` (`213-253`), `getHotspotsData()` (`255-275`), `loadHotspots()` (`277-294`), pre-fetch (`297-303`), `getScenesDict()` (`305-324`), `order()` (`326-342`), `neighbor()` (`344-354`), `timeOfDay()` (`356-365`), and `isHouseRoom()` (`367-370+`). `placedThings` has shifted below line `370` and was not read due to `Czytaj tylko` limits.
- **Required fix in `placedThings` (per strip/atlas layout)**: Animated light fixtures such as `campfire`, `torch_wall`, and `brazier` have `frames: 4` in `lights.json`, while `atlas.json` stores the full horizontal strip width in `entry.w`. `placedThings` must divide `entry.w` by `frames` (`sw = Math.round(entry.w / frames)`, `sh = entry.h`) and attach `sw`/`sh` (plus consistent pixel `anchorX`/`anchorY`) to each placed item object so neither `hotspots.js` nor `canvas-pig.js` falls back to grid `w`/`h` (`1..3`) or full 4-frame strip width.

---

## 4. Exact contracts and anchors for `PK-PF-HS`, `PK-PF-SP`, `PK-PF-CV`, and `PK-PF-SC`

### `PK-PF-HS` (`web/home/lib/hotspots.js`)
- **Anchors**: `isLampItem` (`31-38`), `classifyInstance` (`64-73`).
- **Contract**:
  - `isLampItem(itemId, catalog)`: add `itemId === 'garden_lantern' || itemId === 'lantern_post' || itemId === 'torch_wall'`.
  - `classifyInstance(inst, catalog)`:
    ```js
    var sw = (Number.isFinite(inst.sw) && inst.sw > 0) ? inst.sw
      : (Number.isFinite(inst.w) && inst.w > 0 ? (inst.w <= 8 ? inst.w * 16 : inst.w) : 16);
    var sh = (Number.isFinite(inst.sh) && inst.sh > 0) ? inst.sh
      : (Number.isFinite(inst.h) && inst.h > 0 ? (inst.h <= 8 ? inst.h * 16 : inst.h) : 16);
    var ax = Number.isFinite(inst.anchorX) ? inst.anchorX : sw / 2;
    var ay = Number.isFinite(inst.anchorY) ? inst.anchorY : sh;
    ```
  - **Acceptance**: `{ uid: 'l1', itemId: 'garden_lantern', x: 100, y: 110, w: 1, h: 2 }` returns `kind: 'lamp'`, `rect: [92, 78, 108, 110]` (`16x32`); explicit `sw`/`sh` overrides `w`/`h`; pixel `w > 8` remains unchanged.

### `PK-PF-SP` (`web/home/lib/scene-pigs.js`)
- **Anchors**: `create` (`44-50`), `pickSpawnPoint` (`70-91`), `pickTarget` (`93-104`), `sync` (`120-175`), `stepPig` (`177-200+`; also inspect `201-348` for outer `step`/`stepWalk`).
- **Contract**:
  - Support `opts.isFree` in `create(opts)` and optional `isFreeFn` in `sync(list, isFreeFn)` (falling back to `opts.isFree`), plus `pickSpawnPoint(b, isFreeFn)`.
  - `pickSpawnPoint(b, isFreeFn)`: skip candidates where `isFreeFn && !isFreeFn(cx, cy)`; track fallback `bestX, bestY` only over free candidates; if all `24` random samples fail, scan `b` on a `4 px` grid before falling back to center.
  - Add pure `isSegmentFree(x0, y0, x1, y1, isFreeFn)` sampling every `<= 4 px` (`steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4))`).
  - `pickTarget(pig, b, isFreeFn)`: reject `(tx, ty)` if `isFreeFn && !isSegmentFree(pig.x, pig.y, tx, ty, isFreeFn)` (checking endpoint and path together).
  - `stepPig(pig, subMs, b, isFreeFn)`: when direct `(nx, ny)` fails `canStepTo`, attempt X-slide `(sx, pig.y)` and Y-slide `(pig.x, sy)` ordered by larger `|dx|` vs `|dy|`, moving up to `stepDist` along the free axis (when delta `>= 0.5`). If neither axis moves, clear `targetX`/`targetY` to `'idle'` (avoiding stuck oscillation).

### `PK-PF-CV` (`web/home/canvas-pig.js`)
- **Anchors**: `rebuildGrid()` `standingFootprints` (`558-582`), `isFree` (`625-647`), `setTarget` (`1223-1260`), plus the unread `CuyScenePigs` call site in `canvas-pig.js`.
- **Contract**:
  - Resolve `spw` / `sph` in priority order: positive finite `t.sw`/`t.sh` -> `(t.w <= 8 ? t.w * 16 : t.w)` / `(t.h <= 8 ? t.h * 16 : t.h)` -> `t.width`/`t.height` -> `img` dimensions -> `anchor` fallback (`32`). Compute `ax`, `ay` from resolved `spw`, `sph`.
  - Inspect `ux-p39-blockers.js` and `ux-p50-canvas-wiring.js` first: add horizontal body padding `padX` (e.g. `6 px`) and deeper `footH` (e.g. `Math.min(sph, 8)`) ONLY in a way that preserves all existing test assertions in those two suites.
  - Ensure `CuyScenePigs` integration passes `(x, y) => this.isFree(x, y)` to both `sync` / `create` and `step`.

### `PK-PF-SC` (`web/home/features/places/scenes.js`)
- **Anchors**: `placedThings` (below line `370`; locate by symbol name).
- **Contract**:
  - Read light frame count `frames` (from `lights.json` / item light data, default `1`) and atlas entry `{ w, h }` (from `atlas.json`).
  - Compute single-frame pixel size `sw = frames > 1 ? Math.round(entry.w / frames) : entry.w`, `sh = entry.h` (falling back to `(w <= 8 ? w * 16 : w)` when no atlas entry exists).
  - Include `sw`, `sh`, and matching pixel `anchorX`, `anchorY` on every returned entry from `placedThings`.

---

## 5. Prompt fixes

1. **`PK-PF-SC` stale line range (`scenes.js:244-295`)**: Lines `210-370` of `web/home/features/places/scenes.js` hold `load`, `getHotspotsData`, `loadHotspots`, `getScenesDict`, `order`, `neighbor`, `timeOfDay`, and `isHouseRoom`. `placedThings` moved past line `370`. Update `PK-PF-SC`'s `Czytaj` range to read `scenes.js` lines `371-795` (plus `lights.json` and `atlas.json`) and locate `placedThings` by symbol name.
2. **`PK-PF-HS` exact expression and `torch_wall`**: `hotspots.js:64-65` uses `Number.isFinite(...) ? ... : ...` rather than `Number(inst.sw) || ...`. Also add `torch_wall` alongside `garden_lantern` and `lantern_post` in `isLampItem` (`31-38`).
3. **`PK-PF-SP` symbol name & full read**: Within lines `1-200` of `scene-pigs.js`, the walk-step function at line `177` is `stepPig` (not `stepWalk`). Update `PK-PF-SP` to read all of `scene-pigs.js` (`1-348`) to verify any outer `step`/`stepWalk` wrapper after line `200`.
4. **`PK-PF-CV` range & test check**: `standingFootprints` spans `558-582` inside `rebuildGrid()` (`550-623`). Instruct `PK-PF-CV` to read `ux-p39-blockers.js`, `ux-p50-canvas-wiring.js`, and the `CuyScenePigs` call site in `canvas-pig.js` before setting `padX` and `fy0` depth.
