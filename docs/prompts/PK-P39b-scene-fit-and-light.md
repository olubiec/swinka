# PK-P39b: Scene layout (no clipping) and scene light
Zmieniaj: web/home/features/places/feature.js, web/home/features/places/feature.css, web/home/style.css, web/home/app.js, tools/qa/ux-p39-layout-light.js, docs/opt/log/PK-P39b.md
Wymagane: tools/qa/ux-p39-layout-light.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check web/home/app.js && node --check tools/qa/ux-p39-layout-light.js && node tools/qa/ux-p39-layout-light.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Whole scenes are visible (the places bar must not cover or crop the scene: park trees, farm house) and every scene gets the same light as the garden/farm windows (ambient tint by time of day, lamp glow, dust) through the existing `CanvasPig.setLightScene`.
Depends on: PK-P36a, PK-P37a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. Layout: the scene canvas wrapper must be laid out BELOW the places bar (bar in normal flow, not `position:absolute` over the canvas), and the canvas must show the WHOLE background at an integer scale: choose the largest integer scale that fits the free area, centre it, the remaining space is the room's wood/neutral panel colour `--ui-*` (no stretching, no crop, no `object-fit: cover`). Park 384x192 and 256x144 scenes both must fit.
2. Light: when a scene is applied (`CuyPlaces.applyScene`) build the light scene exactly as the garden feature does (`lib/lights.js`, `assets/data/lights.json`, period from `Lights.periodOf(new Date())`, outdoor for garden/park/farm/market, indoor for rooms, lamp sources from the placed items of that scene) and call `CanvasPig.setLightScene(...)`. Reuse the garden code path (grep `ambientFor`, `activeSources`, `lightsData` in `features/garden/feature.js`); do not copy-paste big blocks: if a shared helper is needed, add a small function in `places/feature.js`. Missing lib or file = no light, no error.
3. Tests FIRST, `tools/qa/ux-p39-layout-light.js` (Playwright, mock with all scenes unlocked, viewport 420x720 and 360x640):
   - Ly1 `bar-not-overlapping`: bar bottom <= canvas top for every scene.
   - Ly2 `whole-scene-visible`: canvas CSS size / scene size is an integer >= 1 and the canvas box lies fully inside the window for all scenes, including park.
   - Ly3 `light-applied`: with the mocked clock at 23:00 the garden scene pixels are darker than at 12:00 (mean luminance), and `CanvasPig.debug().lightScene` is non-null for every scene.
   - Ly4 `lamp-glow`: a placed lamp in the salon at night brightens its surroundings.
4. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P39b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
