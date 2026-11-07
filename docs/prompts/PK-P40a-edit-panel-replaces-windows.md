# PK-P40a: Edit panel instead of Rooms and Garden windows
Zmieniaj: web/home/features/places/feature.js, web/home/features/places/feature.css, web/home/features/places/edit-panel.js, web/home/index.html, web/home/app.js, web/home/features/index.json, tools/qa/ux-p40-edit.js, docs/opt/log/PK-P40a.md
Wymagane: tools/qa/ux-p40-edit.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check web/home/features/places/edit-panel.js && node --check web/home/app.js && node --check tools/qa/ux-p40-edit.js && node tools/qa/ux-p40-edit.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The separate Rooms and Garden windows are redundant now that every place is a scene. Replace them by ONE edit mode in the main window: an `Edit` button next to the places bar opens a stash drawer (owned and buyable items, library icons) and items are placed, moved, removed directly on the current scene. Farm and Market gameplay windows stay as they are, opened by a button in the bar for those scenes (scope cut).
Depends on: PK-P39a, PK-P39b merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. grep how Decorate / Place in room currently works (`rooms/feature.js` editor, `store` feature, `CuyScenes.placedThings`, bridge messages for place/move/remove) and REUSE those messages. Do not change the Core protocol.
2. `edit-panel.js`: toggle `Edit` (wood button from the library, same class family as the places-bar buttons). In edit mode: a drawer from the bottom with the stash (items owned for this scene kind: indoor for rooms, outdoor for garden/park), drag an item onto the scene to place it (snaps to the 4 px grid, only on free walk cells, uses the scene's blockers if present), drag a placed item to move it, drop it on the drawer to put it back, click selects with a small `Remove` button. The pig keeps walking around placed items. Esc or the Edit button leaves edit mode.
3. Remove the entry points of the Rooms and Garden windows (More tile, places-bar links); keep the code of the windows if other features still import it, but nothing opens them. Room tabs (`pig:<id>`, dorm) are switched by the places bar, not by a window.
4. For farm and market scenes the bar shows one extra button `Farm` / `Market` that opens the existing gameplay window (unchanged).
5. Tests FIRST, `tools/qa/ux-p40-edit.js` (Playwright, mock):
   - E1 `edit-toggle`: the Edit button shows the drawer, again hides it.
   - E2 `place-move-remove`: drag an item from the stash onto the salon: appears in `placedThings`; drag moves it; Remove deletes it; the right bridge messages were sent each time.
   - E3 `no-old-windows`: no More tile or button opens a Rooms or Garden window (no `.feature-rooms`/`.feature-garden` modal).
   - E4 `outdoor-vs-indoor`: the stash in the garden lists outdoor items only, in a room indoor only.
   - E5 `farm-market-buttons`: the Farm/Market button opens the gameplay window, Back returns to the scene.
6. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P40a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
