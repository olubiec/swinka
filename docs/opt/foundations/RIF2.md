# RIF2: Integration Analysis — `places/feature.js` State Diffing, Drag Guard & Popover Coordination

Read scope (`Czytaj tylko`): `docs/opt/foundations/RF1.md`, `RF2.md`, `RF5.md`, `RF6.md`; `docs/opt/log/PK-PF-BAR.md`, `PK-PF-MKT.md`, `PK-PF-FRM.md`; `web/home/features/places/feature.js` (`L1-220`, `L820-1120`).

## 1. Status of F2F-2 UI packages (`PK-PF-BAR`, `PK-PF-MKT`, `PK-PF-FRM`)

| Package | Log Status | Modified Files | Verified Checks | Integration Notes & Open Defects |
| --- | --- | --- | --- | --- |
| `PK-PF-BAR` | **OK** | `web/home/index.html`, `web/home/style.css`, `web/home/features/places/feature.css`, `web/home/features/places/edit-panel.css` | `ux-p47-bar.js` (T1-T6 OK), `ux-p66-viewport-matrix.js` (V1-V11 PASS), `check-assets.js` (ASSETS OK) | Restored `"Edit"` text in `#placesEditBtn` (`class="places-edit-btn"`), `28px` border-box `.places-bar`, `24x24` arrows, and single-source `.stage-viewport`/`#pigCanvas` 16:9 sizing in `style.css`. |
| `PK-PF-MKT` | **Implemented with defects** | `web/home/features/market/feature.js`, `web/home/features/market/feature.css` | `node --check` PASS; `ux-p60-hotspots-adv.js` had 6 defects in `PK-PF-MKT.md` and later **FAIL (exit 1)** in `PK-PF-FRM.md` | **Blocker reported by `PK-PF-FRM.md`**: `ReferenceError: resolveTab is not defined` at `market/feature.js:715`. `ux-p43-market.js` missing (`MODULE_NOT_FOUND`). `PK-PF-MKT` did not edit `lib/hotspots.js`, `scene_hotspots.json`, or `places/scenes.js` (from `RF5.md`), so `order_board` hotspot/signboard wiring remains outside its diff. |
| `PK-PF-FRM` | **OK-WITH-NOTE (Farm passes; repo QA fails outside Farm)** | `web/home/features/farm/feature.js`, `web/home/features/farm/feature.css` | `node --check` PASS; headless Edge Farm harness PASS (`ALL_FARM_CHECKS_PASS`) | Added `&times;` close button, capture-phase `pointerdown`/`mousedown` outside-dismiss (`>80ms` guard), `Escape` dismiss, `In bag: X` counts, and `"Go to Market"` calling `CuyPlaces.setCurrentPlace('market')`. `ux-p43-farm.js` missing (`MODULE_NOT_FOUND`); `ux-p60-hotspots-adv.js` fails on `places/mock.js` (`DEFECT H1`) and `market/feature.js:715`. |

**Popover coordination across F2F-2 + `places/feature.js`**:
- Both `#marketStallPanel` (`PK-PF-MKT`) and `#farmPopover` (`PK-PF-FRM`) rely on capture-phase `document` `pointerdown` (`>80ms` open guard) and `CanvasPig.onHotspot`. Unnecessary 1 Hz `CanvasPig.setHotspots(...)` / `CanvasPig.setThings(..., true)` thrashing in `places/feature.js` wastes frame time and interferes with hotspot stability while popovers are open.
- `PK-PF-FRM` `"Go to Market"` invokes `CuyPlaces.setCurrentPlace('market')` (`CuyPlaces` export and `setCurrentPlace` live in unread lines `L221-819` or `L1121-1346` of `places/feature.js`); `PK-PF-PL` must verify `setCurrentPlace` routes through `applyScene` and resets scene signatures cleanly.

## 2. Exact anchors in `web/home/features/places/feature.js` for 1 Hz `applyScene` signature diffing

### 2.1 Storage & reset locations (`L6-20`, `L890-905`, `L1060-1061`)

Declare module-level signature cache near `let apiRef = null;` (`L12`) or `let lampHotspotSubscribed = false;` (`L87`):

