# RI2: Specyfikacja okablowania UI dla PK-PF2, PK-PE2 i PK-APP2

## 1. Status paczek UI z F2-2

| Paczka | Status | STUB / Uwagi z logu | Plik główny |
| --- | --- | --- | --- |
| `PK-P46a` | OK (konflikt) | `WorldItemCatalogTests` oczekuje 75, jest 80; 5 itemów bez `icon` | `src/Cuy.Core/World/RoomLayoutOps.cs` |
| `PK-P46b` | OK | `placedThings`, `def`, `OUTDOOR_SEED` w `mock.js` | `web/home/features/places/scenes.js` |
| `PK-P47a` | OK | Czyste tła 256x144, `bg_clean: true` | `assets/data/place_scenes.json` |
| `PK-P47c` | OK | `#placesBar`, `#placesEditBtn`, układ pionowy | `web/home/index.html`, `places/feature.js` |
| `PK-P47r` | BLOCKED | `ux-p34-pig-walk.js` FAIL `W3` (0.75 vs 1) i `W8` (`take_out`) | `web/home/canvas-pig.js` |
| `PK-P6c` | OK | `activeSources` wymusza `autoOn` przy `toggle:false`, `campfire` | `web/home/lib/lights.js` |
| `PK-P43ab` | OK | `CuyHotspots` czysty UMD, bez `window.CuyEditMode` | `web/home/lib/hotspots.js` |
| `PK-P43c` | OK (STUB) | `ux-p43-market-scene.js`: `STUB onHotspot`; `CuyMarket` | `web/home/features/market/feature.js` |
| `PK-P43d` | OK (STUB) | `ux-p43-farm-scene.js`: `STUB onHotspot`; `CuyFarm` | `web/home/features/farm/feature.js` |
| `PK-P5a` | OK (STUB) | `ux-p5-scene-pigs.js`: `STUB grid`/`isFree`; `CuyScenePigs` | `web/home/lib/scene-pigs.js` |
| `PK-P5b` | BLOCKED (Core) | JS `ux-p5-pin.js` P1-P8 OK; 4 testy `PigPinMessagesTests` FAIL | `web/home/features/pigs/feature.js` |
| `PK-P5c` | OK | `FormPet.IsAmbientCompanion`, `pigs.desktopPet` (max 2) | `src/Cuy/dotNet/Features/PigsFeature.cs` |
| `PK-P7a` | OK (STUB) | `ux-p7-weather.js`: `createMockCtx`; `CuyWeather` | `web/home/lib/weather.js` |
| `PK-P7b` | OK (STUB) | `ux-p7-play-targets.js`: `STUB grid-16`; `CuyPlayTargets` | `web/home/lib/play-targets.js` |
| `PK-P6a` | OK | `EditFilters` + `#editFiltersStyle` | `web/home/features/places/edit-filters.js` |
| `PK-P6b` | OK (STUB) | `ux-p6-templates.js`: `STUB send` (`room_skin`) | `web/home/features/places/edit-templates.js` |
| `PK-P6s` | OK (STUB) | `ux-p6-skins.js`: inline `state.rooms` + `send` spy | `web/home/features/places/edit-skins.js` |
| `PK-P24c` | OK (NO-OP) | `HomeWindow.cs` bez zmian | `src/Cuy/dotNet/HomeWindow.cs` |

## 2. Kontrakt vs rzeczywistość (tabela)

