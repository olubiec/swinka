# PK-P36b: The Rooms window scrolls and its tabs do not break (wave P36)
Zmieniaj: web/home/features/rooms/feature.css, web/home/features/rooms/customize.css, web/home/features/rooms/dorm.css, web/home/features/rooms/feature.js, tools/qa/ux-p36-rooms-scroll.js, docs/opt/log/PK-P36b.md
Wymagane: tools/qa/ux-p36-rooms-scroll.js
Weryfikacja: node --check web/home/features/rooms/feature.js && node --check tools/qa/ux-p36-rooms-scroll.js && node tools/qa/ux-p36-rooms-scroll.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Owner: "the rooms do not scroll". The Rooms window must scroll to its bottom, its room tabs must stay readable in one tidy strip even with 6 rooms, and nothing may overflow sideways.
Depends on: PK-P35b merged. Runs in parallel with PK-P36a (disjoint files).

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. grep `rooms/feature.js` and the three css files for the window body, the tab strip (`.room-tabs`), `overflow`, `height`, `max-height`, `flex`. Read only those ranges. Find what blocks scrolling (typical: a parent with `overflow:hidden` or fixed height, an inner scroller with `height:auto`).
2. Fix with the smallest CSS change: one scroll container (the window body) with `overflow-y:auto`, `min-height:0` in flex parents; the room tab strip in ONE row that scrolls horizontally when it does not fit (`overflow-x:auto`, no wrap, no visible scrollbar chrome that differs from the game: use the same thin brown scrollbar rule the game already uses if any), the active tab scrolled into view when the window opens or the room changes (`scrollIntoView({inline:'center'})`).
3. Tests FIRST, `tools/qa/ux-p36-rooms-scroll.js` (Playwright, mock with 6 rooms, viewport 420x720 and 360x640):
   - R1 `scroll-to-bottom`: after opening Rooms, `body.scrollTop` can reach `scrollHeight - clientHeight`, and the last element of the window (furniture list / selected item) becomes visible after scrolling.
   - R2 `tabs-one-row`: all tabs have the same `offsetTop` (one row), the strip scrolls horizontally when needed.
   - R3 `active-visible`: after clicking the 6th tab it is fully inside the strip's visible area.
   - R4 `no-overflow-x`: `document.documentElement.scrollWidth <= clientWidth` at both viewports.
   - R5 `dorm-and-customize`: the dorm and customize sub-views (grep how they open) also scroll to their bottom.
4. Run the Weryfikacja line; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P36b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
