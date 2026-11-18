Decyzje: podział `canvas-pig.js` na dwa rozłączne przejścia (PK-P47r: kadr/skala/światło/cień; PK-CV2: multi-pig/cele/paski/hotspoty), a pogoda przez `window.CuyRoom.addLayer`.
Nowe API PK-CV2 na `CanvasPig` i `PigCanvas`: `setPresentPigs(list)`, `setHotspots(list)`, `getHotspots()`, `onHotspot(fn)`, plus `thing.suppressDraw`, `thing.frames`, `thing.fps`.
Tryb Edit wykrywany przez `window.CuyEdit && window.CuyEdit.isOpen && window.CuyEdit.isOpen()` (`edit-panel.js:1550`), bo `edit-panel.js:211` blokuje tylko trafione meble, a puste kliknięcia docierają do `canvas`.
Pytanie do właściciela (rozstrzygnięte): czy budżet `drawImage` w PK-T12 podać jako wielokrotność sceny bazowej czy stałą? Wybrano oba: `<= 120` wywołań na klatkę i `<= 1.5x` (3 świnki) / `<= 2.5x` (pełny stres).
Różnice wykryte: `tools/qa/ux-p46-render.js` z weryfikacji PK-CV2 nie istnieje jeszcze na `main` przed F2-2 — zapisano w sekcji 5 i 7 (`Prompt fixes`).
Status: OK.
