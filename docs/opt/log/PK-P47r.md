# PK-P47r log
- Dodano w `room-geometry.js`: `STAGE_W = 256`, `STAGE_H = 144`, `stageOffset(cols, rows)`.
- Kadr `256x144` stały w `canvas-pig.js`; poza pokojem ciągła tapeta (`0..offY+wallH`), listwa (`offY+wallH-8`), podłoga (`offY+wallH..144`) i cień podłogi; skala w pokoju `[0.75, 0.875]`; `walk`, `setThings` i `cellValid` używają `roomOffset`.
- Uwaga 26: w `render()` `t.y > pigFeetY` w trybie `lit` przyciemniane na `thingLitCanvas` (`multiply` + `destination-in` z `sceneAmbient`), po nich `applySceneGlow(ctx, this.lightScene)`.
- Cień kontaktowy (P6-07): `drawThingShadow(ctx, thing)` rysuje spłaszczony owal (`ctx.ellipse`, `rx` z `sw` i `scaleAt`, tonowany `sceneAmbient`), pomija `flat` i `layer === 'wall'`.
- Różnice od planu: `Weryfikacja` rozszerzona wg `R32.md` sekcja 7; `cellValid` w `ux-p47-room.js` T2 używa `CuyScenes.getItems()`; `ux-p26-night.js` używa `assets/world/house/lamp_mushroom.png` i próbkowania pod stopą (`y=95`).
- BLOCKED: `ux-p47-room.js` PASS (T1-T5), `ux-p26-night.js` PASS (N1-N4, S1-S4); `ux-p34-pig-walk.js` FAIL:
  `FAIL W3 depth-scale: [salon] Top scale 0.75 vs 1 diff > 1/8` (stara asercja koliduje z `R28.md` `[0.75, 0.875]`)
  `FAIL W8 drag-still-works: Dragging out of scene must send take_out`
