# F2-FIX5: światło świnki, noszenie w głąb i do ramki, zmiana pokoju, etykiety sklepów, szuflada edycji

Stan 21.11.2026 15:55. Rozszerzony plan naprawczy po teście na żywo (uwzględnia stan po commitach `0f90b09`..`2753f0d` oraz nowe zgłoszenia użytkownika).
Agenci nie uruchamiają komend zapisujących gita (`AGENTS.md`). Każdy pisze log `docs/opt/log/<id>.md` (max 10 linii). Właściciel commituje.

## Zgłoszenia i przyczyny (zbadane w kodzie)

1. **Świnka w ciemności nie jest ciemniejsza, a przy źródle światła w nocy staje się za jasna (plus zachowanie w dzień).**
   - **Brak ściemnienia w ciemności (wyłączone lampy i okno w nocy):**
     - `web/home/canvas-pig.js`: ani `litFrame()` (l. 3976), ani `pigLightAt()` (l. 285) **nie sprawdzają `src.on !== false`**! `Lights.activeSources()` (`web/home/lib/lights.js` l. 109) zwraca wszystkie źródła z polem `on: true/false`, więc wyłączona lampa (`on: false`) nadal oświetlała świnkę pełną mocą w ciemnym pokoju.
     - Źródło `"window"` (`window_sun`, `assets/data/lights.json` l. 248) ma `toggle: false` i `color: "ambient"`, więc `autoOn` zwraca `on: true` także w nocy (`radius = 96 px`), a `pigLightAt` dodawało od okna `+ k * ambient * source_gain` ponad ambient pokoju.
     - `web/home/features/places/feature.js` `CuyLight.build()` (l. 222-275): przedmioty w pokojach (`CuyScenes.placedThings`) mają współrzędne lokalne pokoju bez `roomOffset` (`off.x = 32, off.y = 16` w salonie 12x7; `off.x = 48, off.y = 24` w pokoju 10x6), podczas gdy `setThings` przesuwa sprite'y lamp o `roomOffset`, a świnka chodzi w przestrzeni `256x144`. Dodatkowo `CuyLight.build` nie przekazywało `pigLight: lightsData.pig_light`.
   - **Prześwietlenie przy lampie w nocy (i w dzień):**
     - Świnka była **oświetlana podwójnie**: najpierw `litFrame()` rozjaśniało piksele świnki do `~0.94..1.0` (`source_gain: 0.6`), a potem w `render()` (`web/home/canvas-pig.js` l. 3354) **PO** `drawPigFor` wywoływane jest `this.applySceneGlow(ctx, this.lightScene)` (`web/home/features/places/feature.js` l. 336-374), które rysuje radialny gradient z `globalCompositeOperation = 'lighter'` (`alpha <= 0.32`, czyli do `+81` RGB!) **bezpośrednio na wierzchu świnki**!
     - Tło i meble pod lampą mają w nocy mnożnik `ambient (~0.34..0.59) + glow (~0.32) ≈ 0.66..0.71`, a świnka miała `litFrame (0.94) + glow (0.32) = 1.26` (jaśniejsza niż w dzień i 2x jaśniejsza niż otoczenie lampy).
     - **Rozwiązanie:** W `pigLightAt` i `litFrame` pominąć źródła z `src.on === false` oraz `src.color === 'ambient'` / `src.itemId === 'window'`. W `lights.json` i `PIG_LIGHT_DEFAULTS` ustawić `source_gain: 0.22, max: 0.78` (wtedy `litFrame [~0.56] + applySceneGlow [+0.32] ≈ 0.88 <= 1.0`). W `CuyLight.build` dodać `roomOffset` dla pokoi i przekazać `pigLight`. W `applySceneGlow` pominąć `window` (`color === 'ambient'`), a w dzień (`scene.period === 'day'`) stłumić `glowAlpha * 0.35`.

