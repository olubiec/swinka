# RI1: Analiza integracji `canvas-pig.js` i `scenes.js` (F2-2 -> PK-CV2)

## 1. Status paczek F2-2 (canvas i moduły)

Zweryfikowano wszystkie 18 logów w `docs/opt/log/` oraz obecność plików docelowych:

- `PK-P46a.md`: **OK** (konflikt poza `Zmieniaj`: `WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50` oczekuje 75 zamiast 80).
- `PK-P46b.md`: **OK** (`scenes.js:595` `placedThings`, `scenes.js:473` `def`, `scenes.js:662` `debugInstances`, `scenes.js:459` `setBgClean`, `places/mock.js`).
- `PK-P47a.md`: **OK** (tła 256x144 dla `garden/park/farm/market`, `bg_clean: true` w `place_scenes.json`).
- `PK-P47c.md`: **OK** (`#placesBar`, `places/feature.js`).
- `PK-P47r.md`: **BLOCKED** (`room-geometry.js:5-20`, `canvas-pig.js` kadr 256x144, `roomOffset`, `thingLitCanvas`, `drawThingShadow` `canvas-pig.js:1375`). `ux-p47-room.js` i `ux-p26-night.js` PASS, lecz `ux-p34-pig-walk.js` FAIL (`W3 depth-scale`, `W8 drag-still-works`). **Skutek dla PK-CV2**: zmiany PK-P47r są już w `canvas-pig.js` i przesunęły kotwice względem R32 o ok. +55..+90 linii; `ux-p34-pig-walk.js` jest już zepsuty przed PK-CV2.
- `PK-P6c.md`: **OK** (`web/home/lib/lights.js`, `assets/data/lights.json` z `campfire`, `campfire_small`, `auto_at: "evening"`).
- `PK-P43ab.md`: **OK** (`web/home/lib/hotspots.js`, `assets/data/scene_hotspots.json`, `tools/qa/ux-p43-hotspots.js`).
- `PK-P43c.md`: **OK (STUB w teście)** (`STUB onHotspot` w `ux-p43-market-scene.js`; `features/market/feature.js` podpina `CanvasPig.onHotspot` i `CanvasPig.getHotspots`).
- `PK-P43d.md`: **OK (STUB w teście)** (`STUB onHotspot` w `ux-p43-farm-scene.js`; `features/farm/feature.js` podpina `CanvasPig.onHotspot`, `CanvasPig.addLayer('farm_markers', 60, ...)` i `CanvasPig.getHotspots`).
- `PK-P5a.md`: **OK (STUB w teście)** (`STUB isFree` w `ux-p5-scene-pigs.js`; `web/home/lib/scene-pigs.js`).
- `PK-P5b.md`: **BLOCKED** (JS `ux-p5-pin.js` P1-P8 PASS; 4 testy w `PigPinMessagesTests.cs` padają na `MessageValidator.cs`/`IMessageRuleSet.cs` poza `Zmieniaj`). **Skutek dla PK-CV2**: brak blokady dla `canvas-pig.js`/`scenes.js`.
- `PK-P5c.md`: **OK** (`FormPet.IsAmbientCompanion`, `BrainController.SetDesktopPet`, `PigsFeature.HandleMessage`).
- `PK-P7a.md`: **OK (STUB w teście)** (`createMockCtx` w `ux-p7-weather.js`; `web/home/lib/weather.js`, `assets/data/weather.json`).
- `PK-P7b.md`: **OK (STUB w teście)** (`STUB grid-16` w `ux-p7-play-targets.js`; `web/home/lib/play-targets.js`).
- `PK-P6a.md`: **OK** (`web/home/features/places/edit-filters.js`).
- `PK-P6b.md`: **OK (STUB w teście)** (`STUB send` w `ux-p6-templates.js`; `web/home/features/places/edit-templates.js`).
- `PK-P6s.md`: **OK (STUB w teście)** (inline fixture + `send` spy w `ux-p6-skins.js`; `web/home/features/places/edit-skins.js`).
- `PK-P24c.md`: **OK (NO-OP)** (`HomeWindow.cs` bez zmian).

