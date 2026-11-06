# PK-P34a: The pig walks in 2D with depth and through exits (wave P34)
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p34-pig-walk.js, docs/opt/log/PK-P34a.md
Wymagane: tools/qa/ux-p34-pig-walk.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p34-pig-walk.js && node tools/qa/ux-p34-pig-walk.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The pig must walk over the whole floor of the scene (across and into the depth), look bigger when closer, be hidden behind things standing lower on screen, and be able to walk out through an exit and walk in from the edge. Pseudo-3D, no WebGL.
Depends on: PK-P33a merged (docs/opt/log/PK-P33a.md: setScene, setThings, setPigVisible, debug).

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. grep `canvas-pig.js` for pig state (`pigX`, `currentAnim`, the walk/idle chooser, toy walking `startToyWalk`, `SLOW_ANIMS`, drag code). Read only those ranges. Today the pig walks on one line at `floorY`.
2. Add `pigY` (feet y). Walk targets are chosen inside `walk` band `[x0,y0,x1,y1]` in 2D: pick a random target, walk straight to it (8 px/s scaled by depth scale is NOT required; keep the existing speed and animation choice), idle pauses stay as they are. The existing animations are side views; use walk left/right by dx. Diagonal walking uses the horizontal animation.
3. Depth: draw scale = lerp(`depthScale[0]`, `depthScale[1]`, (pigY - y0)/(y1 - y0)); sprite drawn from the feet point, rounded to whole pixels (nearest-neighbour; use the closest available integer-friendly scale: round the scale to steps of 1/8). The pig is a standing object in the y-sort of PK-P33a with its feet y as sort key.
4. Toys and the house tunnel: keep working in room scenes; toy targets use the nearest `y` in the band to the toy's floor line. Do not change toy animations (P7 does that).
5. Exits: `scene.exits.left/right` have an x. A free (not pinned, not dragged, not playing a toy) pig that is idle may choose an exit as its walk target if `CanvasPig.setExitsEnabled(true)`; when its feet reach the edge it plays no special animation, disappears and calls `onPigExit({to})` once, where `to` is `'left'|'right'` (the page translates to a scene). `CanvasPig.enterFrom('left'|'right')` places the pig at that edge (y in the band) and makes it walk 20-40 px inwards before normal behaviour. `setExitsEnabled(false)` (default) never exits.
6. Tests FIRST, `tools/qa/ux-p34-pig-walk.js` (Playwright; scenes from the mock; speed up with the existing test clock hook if there is one, else wait real seconds with a 25 s total budget; expose `CanvasPig.debug()` fields `pig:{x,y,scale}`):
   - W1 `walks-2d`: in a 12 s observation the pig's y changes by at least 12 px and its x covers at least 50% of the band width (garden and salon).
   - W2 `stays-in-band`: sampled every 200 ms the feet are always inside the band.
   - W3 `depth-scale`: at the top of the band the scale equals `depthScale[0]` (+-1/8), at the bottom `depthScale[1]`; a larger y never gives a smaller scale.
   - W4 `hidden-behind`: with a prop whose bottom is lower on screen than the pig, the prop is drawn after the pig (sort order in debug list) and the reverse for a higher prop.
   - W5 `exit-once`: with exits enabled and a forced target at the right edge, `onPigExit` fires exactly once with `to:'right'` and the pig is no longer drawn.
   - W6 `enter-from-edge`: after `enterFrom('left')` the pig appears with x within 6 px of the left edge and ends 20+ px inside.
   - W7 `never-exits-by-default`: 20 s with exits disabled: zero exit events.
   - W8 `drag-still-works`: drag-pick-up and drop keeps the pig in the band; dragging out of the scene still fires the old leave-Home path.
7. Run the Weryfikacja line; fix until green. Log API names (`pigY`, `setExitsEnabled`, `onPigExit`, `enterFrom`).

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, `bg/`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko gdy w bibliotece naprawdę go nie ma: skrypt w `tools/art/` rysujący wyłącznie kolorami palety, wpis w `ui.json`/`atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu mają wyglądać jak reszta okna gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font` (Pixelify Sans), rozmiary `--ui-fs-*`, odstępy wielokrotności 4 px. Zakaz własnych SVG, glifów tekstowych (✕ ← → ‹ ›) i domyślnych kontrolek przeglądarki.
- Reguła zamykania: jeśli nie wiesz, jak coś ma wyglądać, otwórz najbliższy istniejący element gry (np. nagłówek okna Home z X i koniczynkami) i skopiuj jego klasy i zasoby.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P34a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
