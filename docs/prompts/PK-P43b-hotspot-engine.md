# PK-P43b: Hotspots in the canvas
Zmieniaj: web/home/canvas-pig.js, web/home/features/places/scenes.js, tools/qa/ux-p43-hotspot-engine.js, docs/opt/log/PK-P43b.md
Wymagane: tools/qa/ux-p43-hotspot-engine.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check web/home/features/places/scenes.js && node --check tools/qa/ux-p43-hotspot-engine.js && node tools/qa/ux-p43-hotspot-engine.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The canvas highlights hotspots on hover and reports clicks, without interfering with pig click, drag and edit mode.
Depends on: PK-P40b merged (pickAt, edit mode).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. `scenes.js` `def()` also returns `hotspots` from the data. grep in `canvas-pig.js` the click handler (`suppressClick`, `pointerup`) and cursor handling.
2. API: `CanvasPig.setHotspots(list)`, `CanvasPig.onHotspot = fn({id,kind,rect})`. Hover: draw a 1 px outline in the palette highlight colour (dither-free) and a small label chip (library wood 9-slice, `--ui-font`) above the rect; `cursor: pointer` on the canvas. Click: if the pig is hit first (pig sprite) the pig's own click wins; in edit mode hotspots are inactive; a drag never fires a hotspot. Keyboard: Tab focuses hotspots in reading order (focus ring = same outline), Enter fires.
3. Tests FIRST, `tools/qa/ux-p43-hotspot-engine.js` (Playwright, mock `seven`): X1 `hover-highlights` (`debug().hover` = id), X2 `click-fires-once`, X3 `pig-wins-over-hotspot`, X4 `edit-mode-inactive`, X5 `drag-no-fire`, X6 `keyboard`, X7 `no-hotspots-no-cost` (rooms: nothing drawn, frame time unchanged), X8 `label-inside-scene` (label is clamped inside the canvas).
4. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P43b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
