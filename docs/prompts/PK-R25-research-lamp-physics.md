# PK-R25: Research: lamp placement physics (note 25)
Zmieniaj: docs/opt/foundations/R25.md, docs/opt/log/PK-R25.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R25.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Explain why a lamp cannot be moved higher or onto the wall, and specify the data and rule change (Core and web) so PK-P25c (Core/data), PK-PE2 (editor UX) and PK-T7 can work in parallel.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R25.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 7.` dokładnie w tej kolejności:
- `## 1.` Reguły stawiania dziś (Core i klient, plik:linia)
- `## 2.` Tabela odtwarzająca problem (lampy x komórki)
- `## 3.` Model danych: stopa vs wysokość sprite'a, pola i domyślne
- `## 4.` Skutki: pathfinding, y-sort, stare zapisy, kolizje z istniejącymi testami
- `## 5.` Podział plików: PK-P25c, PK-PE2, PK-CV2
- `## 6.` Tabela przypadków dla PK-T7 (wspólna dla Core i JS)
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P25c, PK-PE2, PK-CV2, PK-T7. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Uwaga właściciela 25: "lampka ma zepsutą fizykę, nie da się jej przenieść wyżej / na ścianę". Stare zadania P7-01/P7-02 mają złe ścieżki: NIE tworzymy `Decor/RoomOccupancy.cs`, jedyną władzą Core jest `src/Cuy.Core/World/RoomLayoutOps.cs` (R7 decyzja 1), a edytor to `web/home/features/places/edit-panel.js` i `canvas-pig.js`, nie `features/decor/feature.js` (R7 decyzja 2).
- Warstwy w `world_items.json`: `ground`, `floor`, `wall`. Rozmiar `w`/`h` jest w kratkach 16 px. Pokój domyślnie 12x7 kratek, `DEFAULT_WALL_ROWS = 2` (`web/home/features/places/room-geometry.js:6-8`).

## Steps
1. Znajdź WSZYSTKIE miejsca, które decydują, czy przedmiot można postawić: grep `CanPlace` w `RoomLayoutOps.cs`, oraz `canPlace`/`footprint`/`layer`/`wallRows`/`behindLine` w `edit-panel.js`, `scenes.js`, `room-geometry.js`, `canvas-pig.js`. Zapisz regułę każdego (plik:linia) i czy klient i Core dają ten sam wynik.
2. Odtwórz problem tabelą: dla `lamp_mushroom`, `lamp_floor` (h2 floor), `lamp_post`, `lamp_oil`, `lamp_salt` (h1 floor), `lamp_arc`, `fairy_lights` (wall) podaj dla pokoju 12x7: najniższy i najwyższy dozwolony wiersz, czy da się stanąć przy tylnej ścianie, czy da się powiesić na ścianie. Pokaż, które komórki odrzuca klient, a które Core.
3. Zaproponuj model: rozdziel stopę blokującą (podstawa, np. h1) od wysokości sprite'a (sprite zachodzi na ścianę); lampa podłogowa może stać przy ścianie (wiersz 0 podłogi), kinkiety i girlandy tylko na warstwie `wall`. Nazwij nowe pola w `world_items.json` (np. `foot_h`, `sprite_h`) i domyślne dla istniejących przedmiotów (brak pola = dotychczasowe `h`), tak by zapisane układy zostały ważne.
4. Sprawdź skutki: pathfinding świnki (blokada tylko ze stopy), y-sort, `RoomLayoutOps.Move`, stare zapisy z lampami na dotychczasowych pozycjach, testy `RoomLayoutOpsTests.cs` (których asercji NIE wolno zmieniać: wypisz te, które mogą się zderzyć).
5. Rozpisz podział plików: PK-P25c (`world_items.json`, `RoomLayoutOps.cs`, testy Core), PK-PE2 (czerwona/zielona komórka, przyciąganie w `edit-panel.js`), PK-CV2 (`canvas-pig.js`, jeśli klient liczy blokady z `h`), oraz przypadki testowe dla PK-T7 (tabela wejście -> oczekiwany wynik, wspólna dla Core i JS).
6. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R25.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
