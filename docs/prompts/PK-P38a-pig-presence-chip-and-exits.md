# PK-P38a: Where the pig is: chip, Go there, walking through exits (wave P38)
Zmieniaj: web/home/features/places/feature.js, web/home/features/places/feature.css, web/home/features/places/mock.js, web/home/app.js, web/home/style.css, tools/qa/ux-p38-presence.js, docs/opt/log/PK-P38a.md
Wymagane: tools/qa/ux-p38-presence.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check web/home/app.js && node --check tools/qa/ux-p38-presence.js && node tools/qa/ux-p38-presence.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Close the loop of the world: the pig is in ONE place; in other places you see that place empty and a chip "Cuy is in <place>" with a button; the pig can walk out through a door/gate/path and then it is in the neighbouring place (state saved by Core), and you see it enter if you are there.
Depends on: PK-P32a, PK-P34a, PK-P36a, PK-P37a merged.

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. Read the logs of PK-P32a (messages), PK-P34a (`setExitsEnabled`, `onPigExit`, `enterFrom`) and PK-P36a (bar and scene switching). grep `places/feature.js` for the scene-switching function.
2. Chip under the bar when the displayed scene is not the pig's: wood-panel pill (same classes as other pills in the header, `assets/ui/` panel, `--ui-*` colors) with text `Cuy is in <scene title>` and a button `Go there` (existing button class) that switches the bar to the pig's scene. With 2+ pigs show one chip per pig (name + scene). Hide the chip in the pig's own scene.
3. In the pig's scene call `setExitsEnabled(true)` unless the pig is pinned (`pigLocations[].pinned`). On `onPigExit({to})`: compute the neighbour scene from the ring and the direction (left = previous, right = next, house exits as in `place_scenes.json` `house_exits`), skip locked neighbours (then do not exit: disable exits for 60 s), send `places.pigMove {pigId, to}`. When the state update arrives and you are looking at the destination scene, call `enterFrom(opposite side)`. If you were looking at the origin scene the pig simply left; the chip appears.
4. The mock (`mock.js`) answers `places.pigMove` by updating `pigLocations` like the Core would (neighbour + unlocked check), so tests do not need the game.
5. Tests FIRST, `tools/qa/ux-p38-presence.js` (Playwright, mock with salon..market unlocked, one pig at salon):
   - Pr1 `chip-elsewhere`: go to garden: chip "Cuy is in" + `Go there` visible, no pig drawn; `Go there` returns to the pig's scene and the chip is gone.
   - Pr2 `exit-moves-pig`: force `onPigExit({to:'right'})` at the last room: the mock location becomes `garden`, the chip in the room scene reads garden, exactly one `places.pigMove` was sent.
   - Pr3 `enter-visible`: viewing the garden when the pig arrives: the pig appears at the left edge (`debug().pig.x` within 6 px of it) and walks in.
   - Pr4 `locked-blocks-exit`: with the garden locked a forced exit at the last room sends no message and the pig stays.
   - Pr5 `pinned-never-exits`: with `pinned:true` `setExitsEnabled` is false and 20 s of play gives no exit.
   - Pr6 `two-pigs`: two pigs in two scenes: two chips when elsewhere, one when in either pig's scene.
   - Pr7 `no-window`: nothing here opens a modal.
6. Run the Weryfikacja line; fix until green.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, `bg/`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko gdy w bibliotece naprawdę go nie ma: skrypt w `tools/art/` rysujący wyłącznie kolorami palety, wpis w `ui.json`/`atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu mają wyglądać jak reszta okna gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font` (Pixelify Sans), rozmiary `--ui-fs-*`, odstępy wielokrotności 4 px. Zakaz własnych SVG, glifów tekstowych (✕ ← → ‹ ›) i domyślnych kontrolek przeglądarki.
- Reguła zamykania: jeśli nie wiesz, jak coś ma wyglądać, otwórz najbliższy istniejący element gry (np. nagłówek okna Home z X i koniczynkami) i skopiuj jego klasy i zasoby.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P38a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
