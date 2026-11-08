# PK-P40d: Rooms and Garden windows retired
Zmieniaj: web/home/app.js, web/home/features/places/feature.js, tools/qa/ux-p40-retire.js, docs/opt/log/PK-P40d.md
Wymagane: tools/qa/ux-p40-retire.js
Weryfikacja: node --check web/home/app.js && node --check web/home/features/places/feature.js && node --check tools/qa/ux-p40-retire.js && node tools/qa/ux-p40-retire.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Nothing opens the Rooms or Garden window any more (More tiles, buttons, deep links). Their jobs are done by the scene and the edit mode. Level-up of a place and unlocking stay reachable.
Depends on: PK-P40c2 and PK-P40a merged (runs before wave P43; PK-P43f must follow it).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- Line numbers below are from 8.11.2026, BEFORE waves P39 and P45 (they edit `canvas-pig.js`, `scenes.js`, `places/feature.js`, `index.html`). Find every function by name with grep, never by line.
- File order: this package runs after PK-P40c2 and BEFORE wave P43 (P43e edits `places/feature.js`, P43f edits `app.js` and `features/index.json` to retire Farm/Market). Edit only the lines named here so the later packages merge cleanly; P43f must read `docs/opt/log/PK-P40d.md`.
- `web/home/app.js`: `openFeature(id,arg,opts)` (~786, finds the feature in `this.features` and opens a modal); `openMoreModal()` (~842) builds the tiles from `window.CuyHome.listFeatures()` (every `registerFeature`, so tiles are NOT driven by `index.json`).
- Do NOT remove `rooms` and `garden` from `features/index.json` (not in Zmieniaj): the loader (`app.js` `loadFromList` ~897) also loads their `mock.js` there, and the mock handlers `room_place/room_move/room_flip/room_remove/place_upgrade/place_unlock` in `features/rooms/mock.js` are needed by the edit mode. They stay registered but must never be shown.
- Callers that open them today (outside Zmieniaj, so redirect centrally in `openFeature`): `features/decor/feature.js:557` `openFeature('rooms', {edit:true, place:id, from:'decor'}, ...)`, `features/pigs/feature.js:860` `openFeature('rooms', {room: roomId})`, `:870` `openFeature('garden')`, `features/rooms/feature.js:685` (inside the window, dies with it).
- `web/home/features/places/feature.js`: `CuyPlaces.openPlace(placeId, roomArg)` (~471, calls `applyScene`); object `CuyPlaces` (~455-495): add `upgrade(id)` -> `bridge.send({type:'place_upgrade', id})` and `unlock(id)` -> `bridge.send({type:'place_unlock', id})`. Message shape reference: `features/farm/feature.js` ~150 sends `place_unlock {id:'farm'}`. `places/feature.js` is also edited by PK-P44b later (different functions).
- `CuyEdit` (PK-P40a) exposes `open()` / `close()` / `isOpen()`.
- Known gap (write in the log, do not fix): Dormitory / room skins / rename / transfer UI live only in `features/rooms/{dorm,customize,feature}.js` and disappear with the window; list the message types that lose their UI (`dorm_*`, `room_skin`, `room_variant*`, `room_rename`, `room_transfer`, `pig_home`) so the owner can plan them.

## Steps
1. grep entry points: `openFeature('rooms'`, `openFeature('garden'`, `data-open-feature`, `roomPlanBtn`, `data-open="rooms"` in `web/home` (not `lib/`). List all in the log.
2. In `app.js`: (a) `openMoreModal` skips features with id `rooms` or `garden`; (b) at the top of `openFeature`, if `id` is `rooms` or `garden`: target = `arg.room || arg.place || (id === 'garden' ? 'garden' : 'salon')`, call `window.CuyPlaces.openPlace(target)`, close any open feature modal (`closeFeature`), and if `arg && arg.edit && window.CuyEdit` call `CuyEdit.open()`; return without opening a modal.
3. In `places/feature.js`: add `upgrade(id)` and `unlock(id)` to `CuyPlaces`. The UI for them comes in PK-P40e (say so in the log).
4. Tests FIRST, `tools/qa/ux-p40-retire.js` (Playwright, mock `seven`): R1 `no-more-tile-for-rooms-garden`, R2 `openPlace-switches-scene` (no modal), R3 `no-rooms-or-garden-modal` (walk all More tiles and also call `CuyHome.openFeature('rooms')`, `('garden')`, `('rooms',{edit:true,place:'garden'})`: no modal content from them, scene switched, edit drawer open for the edit form), R4 `upgrade-unlock-api` (the two functions send the right messages), R5 `no-console-errors`.
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P40d.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
