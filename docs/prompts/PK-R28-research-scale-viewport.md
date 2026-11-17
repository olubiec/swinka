# PK-R28: Research: pig scale after room upgrade and fixed 256x144 viewport (note 28, P47r)
Zmieniaj: docs/opt/foundations/R28.md, docs/opt/log/PK-R28.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R28.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Verify the PK-P47r design against the real code with numbers: the pig must keep the same size relative to the 16 px grid after a room upgrade, the canvas must stay 256x144 in every scene, and saved coordinates must not change.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R28.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 6.` dokładnie w tej kolejności:
- `## 1.` Gdzie rozmiar płótna zależy od pokoju (plik:linia)
- `## 2.` Tabela skali dziś vs propozycja
- `## 3.` Weryfikacja projektu PK-P47r i kto jeszcze liczy piksele
- `## 4.` Walk i behindLine pokoju, park 256x144 (wartości, właściciel pliku)
- `## 5.` Asercje dla PK-T9
- `## 6.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P47r, PK-P47a, PK-P47c, PK-PE2, PK-CV2, PK-T9. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Uwaga właściciela 28: "świnka nie skaluje się proporcjonalnie po upgrade pokoju (zostaje tak samo duża względem okna)". Dziś skala to `bScale = round((frac * sw / 46) * 8) / 8` (`canvas-pig.js` ok. 919), `sw` = szerokość sceny, więc większy pokój (więcej kratek) zmienia `sw` i skalę względem mebli.
- Rozmiary pokoi: salon 12x7 -> 16x8 -> 20x9, pokoje świnek 10x6 -> 12x7 -> 14x8 (`assets/data/places.json`, `assets/data/pig_rooms.json`), kratka 16 px, `size_from_layout:true` w `place_scenes.json`, `room.walk` dziś `[8, 40, 184, 110]` (R6 proponuje `[8, 40, 244, 110]`).
- Decyzja R47 sekcja 3: stały kadr 256x144 dla każdej sceny, mniejszy pokój wyśrodkowany w kadrze (opcja c), zero migracji zapisów.

## Steps
1. Przeczytaj `canvas-pig.js` zakresy: stałe i pola rozmiaru (okolice 300-420), `setScene` (872-980), obliczenie skali (904-925), przeliczenia piksele <-> kratki oraz `toScene`; oraz cały `room-geometry.js` (137 linii). Wypisz każde miejsce, gdzie szerokość lub wysokość płótna zależy od układu pokoju.
2. Policz tabelę skali: dla pokoi 10x6, 12x7, 14x8, 16x8, 20x9 podaj aktualne `sw`, `bScale`, wysokość świnki w pikselach ekranu (okno 420 px szerokości) i stosunek do kratki 16 px; potem to samo dla propozycji z P47r (skala ze stałej kratki 16 px). Wskaż docelową wartość dla dorosłej świnki (R47: 0,75-0,875) i zakres dla baby..legend.
3. Zweryfikuj tekst `docs/prompts/PK-P47r-room-fixed-viewport.md`: czy funkcja `stageOffset(cols, rows)` wystarcza; kto jeszcze liczy piksele z kratek (edit-panel.js przeciąganie i duch, scenes.js blokery, feature.js trafianie, chodzenie `walk`); dla każdego podaj, czy musi dostać przesunięcie i w której paczce to jest (PK-P47r ma tylko `room-geometry.js` i `canvas-pig.js`; reszta w PK-PE2/PK-CV2).
4. Rozstrzygnij `room.walk` i `behindLine` dla pokoju w kadrze 256x144 (wartości i które pliki to zmieniają: `place_scenes.json` jest własnością PK-P47a w F2-2), oraz park 256x144 z R47 sekcja 4.
5. Zaprojektuj asercje dla PK-T9 (wysokość świnki w px kratki dla każdego rozmiaru pokoju i etapu życia, offset pokoju, klik w kratkę (0,0) i (cols-1, rows-1), zapis współrzędnych bez zmian).
6. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R28.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
