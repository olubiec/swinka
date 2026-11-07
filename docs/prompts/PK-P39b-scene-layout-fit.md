# PK-P39b: Whole scene visible: layout below the places bar
Zmieniaj: web/home/features/places/feature.css, web/home/style.css, tools/qa/ux-p39-layout.js, docs/opt/log/PK-P39b.md
Wymagane: tools/qa/ux-p39-layout.js
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p39-layout.js && node tools/qa/ux-p39-layout.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The places bar must not cover or crop the scene (park trees and the farm house are cut). Show the WHOLE background at an integer scale below the bar.
Depends on: PK-P36a, PK-P37a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. grep `.places-bar`, `#placesBar`, canvas wrapper (`#stage`, `.stage`, `canvas`) in `places/feature.css`, `style.css`, `app.js` (read only those ranges). Find why the scene is cut: bar `position:absolute` over the canvas, `object-fit: cover`, fixed height, or the canvas being sized from the room (240x130) not the scene size.
2. Fix in CSS only (and the minimum JS in `places/feature.js` is NOT allowed here, other package edits it): bar in normal flow above the canvas; canvas sized to `sceneW*k x sceneH*k` where k is the largest integer that fits the free area; if CSS alone cannot compute an integer k, expose a CSS variable `--scene-k` that the next package sets; until then use `image-rendering: pixelated; width:100%; height:auto; object-fit: contain` and the remaining space filled with `--ui-*` wood colour. Never `cover`, never stretch non-uniformly.
3. Test `tools/qa/ux-p39-layout.js` (Playwright, mock `seven`, viewports 420x720 and 360x640, every scene): Ly1 `bar-above-canvas` (bar bottom <= canvas top), Ly2 `canvas-inside-window` (canvas fully inside the window), Ly3 `aspect-preserved` (canvas box aspect equals scene aspect within 1%), Ly4 `park-fits` and `farm-fits`, Ly5 `pixelated` (computed `image-rendering`).
4. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P39b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
