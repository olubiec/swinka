# RF1: Frame Lag, 1 Hz State Thrashing, and Drag Override Research

Read scope: `web/home/features/places/feature.js` (lines 850-1080) and `web/home/canvas-pig.js` (lines 240-315, 1070-1120, 1465-1510, 2210-2310, 2750-2815, 2930-3030, 3340-3425).

## 1. 1 Hz state push thrashing in places/feature.js (applyScene lines 868-1065)

`updateStageNav` lies outside lines 850-1080 (not read); `applyScene(sceneId, st)` spans lines 868-1065. Only scene/size switching is guarded (`lines 890-905`): `currentInstScene !== currentSceneId || sizeChanged` gates `window.CanvasPig.setScene(sceneDef)` (`lines 901-905`).

Every other CanvasPig / CuyRoom call in `applyScene` executes unconditionally on each 1 Hz `{ type: 'state' }` push:
1. `window.CanvasPig.setThings(things, true)` (`lines 907-912`): `things = CuyScenes.placedThings(st, currentSceneId)` (`lines 907-909`) is pushed unconditionally with `true` at `line 911` with no diff check. (`clearPlayState()` exists in `canvas-pig.js:1102-1110`; `PigCanvas.setThings` itself is outside read ranges.)
2. `window.CanvasPig.setLightScene(sceneLight)` (`lines 915-926`): `sceneLight = CuyLight.build(currentSceneId)` (`line 915`) runs unconditionally (`line 917`; also inside `ensureLights` callback `lines 920-925`).
3. `syncHotspots()` -> `window.CanvasPig.setHotspots(hsList)` (`lines 931-943`): unconditionally calls `setHotspots` (`line 937`) via `line 940`.
4. `syncWeatherLayer()` -> `window.CuyRoom.addLayer('weather', 15, ...)` / `removeLayer('weather')` (`lines 946-967`): unconditionally recomputes `weatherState` (`line 950`) and updates layer (`lines 952, 961`) via `line 964`.
5. `window.CanvasPig.setEdgeNeighbours({ left, right })` (`lines 1003-1008`): unconditional.
6. `window.CanvasPig.setPresentPigs(...)` (`lines 1026-1027` locked; `lines 1049-1050` unlocked): unconditional with no signature or drag guard, even though `line 1010` already computes `isPigBeingDragged = (inst && !!inst.drag) || (draggedPigId !== null)` and uses it for `setExitsEnabled` (`1014`), `setPigVisible` (`1052`), `draggedPigId` reset (`1056-1058`), and `syncEditButton` (`1061`).

## 2. 60 FPS CPU hotspots in canvas-pig.js (litFrame, setLightScene, drawHabitat)

### 2.1 `setLightScene` double render (stale prompt lines)
Read lines `240-315` do **not** contain `setLightScene`: `240-264` are animations (`eat_bowl`..`chirp`), `267-286` are lighting/shadow constants + `sceneAmbient(scene)`, and `288-315` are top of `class PigCanvas { constructor... }` (`line 298` is `this.roomOffset = { x: 0, y: 0 };`). Because reading outside the listed ranges is forbidden, `PigCanvas.prototype.setLightScene` and `window.CanvasPig.setLightScene` were not directly inspected; `PK-PF-CV` must locate both by symbol name and remove the duplicate synchronous `inst.render()` if `inst.setLightScene` already renders.

### 2.2 `litFrame(sheet, sx, sy, scene)` pixel readback & loop (lines 3349-3415)
- `3350-3358`: draws 64x64 (`FRAME_SIZE`, `line 269`) frame to `this.litCanvas` (`willReadFrequently: true`).
- `3362`: calls `c.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE)` (4,096 pixels) every frame.
- `3367-3375`: computes `ambient = sceneAmbient(scene)` (`281-286`), `origin = scene.origin || { x: Math.round(this.pigX - 32 * scale), y: Math.round(this.pigY - 59 * scale) }` (`3368`), center `(cx, cy)`, and sorts `scene.sources` by `Math.hypot` (`slice(0, 2)`).
- `3378-3412`: loops `64 x 64 = 4,096` pixels; for every `data[i + 3] !== 0` (`3381`), runs up to 2 `Math.hypot` calls (`3389`) and channel multiply + `PIG_KNEE` compression (`3404-3410`).
- `3413-3414`: calls `c.putImageData(img, 0, 0)` and returns shared mutable `this.litCanvas`. No cache exists, so idle frames repeat all 4,096 pixels 60 times/sec per lit pig.

### 2.3 `drawHabitat` per-frame `ctx.createPattern` (lines 2930-3030)
`drawHabitat` calls `ctx.createPattern(..., 'repeat')` **4 times per frame** (not 3; `line 2977` is `} catch (e2) {}`):
- `2938`: `ctx.createPattern(wallImg, 'repeat')`
- `2961`: `ctx.createPattern(baseboardImg, 'repeat')`
- `2990`: `ctx.createPattern(floorImg, 'repeat')`
- `3014`: `ctx.createPattern(shadowImg, 'repeat')`

