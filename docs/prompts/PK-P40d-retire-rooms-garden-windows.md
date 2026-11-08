# PK-P40d: Rooms and Garden windows retired
Zmieniaj: web/home/app.js, web/home/features/index.json, web/home/features/places/feature.js, tools/qa/ux-p40-retire.js, docs/opt/log/PK-P40d.md
Wymagane: tools/qa/ux-p40-retire.js
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p40-retire.js && node tools/qa/ux-p40-retire.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Nothing opens the Rooms or Garden window any more (More tiles, buttons, deep links). Their jobs are done by the scene and the edit mode. Level-up of a place and unlocking stay reachable.
Depends on: PK-P40c merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/app.js` (1221 lines): `openFeature(id,arg,opts)` (line 786); More tiles built from `data-open-feature` (line ~881) fed by `features/index.json` ids `rooms` and `garden`.
- `web/home/features/index.json`: ids `rooms` (line 13) and `garden` (14): keep files, hide from More.
- `web/home/features/places/feature.js`: `CuyPlaces.openPlace(placeId, roomArg)` (471) already calls `applyScene`; add `upgrade(id)` -> `place_upgrade {id}` and `unlock(id)` -> `place_unlock {id}` to the `CuyPlaces` object (line ~480) - this needs `places/feature.js` in Zmieniaj.
- `web/home/features/farm/feature.js` line 150 sends `place_unlock {id:'farm'}`: reference for the message shape.

## Steps
1. grep entry points: `openFeature('rooms')`, `'garden'`, tile definitions in `app.js` and `features/index.json`, `CuyPlaces.openPlace`, `roomPlanBtn` leftovers, `data-open="rooms"`. List all in the log.
2. Remove the More tiles for Rooms and Garden. Make `CuyPlaces.openPlace(id)` switch the scene in the main window instead of opening a window. Keep the feature files if other code imports them (no deletion of `rooms/feature.js` helpers used by P38 or dorm logic), but they must never be shown.
3. Features that the windows provided and nothing else does yet must stay reachable: place upgrade (`place_upgrade`) and unlock (`place_unlock`) -> put them in the edit drawer header as a small row `Level N [Upgrade]` / `[Unlock]` using the existing button class (edit `edit-panel.js` is NOT in this package: instead add a visible TODO in the log and expose the two actions through `CuyPlaces.upgrade(id)` / `CuyPlaces.unlock(id)` which send the messages; PK-P40e wires the UI).
4. Tests FIRST, `tools/qa/ux-p40-retire.js` (Playwright, mock `seven`): R1 `no-more-tile-for-rooms-garden`, R2 `openPlace-switches-scene` (no modal), R3 `no-feature-rooms-or-garden-modal` anywhere (walk all More tiles), R4 `upgrade-unlock-api` (the two functions send the right messages), R5 `no-console-errors`.
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P40d.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
