# RIF1: F2F-3 Integration Analysis (`canvas-pig.js`, `places/scenes.js`, `places/mock.js`) for F2F-4

Read scope (`Czytaj tylko`): `RF1.md`, `RF3.md`, `RF4.md`, `RF5.md`, `PK-PF-BG.md`, `PK-PF-DATA.md`, `PK-PF-HS.md`, `PK-PF-SP.md`, `web/home/canvas-pig.js` (`240-315`, `550-615`, `1070-1120`, `1465-1510`, `2210-2310`, `2750-2815`, `2930-3030`, `3340-3425`), `web/home/features/places/scenes.js` (`140-370` of `795`), `web/home/features/places/mock.js` (`1-140` of `216`).

## 1. Status of F2F-2 Packages (`PK-PF-BG`, `PK-PF-DATA`, `PK-PF-HS`, `PK-PF-SP`)

- **`PK-PF-BG` (Status: `OK`)**:
  - Updated `market_bg.py` -> `market.png` (wall + 3 flat posters `y=54..73`, `Random(61)`, `BULBS` cable + halos; kept `light.render(..., [])`), `farm_bg.py` -> `farm.png` (pasture fence `y=49..58`, skipping `x=174..242`), `garden_bg.py` -> `garden_{morning,day,evening,night}.png` (`gate_garden.png`, `blob` horizon trees `x=18..156`), and `park_bg.py` -> `park_{morning,day,evening,night}.png` (`y<46` treeline `Random(43)`, `bridge` path `x=160`, `256x144` docstring; omitted `gazebo`/`bridge_wood`/foreground `tree_big`).
  - Verified: `ux-p47-bg.js` (`ALL PASS (T1-T7)`), `check-assets.js` (`ASSETS OK`).
  - F2F-4 impact: `256x144` backgrounds exclude placed instances, so `scenes.js` `placedThings` and stall signboards render cleanly over them.
- **`PK-PF-DATA` (Status: Done with documented gap)**:
  - Relocated 5 out-of-bounds `park` defaults in `assets/data/outdoor_defaults.json` and `src/Cuy.Core/World/OutdoorDefaults.cs` inside `16x9` with zero overlap: `tree_3` `(10,1)`, `tree_4` `(0,4)`, `bench_right` `(13,7)`, `lamp_mid` `(9,5)`, `lamp_right` `(14,5)`.
  - Added `"park#v2"` marker in `world.OutdoorSeeded` (`OutdoorSeed.Seed`, `room.Items`) for one-time backfill + OOB repair respecting player removals, plus `S9`/`S10` in `OutdoorSeedTests.cs` (`WorldState.cs` untouched).
  - Verified: `OutdoorSeed` tests `21 passed, 0 failed, 1 pre-existing skip (A8)`; `Cuy.csproj` Release build `0 warnings, 0 errors`.
  - **Gap for `PK-PF-SC`**: `web/home/features/places/mock.js` was excluded from `PK-PF-DATA` and remains unsynced (`cols: 24, rows: 12` and old OOB `park` coordinates at `mock.js:28-44`).
- **`PK-PF-HS` (Status: `OK`)**:
  - Updated `web/home/lib/hotspots.js`, `assets/data/scene_hotspots.json`, `tools/qa/ux-p43-hotspots.js`. Preserved `classifyInstance(inst, catalog)` (`Number.isFinite(...) > 0` grid-to-pixel fallback) and `{ id, kind, rect, label, uid }`, added `torch_wall` + `window_*` exclusion, and added static `stall:orders` fallback at `[8, 60, 28, 88]` (unverified against `scenes.js`; overridden by dynamic `fx:market:order_board`).
  - Verified: `node --check`, `hotspots-check.js` (`PASS`), `ux-p43-hotspots.js` (`12 passed, 0 failed`).
  - F2F-4 impact: `hotspots.js` relies on `scenes.js` `placedThings` emitting single-frame `sw`/`sh` and pixel `anchorX`/`anchorY`.
