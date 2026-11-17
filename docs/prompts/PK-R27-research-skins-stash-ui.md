# PK-R27: Research: wallpaper/floor change in Edit, stash filters and room templates (note 27, P6a/P6b)
Zmieniaj: docs/opt/foundations/R27.md, docs/opt/log/PK-R27.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R27.md 7
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Specify three new UI modules for the Edit drawer (`edit-skins.js` for note 27, `edit-filters.js`, `edit-templates.js`) with exact contracts, and the exact insertion points in `edit-panel.js` for PK-PE2, so the three modules can be coded in parallel before the wiring.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R27.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 7.` dokładnie w tej kolejności:
- `## 1.` Skórki end to end i co przestało działać
- `## 2.` Kontrakt `edit-skins.js`
- `## 3.` Kontrakt `edit-filters.js`
- `## 4.` Kontrakt `edit-templates.js`
- `## 5.` Kotwice w `edit-panel.js` i `.css` dla PK-PE2
- `## 6.` Przypadki dla PK-T5
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P6a, PK-P6b, PK-P6s, PK-PE2, PK-T5. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Uwaga właściciela 27: "brak opcji zmiany kupionej tapety i podłogi po usunięciu okna Rooms". Stary panel to `web/home/features/rooms/customize.js` (`RoomCustomize.mount(container, ctx)`, ctx = `{state, roomId, send}`, panel ścian i podłóg, kolory zastępcze `SKIN_COLORS`, kafelki z `assets/world/tiles`), montowany przez `features/rooms/feature.js`, które po P40d nie jest już oknem.
- C#: `RoomsFeature.cs` wystawia w stanie listy `wallpapers` i `floors` (ok. linii 273-309; przedmioty z prefiksem `wallpaper_` lub ikoną `wallpaper`), `room_skin {room, slot, itemId}` (ok. 471-490; slot `wallpaper`/`floor`, pusty itemId = domyślny).
- Szuflada Edit: `edit-panel.js` (`#editDrawer` ~1152, tytuł/poziom ~1064, nagłówek ~1222, pasek `#editDrawerStrip` ~1237, `renderDrawerContent` ~1355). Motywy pokojów: `assets/data/pig_rooms.json` ~52-87 (tapeta, podłoga, starter).

## Steps
1. Prześledź skórki end to end: stan (`state.rooms`), UI (`customize.js`), wiadomość `room_skin`, Core. Odpowiedz, co dokładnie przestało być osiągalne po wycofaniu okna Rooms i czy `customize.js` jest jeszcze gdzieś montowany (grep `RoomCustomize`, `customize.js` w `app.js`, `index.html`, `features/index.json`).
2. Zaprojektuj `web/home/features/places/edit-skins.js` (UMD): API (np. `window.EditSkins.build(container, {state, roomId, send})`, `listOwned(state, roomId)` czyste), co pokazuje (kupione tapety i podłogi z kafelkami, zaznaczona aktualna, przycisk "Default"), kiedy jest widoczny (tylko pokoje i pokoje świnek, nie dwór), jaką wiadomość wysyła. Sprawdź, czy mock `features/rooms/mock.js` obsługuje `room_skin` (jeśli nie, test paczki ma własny).
3. Zaprojektuj `edit-filters.js`: zakładki `All`, `Furniture`, `Lights`, `Plants`, `Decor` i pole `#editDrawerSearch`; reguły kategoryzacji z pól `world_items.json` i prefiksów id (`lamp_`, `plant_`, `flower_`, `tree_`) oraz `lights.json`; czyste funkcje `categorize(item)`, `filterItems(items, {tab, query})`, `tabs(items)` (z licznikami); zachowanie przy pustym wyniku. Nie zmienia własności przedmiotów.
4. Zaprojektuj `edit-templates.js`: lista motywów z `pig_rooms.json` -> plan wiadomości `room_skin` (tylko tapeta i podłoga, meble bez zmian); co gdy motyw wymaga nieposiadanej tapety (rekomendacja: przycisk nieaktywny z podpowiedzią co kupić); czyste `plan(themeId, state, roomId)` zwraca listę wiadomości lub powód odmowy.
5. Wskaż dokładne kotwice w `edit-panel.js`/`edit-panel.css` dla PK-PE2 (gdzie montować pasek zakładek, pole szukania, panel skórek, przycisk szablonów), jak uniknąć kolizji z zakładką `Outdoor` z PK-P46c i z blokadą fixture, oraz szerokość na 420x640 (nie zasłaniać paska miejsc ani More).
6. Rozpisz przypadki testowe dla PK-T5 (filtry, wyszukiwanie, szablony, skórki, zakładka Outdoor, podpowiedź Edit, szuflada na 420x640).
7. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R27.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
