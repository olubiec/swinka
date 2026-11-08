# PK-P40a: Edit mode: Edit button and stash drawer
Zmieniaj: web/home/features/places/edit-panel.js, web/home/features/places/edit-panel.css, web/home/features/index.json, tools/qa/ux-p40-edit-drawer.js, docs/opt/log/PK-P40a.md
Wymagane: tools/qa/ux-p40-edit-drawer.js
Weryfikacja: node --check web/home/features/places/edit-panel.js && node --check tools/qa/ux-p40-edit-drawer.js && node tools/qa/ux-p40-edit-drawer.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: One Edit mode in the main window: an `Edit` button beside the places bar opens a stash drawer listing items for the current scene. This package builds the drawer and list only (no placing yet).
Depends on: PK-P39b, PK-P36a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/features/index.json`: plain JSON array of feature folder ids (`...,"store","places"`). `places` is last; check how its sibling scripts (`scenes.js`, `mock.js`) get loaded before adding `edit-panel.js`.
- `web/home/features/places/edit-panel.js` and `.css`: NEW (nothing named edit exists yet). Exposes `window.CuyEdit`.
- `assets/data/world_items.json`: `items[]` (77) with `id,name,place[],w,h,price,layer,icon`. Indoor = `place` contains `house` (38 items); outdoor = `garden`/`park`/`farm` (23/12/4). There is NO `indoor`/`outdoor`/`kind` field: derive it from `place`.
- `web/home/features/places/feature.js`: `applyScene(sceneId, st)` (275), `getSceneTitle` (73), `CuyPlaces.getCurrentPlace()`; the Edit button lives next to the places bar this file builds.
- Owned counts: `state.inventory` / `state.world.owned` (grep in `store/feature.js`).

## Steps
1. grep how the rooms/garden editors list items: `S.selectedItem`, `owned`, `stash`, `inventory` in `rooms/feature.js`, `garden/feature.js`, `store/feature.js`; the state keys (`state.inventory`, `state.world.owned`...). Read only those ranges. `features/index.json` registers features: add `places/edit-panel` the way `places` is registered (look at its entry).
2. New file `edit-panel.js` (`window.CuyEdit`): `toggle()`, `isOpen()`, `render(state)`, `itemsFor(state, sceneId)`. Button `Edit` = wood button from the library, same classes as the places-bar arrows' family, placed to the right of the bar; it is disabled with a hint in locked scenes.
3. Drawer: slides up from the bottom (no CSS blur/shadow, 9-slice wood panel `assets/ui/`), height 1/3 of the window, horizontal scrolling strip of item cards (icon from library via the existing icon resolver, name, count owned). `indoor` items for rooms/dorm, `outdoor` for garden/park/farm/market (derive from the `place` array in `world_items.json`: `house` = indoor, others outdoor). Empty state text: `Nothing to place yet`.
4. Tests FIRST, `tools/qa/ux-p40-edit-drawer.js` (Playwright, mock `seven`): E1 `button-toggles` (Edit shows/hides the drawer, aria-pressed), E2 `indoor-only-in-room` and `outdoor-only-in-garden` (item lists differ, no id appears in both), E3 `empty-state`, E4 `esc-closes`, E5 `no-modal` (opening the drawer creates no modal/overlay), E6 `library-icons` (every card icon is an `img` with a src that returns 200, none a text glyph).
5. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P40a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
