# PK-PF-PL: Places feature hotfix: state signature diffing to stop 1 Hz lag, drag guard for setPresentPigs, and immediate lamp toggle
Zmieniaj: web/home/features/places/feature.js, docs/opt/log/PK-PF-PL.md
Weryfikacja: node --check web/home/features/places/feature.js && node tools/qa/ux-p51-places-wiring.js && node tools/qa/ux-p47-bar.js && node tools/qa/ux-p44-drag-switch.js && node tools/qa/ux-p38-presence.js && node tools/qa/ux-p39-light.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Eliminate the 1 Hz state-push lag in `web/home/features/places/feature.js` by diffing `things`, `sceneLight`, `presentList`, `hotspots`, and `weather` signatures before calling `CanvasPig.*`, skip `setPresentPigs` while the user is actively dragging the pig (`CanvasPig.isDragging()`), and force an immediate light refresh when clicking a `lamp_toggle` hotspot.

Depends on: `docs/opt/foundations/RIF2.md`, `RF1.md`. Biegnie w kroku F2F-4 równolegle z `PK-PF-CV` i `PK-PF-SC`.

Produces (names other packages rely on): Lag-free `applyScene` in `web/home/features/places/feature.js`, drag-safe `setPresentPigs`, instant `lamp_toggle` feedback.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RIF2.md`
- `docs/opt/foundations/RF1.md`
- `web/home/features/places/feature.js` linie 1-230, 820-1150

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RIF2.md`, `RF1.md` oraz wskazane linie `web/home/features/places/feature.js`.
2. W `web/home/features/places/feature.js`:
   - Dodaj zmienne stanu sygnatur: `let lastSceneKey = ''; let lastThingsSig = ''; let lastLightSig = ''; let lastPresentSig = ''; let lastHotspotsSig = ''; let lastWeatherSig = '';` oraz funkcję `resetSceneSigs()`, wywoływaną przy faktycznej zmianie `currentPlace`, przełączeniu trybu Edit oraz w `onHotspot` po `lamp_toggle`.
   - W `applyScene(placeId)`:
     - Wywołuj `window.CanvasPig.setThings(things, true)` TYLKO wtedy, gdy `sceneChanged || thingsSig !== lastThingsSig` (dzięki czemu co 1 s przy braku zmian mebli nie kasujemy animacji zabawy `clearPlayState()` i nie przebudowujemy siatki `rebuildGrid()`!).
     - Wywołuj `window.CanvasPig.setLightScene(sceneLight)` TYLKO wtedy, gdy `sceneChanged || lightSig !== lastLightSig`.
     - Wywołuj `window.CanvasPig.setHotspots(hs)` TYLKO wtedy, gdy `sceneChanged || hotspotsSig !== lastHotspotsSig`.
     - Jeśli `window.CanvasPig.isDragging && window.CanvasPig.isDragging()` zwraca `true`, NIE wywołuj `window.CanvasPig.setPresentPigs(presentList)`. W przeciwnym razie wywołuj `setPresentPigs(presentList)` tylko wtedy, gdy `sceneChanged || presentSig !== lastPresentSig`.
   - W obsłudze hotspotu `lamp_toggle` (`onHotspot`): po `CuyLights.toggle(uid)` ustaw `lastLightSig = '';` i wywołaj `applyScene(currentPlace)`, aby kliknięta lampa natychmiast przełączyła światło i klatkę sprite'a.
3. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-PL.md` (max 10 linii).
