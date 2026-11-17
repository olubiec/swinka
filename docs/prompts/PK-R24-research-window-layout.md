# PK-R24: Research: window cut off at the bottom (note 24)
Zmieniaj: docs/opt/foundations/R24.md, docs/opt/log/PK-R24.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R24.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Find, with measurements, why the bottom of the Home window is cut (bottom bar and the More button) and specify the exact fix, so PK-P47c (CSS) and PK-P24c (C#) can be coded in parallel and PK-T9 can test it.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R24.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 7.` dokładnie w tej kolejności:
- `## 1.` Łańcuch układu: elementy, wysokości, linie
- `## 2.` Pomiary (tabela scena x rozmiar x tryb, bottom przycisku More)
- `## 3.` Przyczyny z numerami linii (CSS vs C#)
- `## 4.` Poprawka dla PK-P47c: selektory i wartości
- `## 5.` Poprawka dla PK-P24c (albo NO-OP z uzasadnieniem)
- `## 6.` Asercje i macierz dla PK-T9
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P47c, PK-P47r, PK-P24c, PK-T9. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Uwaga właściciela 24: "rozmiar okna ucięty od dołu (dolny pasek nawigacji / przycisk More)". Poprawka z 11.11: `.stage-viewport` ma `flex: 0 0 auto`, `#pigCanvas` `width:100%; height:auto` (`web/home/style.css`, `web/home/features/places/feature.css`). Elementy układu: `#placesBar` (pasek miejsc), `#btnMore`, `body.webview-mode`, `.home-shell`.
- Proporcje scen: pokój 192x112 (1,71), park 384x192 (2,0), reszta 256x144 (1,78): przy szerokości 420 px wysokość płótna to 245/236/236 px, a pokój i park dają inne wysokości, więc dolny pasek może wypadać poza okno 640 px.

## Steps
1. Przeczytaj łańcuch układu od `HomeWindow.cs:225-300` (rozmiar, DPI, `fit`) po `index.html`/`style.css` (`html`, `body`, `.home-shell`, `.stage-viewport`, pasek miejsc, dolny pasek z `#btnMore`): zapisz każdy element z jego `height`/`flex`/`min-height`/`overflow` i numerem linii.
2. Zmierz (skrypt Playwright w katalogu tymczasowym, serwer jak w `tools/qa/lib/ux.js`, mock `seven`): dla każdej z 7 scen i rozmiarów okna 420x640, 400x620, 420x600, 360x560 zapisz `getBoundingClientRect()` płótna, paska miejsc, `#btnMore` i `document.documentElement.scrollHeight`. Tryby: zwykły, Edit z otwartą szufladą.
3. Zidentyfikuj przyczynę lub przyczyny z numerem linii (np. wysokość sceny zależna od proporcji, szuflada Edit nad dolnym paskiem, `overflow:hidden` na `body`, błąd przeliczenia DPI w `HomeWindow.cs`). Rozdziel: co jest CSS (PK-P47c, pliki `index.html`, `style.css`, `places/feature.css`), a co C# (PK-P24c, `HomeWindow.cs`). Jeśli C# nie ma winy, napisz to wprost: PK-P24c ma wtedy zostać NO-OP.
4. Zaprojektuj poprawkę: dokładne selektory, wartości i kolejność (np. wysokość sceny z proporcji 16:9 plus stała rezerwa dla dolnego paska), tak by dół był widoczny we wszystkich 4 rozmiarach, 7 scenach i obu trybach. Podaj wzór na wysokość każdego bloku.
5. Zaprojektuj asercje dla PK-T9 (`getBoundingClientRect().bottom <= innerHeight`, brak przewijania pionowego `body`, stały rozmiar płótna) i listę rozmiarów okna do macierzy.
6. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R24.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