## 2. Kontrakt vs rzeczywistość (tabela)

| Moduł / plik | Kontrakt (R29/R30/R31) | Rzeczywisty eksport (`file:line`) | Różnica |
|---|---|---|---|
| `scene-pigs.js` | `CuyScenePigs.create(opts)` -> `{ sync, step, entries, remove, setBounds, setPinned, debug }` | `window.CuyScenePigs` / `module.exports` (`scene-pigs.js:329-347`): `create(opts)` (`44`) zwraca te same 7 metod | Zgodne; `step(dtMs, ctx)` (`240`) tnie `dtMs` na podkroki `<=50ms` z limitem `2000ms` (`PK-P5a.md`) |
| `hotspots.js` | `KINDS, EMPTY, fromScene, hit, arbitrate, clampLabelRect, sortKeyboard, createTracker` | `window.CuyHotspots` / `module.exports` (`hotspots.js:263-277`): wszystkie 8 kluczy (`85, 130, 155, 163, 192, 208`) | `arbitrate(opts)` bierze `editMode` jako parametr; `classifyInstance` (`64-65`) czyta `inst.sw`/`inst.w` i `inst.sh`/`inst.h` (domyślnie `16`), a `placedThings` (`scenes.js:644-656`) nie zwraca `w`/`h` |
| `play-targets.js` | `CuyPlayTargets.{ kindOf, interactionSpots, pickReachable }` | `module.exports` / `window.CuyPlayTargets` (`play-targets.js:150-160`): `kindOf` (`34`), `interactionSpots` (`44`), `pickReachable` (`104`) | W `156-160` jest `if (module.exports) ... else { root.CuyPlayTargets = api; }` (nie ustawia `window` przy aktywnym CommonJS); `defs` przyjmuje funkcję lub mapę (`79`) |
| `weather.js` | `CuyWeather.{ DEFAULT_DATA, stateFor, draw }` | `window.CuyWeather` / `module.exports` (`weather.js:184-193`): `DEFAULT_DATA`, `stateFor` (`85`), `draw` (`130`) | Zgodne (`fnv1a` ma dodatkowo fmix32; poza zakresem `canvas-pig.js`, rejestrowane w `PK-PF2` przez `CuyRoom.addLayer`) |
| `lights.js` | `activeSources`, dane z `lights.json` | `PK-P6c.md`: eksportuje `autoOn`, przekazuje `base_file`, `flame_anchor`, `flame_strip_anchor` (`UNVERIFIED` poza logiem) | Dodatkowe pola dla ognia (`campfire`) |

Wyniki uruchomienia testów z kroku 2 (wszystkie exit 0):
- `node tools/qa/ux-p5-scene-pigs.js`: **PASS** (`S1-S11`, `4 pigs x 10000 steps: 42ms`).
- `node tools/qa/ux-p43-hotspots.js`: **PASS** (`X1-X10`, `10 passed, 0 failed`).
- `node tools/qa/ux-p7-play-targets.js`: **PASS** (`T1-T10`, `all 10 tests passed`).
- `node tools/qa/ux-p7-weather.js`: **PASS** (`W1-W8`).
- `node tools/qa/ux-p47-room.js`: **PASS** (`T1-T5`).

## 3. Plan sklejenia PK-CV2 (5 elementów, kotwice po zmianach)

Wszystkie kotwice w `web/home/canvas-pig.js` i `web/home/features/places/scenes.js` po scaleniu `PK-P47r` i `PK-P46b`:

1. **Wielu świnek (`window.CuyScenePigs`)**:
   - `constructor` (`canvas-pig.js:289-355`): dodać `this.presentPigs = []` oraz `this.scenePigs = (typeof window !== 'undefined' && window.CuyScenePigs) ? window.CuyScenePigs.create({ bounds: this.walk || [10, 96, 230, 126], minGap: 22 }) : null;`.
   - `setPresentPigs(list)` (nowa metoda przy `setPigVisible` `1011`, plus eksport na `CanvasPig` `3145+` i alias `PigCanvas.setPresentPigs` `3321+`): ustawia `this.presentPigs`, `this.pigVisible = this.presentPigs.length > 0`, woła `this.scenePigs.sync(this.presentPigs)`.
   - `setScene(def)` (`875-979`, po `959`): `if (this.scenePigs) this.scenePigs.setBounds(this.walk || [10, 96, 230, 126]);`.
   - `update(dt)` (`2206-2344`): gdy `this.scenePigs && this.presentPigs.length > 0`, woła `this.scenePigs.step(dt, { isFree: (x, y) => this.isFree(x, y), bounds: this.walk })` i kopiuje `entries()[0]` do `this.pigX`/`this.pigY` (kompatybilność drag/zabawy).
   - `render()` (`2348-2486`, sekcja `2399-2482`): pobrać `entries()` (lub 1-elementowy fallback `this.pigX/Y`), posortować widoczne świnki razem z `allStanding` po `y` rosnąco; nie psuć kolejności `PK-P47r` (`drawContactShadow` `2844`, `applySceneLight` `2832`, `drawPig` `2740` z `resolveSheet` `3048` + `litFrame` `2899`, `thingLitCanvas` `2433-2462`, `applySceneGlow` `2470`).
   - `isOverPig(x, y)` (`1826-1833`): sprawdzać też dodatkowe świnki z `scenePigs.entries()`.
   - `debug()` (`1284-1335`): dodać pole `pigs: [...]` (`{ id, x, y, look, pinned }`) oraz wpisy wszystkich świnek do `renderList` (`1288-1296`).

2. **Cele zabawy i synchronizacja zabawki (`window.CuyPlayTargets`)**:
   - `constructor` (`289-355`): `this.pendingPlay = null; this.activePlay = null;`.
   - `pickRandomWalkTarget()` (`1175-1273`, po `1196`): jeśli `window.CuyPlayTargets` jest dostępny i np. `Math.random() < 0.25`, wywołać `pickReachable(this.things, { x: this.pigX, y: this.pigY }, (x,y)=>this.isFree(x,y), (sx,sy,tx,ty)=>this.findPath(sx,sy,tx,ty), Math.random, id=>this.getItemDef(id))` (`getItemDef` `1534`); zapisać `this.pendingPlay = res` i ustawić ścieżkę do `res.spot`.
   - `update(dt)` (`2240-2306`): po dojściu do `pendingPlay.spot` znaleźć `thing` (`id === res.thingUid || uid === res.thingUid`), ustawić `thing.suppressDraw = true`, `this.facing = res.spot.facing`, `this.activePlay`, oraz kolejkę animacji (`tunnel`: `tunnel_in/wiggle/out`, `ball`: `ball_push`). Po zakończeniu animacji (oraz w `setScene` `875`, `setThings` `981`, starcie `drag` `1943`) wyczyścić `pendingPlay`/`activePlay` i zresetować `t.suppressDraw = false`.
   - `drawThing(ctx, thing, skipShadow)` (`1404-1424`): na początku `if (!thing || thing.suppressDraw) return;`. `drawPig` (`2740-2787`) używa `getDrawScale()` (`scaleAt(this.pigY)`), więc zabawka w klatce 64x64 rysuje się automatycznie w skali sceny.