```js
  let lastAppliedSceneKey = null;
  let lastThingsSig = null;
  let lastLightSig = null;
  let lastPresentSig = null;
  let lastHotspotsSig = null;
  let lastWeatherSig = null;
  let lastEdgeSig = null; // per RF1.md for setEdgeNeighbours (L1003-1008)

  function resetSceneSigs() {
    lastAppliedSceneKey = null;
    lastThingsSig = null;
    lastLightSig = null;
    lastPresentSig = null;
    lastHotspotsSig = null;
    lastWeatherSig = null;
    lastEdgeSig = null;
  }
```

When `resetSceneSigs()` / signature invalidation must run:
1. **Scene or size switch (`applyScene` `L890-905`)**: Compute `sceneKey = currentSceneId + '|' + tod + '|' + (sceneDef && sceneDef.size ? sceneDef.size.join('x') : '') + '|' + (isLocked ? '1' : '0')` (or `currentSceneId` + size/tod). Check `const sceneChanged = (currentInstScene !== currentSceneId || sizeChanged || sceneKey !== lastAppliedSceneKey);`. Whenever `sceneChanged` is `true`, call `resetSceneSigs()` before `CanvasPig.setScene(sceneDef)` (`L901-905`) — note `setScene` only needs to run on `currentInstScene !== currentSceneId || sizeChanged` as today (`L901`), while `resetSceneSigs()` ensures all cached signatures clear on any `currentSceneId` / `isLocked` / `tod` / size change. Update `lastAppliedSceneKey = sceneKey` after applying scene updates. (Note: `next()` at `L1083` and `prev()` at `L1102` both call `applyScene`, and `setCurrentPlace` in unread lines must also call `applyScene` or `resetSceneSigs()`.)
2. **Edit drawer open / close (`L1060-1061` -> `bindEditButton` / Edit toggle in unread `L221-819` or `L1121-1346`)**: Whenever Edit mode opens or closes, call `resetSceneSigs()` so placed/moved/deleted furniture, lamp changes, and hotspots re-sync immediately on the next `applyScene` without waiting for a scene switch.

### 2.2 Why `CanvasPig.setThings(things, true)` requires `(sceneChanged || thingsSig !== lastThingsSig)` (`L907-912`)

- In `applyScene` (`L907-912`), `things = CuyScenes.placedThings(st, currentSceneId)` is unconditionally passed to `window.CanvasPig.setThings(things, true)` every 1 Hz state tick.
- Per `RF1.md` (`L10`), the second argument `true` invokes `clearPlayState()` (`canvas-pig.js:1102-1110`), wiping active prop play/animation state and rebuilding prop state every second.
- Guard `L907-912`:
  ```js
  const thingsSig = currentSceneId + '|' + JSON.stringify(things);
  if (!isPigBeingDragged && (sceneChanged || thingsSig !== lastThingsSig)) {
    lastThingsSig = thingsSig;
    if (window.CanvasPig && typeof window.CanvasPig.setThings === 'function') {
      window.CanvasPig.setThings(things, true);
    }
  }
  ```
- Only when `thingsSig !== lastThingsSig` or `sceneChanged` (`sceneKey !== lastAppliedSceneKey`) is `setThings(things, true)` allowed; do not update `lastThingsSig` if skipped during drag (`isPigBeingDragged`).

### 2.3 Remaining `applyScene` signature guards (`L915-967`, `L997-1054`)

