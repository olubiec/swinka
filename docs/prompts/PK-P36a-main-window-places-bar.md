# PK-P36a: The bar in the main window switches the scene (wave P36)
Zmieniaj: web/home/app.js, web/home/index.html, web/home/style.css, web/home/features/places/feature.js, web/home/features/places/feature.css, tools/qa/ux-p36-bar.js, docs/opt/log/PK-P36a.md
Wymagane: tools/qa/ux-p36-bar.js
Weryfikacja: node --check web/home/app.js && node --check web/home/features/places/feature.js && node --check tools/qa/ux-p36-bar.js && node tools/qa/ux-p36-bar.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 50 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: One bar right above the main scene: [<] Place name (room name) [>]. The arrows switch the scene of the main canvas (garden, park, farm, market and house rooms are real scenes now). It never opens a window. It must look like the rest of the game window.
Depends on: PK-P33a, PK-P34a, PK-P35a, PK-P35b merged (logs of each for API names; arrow PNGs `assets/ui/arrow_left.png`, `arrow_right.png`).

## Kontekst świata (fakty, nie szukaj ich drugi raz)
- Docelowa wizja właściciela: KAŻDE miejsce (pokoje domku, ogród, park, farma, targ) jest prawdziwą sceną w głównym oknie Home, po której świnka swobodnie chodzi. To pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, jest większa bliżej dołu ekranu i zasłaniana przez rzeczy stojące niżej. NIE prawdziwe 3D/WebGL. Okna „podglądu" miejsc mają zniknąć, bo scena jest w głównym oknie.
- Kolejność scen (pierścień): pokoje domku (salon, pokoje świnek `pig:<id>`, wspólna sypialnia `dorm`) -> `garden` -> `park` -> `farm` -> `market` -> z powrotem salon.
- Tła są gotowe: `assets/world/bg/` garden_{morning,day,evening,night}.png, farm.png, market.png (256x144), park_{morning,day,evening,night}.png (384x192). Pokoje rysuje dziś `drawHabitat` w `web/home/canvas-pig.js` (scena 240x130, `floorY` ok. 119, system warstw `addLayer(name, z, drawFn)`).
- Moduł miejsc w JS: `web/home/features/places/feature.js` (`window.CuyPlaces`, `DEFAULT_PLACES`, `S.currentPlace`). Pliki F: `web/home/features/{rooms,garden,farm,market}/feature.js`. Testy przeglądarkowe: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`).
- Stan 6.11: P3a/P3b dały karuzelę i SVG-i, które NIE przeszły testu właściciela (zły styl, brak scen). Nie przywracaj ich.

## Steps
1. grep `app.js`/`index.html` for the header (title, bond, clovers), the pig view container (canvas wrapper) and where the canvas is created; grep `places/feature.js` for `CuyPlaces`. Read only those ranges. Copy the look from the header: the same wood panel, the same font, the same height as the header close button.
2. Bar markup between header and canvas: `<div class="places-bar">` with `button.ui-arrow-left`, a title element, `button.ui-arrow-right`. CSS in `places/feature.css`/`style.css`: arrows use `assets/ui/arrow_left.png`/`arrow_right.png` (+ `_pressed` on :active) as `background-image`, 32x32 CSS px hit area (the 16x16 art scaled x2, `image-rendering: pixelated`); the title sits on `assets/ui/header_banner.png` or `tab_on.png` as 9-slice (use the slice from `ui.json`), text `--ui-text-on-wood`, `--ui-font`, one row, ellipsis when long. No ‹ › glyphs.
3. Behaviour: the list is `CuyScenes.order(state)`; a click calls `CuyScenes.neighbor`, then `CanvasPig.setScene(CuyScenes.def(id, CuyScenes.timeOfDay()))` and `setThings(CuyScenes.placedThings(...))`; the title shows the scene title and, for house rooms, the room name from the state. Keys ArrowLeft/ArrowRight work when no window is open and no input has focus. Remember the last scene in memory (not saved). Starting scene: the scene of the first pig (`CuyScenes.pigScene`).
4. Locked scene: the canvas shows the scene's background dimmed (draw with the existing dark overlay used for night, no new color), a padlock icon from `assets/icons/` (grep the existing garden padlock) and the unlock hint line under the bar; the pig is not shown there (`setPigVisible(false)`).
5. Pig visibility in this package: show the pig only when the displayed scene equals its scene (`CuyScenes.pigScene`), else hide it. The chip "Cuy is in ..." and exits come in P38.
6. Tests FIRST, `tools/qa/ux-p36-bar.js` (Playwright, mock with 3 rooms, all unlocked; and a variant with farm and market locked):
   - M1 `bar-style`: bar and arrows have a `background-image` from `assets/ui/` (not a flat color), computed font-family contains `Pixelify`, the bar height equals the header close button height, text has no ‹ › ← → glyphs.
   - M2 `full-cycle`: clicking right 8 times visits salon, 2 more pig rooms, dorm, garden, park, farm, market in order and returns to the start on the 9th; left reverses; ArrowRight key does the same.
   - M3 `scene-changes-no-window`: every step changes the canvas scene (`CanvasPig.debug().sceneId`) and no overlay/modal element appears.
   - M4 `one-row`: with 6 rooms the bar stays one row (height unchanged) and the page has no horizontal overflow at 420 px width.
   - M5 `locked`: locked farm shows the hint text and the padlock, `pigVisible` false, arrows still pass over it.
   - M6 `pig-only-in-its-scene`: the pig is drawn in its scene and not in garden.
   - M7 `scene-matches-bar`: the title always equals the scene shown.
7. Run the Weryfikacja line; fix until green. Take no screenshot work here (P37 does). Log API names.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, `bg/`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko gdy w bibliotece naprawdę go nie ma: skrypt w `tools/art/` rysujący wyłącznie kolorami palety, wpis w `ui.json`/`atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu mają wyglądać jak reszta okna gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font` (Pixelify Sans), rozmiary `--ui-fs-*`, odstępy wielokrotności 4 px. Zakaz własnych SVG, glifów tekstowych (✕ ← → ‹ ›) i domyślnych kontrolek przeglądarki.
- Reguła zamykania: jeśli nie wiesz, jak coś ma wyglądać, otwórz najbliższy istniejący element gry (np. nagłówek okna Home z X i koniczynkami) i skopiuj jego klasy i zasoby.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P36a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