3. **Paski klatek świateł (`frames` / `fps`)**:
   - `drawThing(ctx, thing, skipShadow)` (`1404-1424`): odszukać `src` w `this.lightScene && this.lightScene.sources` po `id`/`uid`/`itemId`; gdy `src && src.on && src.on_file`, rysować `on_file` (lub bazę + płomień na `src.flame_anchor` dla `campfire`). Dla `frames > 1`: `fw = Math.floor(sw / frames)`, `idx = Math.floor((nowMs / 1000) * fps) % frames`, `sx = idx * fw`, rysować wycinek `(sx, 0, fw, sh)` (również w gałęzi `thing.flip` `1416-1419`) z `ax = thing.anchorX ?? Math.round(fw / 2)`.

4. **API hotspotów i arbitraż kliknięć**:
   - `constructor` (`289-355`): `this._hotspots = []; this._hotspotListeners = [];` (lub `window.CuyHotspots.createTracker()`).
   - Nowe metody publiczne na `PigCanvas`, `CanvasPig` (`3145+`) i aliasy `PigCanvas.*` (`3321+`): `setHotspots(list)`, `getHotspots()`, `onHotspot(fn)` (zwraca funkcję `unsubscribe`).
   - `bindEvents()` `pointermove` (`2020-2022`): policzyć `mode = CuyHotspots.arbitrate({ overPig, editMode, dragging: !!this.drag })` (gdzie `editMode = !!(window.CuyEdit && window.CuyEdit.isOpen && window.CuyEdit.isOpen())`); kursor `grab` dla `pig`, `pointer` gdy `mode === 'hotspot'` i `hitHotspot(p.x, p.y)`, inaczej `default`.
   - `handleCanvasClick(e)` (`2063-2087`): po czyszczeniu kupy (`2069-2075`) i `if (this.isOverPig(x, y))` (`2078-2080`), jeśli `!editMode` i `h = hitHotspot(x, y)`: wywołać listener(y) `onHotspot(h)` raz i `return` przed `sniff` (`2082-2086`). Zakończony drag ustawia `this.suppressClick = true` (`2026`), co blokuje `handleCanvasClick`.

5. **`scenes.js` — `CuyScenes.hotspotsFor(sceneId, state)`**:
   - W `web/home/features/places/scenes.js`: w `placedThings(state, sceneId)` (`644-656`) dodać `w: sw, h: sh` (wyliczone w `634-635`) do zwracanego obiektu, aby `CuyHotspots.classifyInstance` (`hotspots.js:64-65`) znało rozmiar instancji.
   - Dodać `hotspotsFor(sceneId, state)` przed `CuyScenes = { ... }` (`676-692`) i wyeksportować na `CuyScenes`: pobiera `placedThings(state, sceneId)` i wywołuje `window.CuyHotspots.fromScene(sceneId, staticHotspots, instances, catalog)` (dane `assets/data/scene_hotspots.json` dociągane w `load()` `211+`).

## 4. Testy regresji dla PK-CV2 i znane awarie

- **Przechodzące po F2-2 (muszą przechodzić po PK-CV2)**: `ux-p46-render.js` (D1-D8), `ux-p47-room.js` (T1-T5), `ux-p5-scene-pigs.js` (S1-S11), `ux-p43-hotspots.js` (X1-X10), `ux-p7-play-targets.js` (T1-T10).
- **Już padające po F2-2 (zweryfikowane przed PK-CV2)**:
  1. `ux-p44-drag-edge.js` (exit 1): `FAIL G3 continue-keeps-drag` (`Expected 1 onDrop on release`, `0 !== 1`) oraz `FAIL G7 drop-snaps-free-cell` (`Dropped point (68, 129) must not be inside blocker`).
  2. `ux-p39-blockers.js` (exit 1): `AssertionError [ERR_ASSERTION]: Duplicate ID fixture must fail B5` (`tools/qa/ux-p39-blockers.js:87`).
  3. `ux-p45-pig-depth.js` (exit 1): `FAIL PD3 band-extremes-match-depthScale` (`[salon] Top scale 0.75 vs ds[0]=1 diff 0.25 > 1/32` — stara asercja vs `[0.75, 0.875]` z `PK-P47r`).
  4. `ux-p34-pig-walk.js` (exit 1): `FAIL W1 walks-2d` (`[garden] Pig x span 115 < 50% of band width 120`), `FAIL W3 depth-scale` (`[salon] Top scale 0.75 vs 1 diff > 1/8`), `FAIL W8 drag-still-works` (`Dragging out of scene must send take_out`).

