# PK-R30: Research: outdoor instances and hotspots after wave F1 (P46, P43)
Zmieniaj: docs/opt/foundations/R30.md, docs/opt/log/PK-R30.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R30.md 8
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Re-ground R43/R46 on the code after F1 and fix, in one document, the final contracts for instances, the static hotspot file, the pure module `web/home/lib/hotspots.js` and the market/farm panels, so PK-P46a, PK-P46b, PK-P43ab, PK-P43c, PK-P43d, PK-P46c, PK-PE2, PK-PF2 and PK-CV2 can be coded in parallel.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R30.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 8.` dokładnie w tej kolejności:
- `## 1.` Rozbieżności po F1 (plik:linia)
- `## 2.` Kontrakt instancji (stan, jednostki, flagi, mock)
- `## 3.` `scene_hotspots.json` i `hotspots.js` (schemat i API)
- `## 4.` Targ i farma: fakty dla PK-P43c i PK-P43d
- `## 5.` Fixture, Edit, toast, szuflada Outdoor (PK-P46c, PK-PE2)
- `## 6.` Własność plików F2-2 i F2-4
- `## 7.` Przypadki dla PK-P46t1, PK-P46t2, PK-T3
- `## 8.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P46a, PK-P46b, PK-P43ab, PK-P43c, PK-P43d, PK-P46c, PK-PE2, PK-PF2, PK-CV2, PK-P46t1, PK-P46t2, PK-T3. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Istniejące badania: `docs/opt/foundations/R46.md` (obiekty plenerowe jako instancje: `outdoor_defaults.json`, `OutdoorSeed`, uid `fx:<scena>:<id>`, `fixture_locked`, `bg_clean`) i `R43.md` (hotspoty). Przeczytaj ich sekcje 1-6 i "Prompt fixes"; prompty `docs/prompts/PK-P46a/b`, `PK-P43c/d` już je uwzględniają. Mapa uwag właściciela z 10.11-11.11 jest w `docs/PLAN_POPRAWEK_UX.md` (sekcje "Mapa uwag właściciela").
- Zmiana planu 17.11: stare PK-P43a/b (dane i silnik hotspotów w `place_scenes.json`/`canvas-pig.js`) zastępuje PK-P43ab: nowy plik danych `assets/data/scene_hotspots.json` + czysty moduł `web/home/lib/hotspots.js` (bez edycji canvasa); cienkie `CanvasPig.setHotspots/getHotspots/onHotspot` dopisuje PK-CV2. Stare PK-P43e wchodzi do PK-PF2, PK-P43f do PK-APP2, część JS PK-P46c do PK-PE2, część C# zostaje w PK-P46c.
- Wiadomości: targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; pokój/dwór `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`.

## Steps
1. Sprawdź, które fakty z R46/R43 i z promptów PK-P46a/b, PK-P43c/d przestały być prawdziwe po F1 (P44 przeciąganie do krawędzi, P4 adopcja, F1-fix, F1-fix2): grep nazw i numerów linii; wypisz każdą rozbieżność.
2. Ustal końcowy kontrakt instancji: kształt `state.rooms.layouts[<scena>].items` w stanie wysyłanym do JS (pola uid, itemId, x, y, flip, variant, locked/fixture), jednostka X/Y (piksele czy kratki), uid `fx:<scena>:<id>`, flagi `bg_clean` i `Balance.OutdoorInstancesActive`, co robi mock `places/mock.js`.
3. Zdefiniuj `assets/data/scene_hotspots.json` (schemat, przykłady dla ogrodu: staw, rabata; parku: altana; pokoi: brak) i kontrakt `web/home/lib/hotspots.js` (UMD, czysty): `fromScene(sceneId, staticData, instances, catalog)` -> lista `{id, kind, rect, label, uid?}`, `hit(list, x, y)`, `hover`/`active` stan, `on(kind, fn)`, reguły priorytetu (świnka wygrywa, Edit wyłącza, przeciąganie nie wystrzeliwuje), dynamiczne hotspoty z instancji (stragany -> `stall:<n>`, grządki -> `plot:<n>`), nazwy `kind` (`stall`, `plot`, `orchard`, `shop`, `decor`, `lamp`).
4. Fakty do PK-P43c (targ): ile straganów i skąd ich towary w `market/feature.js` (linie renderu towarów, kwotowania, przycisków), `stall:own`, jak panel dostaje kotwicę; oraz do PK-P43d (farma): liczba grządek z `FarmConfig`, sad, sklep, ikony kropli i kosza. Podaj jak feature rejestruje się w `CanvasPig.onHotspot` i że w tym kroku testuje się z atrapą `CanvasPig.onHotspot`.
5. Zasady fixture dla PK-P46c (C#) i PK-PE2 (UI): które obiekty ruchome ale nieschowalne (stragany, grządki, stodoła), dokładny kształt błędu `fixture_locked` i tekst toastu, komunikat podpowiedzi Edit (`.edit-hint`), zakładka szuflady `Outdoor`.
6. Wypisz kolizje plików: `place_scenes.json` należy w F2-2 tylko do PK-P47a (PK-P46b go NIE edytuje: brak klucza `bg_clean` = false), `places/mock.js` tylko do PK-P46b, `world_items.json`/`atlas.json`/`RoomLayoutOps.cs` do PK-P46a w F2-2 i do PK-P25c w F2-4.
7. Zaprojektuj przypadki dla PK-P46t1, PK-P46t2 i PK-T3 (hotspoty, panele, zachowanie po przesunięciu instancji).
8. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R30.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