| Moduł | Kontrakt (R27/R29/R30/R31) | Rzeczywisty eksport i sygnatury | Zmiana w kodzie wołającym |
| --- | --- | --- | --- |
| `edit-filters.js` | `TABS`, `EMPTY_MESSAGE`, `DEFAULT_LIGHT_IDS`, `categorize`, `tabs`, `filterItems`, `build(container, opts)` | `window.EditFilters` (`edit-filters.js:329-342`): identyczne; `build` zwraca `{ getState() }` | `edit-panel.js` montuje `#editDrawerFilters`, trzyma `_filterState`, przy 0 wyników pokazuje `EMPTY_MESSAGE` |
| `edit-templates.js` | `themes`, `plan`, `build(container, { state, roomId, send })` | `window.EditTemplates` (`edit-templates.js:207-218`): identyczne + `OUTDOOR_IDS`, `DEFAULT_THEMES` | `edit-panel.js` przekazuje `{ state, roomId, send }` (`bridge.send`) |
| `edit-skins.js` | `isIndoorRoom`, `listOwned`, `build(container, { state, roomId, send })` | `window.EditSkins` (`edit-skins.js:179-190`): identyczne + `OUTDOOR_IDS`, `SKIN_COLORS` | `edit-panel.js` przekazuje `{ state, roomId, send }` w `#editDrawerSubpanel` |
| `hotspots.js` | `CuyHotspots.{KINDS, EMPTY, fromScene, hit, arbitrate, clampLabelRect, sortKeyboard, createTracker}` | `window.CuyHotspots` (`hotspots.js:263-277`): identyczne; `arbitrate({ overPig, editMode, dragging })` | Przekazać `editMode: !!(window.CuyEdit?.isOpen?.())`; lampy przez `onHotspot` |
| `weather.js` | `CuyWeather.{DEFAULT_DATA, stateFor, draw}` | `window.CuyWeather` (`weather.js:184-193`): identyczne | Rejestracja przez `window.CuyRoom.addLayer('weather', 15, fn)` (nie `CanvasPig.addLayer`), `removeLayer` w pokojach |
| `lights.js` | `Lights.{PERIODS, PLACE_KINDS, periodOf, ambientFor, autoOn, activeSources, tint, nearest}` | `window.Lights` (`lights.js:166-180`): identyczne; `activeSources` wymusza `autoOn` dla `toggle:false` | `places/feature.js` usuwa ręczny click-hit i respektuje `toggle: false` |
| `scene-pigs.js` | `CuyScenePigs.create({ rng, bounds, minGap, speed })` | `window.CuyScenePigs` (`scene-pigs.js:340-347`): identyczne | `places/feature.js` (`applyScene`) woła `CanvasPig.setPresentPigs(list)` |
| `play-targets.js` | `CuyPlayTargets.{kindOf, interactionSpots, pickReachable}` | `window.CuyPlayTargets` (`play-targets.js:150-160`): identyczne; `defs` fn lub mapa | Zużywa `PK-CV2` (`canvas-pig.js`) |
| `market/feature.js` | `CuyMarket.{openPanel, closePanel}` + `onHotspot` | `window.CuyMarket` (`market/feature.js:500`), subskrypcja `:189-191` | Wymaga `CanvasPig.onHotspot`/`getHotspots()` (`PK-CV2`); ukryć kafel w More (`PK-APP2`) |
| `farm/feature.js` | `CuyFarm.{handleHotspot, closePanel, drawMarkers, syncSceneUI}` + `onHotspot` + `addLayer` | `window.CuyFarm` (`farm/feature.js:678-683`), `:658-667` | Wymaga `CanvasPig.onHotspot`/`getHotspots()` (`PK-CV2`); ukryć kafel w More (`PK-APP2`) |
| `pigs/feature.js` | `places.pigPin { pigId, pinned }`, `pigs.desktopPet { pigId, on }` | `pigs/feature.js:522-523, 725-747`: identyczne | Brak zmian poza obsługą `pinned` w `presentPigs` |

## 3. Kotwice PK-PF2

Cel: `web/home/features/places/feature.js` (1234 linii po `PK-P47c`).

1. **Usunięcie `initCanvasLampClick` i zapasowego `120, 65`**:
   - Usunąć `initCanvasLampClick()` (`places/feature.js:1040-1061`) oraz blok startowy `:1063-1069`.
   - W `CuyLight.build` (`:141-144`) usunąć `gx = 120; gy = 65;` — brak `(it.x != null && it.y != null)` pomija wpis (`return;`).
2. **Lampy przez hotspoty + straż `toggle: false`**:
   - Zachować `isToggleableLightSource(src)` (`:1014-1020`, blokuje `src.toggle === false` i `window*`), `toggleLamp(uid)` (`:1022-1031`), `setLampToggle(uid, on)` (`:1033-1038`).
   - Dodać leniwą subskrypcję `CanvasPig.onHotspot((hs) => { if (hs && hs.kind === 'lamp') toggleLamp(hs.uid || hs.id); })` (wzorzec `farm/feature.js:658-660`, z guardem przed duplikacją).
3. **Przekazanie świnek (`applyScene`, `:851-918`)**:
   - Z `pigLocs` (`:852`) odfiltrować świnki w `currentSceneId`, zmapować z `st.roster` na `{ id: pigId, look: rosterPig?.look || rosterPig, pinned: !!loc.pinned, stage: rosterPig?.stage || st.stageKey || 'adult' }`.
   - Wywołać `CanvasPig.setPresentPigs(isLocked ? [] : presentList)` (fallback `setPigVisible` gdy brak metody).
