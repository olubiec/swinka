# PK-RF1: Research: frame lag, state push thrashing and drag override bug in canvas-pig.js & places/feature.js
Zmieniaj: docs/opt/foundations/RF1.md, docs/opt/log/PK-RF1.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RF1.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Nie uruchamiaj git. Czytaj wyłącznie wskazane zakresy linii. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Measure and prove the exact code lines causing the 1 Hz lag/stutter on every `{ type: 'state' }` push and the invisible/frozen pig during mouse dragging, and specify the exact diff anchors for `PK-PF-CV` (`web/home/canvas-pig.js`) and `PK-PF-PL` (`web/home/features/places/feature.js`).

Depends on: nothing (tylko odczyt). Działa w kroku F2F-1 równolegle z `PK-RF2..PK-RF6`.

Produces (names other packages rely on): `docs/opt/foundations/RF1.md` (1500..16000 znaków, sekcje `## 1.` .. `## 5.`):
- `## 1.` 1 Hz state push thrashing in `places/feature.js` (`applyScene` lines 868-1065)
- `## 2.` 60 FPS CPU hotspots in `canvas-pig.js` (`litFrame`, `setLightScene`, `drawHabitat`)
- `## 3.` Mouse drag bug under `_multiPigActive` and `setPresentPigs` reset
- `## 4.` Exact contracts and anchors for `PK-PF-PL` and `PK-PF-CV`
- `## 5.` Prompt fixes

## Czytaj tylko (zakaz czytania innych plików)
- `web/home/features/places/feature.js` linie 850-1080
- `web/home/canvas-pig.js` linie 240-315, 1070-1120, 1465-1510, 2210-2310, 2750-2815, 2930-3030, 3340-3425

## Nie czytaj
Wszystkich pozostałych plików w repozytorium, `docs/PLAN.md`, `docs/archive/`, pełnego `canvas-pig.js` poza wskazanymi zakresami.

## Steps
1. Przeczytaj wskazane zakresy `web/home/features/places/feature.js` (850-1080) i udowodnij z numerami linii, że każde przyjście `{ type: 'state' }` (co 1 s z C#) wywołuje `updateStageNav` -> `applyScene`, które bezwarunkowo woła `CanvasPig.setThings(things, true)` (kasując animacje zabawy `clearPlayState()` i przebudowując siatkę `rebuildGrid()`), `CanvasPig.setLightScene(sceneLight)` oraz `CanvasPig.setPresentPigs(presentList)`.
2. Przeczytaj wskazane zakresy `web/home/canvas-pig.js` i udowodnij 3 wąskie gardła CPU:
   - `window.CanvasPig.setLightScene` (linie 250-258) woła `inst.setLightScene(scene)` (które już woła `this.render()` na linii 298) i zaraz potem drugi raz synchronicznie `inst.render()` na linii 255.
   - `litFrame(sheet, sx, sy, scene)` (linie 3349-3415) w każdej klatce 60 FPS robi `getImageData(0, 0, 64, 64)`, pętlę po 4096 pikselach z `Math.hypot` i `putImageData` bez cache'owania po kluczu `(sheet.src, sx, sy, Math.round(pigX/2), Math.round(pigY/2), ambient, sourcesKey)`.
   - `drawHabitat` (linie 2938, 2977, 3014) tworzy `ctx.createPattern(img, 'repeat')` 3 razy na klatkę zamiast cache'ować `img._cachedPattern`.
3. Przeczytaj `canvas-pig.js` (1070-1120, 1465-1510, 2210-2310, 2750-2815) i udowodnij oba powody niedziałającego przeciągania świnki:
   - Gdy `this._multiPigActive === true`, `render()` (linia 2768) i `debug()` (linia 1471) nadpisują `pigEntries[0]` pozycją `(this.pigX, this.pigY)` tylko wtedy, gdy `this._overridePrimaryPos` jest `true` (nie sprawdzają `this.drag`), a `pointermove` (linie 2241-2249) zmienia tylko `this.pigX/pigY` bez ustawienia `this._overridePrimaryPos = true` i bez `this.scenePigs.movePrimary(this.pigX, this.pigY)`.
   - Co 1 s w trakcie trzymania myszy `applyScene` woła `setPresentPigs` (linie 1078-1100), które kasuje `this._overridePrimaryPos = false` i cofa `this.pigX/pigY` do pozycji początkowej.
4. Zapisz w sekcji 4 dokładne kotwice i kod zmian dla `PK-PF-PL` (sygnatury JSON `lastThingsSig`, `lastLightSig`, `lastPresentSig`, `lastWeatherSig` + `CanvasPig.isDragging()` guard) oraz `PK-PF-CV` (`isDragging()`, `litFrame` cache, `_cachedPattern`, naprawa `pointerdown`/`pointermove`/`setPresentPigs`/`render`/`debug`).
5. Uruchom Weryfikację (`node tools/qa/foundation-check.js docs/opt/foundations/RF1.md 5`).

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-RF1.md` (max 10 linii).