- **`PK-PF-SP` (Status: `OK`)**:
  - Updated `web/home/lib/scene-pigs.js` and `tools/qa/ux-p5-scene-pigs.js` (`S1-S14` pass). Added `isSegmentFree(x0, y0, x1, y1, isFreeFn)` (4 px step, used in `pickTarget(pig, b, isFreeFn)`), `isFree` in `create(opts)` and `sync(list, isFreeFn)`, 4 px spiral fallback `findNearestFree` in `pickSpawnPoint`, and `trySlideStep` X/Y sliding (`>= 0.5 px`, else `'idle'`) in `stepPig` (plus `targets` in `debug()`).
  - F2F-4 impact: `canvas-pig.js` must pass `(x, y) => this.isFree(x, y)` to `CuyScenePigs.create`, `sp.sync`, and `sp.step`, and fix `rebuildGrid()` pixel footprints.

## 2. Exact Anchors in `web/home/canvas-pig.js` for `PK-PF-CV`

`web/home/canvas-pig.js` (`3922` lines) matches `RF1.md` and `RF4.md` line numbers exactly.

1. **`isDragging()` API**:
   - On `PigCanvas` (right after `setPresentPigs(list)` ends at `1100`, before `clearPlayState()` at `1102`): add `isDragging() { return !!this.drag; }`.
   - On `window.CanvasPig` (in unread export block `3426-3922`, locate by symbol): add `isDragging() { return !!(mainInstance && mainInstance.isDragging()); }` using the existing instance accessor. (`places/feature.js` relies on this.)
2. **`setLightScene` double-render fix (locate by symbol)**:
   - Lines `240-315` do **not** contain `setLightScene` (`240-264` = anim rows `eat_bowl`..`chirp`; `267-286` = `SLOW_ANIMS`, `FRAME_SIZE=64`, `PIG_LIGHT_*`, `PIG_KNEE`, `PIG_SHADOW_*`, `sceneAmbient`; `288-315` = `PigCanvas.constructor`, `298` = `this.roomOffset = { x: 0, y: 0 };`).
   - `PK-PF-CV` must locate `PigCanvas.prototype.setLightScene(scene)` and `window.CanvasPig.setLightScene(scene)` by symbol, keep `this.render()` inside `PigCanvas.prototype.setLightScene` (guarding unchanged light signatures), and remove the duplicate synchronous `inst.render()` from `window.CanvasPig.setLightScene`.
3. **`litFrame(sheet, sx, sy, scene)` cache (`lines 3349-3415`)**:
   - Currently allocates `this.litCanvas` (`3350-3355`), draws frame (`3357-3358`), calls `getImageData` (`3362`), then computes `ambient = sceneAmbient(scene)` (`3367`), `origin` (`3368`), and top-2 `sources` (`3371-3375`) before running the `64x64` loop (`3378-3412`) and returning shared `this.litCanvas` (`3413-3414`).
   - **Contract**: hoist `ambient` (`3367`), `origin` (`3368`), and top-2 `sources` (`3371-3375`) **before** `c.clearRect`/`c.drawImage`/`c.getImageData`. When `sheet && sheet.src`, key `this._litFrameCache = new Map()` (max `128`, LRU eviction) on:
     `${sheet.src}|${sx},${sy}|${Math.round(origin.x / 2)},${Math.round(origin.y / 2)}|${ambient.map(v => v.toFixed(2)).join(',')}|${srcKey}`
     (`srcKey` from `x,y,radius,intensity,color` of the `<= 2` selected sources). On hit, refresh LRU and return the cached `64x64` `<canvas>`. On miss (only if `getImageData` does not throw taint/`null`), copy `putImageData(img, 0, 0)` into a **new dedicated `64x64` `<canvas>`** (never return shared `this.litCanvas`), cache it, and return it.
