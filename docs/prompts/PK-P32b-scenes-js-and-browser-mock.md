# PK-P32b: scenes.js (scene facts for the page) and the browser mock (wave P32)
Zmieniaj: web/home/features/places/scenes.js, web/home/features/places/mock.js, web/home/features/index.json, tools/qa/ux-p32-scenes-data.js, docs/opt/log/PK-P32b.md
Wymagane: tools/qa/ux-p32-scenes-data.js
Weryfikacja: node --check web/home/features/places/scenes.js && node --check web/home/features/places/mock.js && node --check tools/qa/ux-p32-scenes-data.js && node tools/qa/ux-p32-scenes-data.js && node tools/qa/place-scenes-check.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: One small module that answers: which scenes exist, in what order, which background now, where the floor is, who is the neighbour. The engine (next waves) and the bar read only this module.
Depends on: PK-P31a merged (assets/data/place_scenes.json); contract shape from docs/contracts/places-pig-location.md if PK-P32a already wrote it (else use the field names in its prompt: places.order [{id,title,locked,unlockHint}], places.pigLocations [{pigId,scene,pinned}]).

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. grep how another feature JS loads a data JSON from `assets/` and how features register in `features/index.json`; grep for the existing time-of-day/ambient value used by the light system (do not add a clock). Read only those ranges.
2. `scenes.js` (one file, IIFE like the other features, `window.CuyScenes`), API (names fixed, others rely on them):
   - `await CuyScenes.load()` reads `assets/data/place_scenes.json` once.
   - `CuyScenes.order(state)` -> array of `{id,title,locked,unlockHint}` from `state.places.order`; fallback when absent: `salon, garden, park, farm, market` all unlocked.
   - `CuyScenes.neighbor(id, dir, state)` with dir `-1|1`, wraps around the ring.
   - `CuyScenes.def(id, tod)` -> `{id, kind, title, size:[w,h], walk:[x0,y0,x1,y1], depthScale:[far,near], bgUrl|null, exits}`; every house room id (`salon`, `pig:*`, `dorm`) returns the `room` template; unknown id returns the `room` template.
   - `CuyScenes.timeOfDay()` returns one of `morning|day|evening|night` from the existing light/ambient source.
   - `CuyScenes.pigScene(state, pigId)` -> scene id from `state.places.pigLocations`, default `salon`.
   Register `places/scenes.js` in `index.json` BEFORE `places/feature.js`.
3. `mock.js`: browser-test mock state: `places.order` with 3 pig rooms + dorm + 4 places (a variant with garden unlocked and the rest locked), `pigLocations` with one pig at `salon`; same shape as the contract. Export `window.CuyScenesMock.state(variant)`.
4. Tests FIRST, `tools/qa/ux-p32-scenes-data.js` (Playwright via `tools/qa/lib/ux.js`; the page loads the mock):
   - S1 `order`: the order equals the mock order; locked flags preserved.
   - S2 `ring`: `neighbor` right from `market` is `salon`, left from `salon` is `market`; 14 steps right return to start with 7 scenes.
   - S3 `bg-by-time`: garden returns the 4 different files for the 4 times; farm and market the same file for all; rooms `bgUrl` is null.
   - S4 `band`: for every scene `walk` is inside `size` and `depthScale` far<=near.
   - S5 `unknown`: unknown id returns the room template, no exception.
   - S6 `pig-scene`: `pigScene` default `salon`; after changing the mock location returns it.
5. Run the Weryfikacja line; fix until green. Log the final API list.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, `bg/`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko gdy w bibliotece naprawdę go nie ma: skrypt w `tools/art/` rysujący wyłącznie kolorami palety, wpis w `ui.json`/`atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu mają wyglądać jak reszta okna gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font` (Pixelify Sans), rozmiary `--ui-fs-*`, odstępy wielokrotności 4 px. Zakaz własnych SVG, glifów tekstowych (✕ ← → ‹ ›) i domyślnych kontrolek przeglądarki.
- Reguła zamykania: jeśli nie wiesz, jak coś ma wyglądać, otwórz najbliższy istniejący element gry (np. nagłówek okna Home z X i koniczynkami) i skopiuj jego klasy i zasoby.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P32b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
