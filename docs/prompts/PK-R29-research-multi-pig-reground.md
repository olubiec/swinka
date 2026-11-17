# PK-R29: Research: multiple pigs, pin and desktop pet after wave F1 (P5)
Zmieniaj: docs/opt/foundations/R29.md, docs/opt/log/PK-R29.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R29.md 8
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Re-ground R5 on the code after F1 (P44, P4, F1-fix changed canvas-pig.js, places/feature.js, pigs/feature.js) and define the contract of the pure module `web/home/lib/scene-pigs.js`, the pin/desktop UI and the C# desktop pet, so PK-P5a, PK-P5b, PK-P5c, PK-CV2 and PK-PF2 can be coded in parallel.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R29.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 8.` dokładnie w tej kolejności:
- `## 1.` Stan po F1 (zrobione/brakuje, plik:linia)
- `## 2.` Stan jednej świnki w canvasie
- `## 3.` Kontrakt `scene-pigs.js`
- `## 4.` Integracja: CanvasPig i places/feature.js (kotwice)
- `## 5.` UI przypinania i pulpitu, wiadomości, walidacja, mock
- `## 6.` P5-04: koszt, minimalna wersja, kryterium BLOCKED
- `## 7.` Przypadki dla PK-T4
- `## 8.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P5a, PK-P5b, PK-P5c, PK-CV2, PK-PF2, PK-T4. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- `docs/opt/foundations/R5.md` (przeczytaj sekcje 1-5; dziś jest w repo) opisuje stan przed F1. Fakty do sprawdzenia: lokalizacja świnek w Core `src/Cuy.Core/Pigs/PigLocation.cs`, wiadomości `places.pigMove {pigId,to}` i `places.pigPin {pigId,pinned}` (C# `src/Cuy/dotNet/Features/PlacesFeature.cs` ok. 246, kontrakt `docs/contracts/places-pig-location.md`), reguły walidacji `src/Cuy.Core/Input/Validation/PlacesMessages.cs`, `CuyLook.resolve(pig, stageKey)` (`canvas-pig.js` ok. 90-190), `setPigVisible` (tylko jedna świnka), chip obecności `#placesPresenceChips`, pulpit: `src/Cuy/dotNet/BrainController.cs`, `FormPet.cs`.
- Decyzje domyślne R5: pulpit opcja A (minimalny towarzysz, osobna pętla animacji, NIE przez `BrainController.OnAnimationSequenceFinished` ani `_brain.CurrentAction`), przypinanie w kartach świnek (`features/pigs/feature.js`), spacer niezależny w pasie podłogi (animacje wzajemne odłożone).

## Steps
1. Przeczytaj `docs/opt/foundations/R5.md` sekcje 1-5 i zweryfikuj każde twierdzenie na obecnym kodzie (po F1): co z P5-02/P5-03/P5-04 już istnieje, z numerami linii. `git log --oneline -8 -- web/home/canvas-pig.js web/home/features/places/feature.js web/home/features/pigs/feature.js` pokaże, co zmieniło F1.
2. Opisz stan jednej świnki w `canvas-pig.js` (pola `pigX/pigY`, animacje, cel, `walk`, `setPigVisible`, rysowanie świnki i cienia): to jest to, co moduł `scene-pigs.js` ma powielić per świnka bez dotykania reszty.
3. Zdefiniuj kontrakt `web/home/lib/scene-pigs.js` (UMD, czysty): funkcje z typami i znaczeniem, np. `create({rng, bounds, minGap})`, `sync(list)` (z lokalizacji i rostera: id, look, pinned), `step(dtMs, ctx)` (ruch w pasie podłogi, omijanie sąsiada, `isFree` wstrzykiwane), `entries()` (dla `renderList`: id, y, x, frame, look), `remove(id)`, `debug()`. Podaj zachowania graniczne (0, 1, 2, 3 świnki, świnka przypięta stoi, brak miejsca).
4. Opisz punkty integracji: CanvasPig (PK-CV2: `setPresentPigs`, wstawienie do `renderList`, rysowanie `drawPig` per świnka, cień i światło per świnka) oraz `places/feature.js` (PK-PF2: `applyScene` filtruje lokalizacje po `currentSceneId`, wywołuje `CanvasPig.setPresentPigs`). Podaj kotwice i szacunek linii.
5. Zaprojektuj UI i walidację dla PK-P5b: przycisk "Stay in this room"/"Roam freely" w karcie świnki (`pigs/feature.js`), przełącznik "Show on desktop" (max 2), nazwy wiadomości (pin: istniejące `places.pigPin`; pulpit: nowa wiadomość, np. `pigs.desktopPet {pigId, on}`), reguły `PlacesMessages.cs`/`PigsMessages.cs`, handler mocka w `features/pigs/mock.js` (NIE w `places/mock.js`, ten należy do PK-P46b), aktualizacja `docs/contracts/`.
6. Oceń koszt i ryzyko P5-04 (drugie okno świnki na pulpicie) w `BrainController.cs`/`FormPet.cs`/`PigsFeature.cs`: minimalna wersja (dokładne metody i pola, które trzeba dodać), co jest niemożliwe do przetestowania na Linuksie (tylko `dotnet build`), kryterium BLOCKED dla PK-P5c.
7. Zaprojektuj przypadki dla PK-T4 (dwie świnki w scenie z różnymi wyglądami, odstęp, y-sort, przypięta stoi, przeniesienie do zablokowanego miejsca, trzy i cztery świnki, wydajność).
8. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R29.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