2. **Przenoszenie w przestrzeni pomieszczenia (głębia + kolizje) oraz brak możliwości dociągnięcia świnki do samej ramki okna.**
   - **Głębia i kolizje (`F5-D` — wgrane w `canvas-pig.js` l. 2580-2595):** `pointermove` używa `clampDragToFree(this.pigX, this.pigY, targetX, targetY)` oraz `pigAirY = clamp(10..48, 10 + max(0, y0 - rawVisualY))`.
   - **Dlaczego nie da się dociągnąć świnki do samej ramki okna:**
     - W `web/home/canvas-pig.js` `setScene(def)` (l. 1075-1085) dla pokoi (`this.sceneKind === 'room' && !def.roomOffset`) `this.walk` dodaje `this.roomOffset.x` (`32` dla 12x7 -> `x: 40..216`; `48` dla 10x6 `pig:*` -> `x: 56..200`; lub nawet `72..248` przy fallbacku z `place_scenes.json`), podczas gdy `drawHabitat` (l. 3447) rysuje ścianę i podłogę pokoju na **całej scenie `256x144`** (`roomX0 = 0, innerW = 256, floorBottomY = 144`)!
     - Przez `x0 = 40..56` i `x1 = 200..216` świnka zatrzymuje się o 40–56 px sceny (~65–90 px CSS) przed lewą i prawą ramką okna oraz 18–26 px przed dolną ramką.
     - **Rozwiązanie:** W `setScene` dla pokoi (`this.sceneKind === 'room' && !def.roomOffset`) rozciągnąć `this.walk` na pełną szerokość i dół podłogi sceny `256x144`:
       `const stageWallY = Math.max(0, ((this.roomOffset && this.roomOffset.y) || 0) + (this.wallH || 32));`
       `this.walk = [8, stageWallY + 8, this.sceneWidth - 8, this.sceneHeight - 6];` (`[8, stageWallY + 8, 248, 138]`).

