# PK-R33: Research: places/feature.js, edit-panel.js, scenes.js, app.js wiring map
Zmieniaj: docs/opt/foundations/R33.md, docs/opt/log/PK-R33.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R33.md 7
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Map how Home loads scripts and wires features and give exact anchors for the F2-4 wiring packages (PK-PF2 places/feature.js, PK-PE2 edit-panel.js, PK-APP2 app.js/index.html/features/index.json), including how new `lib/*.js` and `places/edit-*.js` modules get loaded.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R33.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 7.` dokładnie w tej kolejności:
- `## 1.` Mechanizm ładowania skryptów i modułów
- `## 2.` Mapa globali i kolejność inicjalizacji
- `## 3.` Kotwice PK-PF2 (`places/feature.js`)
- `## 4.` Kotwice PK-PE2 (`edit-panel.js`, `.css`)
- `## 5.` Kotwice PK-APP2 (`index.html`, `app.js`, `index.json`, More)
- `## 6.` Kolizje z PK-P47c i kolejność
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-PF2, PK-PE2, PK-APP2, PK-P47c. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- `features/index.json` zawiera m.in. `places` i `places/edit-panel`; `app.js:963-995` ładuje `features/<id>/feature.css`, `features/<id>/feature.js`, w mocku `features/<id>/mock.js`. Sprawdź, jak wpis `places/edit-panel` rozwiązuje się do plików (czy to `features/places/edit-panel/feature.js`, czy inny mechanizm), bo w repo jest `features/places/edit-panel.js`.
- Nowe pliki bez ładowania: `web/home/lib/{hotspots,scene-pigs,weather,play-targets}.js` (kroki F2-2), `web/home/features/places/{edit-skins,edit-filters,edit-templates}.js`. Ktoś musi je dopisać do `index.html` (znaczniki `<script>`) lub do mechanizmu ładowania: to robi PK-APP2 w F2-4, a PK-PF2 i PK-PE2 z nich korzystają.

## Steps
1. Opisz mechanizm ładowania skryptów: `index.html` (`<script src>` w kolejności), `app.js` loadFeatures, `features/index.json`, tryb WebView (`state.features`) vs przeglądarka; oraz jak C# (`HomeWindow`) dostarcza listę funkcji i czy trzeba tam coś zmienić dla nowych plików (zwykle nie).
2. Zrób mapę globalnych nazw (`window.CuyHome`, `CuyScenes`, `CuyLight`/`Lights`, `CanvasPig`, `CuyPlaces`, `EditPanel`, `bridge`) i kolejności inicjalizacji; wskaż, gdzie można bezpiecznie sięgnąć po moduł `lib/*.js` (po załadowaniu) i jak bronić się przed brakiem modułu (`window.X && ...`).
3. PK-PF2 (`places/feature.js` ok. 1200 linii): kotwice dla (a) akcji obiektów (przełącznik lamp `toggleLamp` ~765, `sceneLampToggles`, `initCanvasLampClick` ~782-811 do usunięcia, zapasowe `gx = 120; gy = 65` ~138), (b) przekazania świnek w scenie do `CanvasPig` w `applyScene` (~625-675), (c) rejestracji warstwy pogody i hotspotów przy zmianie sceny, (d) nocnych źródeł plenerowych. Pliki tej paczki: `places/feature.js`, `places/feature.css`.
4. PK-PE2 (`edit-panel.js` ok. 1570 linii, `edit-panel.css`): kotwice dla zakładki `Outdoor`, podpowiedzi `.edit-hint`, blokady fixture, pasku zakładek kategorii i pola szukania, panelu skórek, przycisku szablonów, czerwonej/zielonej komórki dla lamp. Wskaż funkcje, które trzeba rozszerzyć, nie przepisywać.
5. PK-APP2: kotwice w `index.html` (kolejność `<script>`), `app.js` (siatka More ok. linii 927: ukrycie kafelków `farm` i `market`, wejście `openFeature('farm'|'market')` -> przekierowanie do sceny), `features/index.json`; test, że po wejściu w farmę przez deep link otwiera się scena.
6. Kolizje i kolejność: które z tych plików dotyka dziś P47c (F2-2: `index.html`, `style.css`, `places/feature.css`, `places/feature.js`), żeby F2-4 wiedział, czego się spodziewać; i że PK-PF2/PK-PE2/PK-APP2 nie dzielą plików.
7. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R33.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
