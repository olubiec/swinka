# PK-P43e: Rooms and garden: lamps and gramophone act in the scene
Zmieniaj: web/home/features/places/feature.js, web/home/features/garden/feature.js, tools/qa/ux-p43-object-actions.js, docs/opt/log/PK-P43e.md
Wymagane: tools/qa/ux-p43-object-actions.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check web/home/features/garden/feature.js && node --check tools/qa/ux-p43-object-actions.js && node tools/qa/ux-p43-object-actions.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Clicking a placed lamp toggles its light and clicking the gramophone shows the player. Toys, tunnel, house and hay ball no longer exist (removed 8.11, PR #91): do not add any toy code.
Depends on: PK-P43b merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).


## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `assets/data/world_items.json`: items have NO `action` field. Map by id: `lamp_*` (lamp_post, lamp_mushroom, lamp_floor, lamp_arc, lamp_salt, lamp_lava, lamp_oil) -> toggle; `gramophone` -> player. There is no placed food bowl or bed with an action: do not invent them.
- `web/home/features/garden/feature.js`: `S.lampToggles` (line 43: placed uid -> on/off), click-toggle logic at line ~230, light sources at ~149 (`Lights.activeSources(..., S.lampToggles)`). Expose `CuyGarden.toggleLamp(uid)` (small wrapper of the existing logic) so `places` can call it for any scene.
- `web/home/features/music/player.js`: gramophone detection at lines 86-94 (`gramophone`, `player_gramophone`); find the existing function that shows the player (grep `openPlayer|show|toggle` in this file); call it, do not rewrite.
- `web/home/features/places/feature.js`: `applyScene(sceneId, st)` (line 275): after drawing, build hotspots for placed `lamp_*`/`gramophone` things (rect from sprite size) and call `CanvasPig.setHotspots` merged with the scene data hotspots; `CanvasPig.onHotspot` dispatches by kind `object`.
- `web/home/canvas-pig.js`: read-only. It no longer contains toy code (`targetToy`/`walkToToy` do not exist).

## Steps
1. Tests FIRST (`ux-p43-object-actions.js`, Playwright, mock): O1 `lamp-click-toggles-light`, O2 `gramophone-click-shows-player`, O3 `object-without-action-no-hotspot` (e.g. a sofa), O4 `hotspots-update-after-place-and-remove`, O5 `no-toy-code` (grep: no `toy` identifier in the three changed files).
2. Implement as above.
3. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P43e.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