3. **Przy zbliżaniu świnki do skraju okna: brak strzałek (tylko brązowe paski), zmiana pokoju nie działa w każdym pomieszczeniu w każdą stronę.**
   - **Brak strzałek (`F5-U` + `F5-D` — wgrane):** ukryty tekst `<`/`>` na `#stageEdgeLeft/#stageEdgeRight` (`feature.css`), usunięte `this.drawEdgeIndicator(ctx)` z `render()` (`canvas-pig.js`).
   - **Dlaczego zmiana pokoju nie działa w każdym pomieszczeniu w każdą stronę (3 przyczyny):**
     1. **Zablokowane sceny w środku pierścienia (`web/home/features/places/feature.js` `handleEdgeHold`, l. 871-893):**
        W `assets/data/places.json` na starcie odblokowane są `salon`, pokoje świnek (`pig:*`) oraz `market` (`unlocked_at_start: true`), natomiast `garden`, `park`, `farm` pomiędzy `pig:*` a `market` są zablokowane (`locked: true`). Pierścień ma postać `[salon (odblokowany), pig:* (odblokowany), garden (zablokowany), park (zablokowany), farm (zablokowany), market (odblokowany)]`.
        W `pig:*` (lub po odblokowaniu ogrodu — w `garden`) ruch w prawo trafia na zablokowany `garden`/`park`, a w `market` ruch w lewo trafia na zablokowany `farm` — i `handleEdgeHold` przerywa zmianę pokoju zamiast przeskoczyć do kolejnego **odblokowanego** pokoju/miejsca w tym kierunku! (Backend C# `PlacesFeature.cs` l. 279 ma już `allowNonAdjacent: true`, więc obsługuje przeskok nad zablokowanymi scenami).
     2. **Chwyt świnki z boku (`anchor.dx`) a strefa `inLeftZone`/`inRightZone` (`web/home/canvas-pig.js` l. 2623-2624):**
        `inLeftZone` i `inRightZone` sprawdzały wyłącznie kursor myszy (`e.clientX <= rect.left + 24` / `e.clientX >= rect.right - 24`). Gdy gracz złapie świnkę bliżej jej prawego boku (`anchor.dx > 0`) i dociągnie świnkę do lewej ramki (`rawX <= 14`), kursor jest jeszcze ~35–40 px CSS od ramki i strefa krawędzi w ogóle się nie włącza (analogicznie przy prawym brzegu).
     3. **Blokada obu krawędzi przez `edgeHoldRearmed = false` po `continueDrag` (`web/home/canvas-pig.js` l. 2465, 2628, 2644):**
        Po przejściu przez jedną krawędź (np. prawą) `this.edgeHoldRearmed = false` blokowało także przeciwną krawędź (lewą), jeśli gracz od razu przeciągnął świnkę na drugą stronę, a ponadto `_dragStartSceneX` nie był aktualizowany w `continueDrag`.

4. **Pasek wyboru rzeczy do pokoju (`#editDrawer`) zwijalny i wyświetla się zamiast menu (`F5-U` — wgrane).**
   - `body.cuy-edit-open` ukrywa `.actions-grid`, `.edit-drawer` ma `bottom: 0`, przycisk `#editDrawerCollapse` (`▾`/`▴`) zwija szufladę do paska tytułu (`.edit-drawer.is-collapsed`).

5. **Etykiety sklepów (`market`): mają być na ich dole (na blacie), dalej w głębi, żeby nie nachodziły na niesioną świnkę.**
   - **Pozycja na dachu zamiast na dolnym blacie (`web/home/features/places/scenes.js` `drawMarketSignboards`, l. 1085-1086):**
     Obecnie `sy = Math.round(top + Math.max(3, Math.min(8, Math.round(sh * 0.12))))` (`top + 5`) rysuje tabliczkę `14x12` na górnej markizie/dachu straganu. W sprite'ach `stall_basic.png` (`48x40`) i `stall_big.png` (`64x40`) przedni drewniany blat/lada znajduje się na dole straganu (`top + 22 .. top + 34`). Zmiana na `sy = Math.round(top + Math.max(12, sh - 18))` umieszcza tabliczkę `14x12` bezpośrednio na drewnianym blacie na dole straganu.
   - **Nachodzenie na niesioną świnkę (`web/home/canvas-pig.js` `render()`, l. 3368-3370):**
     `window.CuyScenes.drawMarketSignboards(...)` było wywoływane w l. 3368 **PO** narysowaniu świnki (`drawPigFor`) i **PO** `applySceneLight`! Przez to gdy gracz podniósł świnkę (`pigAirY > 0`) na tle straganu (`stall.y = 112 < pigY = 120..140`), etykiety sklepów rysowały się **na wierzchu świnki** i nie były objęte światłem sceny.
     Przeniesienie `drawMarketSignboards` przed `applySceneLight` i przed `drawPigFor` (zaraz po narysowaniu obiektów stojących za świnką `t.y <= firstPigY`) sprawia, że etykiety leżą na straganach w głębi (za świnką) i nigdy nie nachodzą na świnkę.

---

## Kroki wykonania (zaktualizowane)

> **Status wcześniejszych kroków:** `F5-L` (wersja 1), `F5-U` i `F5-D` (wersja 1) są już w drzewie (commity `0f90b09`..`2753f0d`).
> Poniższe 3 kroki (`F5-C`, `F5-P`, `F5-Q`) domykają wszystkie nowe punkty oraz poprawkę światła i krawędzi na bazie aktualnego stanu repozytorium. Pliki `Zmieniaj` w Kroku 1 są całkowicie rozłączne, więc Agenci E i F mogą działać równolegle.

| Krok | Agent | Paczka | Zmieniaj | Model |
|---|---|---|---|---|
| 1 (równolegle) | E | `F5-C` `canvas-pig.js` + `lights.json`: światło (off/window/gain), `walk` do ramki, strefa krawędzi, głębia etykiet sklepów | `web/home/canvas-pig.js`, `assets/data/lights.json`, `docs/SWIATLO_SWINEK.md`, `docs/opt/log/F5-C.md` | inherit |
| 1 (równolegle) | F | `F5-P` `places/feature.js` + `scenes.js`: zmiana pokoju w każdą stronę (przeskok `locked`), etykiety sklepów na blacie, offset światła w pokojach | `web/home/features/places/feature.js`, `web/home/features/places/scenes.js`, `docs/opt/log/F5-P.md` | inherit |
| 2 (po E i F) | D | `F5-Q` pełny test regresji `ux-p76-fix5.js`, bramka, 7 zrzutów ekranu | `tools/qa/ux-p76-fix5.js` (nowy), `docs/qa/shots/fix5-*.png`, `docs/opt/log/F5-Q.md` | inherit |

Zasady oszczędności (dla każdego agenta):
- Czytaj wyłącznie podane zakresy linii (`read_file` ze `StartLine`/`EndLine`); nie czytaj całych plików `canvas-pig.js` (4577 l.), `places/feature.js` (1647 l.), `scenes.js` (1163 l.).
- Nie uruchamiaj `setup.sh` (Playwright jest gotowy w `tools/qa/node_modules`).
- Testy Playwright uruchamiaj pojedynczo (sekwencyjnie), nigdy równolegle.
- Nie zmieniaj istniejących asercji w starych testach (`AGENTS.md`); konflikty zapisz w `docs/opt/log/<id>.md` (max 10 linii). Raport końcowy max 8 linii.

---

## Prompt E — `F5-C` Pig light (off/window/gain), full-stage room walk to frame, edge zones, market signboard depth
```
You are a frugal agent in repo c:\Users\48782\Desktop\projekty ai\swinka-1 (read AGENTS.md rules once; never run git write commands).
Package F5-C. Four targeted fixes in web/home/canvas-pig.js and assets/data/lights.json:

1. Pig lighting (no bright pig in dark room when lamp is off / near window; no double-lighting burnout near lit lamp):
   - In assets/data/lights.json (line 4): update "pig_light" to:
     "pig_light": {"ambient_strength": 1.0, "source_gain": 0.22, "min": 0.2, "max": 0.78, "knee": 200, "note": "Pig light in Home scenes: ambient multiplied at full strength like the room; lamps add source_gain*k*color; capped at max (0.78) so litFrame + applySceneGlow never exceeds daylight (1.0)."}
   - In web/home/canvas-pig.js (lines 279-301):
     - Set PIG_LIGHT_DEFAULTS = { ambient_strength: 1.0, source_gain: 0.22, min: 0.2, max: 0.78, knee: 200 }.
     - In pigLightAt(ambient, sources, wx, wy, cfg): inside `(sources || []).forEach((src) => {`, immediately skip disabled or ambient-window sources:
       `if (!src || src.on === false || src.color === 'ambient' || src.itemId === 'window' || src.item === 'window_sun') return;`
   - In web/home/canvas-pig.js litFrame() (~lines 3976-3981): filter `(sc.sources || [])` with
     `.filter((s) => s && s.on !== false && s.color !== 'ambient' && s.itemId !== 'window' && s.item !== 'window_sun')`
     before sorting/slicing the 2 nearest sources, so turned-off lamps or windows never displace active lamps or light the pig in the dark.
   - In docs/SWIATLO_SWINEK.md point 3: update numbers to source_gain 0.22, max 0.78, and note that off sources (on:false) and ambient windows are skipped.

2. Dragging/walking the pig all the way to the window frame in every room:
   - In web/home/canvas-pig.js setScene(def) (~lines 1075-1085):
     Currently for `this.sceneKind === 'room' && !def.roomOffset`, `this.walk` adds `this.roomOffset.x` (making x0=40..56, x1=200..216, y1=118..126), even though drawHabitat() renders the room wall and floor across the full 256x144 stage!
     Replace the `if (this.sceneKind === 'room' && !def.roomOffset)` branch with:
     ```js
     if (this.sceneKind === 'room' && !def.roomOffset) {
       const stageWallY = Math.max(0, ((this.roomOffset && this.roomOffset.y) || 0) + (this.wallH || 32));
       this.walk = [8, stageWallY + 8, this.sceneWidth - 8, this.sceneHeight - 6];
     } else {
       this.walk = def.walk ? def.walk.slice() : null;
     }
     ```
     so in every room (10x6, 12x7, 14x8, 16x8) the pig can reach x = 8..248 and y = stageWallY+8..138 (right up to the window frame).

3. Edge zone activation & opposite-side re-arming during drag:
   - In web/home/canvas-pig.js continueDrag(newSceneDef) (~lines 2434-2466):
     Set `this._dragStartSceneX = this.pigX;` and `this._disarmedSide = this.lastHoldSide || null;` (in addition to `this.edgeHoldRearmed = false`).
     In pointerdown (~line 2540) and endDrag (~line 2688): also reset `this._disarmedSide = null;`.
   - In web/home/canvas-pig.js pointermove (~lines 2622-2664):
     Trigger the left/right edge zone when EITHER the pointer is within 24 CSS px of the canvas edge OR the dragged pig's desired x (`rawX`) reaches within 14 scene px of the edge:
     ```js
     const inLeftZone = (e.clientX <= rect.left + 24) || (rawX <= 14);
     const inRightZone = (e.clientX >= rect.right - 24) || (rawX >= this.sceneWidth - 14);
     ```
     Allow left hold to start when `(this.edgeHoldRearmed || this._disarmedSide !== 'left')`, and right hold when `(this.edgeHoldRearmed || this._disarmedSide !== 'right')`.
     When `!inLeftZone && !inRightZone` (or when `inLeftZone && this._disarmedSide === 'right'` or `inRightZone && this._disarmedSide === 'left'`), set `this.edgeHoldRearmed = true; this._disarmedSide = null;`.

4. Market stall signboards drawn behind the pig (never overlapping the carried pig) and lit by scene light:
   - In web/home/canvas-pig.js render() (~lines 3275-3371):
     Remove the late `if (this.sceneId === 'market' ... drawMarketSignboards ...)` block at ~lines 3368-3370 (which ran AFTER drawPigFor and AFTER applySceneLight).
     Instead, call:
     ```js
     if (this.sceneId === 'market' && typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.drawMarketSignboards === 'function') {
       window.CuyScenes.drawMarketSignboards(ctx, this.lastState || {}, { things: this.things });
     }
     ```
     inside both branches of `if (pigEntries.length > 0)`:
     - in the `pigEntries.length > 0` branch: right after `allStanding.filter(t => (t.y || 0) <= firstPigY).forEach(...)` (~line 3282, BEFORE `this.applySceneLight` and BEFORE `this.drawPigFor`),
     - in the `else` branch (~line 3361): right after `allStanding.forEach(...)` and BEFORE `if (lit) { this.applySceneLight... }`.

Zmieniaj: web/home/canvas-pig.js, assets/data/lights.json, docs/SWIATLO_SWINEK.md, docs/opt/log/F5-C.md.
Czytaj tylko: web/home/canvas-pig.js lines 270-310, 1050-1155, 2430-2470, 2520-2700, 3265-3385, 3965-4045; assets/data/lights.json lines 1-15; docs/SWIATLO_SWINEK.md lines 1-45.
Weryfikacja (run sequentially):
  node --check web/home/canvas-pig.js
  node tools/qa/ux-p44-drag-edge.js
  node tools/qa/ux-p71-lag-and-drag-fix.js
  node tools/qa/ux-p73-drag-collision-lamps.js
  node tools/qa/ux-p75-f2-fix2.js
Log docs/opt/log/F5-C.md (max 10 lines). Final reply max 8 lines.
```

---

## Prompt F — `F5-P` Room switching in every room & direction, shop labels on bottom counter, room light source offsets
```
You are a frugal agent in repo c:\Users\48782\Desktop\projekty ai\swinka-1 (read AGENTS.md rules once; never run git write commands).
Package F5-P. Three targeted fixes in web/home/features/places/feature.js and web/home/features/places/scenes.js:

1. Room switching by dragging to the edge works in every room in every direction (web/home/features/places/feature.js):
   - Root cause: in places.json, `salon`, `pig:*`, and `market` are unlocked at start, while `garden`, `park`, `farm` in the middle of the ring `[salon, pig:*, garden, park, farm, market]` are locked. When dragging the pig right from `pig:*` (or `garden`), or left from `market`, `handleEdgeHold` (~lines 861-920) and `handlePigExit` (~lines 720-753) only checked the immediate adjacent entry in `ord`; hitting a locked entry aborted the switch instead of advancing to the next unlocked room/place in that direction (C# `PlacesFeature.cs` already allows `allowNonAdjacent: true`).
   - Add a helper in web/home/features/places/feature.js (near `computeNeighbourScene` ~line 631):
     ```js
     function findNextUnlockedScene(currentScene, direction, st) {
       const ord = getOrder(st);
       if (!Array.isArray(ord) || ord.length === 0) return null;
       const step = (direction === 'left' || direction === -1) ? -1 : 1;
       const startIdx = ord.findIndex(s => s && s.id === currentScene);
       if (startIdx === -1) {
         return ord.find(s => s && !s.locked && s.id !== currentScene) || null;
       }
       for (let i = 1; i < ord.length; i++) {
         const candidate = ord[(startIdx + step * i + ord.length * 2) % ord.length];
         if (candidate && !candidate.locked && candidate.id !== currentScene) {
           return candidate;
         }
       }
       return null;
     }
     ```
   - In `handleEdgeHold(ev)` (~lines 871-894):
     First look up the immediate neighbour `neighbourId` / `neighbourItem` as today. If `!neighbourItem || neighbourItem.locked || neighbourId === current`, look up `const unlockedAlt = findNextUnlockedScene(current, side, st);`. If `unlockedAlt` exists, use `neighbourId = unlockedAlt.id; neighbourItem = unlockedAlt; isLocked = false; isNone = false;` so dragging the pig to the left or right edge in ANY room always transitions to the next unlocked room/place in that direction!
     Only if no other unlocked scene exists in the entire ring (`!unlockedAlt`), show the toast `'Locked: ' + hint`, clear `edgeHold` on the canvas instance (`const inst = getCanvasPigInst(); if (inst && typeof inst.clearEdgeHold === 'function') inst.clearEdgeHold();`), call `syncEdgeActive(null)`, and return.
   - In `handlePigExit(ev)` (~lines 731-743): similarly fall back to `findNextUnlockedScene(currentSceneId, direction, st)` if `targetScene` is locked.

2. Shop stall labels (signboards) placed at the bottom on the wooden counter front (web/home/features/places/scenes.js):
   - In `drawMarketSignboards(ctx, state, opts)` (~lines 1067-1133):
     Currently line 1086 sets:
     `const sy = Math.round(top + Math.max(3, Math.min(8, Math.round(sh * 0.12))));`
     which draws the 14x12 signboard at the very top of the stall on the roof canopy (`top + 5`).
     Change `sy` to sit on the lower wooden counter front board ("na ich dole, na tym blacie"):
     ```js
     const sy = Math.round(top + Math.max(12, sh - 18));
     ```
     (For `sh = 40` on `stall_basic.png` and `stall_big.png`, `sy = top + 22`, so the 14x12 signboard spans `top + 22 .. top + 34`, centered on the wooden counter front panel above the base legs).

3. Indoor light source stage offset, `pigLight` pass-through, and daytime/window glow guard (web/home/features/places/feature.js):
   - In `CuyLight.build(sceneId, placed, toggles)` (~lines 196-276):
     - Compute the indoor room stage offset `off`:
       If `kind === 'indoor'` and `!placed` (i.e. items came from `CuyScenes.placedThings(st, sId)` or `layout.items`), look up `const layout = (window.CuyScenes && typeof window.CuyScenes.layoutFor === 'function') ? window.CuyScenes.layoutFor(sId, getState()) : null;`, `cols = (layout && layout.cols) || 12`, `rows = (layout && layout.rows) || 7`, and `off = (window.CuyRoomGeometry && typeof window.CuyRoomGeometry.stageOffset === 'function') ? window.CuyRoomGeometry.stageOffset(cols, rows) : { x: Math.floor((256 - cols * 16) / 2), y: Math.floor((144 - rows * 16) / 2) }`. (When explicit `placed` is passed by a caller/test with `it.isPixel`, keep `off = { x: 0, y: 0 }`).
     - Add `off.x` and `off.y` to `gx` and `gy` (when `!it._stageOffsetApplied && !it.isPixel`) so indoor lamp light positions match the rendered lamp sprites on the 256x144 canvas.
     - In the object returned by `CuyLight.build` (~line 269), include:
       `pigLight: (window.Lights && typeof window.Lights.pigLight === 'function') ? window.Lights.pigLight(lightsData) : (lightsData.pig_light || null)`
   - In `PigCanvas.prototype.applySceneGlow` (~lines 336-375):
     - Inside `sources.forEach((src, idx) => {`: skip ambient window sources (`if (!src || !src.on || src.color === 'ambient' || src.itemId === 'window') return;`) so windows don't draw a radial point-lamp glow circle at night.
     - Scale `glowAlpha`: in daytime (`scene.period === 'day'`), multiply `glowAlpha` by `0.35` so a lamp turned on during the day does not over-brighten the scene or pig (keep `glowAlpha` unchanged for `'night'`/`'evening'`/`'morning'`).

Zmieniaj: web/home/features/places/feature.js, web/home/features/places/scenes.js, docs/opt/log/F5-P.md.
Czytaj tylko: web/home/features/places/feature.js lines 195-399, 630-648, 720-755, 860-925; web/home/features/places/scenes.js lines 1060-1135.
Weryfikacja (run sequentially):
  node --check web/home/features/places/feature.js
  node --check web/home/features/places/scenes.js
  node tools/qa/ux-p63-light-pixels.js
  node tools/qa/ux-p74-market-farm-ux.js
  node tools/qa/ux-p44-drag-switch.js
Note: in ux-p44-drag-switch.js, T3 expects dragging from garden toward locked park to stay in garden and show a Locked toast; with fix #1 it now skips locked park and switches to the next unlocked scene as requested by the user. Do NOT change ux-p44-drag-switch.js; record the T3 conflict in docs/opt/log/F5-P.md.
Log docs/opt/log/F5-P.md (max 10 lines). Final reply max 8 lines.
```

---

## Prompt D — `F5-Q` Full regression test `ux-p76-fix5.js`, verification gate, 7 screenshots
```
You are a frugal QA agent in repo c:\Users\48782\Desktop\projekty ai\swinka-1 (read AGENTS.md rules once; never run git write commands).
Package F5-Q. Read logs docs/opt/log/F5-L.md, F5-U.md, F5-D.md, F5-C.md, F5-P.md first.
Write ONE headless Playwright test tools/qa/ux-p76-fix5.js modelled on tools/qa/ux-p75-f2-fix2.js (read only its first 65 lines for the harness pattern).
It must verify all 5 user requirements:

1. Pig light (night dark, lamp never burns, off lamp & window ignored):
   - CanvasPig.pigLightAt: day no lamp == ambient (+-0.01); night no lamp == ambient (+-0.01);
     night with lamp {on:false, distance:0} == night ambient (+-0.01);
     night with window {on:true, color:'ambient', itemId:'window', distance:0} == night ambient (+-0.01);
     night with active lamp {on:true, distance:0, intensity:1, color:[1,0.72,0.38]} -> every channel <= 0.78.
   - Rendered canvas check in salon: mean luminance of opaque pig pixels at night without lamp < 0.55 * day luminance;
     at night right next to an active lamp_floor (including applySceneGlow), mean luminance of opaque pig pixels <= day luminance.

2. Carrying in depth, collisions, and reaching the window frame in every room:
   - In salon (12x7) and pig:pig_1 (10x6): inst.walk[0] <= 8 and inst.walk[2] >= 248 (full stage width).
   - Dragging the pig 25 scene px up in salon decreases pigY, decreases CanvasPig.scaleAt(pigY), keeps pigAirY <= 12, and obeys furniture collisions (isFree(pigX, pigY) === true).
   - Dragging the pig to the left frame and right frame in pig:pig_1 allows pigX <= 12 on the left and pigX >= 244 on the right.

3. Edge bars without arrows & room switching in every room in every direction (even when some places are locked):
   - With default starter unlock state (salon, pig:pig_1, market unlocked; garden, park, farm locked):
     - In pig:pig_1, dragging to the right edge and holding 320 ms switches to market (skipping locked garden/park/farm);
     - In market, dragging to the left edge and holding 320 ms switches back to pig:pig_1;
     - In salon, dragging left switches to market and dragging right switches to pig:pig_1.
   - While edgeHold is active on #stageEdgeRight: it has class edge-active, computed color is transparent or font-size is 0px, and ctx.drawImage never draws ui/arrow_*.png.

4. Market shop signboards on bottom counter & behind the carried pig:
   - In market scene, CuyScenes.drawMarketSignboards returns 3 signboards with sy >= top + sh - 18 (for sh=40, sy >= top + 22, on the counter front).
   - Carry the pig so its drawn body overlaps the center stall's signboard (x = sx + 7, visualY covering sy..sy+12) and call inst.render(): verify via spy/order or pixel check that drawPigFor runs AFTER drawMarketSignboards (the pig overlaps the signboard, not vice versa).

5. Edit drawer at 420x640 replaces menu and collapses:
   - Open edit mode -> document.body has class cuy-edit-open, .actions-grid is hidden (display:none), #editDrawer top >= #pigCanvas bottom;
   - Click #editDrawerCollapse -> #editDrawer has class is-collapsed and height <= 40 px (while body.cuy-edit-open and edit mode stay active);
   - Click #editDrawerCollapse again -> expanded; close edit mode -> .actions-grid visible again.

Also save 7 screenshots in docs/qa/shots/:
  fix5-night-dark.png, fix5-night-lamp.png, fix5-day.png,
  fix5-drag-back.png, fix5-market-labels.png,
  fix5-edit-drawer.png, fix5-edit-drawer-collapsed.png
Inspect each screenshot with read_file and verify it visually shows the fix.

Run verification sequentially:
  powershell -ExecutionPolicy Bypass -File tools/verify.ps1 -Js web/home/canvas-pig.js,web/home/lib/lights.js,web/home/features/places/edit-panel.js,web/home/features/places/feature.js,web/home/features/places/scenes.js -Smoke
  node tools/qa/ux-p76-fix5.js
  node tools/qa/ux-p63-light-pixels.js
  node tools/qa/ux-p71-lag-and-drag-fix.js
  node tools/qa/ux-p73-drag-collision-lamps.js
  node tools/qa/ux-p74-market-farm-ux.js
  node tools/qa/ux-p75-f2-fix2.js
  node tools/qa/ux-p40-edit-drawer.js

Zmieniaj: tools/qa/ux-p76-fix5.js, docs/qa/shots/fix5-*.png, docs/opt/log/F5-Q.md.
Log docs/opt/log/F5-Q.md (max 10 lines). Final reply max 8 lines.
```

---

## Koordynator — po Kroku 2
1. `git status --short` — sprawdzenie, że zmienione zostały wyłącznie pliki z tabeli + logi + zrzuty.
2. Zapis podsumowania w `docs/opt/log/F2-FIX5.md` (max 10 linii): co naprawiono, decyzje/konflikty ze starymi testami (`ux-p44-drag-switch.js` T3, `ux-p52` E14, `ux-p62` D10), lista kroków do ręcznego sprawdzenia w `Cuy.exe` (`tools/build.ps1`).
3. Bez commita (commituje właściciel).
