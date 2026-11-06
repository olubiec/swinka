# PK-P31a: Scene data file for all places (wave P31)
Zmieniaj: assets/data/place_scenes.json, tools/qa/place-scenes-check.js, docs/opt/log/PK-P31a.md
Wymagane: tools/qa/place-scenes-check.js
Weryfikacja: node --check tools/qa/place-scenes-check.js && node tools/qa/place-scenes-check.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Give every place a data description (background per time of day, where the floor is, depth scale, exits) so the engine can make it walkable. Data only, no game code.
Depends on: nothing (runs in parallel with PK-P31b; disjoint files).

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. Read `assets/data/style_palette.json` is NOT needed. Look at the 8 background PNGs once with the Read tool (images are shown visually; the "do not read assets" rule is lifted for these files only): `assets/world/bg/garden_day.png`, `park_day.png`, `farm.png`, `market.png`, and one night variant. For each, decide the floor band: the rectangle where a small animal could stand (ground, grass, path, market floor), excluding water, fences, the sky and the far horizon. Be conservative: better a small band than a pig standing in a pond. Coordinates are bg pixels `[x0,y0,x1,y1]` and are the position of the pig's FEET (bottom centre).
2. Write `assets/data/place_scenes.json`, schema (all keys required):
```
{ "version": 1,
  "time_of_day": ["morning","day","evening","night"],
  "scenes": {
    "room":   { "kind":"room", "title":"Room", "size":[240,130], "walk":[10,96,230,126], "depth_scale":[0.88,1.0], "bg":null },
    "garden": { "kind":"outdoor", "title":"Garden", "size":[256,144], "walk":[..], "depth_scale":[0.82,1.0],
                "bg": {"morning":"world/bg/garden_morning.png","day":"world/bg/garden_day.png","evening":"world/bg/garden_evening.png","night":"world/bg/garden_night.png"},
                "exits": {"left":{"to":"house","x":2},"right":{"to":"park","x":253}} },
    "park": {...384x192, 4 variants, exits left->garden, right->farm },
    "farm": {...bg farm.png for all four times, exits left->park, right->market },
    "market": {...bg market.png for all four times, exits left->farm, right->house }
  },
  "house_exits": { "left": "market", "right": "garden" } }
```
   `room` is one template used by every house room (wallpaper and floor are drawn by the existing code, so `bg` is null). `to:"house"` means the house: coming from the garden you enter the LAST room of the house, coming from the market you enter the FIRST room (salon). `x` is where the exit door/gate/path is on that edge (bg pixel). Keep `depth_scale` far<=near<=1.0.
3. Write `tools/qa/place-scenes-check.js` (Node, no dependencies, exit code 1 on failure, prints one line per check): C1 every `bg` path exists under `assets/`; C2 the PNG size read from the file header equals `size`; C3 `walk` lies inside `size` and has width >= 60 and height >= 12; C4 every `exits.to` is a known scene or `house`; C5 the exit ring closes: following `right` from `house` visits garden, park, farm, market and returns to `house`, and `left` is the reverse; C6 `depth_scale` far<=near<=1.0; C7 all four times of day present for outdoor scenes.
4. Run the Weryfikacja line. If C2 fails because a PNG size differs from the listed one, fix `size` in the JSON (the file is the truth). Log: the final `walk` rectangle of every scene and one sentence why.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P31a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