All 4 source images come from `this.loadCachedImage(...)`, so recreating `CanvasPattern` every 60 FPS frame is pure waste.

## 3. Mouse drag bug under _multiPigActive and setPresentPigs reset

1. **Render/debug ignore `this.drag` and `pointermove` skips `_overridePrimaryPos` + `movePrimary`**:
   - `setPresentPigs(list)` (`line 1079`) always sets `this._multiPigActive = true`.
   - `render()` (`lines 2762-2770`) uses `sp.entries()` when `this._multiPigActive && sp`, overriding `pigEntries[0]` with `{ x: this.pigX, y: this.pigY }` only when `this._multiPigActive && this._overridePrimaryPos && pigEntries.length > 0` (`line 2768`). `debug()` (`lines 1465-1473`) has the exact same gate at `line 1471`. Neither checks `this.drag`.
   - `pointerdown` (`lines 2210-2215`) sets `this.drag` (`2211`) without `_overridePrimaryPos = true`.
   - `pointermove` (`lines 2241-2249`) updates `this.pigX`, `this.pigY`, `currentAnim = 'idle'`, `animTimer = 1000`, `targetX = null`, `targetY = null` without setting `this._overridePrimaryPos = true` or calling `this.scenePigs.movePrimary(this.pigX, this.pigY)`. Thus `sp.entries()[0]` stays at the old position and the rendered pig appears frozen while `pigX/pigY` move unseen.
2. **1 Hz `applyScene` -> `setPresentPigs` wipes `_overridePrimaryPos` and snaps `pigX/pigY`**:
   - Every 1 s, `applyScene` calls `CanvasPig.setPresentPigs(...)` (`feature.js:1027,1050`).
   - `setPresentPigs(list)` (`canvas-pig.js:1078-1100`) unconditionally sets `this._overridePrimaryPos = false` (`line 1080`), calls `sp.sync(this.presentPigs)` (`1090`), and overwrites `this.pigX = entries[0].x; this.pigY = entries[0].y; this.facing = entries[0].facing;` (`1093-1095`), snapping the dragged pig back mid-drag.

## 4. Exact contracts and anchors for PK-PF-PL and PK-PF-CV

### 4.1 `PK-PF-PL` (`web/home/features/places/feature.js`)
Add module-level signature cache near `currentSceneId`:
```js
let lastThingsSig = null, lastLightSig = null, lastHotspotsSig = null;
let lastWeatherSig = null, lastPresentSig = null, lastEdgeSig = null;
```
In `applyScene(sceneId, st)` (`lines 868-1065`):
1. **Scene/size reset (`lines 901-905`)**: when `currentInstScene !== currentSceneId || sizeChanged`, reset all six `last*Sig = null` before `CanvasPig.setScene(sceneDef)`.
2. **Hoist `isPigBeingDragged` (`line 1010` -> right after `inst` at `line 899`)**:
   ```js
   const isPigBeingDragged = (inst && !!inst.drag) || (draggedPigId !== null) ||
     (window.CanvasPig && typeof window.CanvasPig.isDragging === 'function' && window.CanvasPig.isDragging());
   ```
3. **Guard `setThings` (`lines 907-912`)**:
   ```js
   const thingsSig = currentSceneId + '|' + JSON.stringify(things);
   if (!isPigBeingDragged && thingsSig !== lastThingsSig) {
     lastThingsSig = thingsSig;
     if (window.CanvasPig && typeof window.CanvasPig.setThings === 'function') {
       window.CanvasPig.setThings(things, true);
     }
   }
   ```
4. **Guard `setLightScene` (`lines 915-926`)**: wrap `CuyLight.build(currentSceneId)` with `const sig = currentSceneId + '|' + JSON.stringify(sl); if (sig !== lastLightSig) { lastLightSig = sig; window.CanvasPig.setLightScene(sl); }` for both immediate (`917`) and `ensureLights` (`923`) calls.
5. **Guard `syncHotspots` (`lines 931-943`)**: compare `currentSceneId + '|' + (isLocked ? '1' : '0') + '|' + JSON.stringify(hsList)` against `lastHotspotsSig` before calling `CanvasPig.setHotspots(hsList)`.
6. **Guard `syncWeatherLayer` (`lines 946-967`)**: in outdoor unlocked branch, check `wSig = currentSceneId + '|outdoor|' + JSON.stringify(weatherState)` against `lastWeatherSig` before `CuyRoom.addLayer('weather', 15, ...)`; in `else` branch, call `CuyRoom.removeLayer('weather')` only if `lastWeatherSig !== 'none'`, then set `lastWeatherSig = 'none'`.
7. **Guard `setEdgeNeighbours` (`lines 1003-1008`)**: compare `${hasLeftNeighbour ? 1 : 0}${hasRightNeighbour ? 1 : 0}` against `lastEdgeSig`.
8. **Guard `setPresentPigs` (`lines 1026-1027, 1049-1050`)**: if `isPigBeingDragged`, skip `setPresentPigs` completely; else check `presentSig = currentSceneId + '|' + (isLocked ? 'locked' : JSON.stringify(presentList))` against `lastPresentSig` before calling `CanvasPig.setPresentPigs(isLocked ? [] : presentList)`.

