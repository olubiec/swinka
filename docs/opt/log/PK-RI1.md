# PK-RI1 Log
- Status: OK. Weryfikacja `node tools/qa/foundation-check.js docs/opt/foundations/RI1.md 6` PASS.
- Paczki F2-2: `PK-P47r` BLOCKED (`ux-p34-pig-walk.js` W3/W8), `PK-P5b` BLOCKED (4 testy `PigPinMessagesTests.cs`); 7 paczek (`PK-P43c/d`, `PK-P5a`, `PK-P7a/b`, `PK-P6b/s`) ma `STUB` w testach jednostkowych/QA; reszta OK.
- Rozbieżności kontrakt/rzeczywistość: `scenes.js:644-656` (`placedThings`) nie zwraca `w`/`h`, więc `hotspots.js:64-65` bez poprawki przyjmie `16x16`; `play-targets.js:156-160` ustawia `window.CuyPlayTargets` tylko w gałęzi `else`; `index.html:288-313` nie ładuje jeszcze 4 modułów z `lib/`.
- Regresje przed PK-CV2: `ux-p44-drag-edge.js` (G3/G7), `ux-p39-blockers.js` (B5), `ux-p45-pig-depth.js` (PD3) i `ux-p34-pig-walk.js` (W1/W3/W8) już padają po F2-2; `ux-p46-render.js` i `ux-p47-room.js` PASS.
- Decyzja: dodano poprawkę `w: sw, h: sh` w `placedThings` oraz wytyczne dot. pre-existing FAILów i `nowMs` dla `thingLitCanvas` w sekcji 6 (`Prompt fixes` dla PK-CV2).