| Target Call | Current Lines | Signature Formula & Guard |
| --- | --- | --- |
| `CanvasPig.setLightScene` | `L915-926` | Extract `applyLightIfChanged(sl)`: `const sig = currentSceneId + '|' + JSON.stringify(sl); if (sig !== lastLightSig) { lastLightSig = sig; window.CanvasPig.setLightScene(sl); }`. Use at both `L916-918` and inside `ensureLights` callback (`L920-925`). |
| `CanvasPig.setHotspots` | `L931-943` | Inside `syncHotspots()`: `const sig = currentSceneId + '|' + (isLocked ? '1' : '0') + '|' + (hotspotsLoaded ? '1' : '0') + '|' + JSON.stringify(hsList); if (sig !== lastHotspotsSig) { lastHotspotsSig = sig; window.CanvasPig.setHotspots(hsList); }`. Covers both `L940` and `ensureHotspots(syncHotspots)` (`L942`). |
| `CuyRoom` weather layer | `L946-967` | Inside `syncWeatherLayer()`: outdoor unlocked branch builds `wSig = currentSceneId + '|outdoor|' + (weatherLoaded ? '1' : '0') + '|' + JSON.stringify(weatherState)` and calls `CuyRoom.addLayer('weather', 15, ...)` (`L952`) only when `wSig !== lastWeatherSig`, setting `lastWeatherSig = wSig`. Else branch calls `CuyRoom.removeLayer('weather')` (`L961`) only when `lastWeatherSig !== 'none'`, then sets `lastWeatherSig = 'none'`. |
| `CanvasPig.setEdgeNeighbours` | `L997-1008` | Compute `edgeSig = (hasLeftNeighbour ? '1' : '0') + (hasRightNeighbour ? '1' : '0')` (`RF1.md`); call `setEdgeNeighbours` only if `sceneChanged || edgeSig !== lastEdgeSig`, then update `lastEdgeSig = edgeSig`. |
| `CanvasPig.setPresentPigs` | `L1026-1027`, `L1049-1050` | Skip entirely when `isPigBeingDragged` (see `## 3.`). Otherwise `targetPresent = isLocked ? [] : presentList`; `presentSig = currentSceneId + '|' + (isLocked ? 'locked' : JSON.stringify(targetPresent))`; call `setPresentPigs(targetPresent)` only if `sceneChanged || presentSig !== lastPresentSig`, then set `lastPresentSig = presentSig`. |

## 3. Drag guard (`CanvasPig.isDragging()`) and lamp toggle immediate refresh in `places/feature.js`

### 3.1 Drag guard (`L898-899`, `L907-912`, `L1010-1058`)

- Currently `isPigBeingDragged` is computed late at `L1010`: `const isPigBeingDragged = (inst && !!inst.drag) || (draggedPigId !== null);`.
- Hoist it to right after `L899` (above `setThings` at `L907`) and include `window.CanvasPig.isDragging()` (`RF1.md` §4.2):
  ```js
  const isCanvasDragging = !!(window.CanvasPig && typeof window.CanvasPig.isDragging === 'function' && window.CanvasPig.isDragging());
  const isPigBeingDragged = (inst && !!inst.drag) || (draggedPigId !== null) || isCanvasDragging;
  ```
- Why checking `window.CanvasPig.isDragging()` matters: `inst` at `L898` reads `.instance` / `CuyPig.mainInstance`, whereas `RF1.md` defines `isDragging()` directly on `window.CanvasPig` (`mainInstance.isDragging()`).
- Skip `CanvasPig.setPresentPigs(...)` at **both** `L1026-1027` (locked) and `L1049-1050` (unlocked) whenever `isPigBeingDragged` is `true`, and do **not** update `lastPresentSig` while skipped so the post-drag 1 Hz tick reconciles `presentList` if anything changed during drag. Also keep `L1014` (`setExitsEnabled`), `L1052` (`setPigVisible`), `L1056-1058` (`draggedPigId = null`), and `L1061` (`syncEditButton`) using the hoisted `isPigBeingDragged`.

### 3.2 Lamp toggle immediate refresh (`L147-157`, `L185`, `toggleLamp` unread)

- In `L147-157`, `ensureLampHotspotSubscription()` listens via `CanvasPig.onHotspot`:
  ```js
  if (hs && hs.kind === 'lamp') {
    toggleLamp(hs.uid || hs.id);
  }
  ```
