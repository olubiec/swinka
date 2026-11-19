# PK-PF-CV: Canvas hotfix: live pig dragging under multi-pig, litFrame & pattern caching, double-render removal, and pixel footprint collision grid
Zmieniaj: web/home/canvas-pig.js, docs/opt/log/PK-PF-CV.md
Weryfikacja: node --check web/home/canvas-pig.js && node tools/qa/ux-p50-canvas-wiring.js && node tools/qa/ux-p47-room.js && node tools/qa/ux-p44-drag-edge.js && node tools/qa/ux-p39-blockers.js && node tools/qa/ux-p34-pig-walk.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Fix the 3 root problems in `web/home/canvas-pig.js`: (1) make the pig visibly follow the cursor while dragging even when `_multiPigActive` is true and a 1 Hz state push arrives, (2) eliminate 60 FPS CPU lag by caching `litFrame`, caching `createPattern`, and removing the duplicate synchronous `inst.render()` in `setLightScene`, and (3) fix `rebuildGrid()` so grid-cell `w, h` footprints block their full pixel width/height instead of 1-3 px.

Depends on: `docs/opt/foundations/RIF1.md`, `RF1.md`, `RF4.md`. Biegnie w kroku F2F-4 równolegle z `PK-PF-SC` i `PK-PF-PL`.

Produces (names other packages rely on): `CanvasPig.isDragging()`, smooth 60 FPS `litFrame`/`drawHabitat`, live visual pig dragging, accurate pixel collision grid in `web/home/canvas-pig.js`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RIF1.md`
- `docs/opt/foundations/RF1.md`
- `docs/opt/foundations/RF4.md`
- `web/home/canvas-pig.js` linie 240-315, 550-650, 1070-1120, 1465-1515, 2210-2315, 2750-2815, 2930-3030, 3340-3425, 3650-3740

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RIF1.md` oraz wskazane zakresy linii w `web/home/canvas-pig.js`.
2. Napraw przeciąganie świnki (`canvas-pig.js`):
   - W `pointerdown` (gdy rozpoczyna się `this.drag`) oraz w `pointermove` (gdy `this.drag.moved`): ustaw `this._overridePrimaryPos = true;` i jeśli `this.scenePigs && typeof this.scenePigs.movePrimary === 'function'`, wywołaj `this.scenePigs.movePrimary(this.pigX, this.pigY);`.
   - W `render()` (~2768) i `debug()` (~1471): używaj `if ((this._overridePrimaryPos || this.drag) && pigEntries.length > 0)` żeby główna świnka zawsze rysowała się w aktualnym `(this.pigX, this.pigY)` podczas przeciągania.
   - W `setPresentPigs(list)` (~1078): jeśli `this.drag` jest aktywne (`this.drag !== null`), NIE nadpisuj `this.pigX`, `this.pigY` ani `this._overridePrimaryPos = false` — zachowaj aktualną pozycję przeciąganej świnki i zaktualizuj nią `this.scenePigs.movePrimary(this.pigX, this.pigY)`.
   - Dodaj metodę `isDragging() { return !!this.drag; }` na instancji oraz `isDragging: function () { return !!(inst && inst.isDragging && inst.isDragging()); }` na `window.CanvasPig`.
3. Napraw zacinanie (CPU lag) w `canvas-pig.js`:
   - W `window.CanvasPig.setLightScene` (~250-258): usuń nadmiarowe wywołanie `if (inst.render) inst.render();` na linii ~255 (ponieważ `inst.setLightScene(scene)` samo wywołuje `this.render()`).
   - W `litFrame(sheet, sx, sy, scene)` (~3349): dodaj cache ostatnio policzonej klatki `_litCache` (lub małą mapę max 8 wpisów po kluczu `(sheet.src || '') + ':' + sx + ':' + sy + ':' + (this.flipX ? 1 : 0) + ':' + Math.round(this.pigX / 2) + ':' + Math.round(this.pigY / 2) + ':' + ambient + ':' + srcSig`), dzięki czemu `getImageData` + pętla 4096 pikseli + `putImageData` wykonuje się tylko przy faktycznej zmianie klatki animacji, pozycji o >=2 px lub światła, a nie 60 razy na sekundę dla tej samej klatki.
   - W `drawHabitat` (~2938, 2977, 3014): cache'uj `img._cachedPattern = img._cachedPattern || ctx.createPattern(img, 'repeat')`.
4. Napraw siatkę kolizji `rebuildGrid()` (~558-590):
   - Obliczaj pikselową szerokość `spw` i wysokość `sph` przedmiotu: jeśli `Number(t.sw) > 0`, użyj `Number(t.sw)`; w przeciwnym razie jeśli `Number(t.w) > 0`, to gdy `t.w <= 8` (wymiar w kratkach siatki 16 px), użyj `t.w * 16`, a gdy `t.w > 8` (wymiar już w pikselach, np. w `ux-p39-blockers.js`), użyj `t.w`. Analogicznie dla `sph` (`t.sh` lub `t.h <= 8 ? t.h * 16 : t.h`).
   - Dla przedmiotów blokujących (`layer !== 'wall' && !t.walkable && !t.noBlock`): wyznacz prostokąt stopy `fy1 = ty + sph`, `footH = Number(t.footH) > 0 ? Number(t.footH) * 16 : Math.min(sph, Math.max(8, Math.round(sph * 0.45)))`, `fy0 = Math.max(ty, fy1 - footH)`, oraz dodaj poziomy margines na połowę szerokości świnki `padX = 4` (`fx0 = tx - padX`, `fx1 = tx + spw + padX`), tak aby środek stóp świnki nie mógł wejść w grafikę mebla ani przedmiotu plenerowego, a jednocześnie wszystkie istniejące testy (`ux-p39-blockers.js`, `ux-p50-canvas-wiring.js`, `ux-p47-room.js`, `ux-p34-pig-walk.js`) przechodziły w 100%.
5. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-CV.md` (max 10 linii).
