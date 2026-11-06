# PK-P33a: The canvas draws any scene: background, size, y-sorted things (wave P33)
Zmieniaj: web/home/canvas-pig.js, web/home/features/places/scenes.js, tools/qa/ux-p33-scene-draw.js, docs/opt/log/PK-P33a.md
Wymagane: tools/qa/ux-p33-scene-draw.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check web/home/features/places/scenes.js && node --check tools/qa/ux-p33-scene-draw.js && node tools/qa/ux-p33-scene-draw.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Make the main canvas able to show ANY scene with its own background, size and correctly sorted objects. The pig keeps its current behaviour in this package (movement comes in P34). Visible result: with the console or the test, the garden looks like the garden, not like the house.
Depends on: PK-P32b merged (CuyScenes API in docs/opt/log/PK-P32b.md).

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. grep `canvas-pig.js` for `sceneWidth`, `sceneHeight`, `floorY`, `drawHabitat`, `skipDefaultWall`, `skipDefaultFloor`, the render loop and `addLayer`, and the code that maps the mouse to scene coordinates (`object-fit: cover` math). Read only those ranges.
2. Add `CanvasPig.setScene(def)` (def comes from `CuyScenes.def`): sets `sceneWidth/Height = def.size`, resizes the canvas, stores `def.walk` and `def.depthScale`, loads `def.bgUrl` (an `Image`, cached by url; until it loads draw nothing special and do not crash), keeps `imageSmoothingEnabled=false`. For `kind:'room'` everything stays as today (wallpaper, floor, existing layers). For `kind:'outdoor'` the existing wall/floor drawing is skipped and the bg image is drawn at 0,0.
3. Mouse mapping must still work for any canvas size (re-check the cover math with the new sceneWidth/Height) and a pig dragged out of the scene still leaves Home.
4. Draw order for every scene: bg, flat things, then ALL standing objects (decorations and the pig) sorted by their bottom edge (y of the feet), then the existing light layers. Add `CanvasPig.setThings(list)` with `[{img|url, x, y, anchorX, anchorY, flat}]` (x,y = bottom centre of the footprint, same convention as `atlas.json` `anchor`). `CuyScenes.placedThings(state, sceneId)` (add it to `scenes.js`) builds this list from the layouts that are already saved: rooms from `state.rooms.layouts[sceneId]`, garden/park/farm/market from their existing saved layouts (grep how each feature stores its items and where `atlas.json` gives file, size and anchor). Only drawing: no editing, no saving.
5. `CanvasPig.setPigVisible(bool)`: when false no pig sprite is drawn and the pig logic idles (used for scenes the pig is not in).
6. Tests FIRST, `tools/qa/ux-p33-scene-draw.js` (Playwright, `ux.js`, mock from PK-P32b; read the canvas pixels or the exposed state `CanvasPig.debug()` that you add: `{sceneId, sceneSize, bgUrl, things:[{id,y}], pigVisible, smoothing}`):
   - E1 `own-background`: for salon, garden, park, farm, market the debug `bgUrl` differs per scene (null for the room) and the canvas size equals the scene size.
   - E2 `time-of-day`: forcing night gives `garden_night.png`; forcing morning gives `garden_morning.png`.
   - E3 `pixel-clean`: smoothing is false; the CSS scale of the canvas is an integer multiple or the cover scale is rounded (assert the same rule the old code had, do not invent a new one).
   - E4 `y-sort`: two things with bottoms 60 and 90 are drawn in that order (lower on screen later); a flat thing is always first.
   - E5 `room-regression`: the room scene still draws wallpaper and floor (pixel at a known wall and floor coordinate is not transparent) and the toy/house sprites still load.
   - E6 `pig-hidden`: `setPigVisible(false)` leaves zero pig-colored draws (use debug counter `pigDraws`).
   - E7 `mouse-map`: a click at the centre of the canvas maps to the centre of the scene for the garden size and for the room size.
7. Run the Weryfikacja line; fix until green. Log the new API names.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, `bg/`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko gdy w bibliotece naprawdę go nie ma: skrypt w `tools/art/` rysujący wyłącznie kolorami palety, wpis w `ui.json`/`atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu mają wyglądać jak reszta okna gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font` (Pixelify Sans), rozmiary `--ui-fs-*`, odstępy wielokrotności 4 px. Zakaz własnych SVG, glifów tekstowych (✕ ← → ‹ ›) i domyślnych kontrolek przeglądarki.
- Reguła zamykania: jeśli nie wiesz, jak coś ma wyglądać, otwórz najbliższy istniejący element gry (np. nagłówek okna Home z X i koniczynkami) i skopiuj jego klasy i zasoby.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P33a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