4. **Warstwa pogody (`CuyWeather`)**:
   - Dodać leniwy loader `assets/data/weather.json` (wzorzec `ensureLights` `:48-80`).
   - W `applyScene` (`:890-914`): dla `getPlaceKind(currentSceneId) === 'outdoor'` i `!isLocked` zarejestrować `window.CuyRoom.addLayer('weather', 15, (ctx, scene) => ...)` wywołującą `CuyWeather.draw(ctx, weatherState, scene.time, scene.width, scene.height)` z `CuyWeather.stateFor(new Date(), 'outdoor', st?.settings, weatherData)`. Dla `indoor` lub `isLocked` wywołać `window.CuyRoom.removeLayer('weather')`.
5. **Nocne źródła plenerowe (`CuyLight.build`, `:84-166`)**:
   - `CuyLight.build` przekazuje `kind = getPlaceKind(sId)` i `placedForLights` (z `CuyScenes.placedThings`, `:95-96`) do `Lights.activeSources` (`:156`), które po `PK-P6c` automatycznie zapala `torch`, `lamp_oil`, `lantern`, `brazier`, `campfire` od `evening` i pilnuje `toggle: false`.

## 4. Kotwice PK-PE2

Cel: `web/home/features/places/edit-panel.js` (1567 linii) i `web/home/features/places/edit-panel.css` (297 linii).

1. **Nagłówek i subpanel (`edit-panel.js:1156-1169, 1221-1238`)**:
   - W obu miejscach `.edit-drawer-header-actions` (`:1161-1169` i `:1226-1234`) przed `#editDrawerClose` dodać `#editSkinsBtn` (`Skins`) i `#editTemplatesBtn` (`Themes`).
   - W `#editDrawer` (`:1236`) przed `#editDrawerContent` dodać `#editDrawerFilters` i `#editDrawerSubpanel` (`hidden`).
   - Dla `getSceneKind(curScene) === 'outdoor'` (`:719-723`) ukrywać `#editSkinsBtn`, `#editTemplatesBtn` i `#editDrawerSubpanel`.
2. **Montowanie `EditFilters`, `EditSkins`, `EditTemplates`**:
   - Dodać `_filterState = { tab: 'All', query: '' }` (przy powrocie z `outdoor` do pokoju reset `'Outdoor' -> 'All'`).
   - W `renderDrawerContent(state, curScene)` (`:1355-1382`): po `itemsFor(state, curScene)` filtrować przez `EditFilters.filterItems` (zakładka `Outdoor` widoczna tylko na dworze); przy 0 wyników pokazać `EditFilters.EMPTY_MESSAGE`.
   - Klik `#editSkinsBtn` / `#editTemplatesBtn` otwiera `#editDrawerSubpanel` i wywołuje `EditSkins.build` / `EditTemplates.build(subpanel, { state, roomId: curScene, send })`.
3. **Blokada fixture (`edit-panel.js:463-471, 1332-1351, 1483-1503`)**:
   - Dodać `isFixtureItem(thing)`: `!!(thing && (thing.fixture === true || thing.removable === false || String(thing.uid || thing.id || '').startsWith('fx:')))`.
   - Zablokować `room_remove` w 3 miejscach: drag-to-drawer (`:463-471`), `#editItemRemoveBtn` (`:1334-1350`), `Delete`/`Backspace` (`:1483-1503`); pokazać toast `"You can move this fixture, not stash it."` (`showToast` w `app.js` `UNVERIFIED` co do dokładnej nazwy helpera). `room_move` (`:473-481`) działa dalej.
4. **`.edit-hint` i kursor**:
   - Dodać `.edit-hint` (`"Drag objects to move, or drag to drawer to stash"`), widoczny tylko przy `_isOpen === true`; ustawiać `cursor: grab` nad ruchomymi obiektami w Edit.
5. **Lampy R25 — czerwona/zielona komórka (`edit-panel.js:262-285, 408-430`)**:
   - `onPointerMove` (`:262-268`) i `onPointerUp` (`:408-414`) przekazują `snappedX/Y` do `CanvasPig.cellValid(itemId, snappedX, snappedY)` -> `setGhost({ ..., valid })`. Po `PK-CV2` `cellValid` rozróżnia `wall` (`cy=0..1`) i `floor` (`cy=2..6`); przy `!valid` czerwony duch, brak `room_place`.
6. **Układ `420x640` / `400x620` (`edit-panel.css:48-68`)**:
   - Obecnie `.edit-drawer` ma `bottom: 0; max-height: 220px; z-index: 100;` (`:48-55`), zasłaniając `.actions-section` i `#btnMore`. Podnieść szufladę nad `.actions-section`, by zachować `drawer.top >= placesBar.bottom` i `drawer.bottom <= btnMore.top`.

## 5. Kotwice PK-APP2 (kolejność skryptów, More)