## 5. Ryzyka

- **Brak skryptów w `index.html` na starcie PK-CV2**: `web/home/index.html:288-313` nie ładuje jeszcze `lib/{scene-pigs,play-targets,hotspots,weather}.js` (robi to równoległy `PK-APP2`). Wszystkie wywołania w `canvas-pig.js` i `scenes.js` muszą mieć strażników `window.X && ...` i działać bezbłędnie bez tych modułów.
- **`roomOffset` z `PK-P47r` a hotspoty lamp w pokojach**: `canvas-pig.js:983-994` (`setThings`) dodaje `this.roomOffset` do `t.x`/`t.y` w pokojach (`sceneKind === 'room'`), podczas gdy `placedThings` (`scenes.js:625-632`) wywołuje `roomGeom.cellToPx(layout, ...)` (`room-geometry.js:52-85`). Na scenach zewnętrznych `roomOffset = {0, 0}`, ale w pokojach `hotspotsFor` musi dawać współrzędne spójne z narysowanym meblem (uwzględnić `roomGeom.stageOffset(cols, rows)` z `room-geometry.js:15` lub użyć pozycji po offsecie).
- **Podwójne `drawThing` w `thingLitCanvas` (`canvas-pig.js:2454, 2459`)**: obiekty przed świnką w trybie `lit` są rysowane dwa razy (`source-over` i `destination-in`). Jeśli `drawThing` liczy klatkę paska przez świeże `Date.now()`, przy granicy klatki maska i kolor mogą się rozjechać — trzeba użyć jednego `nowMs` na całą klatkę `render()`.
- **Budżet `drawImage` przy 3 świnkach**: `drawPig` (`2771`) woła `litFrame` dla każdej świnki w trybie `lit`; utrzymać limit `<= 1.5x` sceny bazowej.

## 6. Prompt fixes (dla PK-CV2)

- **Rzeczywiste kotwice (zamiast R32)**: używaj linii po `PK-P47r` i `PK-P46b` z sekcji 3 (`constructor: 289`, `setScene: 875`, `setThings: 981`, `pickRandomWalkTarget: 1175`, `debug: 1284`, `drawThing: 1404`, `isOverPig: 1826`, `pointermove: 2020`, `handleCanvasClick: 2063`, `update: 2206`, `render: 2348`, `drawPig: 2740`, `CanvasPig: 3145`, `PigCanvas.*: 3321`; `scenes.js`: `placedThings: 595`, `CuyScenes: 676`).
- **Brakujące `w, h` w `placedThings`**: w `scenes.js:644-656` dodaj `w: sw, h: sh` do zwracanych elementów, inaczej `CuyHotspots.classifyInstance` (`hotspots.js:64-65`) przyjmie `16x16` zamiast rozmiaru z atlasu.
- **Testy regresji w `Weryfikacja`**: `ux-p44-drag-edge.js`, `ux-p39-blockers.js`, `ux-p45-pig-depth.js` i `ux-p34-pig-walk.js` **już padają po F2-2** (sekcja 4). Nie naprawiaj ich (są poza `Zmieniaj`); odnotuj w `PK-CV2.md` ich pre-existing FAIL i zweryfikuj przejście `ux-p50-canvas-wiring.js`, `ux-p46-render.js` oraz `ux-p47-room.js`.
- **Ładowanie w `ux-p50-canvas-wiring.js`**: dopóki `PK-APP2` nie dopisze `lib/{scene-pigs,play-targets,hotspots}.js` do `index.html`, ładuj je jawnie przez `page.addScriptTag` w teście.