- `CuyLight.build(sceneId, ...)` (`L185`) reads `sceneLampToggles[sId]`, which modifies active light sources in `sceneLight`.
- Once `lastLightSig` guards `applyScene` (`L915-926`), clicking a lamp hotspot must **not** wait up to 1 s for the next state push or risk being skipped by a stale cache. Inside `toggleLamp(uid)` (located in unread `L221-819` or `L1121-1346`, verify exact lines in `PK-PF-PL`), after flipping `sceneLampToggles[currentSceneId][uid]`, force immediate recalculation in the same frame:
  ```js
  lastLightSig = '';
  applyScene(currentSceneId, getState());
  ```
  (If `toggleLamp` also receives `lamp_toggle` id/kind aliases, keep both `hs.kind === 'lamp'` and `hs.id === 'lamp_toggle'` consistent with `hotspots.js`.)

## 4. Edit button text/state compatibility with `PK-PF-BAR` and `ux-p47-bar.js`

- Per `RF2.md` and `PK-PF-BAR.md`, `#placesEditBtn` (`web/home/index.html:78`) now has `class="places-edit-btn"`, visible text `"Edit"`, `aria-label="Edit"`, `aria-pressed="false"`, `border-image: var(--ui-btn_*)`, and zero-sized (`0 0`) `background-image` across normal, `:hover`, and `aria-pressed="true"` states in `edit-panel.css`.
- `ux-p47-bar.js` T2/T3 (`RF2.md:26`) verifies `#placesEditBtn` toggles `aria-pressed` (`"false"` <-> `"true"`) and `#editDrawer.hidden`, and asserts `getComputedStyle(editBtn).backgroundImage !== 'none'` with 3 distinct values across normal, `:hover`, and `[aria-pressed="true"]`. T1-T6 passed after `PK-PF-BAR`.
- In `places/feature.js` (`L1060-1061`), `applyScene` calls `bindEditButton()` and `syncEditButton(isPigBeingDragged)`. Because both functions reside outside the read range (`L221-819` / `L1121-1346`), `PK-PF-PL` must inspect them and preserve these invariants:
  1. Do **not** clear `#placesEditBtn.textContent` to `''` or override `"Edit"` with icon-only markup.
  2. Do **not** set inline `editBtn.style.backgroundImage` in JS (preserve `edit-panel.css` computed `backgroundImage` for T2/T3).
  3. Keep `aria-pressed` and `#editDrawer.hidden` toggling intact, disable Edit while `isPigBeingDragged` is `true`, and call `resetSceneSigs()` on Edit open/close.

## 5. Prompt fixes

1. **Symbol names in `PK-RIF2` vs real `places/feature.js`**: Use `currentSceneId` (`L7, L877`), **not** `currentPlace`; hotspot handler uses `hs.kind === 'lamp'` -> `toggleLamp(hs.uid || hs.id)` (`L152-154`), **not** `lamp_toggle` (`hotspots.js` `KINDS` uses `'lamp'`).
2. **Unread `places/feature.js` ranges required by `PK-PF-PL`**: `places/feature.js` is `1346` lines; `L221-819` and `L1121-1346` (containing `toggleLamp`, `bindEditButton`, `syncEditButton`, `setCurrentPlace`, `updateStageNav`, `CuyPlaces`) were excluded by `Czytaj tylko`. `PK-PF-PL` must read full `places/feature.js`, `edit-panel.css`, and `tools/qa/ux-p47-bar.js` before editing.
3. **Additional 1 Hz guards in `applyScene`**: Guard `setEdgeNeighbours` (`L1003-1008`) with `lastEdgeSig` (`RF1.md`), and consider guarding `CuyRoom.addLayer('p36_locked_overlay', ...)` / `removeLayer('p36_locked_overlay')` (`L1032-1047`) on `isLocked` transitions.
4. **F2F-2 runtime & QA defects to schedule before F2F-4 sign-off**:
   - Fix `ReferenceError: resolveTab is not defined` at `web/home/features/market/feature.js:715` (reported by `PK-PF-FRM.md`).
   - Address missing `tools/qa/ux-p43-market.js` and `tools/qa/ux-p43-farm.js` (`MODULE_NOT_FOUND`), `DEFECT H1` in `ux-p60-hotspots-adv.js` (`places/mock.js` + specialized market titles), and unimplemented `order_board` plumbing in `lib/hotspots.js` / `scene_hotspots.json` / `places/scenes.js` (`RF5.md`).