4. **`drawHabitat` `CanvasPattern` cache (`lines 2938, 2961, 2990, 3014`)**:
   - Add `cachedPattern(ctx, img)` on `PigCanvas`: if `!img`, return `null`; if `!img._cachedPattern || img._cachedPatternCtx !== ctx`, set `img._cachedPattern = ctx.createPattern(img, 'repeat')` and `img._cachedPatternCtx = ctx`, then return `img._cachedPattern`.
   - Replace **all 4** `ctx.createPattern(..., 'repeat')` calls: `2938` (`wallImg`), `2961` (`baseboardImg`), `2990` (`floorImg`), `3014` (`shadowImg`). Note: `2977` is `} catch (e2) {}`.
5. **Drag override & `CuyScenePigs` wiring (`1071-1100`, `1465-1473`, `2210-2310`, `2762-2770`)**:
   - `ensureScenePigs()` (`1071-1076`): pass `isFree: (x, y) => this.isFree(x, y)` in `window.CuyScenePigs.create({ bounds: this.walk || [10, 96, 230, 126], minGap: 22, isFree: ... })` (`1073`); also pass `(x, y) => this.isFree(x, y)` at the unread `scenePigs.step(...)` call site.
   - `setPresentPigs(list)` (`1078-1100`): let `const dragging = !!this.drag;`. Clear `this._overridePrimaryPos = false` (`1080`) only when `!dragging`. Call `sp.sync(this.presentPigs, (x, y) => this.isFree(x, y))` (`1090`). When `dragging`, skip overwriting `this.pigX`/`this.pigY`/`this.facing` (`1093-1095`) and instead call `if (typeof sp.movePrimary === 'function') sp.movePrimary(this.pigX, this.pigY);` (still updating `activePig`/`stageKey`).
   - `pointerdown` (`2210-2215`): keep `this.drag` creation (`2211`); do not treat click without move as moved.
   - `pointermove` `take_out` (`2231-2240`): after setting `this.pigY` (`2237`), set `this._overridePrimaryPos = false;` and call `if (this.scenePigs && typeof this.scenePigs.movePrimary === 'function') this.scenePigs.movePrimary(this.pigX, this.pigY);`.
   - `pointermove` active drag (`2241-2249`): after setting `this.pigX` and `this.pigY` (`2243-2244`), set `this._overridePrimaryPos = true;` and call `if (this.scenePigs && typeof this.scenePigs.movePrimary === 'function') this.scenePigs.movePrimary(this.pigX, this.pigY);`.
   - `endDrag` (`2304-2310+`): inspect lines `2304-2350` (after `2310` unread) to verify drop position remains synced via `movePrimary` / `_overridePrimaryPos` until next update.
   - `render()` (`2768-2770`) & `debug()` (`1471-1473`): change `this._overridePrimaryPos` to `(this._overridePrimaryPos || this.drag)`; in `render()`, when `this.drag && this.drag.moved`, also copy `anim: this.currentAnim`.
6. **`rebuildGrid()` pixel footprints (`lines 558-582`)**:
   - Currently `570-571` read `t.w` / `t.h` directly (`1..3` grid cells -> `1..3 px`).
   - Update `570-571` to resolve `t.sw`/`t.sh` first, then convert `t.w`/`t.h` only when `<= 8` (`* 16`), leaving pixel `w`/`h > 8` untouched for `ux-p39-blockers.js` compatibility:
     `const rawW = (Number.isFinite(t.sw) && t.sw > 0) ? t.sw : (Number.isFinite(t.w) && t.w > 0 ? (t.w <= 8 ? t.w * 16 : t.w) : 0);`
     `const rawH = (Number.isFinite(t.sh) && t.sh > 0) ? t.sh : (Number.isFinite(t.h) && t.h > 0 ? (t.h <= 8 ? t.h * 16 : t.h) : 0);`
     `const spw = rawW || t.width || (img && (img.naturalWidth || img.width)) || (t.anchorX ? t.anchorX * 2 : 32);`
     `const sph = rawH || t.height || (img && (img.naturalHeight || img.height)) || (t.anchorY ? t.anchorY : 32);`
   - Keep `t.flat` skip (`564`) and `t.footprint` 4-element override (`565-568`). Inspect `ux-p39-blockers.js`, `ux-p50-canvas-wiring.js`, and `isFree` (`616-650`) before changing `fy0 = fy1 - 4` (`579`) or adding horizontal `padX`.