### 4.2 `PK-PF-CV` (`web/home/canvas-pig.js`)
1. **`isDragging()` API**:
   - On `PigCanvas` (near `line 1100`): `isDragging() { return !!this.drag; }`
   - On `window.CanvasPig` (locate export object by symbol): `isDragging() { return !!(mainInstance && mainInstance.isDragging()); }` (using existing instance accessor).
2. **`setLightScene` double render (locate by symbol)**: keep `this.render()` inside `PigCanvas.prototype.setLightScene(scene)` (skip if light signature unchanged) and remove the second synchronous `inst.render()` from `window.CanvasPig.setLightScene(scene)`.
3. **`litFrame` cache (`lines 3349-3415`)**:
   - Compute `ambient` (`3367`), `origin` (`3368`), and top-2 `sources` (`3371-3375`) before `drawImage`/`getImageData`.
   - When `sheet && sheet.src`, build key `${sheet.src}|${sx},${sy}|${Math.round(origin.x/2)},${Math.round(origin.y/2)}|${ambient.map(v=>v.toFixed(2)).join(',')}|${srcKey}` (`srcKey` from `x,y,radius,intensity,color` of the 2 selected sources).
   - Store a dedicated 64x64 `<canvas>` per cache entry in `this._litFrameCache = new Map()` (max 128 entries, LRU eviction). Do **not** return shared `this.litCanvas` from cache; on miss, `putImageData` into the entry canvas and return it.
4. **`drawHabitat` pattern cache (`lines 2938, 2961, 2990, 3014`)**:
   ```js
   cachedPattern(ctx, img) {
     if (!img) return null;
     if (!img._cachedPattern || img._cachedPatternCtx !== ctx) {
       img._cachedPattern = ctx.createPattern(img, 'repeat');
       img._cachedPatternCtx = ctx;
     }
     return img._cachedPattern;
   }
   ```
   Replace all 4 `ctx.createPattern(..., 'repeat')` calls at `2938, 2961, 2990, 3014`.
5. **Drag override & `setPresentPigs`**:
   - `pointermove` (`2241-2249`): set `this._overridePrimaryPos = true;` and call `if (this.scenePigs && typeof this.scenePigs.movePrimary === 'function') this.scenePigs.movePrimary(this.pigX, this.pigY);`.
   - `pointermove` `take_out` (`2231-2240`): clear `this._overridePrimaryPos = false;` and sync `movePrimary` if `this.scenePigs` exists after setting `this.pigY`.
   - `render()` (`2768`) & `debug()` (`1471`): change `this._overridePrimaryPos` to `(this._overridePrimaryPos || this.drag)`; in `render()`, when `this.drag && this.drag.moved`, also copy `anim: this.currentAnim`.
   - `setPresentPigs(list)` (`1078-1100`): let `const dragging = !!this.drag;`; only set `this._overridePrimaryPos = false` when `!dragging`; inside `if (sp)`, always `sp.setBounds(...)` + `sp.sync(this.presentPigs)`, then if `dragging` call `sp.movePrimary(this.pigX, this.pigY)` (if present) without overwriting `this.pigX/pigY/facing`, else copy `entries[0]` position/facing as before.

## 5. Prompt fixes

1. **Stale `setLightScene` line numbers**: `canvas-pig.js:240-315` contains animation rows and `PigCanvas.constructor` (`line 298` is `this.roomOffset = { x: 0, y: 0 };`), not `window.CanvasPig.setLightScene` (`250-258`) or `inst.setLightScene` (`298`). `PK-PF-CV` must locate `setLightScene` and `window.CanvasPig` by symbol.
2. **4 `createPattern` sites in `drawHabitat`, not 3**: actual lines in `2930-3030` are `2938, 2961, 2990, 3014` (`line 2977` is `} catch (e2) {}`). `PK-PF-CV` must cache all 4.
3. **Extra unguarded callers in `places/feature.js`**: `applyScene` (`868-1065`) also calls `syncHotspots` (`931-940`), `syncWeatherLayer` (`946-964`), and `setEdgeNeighbours` (`1003-1008`) unconditionally; `isPigBeingDragged` already exists at `line 1010` and should be hoisted above `907`.
4. **Strict read bounds**: `updateStageNav` (`feature.js`), `PigCanvas.setThings` (`canvas-pig.js`), `endDrag` after `line 2310`, and `window.CanvasPig` export block were outside `Czytaj tylko` and unread.
5. **`litFrame` return value & key**: `litFrame` uses `origin` (`line 3368`) and returns shared mutable `this.litCanvas` (`3414`); `PK-PF-CV` must key on `origin.x/2, origin.y/2` and cache dedicated per-entry 64x64 canvases.