1. **`web/home/index.html` (po `PK-P47c`)**:
   - `PK-P47c` dodał `#placesBar`, `#placesBarTitle`, `#placesEditBtn` (`:72-80`) i `.stage-viewport` z `.stage-overlay-hint` (`:86-88`).
   - Kolejność `<script>`:
     - Przed `canvas-pig.js` (`:293`): dodać `lib/hotspots.js`, `lib/weather.js`, `lib/scene-pigs.js`, `lib/play-targets.js` przy `lib/lights.js` (`:292`).
     - Przed `features/places/edit-panel.js` (`:311`): dodać `features/places/edit-filters.js`, `features/places/edit-templates.js`, `features/places/edit-skins.js`.
2. **`web/home/app.js` — ukrycie `farm` / `market` w More**:
   - W `listFeatures()` (`:783-785`) i `openMoreModal()` (`:926-927`) wykluczyć `'farm'` i `'market'` obok `'rooms'` i `'garden'`. Zachować je w `features/index.json:13-14`, bo działają w scenie przez hotspoty.
3. **`web/home/app.js` — przekierowanie deep linku (`openFeature`, `:786-798`)**:
   - Rozszerzyć `if (id === 'rooms' || id === 'garden')` (`:791-798`) o `'farm'` -> `openPlace('farm')` i `'market'` -> `openPlace('market')`.

## 6. Testy regresji i znane awarie

Uruchomione po F2-2 (5/5 PASS):
- `node tools/qa/ux-p47-bar.js` -> EXIT 0 (`T1`..`T6 OK`).
- `node tools/qa/ux-p6-filters.js` -> EXIT 0 (`F1`..`F11 OK`).
- `node tools/qa/ux-p6-templates.js` -> EXIT 0 (`M1`..`M10 OK`, `STUB send`).
- `node tools/qa/ux-p6-skins.js` -> EXIT 0 (`K1`..`K10 OK`, inline `state.rooms`).
- `node tools/qa/ux-p43-hotspots.js` -> EXIT 0 (`X1`..`X10 PASS`).

Znane awarie po F2-2 (z logów):
- `PK-P47r`: `ux-p34-pig-walk.js` FAIL `W3` (0.75 vs 1) i `W8` (`take_out`).
- `PK-P5b`: 4 testy `PigPinMessagesTests.cs` FAIL na `MessageValidator.cs`/`IMessageRuleSet.cs`.
- `PK-P46a`: `WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50` oczekuje 75 zamiast 80.

Weryfikacja dla paczek F2-4:
- `PK-PF2`: `node --check web/home/features/places/feature.js && node tools/qa/ux-p47-bar.js && node tools/qa/ux-p43-hotspots.js`.
- `PK-PE2`: `node --check web/home/features/places/edit-panel.js && node tools/qa/ux-p6-filters.js && node tools/qa/ux-p6-templates.js && node tools/qa/ux-p6-skins.js`.
- `PK-APP2`: `node --check web/home/app.js && node tools/qa/web-smoke.js && node tools/qa/ux-p47-bar.js`.

## 7. Prompt fixes

- **PK-PF2**:
  - Pogodę rejestrować przez `window.CuyRoom.addLayer('weather', 15, fn)` i `removeLayer('weather')` (NIE `CanvasPig.addLayer`).
  - Usunąć `initCanvasLampClick` (`places/feature.js:1040-1069`) oraz `gx = 120; gy = 65;` (`:141-144`); lampy podpiąć pod `CanvasPig.onHotspot` (`hs.kind === 'lamp'`).
  - W `applyScene` (`:851-918`) przekazywać świnki przez `CanvasPig.setPresentPigs(presentList)`.
- **PK-PE2**:
  - `#editSkinsBtn` i `#editTemplatesBtn` oraz `#editDrawerSubpanel` ukrywać na `outdoor`; przekazywać `{ state, roomId, send }`.
  - Blokadę fixture (`fixture === true || removable === false || uid.startsWith('fx:')`) wstawić w 3 miejscach (`:463`, `:1334`, `:1483`) z toastem `"You can move this fixture, not stash it."`.
  - `.edit-drawer` (`edit-panel.css:48-68`) podnieść nad `.actions-section` (koniec z `bottom: 0`), żeby nie zasłaniać `#btnMore` w `420x640` i `400x620`.
- **PK-APP2**:
  - W `index.html:292-293` dodać `lib/{hotspots,weather,scene-pigs,play-targets}.js` przed `canvas-pig.js`; w `:310-311` dodać `features/places/edit-{filters,templates,skins}.js` przed `edit-panel.js`.
  - W `app.js:783-785` i `:926-927` ukryć `farm` i `market` w More; w `openFeature` (`:791-798`) przekierować `'farm'` i `'market'` do `CuyPlaces.openPlace`.