## 3. Exact Anchors in `web/home/features/places/scenes.js` and `mock.js` for `PK-PF-SC`

1. **`web/home/features/places/scenes.js` (`795` lines; read `140-370`)**:
   - Lines `140-370` hold `loadTiles`/`getTileUrl` (`140-168`), `getAtlas`/`loadAtlas` (`170-211`), `load` (`213-253`), `getHotspotsData`/`loadHotspots` (`255-294`), preload (`297-303`), `getScenesDict` (`305-324`), `order`/`neighbor` (`326-354`), `timeOfDay` (`356-365`), and `isHouseRoom` (`367-370`).
   - Both `placedThings` and the `market` render layer are in unread lines **`371-795`** (locate by symbol). Note `feature.js:907` calls `CuyScenes.placedThings(st, currentSceneId)` (`RF1.md:10`), so verify parameter order in `371-795`.
   - **Single-frame `sw`/`sh` in `placedThings`**: use `atlasData || getAtlas()` (`170-211`) for `{ w, h }` and `lights.json` / item light data for `frames` (default `1`, mirroring `getHotspotsData()` loader pattern if no light loader exists in `1-139`/`371-795`). Emit `sw = frames > 1 ? Math.round(entry.w / frames) : entry.w`, `sh = entry.h` (fallback `(w <= 8 ? w * 16 : w)` / `(h <= 8 ? h * 16 : h)`), plus pixel `anchorX`/`anchorY` on every returned entry.
   - **Market signboards (`drawMarketSignboards(ctx, state)`)**: invoke in the `market` scene render layer immediately after `stall_left`, `stall_center`, `stall_right` (before foreground pigs/UI). Per `RF5.md:103-111`: set `ctx.imageSmoothingEnabled = false`, draw `14x12` wooden plaque at integer `sx = Math.round((stallRect[0] + stallRect[2]) / 2) - 7`, `sy = Math.round(canopyTopY + fasciaOffsetY)` (shadow `rgba(30,16,8,0.35)` at `(sx,sy+12,14,1)`, frame `#3b2416`, fill `#9c6b3f`, highlights `#b98756`/`#744a28`, nails `#3b2416` at `(sx+2,sy+2)` & `(sx+11,sy+2)`, `#ffe89a` 1px hover/active border) + `8x8` emblem at `(sx+3,sy+2)` (`stall_left` sprout `#4e301b`/`#2f7d32`/`#52b748`/`#9be068`; `stall_center` carrot `#3d943c`/`#7cd458`/`#e86f1c`/`#ff9b3d`/`#b84b10`; `stall_right` pink ball/star `#e85a90`/`#ff9ec4`/`#a8325f`/`#fff0c2`).
2. **`web/home/features/places/mock.js` (`216` lines; read `1-140`)**:
   - `OUTDOOR_SEED.park` (`28-44`, consumed by `createOutdoorLayouts()` `71-93` and `createState()` `95-136`) still has `cols: 24` (`29`), `rows: 12` (`30`), and 5 OOB items: `bench_right` (`34`, `21,9`), `tree_3` (`38`, `16,1`), `tree_4` (`39`, `20,1`), `lamp_mid` (`41`, `17,7`), `lamp_right` (`42`, `21,10`).
   - Update `cols: 16`, `rows: 9` and sync `park` coordinates to `PK-PF-DATA`: `bench_right` `(13,7)`, `tree_3` `(10,1)`, `tree_4` `(0,4)`, `lamp_mid` `(9,5)`, `lamp_right` `(14,5)`. Verify all 11 items (`gazebo` `4,2`, `bench_left` `7,8`, `bridge` `10,5`, `tree_1` `0,1`, `tree_2` `13,1`, `lamp_left` `1,7` + 5 updated) against `assets/data/outdoor_defaults.json`, and check `mock.js:141-216`.

