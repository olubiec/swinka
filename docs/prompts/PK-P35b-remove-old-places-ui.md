# PK-P35b: Remove the preview carousel arrows in windows and the house plan (wave P35)
Zmieniaj: web/home/features/places/feature.js, web/home/features/places/feature.css, web/home/features/rooms/feature.js, web/home/features/rooms/plan.js, web/home/features/rooms/plan.css, web/home/features/garden/feature.js, web/home/features/farm/feature.js, web/home/features/market/feature.js, web/home/app.js, web/home/index.html, tools/qa/ux-p3-places.js, tools/qa/ux-p35-cleanup.js, docs/opt/log/PK-P35b.md
Wymagane: tools/qa/ux-p35-cleanup.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check web/home/features/rooms/feature.js && node --check web/home/app.js && node --check tools/qa/ux-p35-cleanup.js && node tools/qa/ux-p35-cleanup.js && node tools/qa/ux-p1-decorate.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Owner after P3: the arrows inside the Rooms/Garden/... windows open a preview you cannot enter and the preview is redundant once places are real scenes in the main window. Remove them and the house plan (owner decided 6.11 to drop the plan). The new bar comes in P36; until then the main window has no place switcher (acceptable in this wave).
Depends on: nothing (runs in parallel with PK-P35a; disjoint files). PK-P34a merged.

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. grep for what P3a added: `.places-arrow`, carousel creation in `places/feature.js`, arrows injected into feature windows, `#placesBar`, `.room-tabs`, `roomPlanBtn`, `plan.js`/`plan.css`/`planBtn`. Read only those ranges.
2. Remove: every arrow/carousel control inside Rooms, Garden, Farm, Market, Park windows (and any "House" title bar that exists only for the carousel); the room plan button and the files `rooms/plan.js`, `rooms/plan.css` with their registrations (index.html/feature.js/css links). Keep the Rooms window's own room tabs (they are still the room selector of that window) and everything about decorating. Keep `window.CuyPlaces` available with `getState`-style helpers other code may call, but it must not create UI in this package (grep its callers first; if something calls a removed function, replace the call with a no-op and log it).
3. `ux-p3-places.js` (old carousel tests): change or delete ONLY assertions about the removed arrows/strip/plan; list each change in the log. Everything else must stay.
4. Tests FIRST, `tools/qa/ux-p35-cleanup.js` (Playwright, `ux.js`):
   - C1 `no-arrows-in-windows`: open Rooms, Garden, Farm, Market, Album, Shop from More: none contains `.places-arrow` or any element with class matching `arrow` that switches places.
   - C2 `no-plan`: no element or script for the house plan exists (`#roomPlanBtn`, `plan.js` not loaded).
   - C3 `rooms-tabs-still-work`: in the Rooms window clicking a room tab changes the shown room name.
   - C4 `decorate-still-works`: `ux-p1-decorate.js` stays green.
   - C5 `no-console-errors`: opening those windows produces no console error.
5. Run the Weryfikacja line; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P35b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
