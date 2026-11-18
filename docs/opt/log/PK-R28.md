# PK-R28 Log
- Decyzje: wybrano `depthScale = [0.75, 0.875]` (`bScale = 0.875`) ze stałej kratki `16 px` (zachowuje 1:1 domyślny salon `12x7` i mieści się w `0.75–0.875` z R47); `cellToPx`/`pxToCell` zostają lokalne dla pokoju, a `stageOffset(cols, rows)` przesuwa render/walk/cellValid.
- Wykryta niespójność: `scenes.js:467-489` też liczy `depthScale` z `sw` i nadpisuje fallback w `canvas-pig.js`; `PK-P47r` musi ignorować `def.depthScale` dla pokoi, a `PK-CV2` poprawi `scenes.js`.
- Wykryta niespójność: `RoomsFeature.cs:641-642` dzieli `rawX/rawY` przez `16.0` bez offsetu sceny, więc `edit-panel.js` (`PK-PE2`) musi odjąć `stageOffset` przed wysłaniem `room_place`/`room_move`.
- O co zapytałbym właściciela: co z pokojem `20x9` (`320x144`), który jest szerszy niż stały kadr `256x144`? Wybrana odpowiedź: `stageOffset(20,9) = {x:-32, y:0}` (wyśrodkowany bez kamery), a `PK-T9` V6 sprawdza dla `20x9` tylko widoczne komórki `0..255`.
- API/pola: `CuyRoomGeometry.STAGE_W = 256`, `CuyRoomGeometry.STAGE_H = 144`, `CuyRoomGeometry.stageOffset(cols, rows)`, `place_scenes.json` `scenes.room.{size,walk,behindLine}`.
- Status: OK
