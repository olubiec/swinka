# PK-P43f: Farm and Market windows retired
Zmieniaj: web/home/app.js, web/home/features/index.json, tools/qa/ux-p43-retire-fm.js, docs/opt/log/PK-P43f.md
Wymagane: tools/qa/ux-p43-retire-fm.js
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p43-retire-fm.js && node tools/qa/ux-p43-retire-fm.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Farm and Market are played only in their scenes. Remove their More tiles and windows; level-up/unlock moved into the edit drawer already (P40e).
Depends on: PK-P43c, PK-P43d, PK-P43g, PK-P40d merged (P40d edited app.js and features/index.json before; re-grep, rooms/garden entries are already gone).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/features/index.json` (17 ids, one per line): `"farm"` at line 15, `"market"` at line 16 (before P40d removed `rooms`/`garden`; re-grep). The More tiles are built from this list and open via `data-open-feature` (`app.js` ~881-886 -> `CuyHome.openFeature(id, null, {from:'more'})`); `openFeature` is at `app.js:786`, `registerFeature` at 779. The farm/market modules themselves register `{id:'farm'}`/`{id:'market'}` features (`farm/feature.js:322`, `market/feature.js:269`); their `open()` calls `CuyPlaces.setCurrentPlace`. The farm/market modules must keep loading because PK-P43c/d/g put their scene panels in them (`window.CuyMarket`, `window.CuyFarm`).
- `web/home/features/places/feature.js` is NOT in Zmieniaj: `CuyPlaces.openPlace(placeId)` (471) already calls `applyScene` for `farm`/`market`, and the places bar (`DEFAULT_PLACES` line 6) switches scenes. Only check it in the test; if it opens a window, report BLOCKED in the log.
- Other callers: grep `openFeature('farm'`, `openFeature('market'`, `data-open-feature="farm"` in `web/home/*.js` and `web/home/features/**` (read-only evidence); if a caller sits outside Zmieniaj, change it only when it is in `app.js`, else list it in the log.

## Steps
1. grep entry points of the farm and market windows (tiles in `app.js`, `features/index.json`, `CuyPlaces.openPlace`). List them in the log.
2. Remove `"farm"` and `"market"` from `features/index.json` and any `openFeature('farm'|'market')` in `app.js`. Do not edit farm/market `feature.js` (not in Zmieniaj; the unused window `open()` stays, it is unreachable). If `openFeature('farm')` is called by a deep link, make it call `CuyPlaces.openPlace('farm')` instead.
3. If the farm is locked, its scene shows the locked overlay (P36) and the unlock row in the edit drawer (P40e): check this still works.
4. Tests FIRST, `tools/qa/ux-p43-retire-fm.js` (Playwright, mock `seven`): V1 `no-farm-market-tile`, V2 `no-window-anywhere` (walk all More tiles + places bar: no modal with farm/market class), V3 `farm-playable-in-scene` (plant a crop through the scene), V4 `market-playable-in-scene` (buy through the stall panel), V5 `locked-farm-unlock-path`.
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P43f.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
