# PK-R32: Research: canvas-pig.js edit plan (two passes, no overlap)
Zmieniaj: docs/opt/foundations/R32.md, docs/opt/log/PK-R32.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R32.md 7
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Inventory the extension points of the 3300-line `canvas-pig.js` and give exact anchors for the two planned edit passes (PK-P47r in F2-2, PK-CV2 in F2-4) so no other package needs to touch the file.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R32.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 7.` dokładnie w tej kolejności:
- `## 1.` Publiczne API i istniejące haki (tabela)
- `## 2.` Potok klatki i potok wskaźnika
- `## 3.` Plan edycji PK-P47r (kotwice)
- `## 4.` Plan edycji PK-CV2 (kotwice)
- `## 5.` Istniejące testy do uruchamiania
- `## 6.` Ryzyka i pomiar wydajności
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P47r, PK-CV2, PK-T9, PK-T12. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Plan 17.11: `canvas-pig.js` edytują tylko dwie paczki, po kolei. PK-P47r (F2-2): stały kadr 256x144 i skala ze stałej kratki (uwaga 28), kolejność światła na lampie (uwaga 26), cień kontaktowy mebli (P6-07). PK-CV2 (F2-4): wielu świnek (`scene-pigs.js`), cele zabawy i synchronizacja zabawki (`play-targets.js`), paski klatek świateł, cienkie API hotspotów i arbitraż kliknięć. Reszta idzie modułami przez `addLayer` i zdarzenia bez edycji canvasa.
- Publiczny obiekt `CanvasPig` (~3024) opakowuje instancję (`setScene`, `setPigVisible`, `isFree`, `debug`, `toScene`...), `PigCanvas.*` to aliasy.

## Steps
1. Zrób tabelę publicznego API (`CanvasPig.*`, `PigCanvas.*`) z numerami linii i krótkim opisem, oraz listę wszystkich haków rozszerzeń już istniejących (`addLayer`, zdarzenia, callbacki).
2. Opisz potok klatki (pętla rysowania, kolejność warstw i wartości z) i potok wskaźnika myszy (`pointerdown/move/up`, przeciąganie świnki P44, klik w świnkę, tryb Edit): kto pierwszy obsługuje zdarzenie. To jest podstawa arbitrażu hotspotów (świnka wygrywa, Edit wyłącza, przeciąganie nie wystrzeliwuje).
3. Plan edycji PK-P47r: dla każdego z trzech elementów podaj funkcje i kotwice (grep, nie same numery), oczekiwaną liczbę zmienionych linii i ryzyko; sprawdź zgodność z `docs/prompts/PK-P47r-room-fixed-viewport.md` (rozszerzonym 17.11 o kroki B i C).
4. Plan edycji PK-CV2: dla każdego z 4-5 elementów podaj funkcje i kotwice, minimalny kształt zmiany, nowe pola `CanvasPig`, i co da się zrobić bez edycji (np. pogoda przez `addLayer`).
5. Wskaż, które istniejące testy (`tools/qa/ux-p33-scene-draw.js`, `ux-p34-pig-walk.js`, `ux-p39-*.js`, `ux-p44-*.js`, `ux-p45-*.js`) obejmują edytowane obszary i powinny wejść do `Weryfikacja` obu paczek.
6. Ryzyka: styk edycji PK-P47r i PK-CV2 (ta sama funkcja?), stan współdzielony, wydajność klatki; podaj sposób pomiaru (liczba wywołań `drawImage` na klatkę, czas klatki w trybie headless).
7. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R32.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
