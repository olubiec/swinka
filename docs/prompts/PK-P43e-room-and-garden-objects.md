# PK-P43e: Rooms and garden: objects act in the scene
Zmieniaj: web/home/features/places/feature.js, tools/qa/ux-p43-object-actions.js, docs/opt/log/PK-P43e.md
Wymagane: tools/qa/ux-p43-object-actions.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check tools/qa/ux-p43-object-actions.js && node tools/qa/ux-p43-object-actions.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Clicking placed objects does what the old windows did: gramophone shows the player, lamps toggle, toys/tunnel/house call the pig, food bowl opens the food drawer.
Depends on: PK-P43b merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Steps
1. grep the old per-item actions: lamp toggles (`lampToggles` in `garden/feature.js`), toy handling (`targetToy`, `toy` in `canvas-pig.js`), gramophone (`music/player.js`), food (`food-drawer`). List each in the log.
2. Placed things get hotspots automatically: `places/feature.js` converts each standing/flat placed thing with an action (`lamp`, `toy`, `gramophone`, `food`, `bed`) into a hotspot (rect from its sprite) via `CanvasPig.setHotspots` merged with the scene's data hotspots. Click behaviour: lamp -> toggle (existing function), toy -> `CanvasPig.walkToToy(uid)` (use the existing toy API), gramophone -> show player (existing function), food bowl -> open food drawer. Uwaga: w ogrodzie/parku/farmie wycofaj lewitujące domowe lampki/grzybki ze scen zewnętrznych (na dworze na razie nie ma lampek, w nocy ciemno, w przyszłości dojdą pochodnie/latarnie).
3. Tests FIRST, `tools/qa/ux-p43-object-actions.js` (Playwright, mock): O1 `lamp-click-toggles-light` (ambient glow on/off), O2 `toy-click-pig-walks-there`, O3 `gramophone-click-shows-player`, O4 `food-click-opens-drawer`, O5 `object-without-action-no-hotspot`, O6 `hotspots-update-after-place-and-remove`.
4. Run Weryfikacja; fix until green.

## Poprawki po R1 (obowiązują, mają pierwszeństwo nad krokami wyżej)
- Zakres zawężony do przełącznika lamp: `places/feature.js` zamienia postawione lampy na hotspoty i wywołuje `toggleLamp(uid)` (`places/feature.js:765`), aktualizując `sceneLampToggles`.
- Zabawki, miska i gramofon wycofane (brak systemu zabawek i szuflady jedzenia, odtwarzacz muzyki wyłączony). Nie dotykaj `garden/feature.js`.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P43e.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
