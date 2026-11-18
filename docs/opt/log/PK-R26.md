# PK-R26 log
- Decyzja (uwaga 26): zachować `applySceneLight` (ambient `multiply`) przed `drawPig` (`litFrame`), przyciemniać `allStanding (t.y > pigFeetY)` przez scratch `source-atop`, a `Lamp glow`+`dust` przenieść do `applySceneGlow` po wszystkich stojących.
- Decyzja (cień mebli): owal `ellipse` w `drawThingShadow` w `canvas-pig.js:drawThing` z pominięciem `thing.flat || thing.layer === 'wall'`, `layer` przekazane z `scenes.js:placedThings`.
- Decyzja (P6-06): straż `src.toggle === false` w `lights.js:activeSources` i `feature.js:setLampToggle`; usunięcie `initCanvasLampClick` w `PK-PF2`.
- Decyzja (P6-07): usunięcie fallbacku `gx = 120; gy = 65` w `feature.js:141-144` (pominięcie elementu bez `x/y`).
- API/pola: `PigCanvas.prototype.applySceneGlow(ctx, scene)`, `PigCanvas.prototype.drawThingShadow(ctx, thing)`, `placedThings[].layer`, `Lights.activeSources`, `window.__cuyNow`, `CuyPlaces.setLampToggle`.
- Pytanie do właściciela (rozstrzygnięte wg R6/AGENTS): czy `initCanvasLampClick` usuwamy całkowicie w `PK-PF2`? Wybrano tak (zostaje `toggleLamp`/`setLampToggle` i klik przez obsługę sceny).
- Weryfikacja: `node tools/qa/foundation-check.js docs/opt/foundations/R26.md 7`.