## 4. Regression Checks for `PK-PF-CV` and `PK-PF-SC`

- **Commands**: `node --check web/home/canvas-pig.js`, `node --check web/home/features/places/scenes.js`, `node --check web/home/features/places/mock.js`, `node tools/qa/web-smoke.js`, `node tools/qa/ux-p39-blockers.js`, `node tools/qa/ux-p50-canvas-wiring.js`, `node tools/qa/ux-p5-scene-pigs.js`, `node tools/qa/ux-p43-hotspots.js`, `node tools/qa/hotspots-check.js`, `node tools/qa/ux-p47-bg.js`, `node tools/qa/ux-p60-hotspots-adv.js` (note: `tools/qa/ux-p43-market.js` does not exist).
- **`PK-PF-CV` checks**: `window.CanvasPig.isDragging()` reflects `!!this.drag`; drag under `_multiPigActive` updates `movePrimary` and resists `setPresentPigs()` snap-back; `setLightScene` renders at most once per change; `litFrame` caches dedicated `64x64` canvases (LRU 128, no shared `litCanvas` return, no taint cache); all 4 `drawHabitat` patterns use `cachedPattern`; `rebuildGrid()` converts `w/h <= 8` (`*16`) while keeping pixel `w/h > 8` (`ux-p39-blockers.js`) and passes `this.isFree` to `CuyScenePigs`.
- **`PK-PF-SC` checks**: `placedThings` outputs single-frame `sw`/`sh` and pixel `anchorX`/`anchorY` (so `hotspots.js` builds full rects, never `1x2 px` or `4x`-wide strips); `drawMarketSignboards` paints all 3 plaques cleanly; `mock.js` `park` (`16x9`, 11 items) matches `assets/data/outdoor_defaults.json`.

## 5. Prompt Fixes

1. **`PK-PF-CV` read range & symbols**: `canvas-pig.js:240-315` has no `setLightScene`. Allow `PK-PF-CV` to read full `web/home/canvas-pig.js` (including `316-549`, `616-1069`, `1121-1464`, `2304-2749`, `3426-3922`), `tools/qa/ux-p39-blockers.js`, and `tools/qa/ux-p50-canvas-wiring.js`, locating `setLightScene`, `scenePigs.step`, `endDrag`, and `window.CanvasPig` by symbol.
2. **4 `createPattern` sites in `drawHabitat` (not 3)**: cache all 4 at lines `2938`, `2961`, `2990`, `3014` (`2977` is `} catch (e2) {}`).
3. **`PK-PF-SC` read range**: `placedThings` and `market` render code live in `scenes.js:371-795`. Allow reading full `scenes.js` (`1-795`), full `mock.js` (`1-216`), `assets/data/outdoor_defaults.json`, `assets/world/atlas.json`, `assets/data/lights.json` (+ `items_world.json`), and `web/home/features/places/feature.js` (`feature.js:907` passes `(st, currentSceneId)` to `placedThings`).
4. **Add `web/home/features/places/mock.js` to `PK-PF-SC` `Zmieniaj`**: sync `OUTDOOR_SEED.park` (`28-44`) with `PK-PF-DATA` / `outdoor_defaults.json`.
5. **Verify `PK-PF-HS` `stall:orders` fallback `[8, 60, 28, 88]`**: once `PK-PF-SC` reads `scenes.js:371-795`, record rendered `order_board` bounds for `PK-PF-MK` / `PK-RF5`.
