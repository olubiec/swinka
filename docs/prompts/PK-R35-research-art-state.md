# PK-R35: Research: delivered D2/D4 art, atlas and catalog gaps, light data
Zmieniaj: docs/opt/foundations/R35.md, docs/opt/log/PK-R35.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R35.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Inventory the outdoor art that already exists in `assets/world/` after the D2 and D4 deliveries (commits 1024d65, ec65734) and list exactly what is still missing from `world_items.json`, `atlas.json` and `lights.json`, so PK-P25c, PK-P47a and PK-P6c need no artist and no guessing.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R35.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 5.` dokładnie w tej kolejności:
- `## 1.` Tabela zasobów `assets/world` (ścieżka, wymiary, klatki, atlas, katalog)
- `## 2.` Luki w `world_items.json` i `atlas.json` (id, w, h, warstwa)
- `## 3.` Dane świateł dla `lights.json`
- `## 4.` Zamówienia do grafika (jeśli są) i wymagania dla PK-P47a
- `## 5.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P25c, PK-P47a, PK-P6c, PK-P46a. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Plan 11.11 zakładał, że D2 (obiekty) i D4 (ognisko) dostarczy grafik. Commit `1024d65` ("Merge assets/d2-d4-objects: D2 + D4 art delivery") i `ec65734` ("D2 outdoor objects (plots, stalls, fruit tree, fountain anim, grass tufts) + D4 campfire + generator") już je wniosły: `assets/world/garden/` ma m.in. `campfire_base.png`, `campfire_flame.png`, `campfire_flame_small.png` (+ `.json`), `grass_tuft_1..4`, `hay_basket.png`; sprawdź też `assets/world/{park,farm,market,fx}`.
- Wymagania grafiki: `docs/BRIEF_DLA_GRAFIKA_SCENY_I_OBIEKTY.md`, `docs/GRAFIK_D2_obiekty.md` (czytaj tylko listę plików), kotwica = dół środek podstawy, skala do świnki 32x24, palety `assets/data/style_palette.json`. Wynik poprzedniego audytu: `docs/opt/foundations/R47.md` sekcja 2.

## Steps
1. Zrób tabelę wszystkich PNG w `assets/world/{garden,park,farm,market,fx}`: ścieżka, wymiary (`python3 -c "from PIL import Image..."`), liczba klatek (z `.json` obok lub z szerokości/wysokości), czy jest wpis w `assets/world/atlas.json`, czy jest przedmiot w `assets/data/world_items.json`.
2. Wypisz luki: przedmioty z propozycji `outdoor_defaults.json` (R46 sekcja 3: ławki, fontanna, latarnie, drzewa, krzewy, żywopłot, skrzynki, tablica, ognisko, stragany, grządki, stodoła, płot) bez sprite'a, bez wpisu w atlasie lub w katalogu; podaj dokładne id, `w`/`h` w kratkach i warstwę, jakie PK-P25c powinien dopisać.
3. Dane świateł dla PK-P6c: dla ogniska (baza + płomień + mały płomień), pochodni, latarni, lampy olejowej, brazier: liczba klatek, fps, promień i kolor blasku (propozycje zgodne z istniejącymi wpisami `lights.json`), `autoOn` o zmierzchu.
4. Zweryfikuj wymagania dla PK-P47a (generatory teł): które obiekty znikają z którego generatora (R47 sekcja 1) i czy każdy ma gotowy sprite (inaczej scena z `bg_clean:true` zostanie pusta). Jeśli jakiegoś brakuje: dokładna nazwa pliku, wymiary i opis dla zamówienia u grafika albo wskazanie generatora w `tools/art/` do uruchomienia.
5. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R35.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
