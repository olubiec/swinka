# PK-R26: Research: night effect on lamps, toggles, contact shadows (note 26, P6-06/07)
Zmieniaj: docs/opt/foundations/R26.md, docs/opt/log/PK-R26.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R26.md 7
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Pin down why a lamp loses its night effect when the pig walks up to it, check what is left of P6-06/P6-07 after the F1 fixes, and specify the fixes for PK-P47r (canvas), PK-P6c (lights) and PK-PF2 (places/feature.js) with pixel-level test criteria for PK-T6.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R26.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 7.` dokładnie w tej kolejności:
- `## 1.` Kolejność rysowania sceny (tabela krok, funkcja, linia)
- `## 2.` Przyczyna uwagi 26 z pomiarami (liczby przed i po)
- `## 3.` Stan P6-06 i P6-07 po poprawkach F1 (co zrobione, co nie)
- `## 4.` Cień kontaktowy: specyfikacja i miejsce w kodzie
- `## 5.` Podział na PK-P47r, PK-P6c, PK-PF2 (kotwice, kryteria)
- `## 6.` Kryteria pikselowe dla PK-T6
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P47r, PK-P6c, PK-PF2, PK-T6. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Uwaga właściciela 26: "gdy świnka podchodzi do lampki, na lampce znika efekt nocy". Podejrzenie: kolejność `applySceneLight` (wywoływane dwa razy, ok. `canvas-pig.js:2341` i `2363`), `litFrame` (ok. 2776, rozjaśnia klatkę świnki światłem sceny), `drawContactShadow` (2721). Poprawki 11.11 i F1-fix2 zmieniły światło (`lighter` 0.32, `src.color === 'ambient'`, zabezpieczenie NaN, okno `toggle:false`): sprawdź, co z P6-06/P6-07 już jest w kodzie.
- R6 (sekcja 2.3-2.4) twierdzi: `lib/lights.js:100` `activeSources` bez straży `toggle:false`, `places/feature.js:765` `toggleLamp`, `places/feature.js:782-811` `initCanvasLampClick`, `places/feature.js:138` zapasowe `gx = 120; gy = 65` (fałszywa plama światła), `drawThing` bez cienia pod meblami. Zweryfikuj każde zdanie na obecnym kodzie.

## Steps
1. Opisz kolejność rysowania sceny od `canvas-pig.js:2300` do końca klatki (tabela: krok, funkcja, linia, co robi ze światłem), włącznie z warstwami `addLayer` i z.
2. Odtwórz uwagę 26 w katalogu tymczasowym: Playwright, scena z lampą (np. `lamp_mushroom` w pokoju, noc przez mock zegara), pobierz piksele płótna w prostokącie lampy przy świnka daleko i świnka przy lampie (kilka pozycji x). Zapisz liczby (średni kolor) i wskaż funkcję, która gasi lub wybiela efekt, z numerem linii.
3. Sprawdź stan P6-06: czy `toggle:false` jest respektowane w `lights.js` i `toggleLamp`; czy `initCanvasLampClick` nadal istnieje; czy kliknięcie okna zmienia światło (F1-fix2). Sprawdź P6-07: czy fallback 120,65 nadal istnieje i czy rysuje plamę bez źródła.
4. Zaprojektuj cień kontaktowy mebli (owal pod stopą, wymiar z `w` przedmiotu i `depthScale`, alfa, tonowanie światłem otoczenia, brak cienia dla `flat` i `wall`) jako zmianę w `drawThing`/okolicy, max 25 linii, i poprawkę kolejności dla uwagi 26 (max kilka linii).
5. Rozpisz podział między paczki bez wspólnych plików: PK-P47r (`canvas-pig.js`: kolejność światła i cień), PK-P6c (`lib/lights.js`, `assets/data/lights.json`: straż `toggle:false`, nocne źródła plenerowe, parametry), PK-PF2 (`places/feature.js`: `toggleLamp`, usunięcie `initCanvasLampClick`, fallback 120,65). Dla każdej podaj kotwice i testy.
6. Zaprojektuj kryteria pikselowe dla PK-T6: które prostokąty próbkować, tolerancja, ile pozycji świnki, jak wymusić porę dnia przez mock.
7. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R26.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
