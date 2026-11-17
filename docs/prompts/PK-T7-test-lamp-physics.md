# PK-T7: Test agent: lamp placement physics (note 25), Core and editor parity
Zmieniaj: tests/Cuy.Core.Tests/LampPlacementAdversarialTests.cs, tools/qa/ux-p64-lamp-edit.js, docs/opt/log/PK-T7.md
Wymagane: tests/Cuy.Core.Tests/LampPlacementAdversarialTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~LampPlacementAdversarial" && node --check tools/qa/ux-p64-lamp-edit.js && node tools/qa/ux-p64-lamp-edit.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj" i zakresy linii znalezione przez grep. Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego i NIE czytasz testów, które napisali implementujący (lista w sekcji "Nie czytaj"). Wada kodu = linia `DEFECT <id>: <opis>` w wyjściu testu i w logu (w C# test z `Skip = "DEFECT <id>"`); skrypt JS kończy się kodem 0, chyba że ustawiono zmienną STRICT=1 (wtedy kod 1 przy jakimkolwiek DEFECT). Test, którego API jeszcze nie istnieje, drukuje `SKIP <id>: <powód>` (nigdy nie przechodzi po cichu). Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Attack the lamp placement rules from both sides (Core `RoomLayoutOps` and the editor ghost) and prove they agree.

Depends on: kroki F2-2 i F2-4 scalone w `main` (cały kod funkcji istnieje). Biegnie w kroku F2-5 równolegle z innymi agentami testowymi (inne pliki testów).

Produces (names other packages rely on): `tests/Cuy.Core.Tests/LampPlacementAdversarialTests.cs`, `tools/qa/ux-p64-lamp-edit.js`. Wynik czyta bramka PK-Q1 (uruchamia testy raz, także z `STRICT=1`) i PK-Q2 (arkusz właściciela).

## Czytaj
`docs/opt/foundations/R34.md` sekcje 4 i 6 (przepis PK-T7), `R25.md` sekcje 2, 3 i 6 (tabela przypadków).
## Nie czytaj
`tools/qa/ux-p5-*.js`, `ux-p6-*.js`, `ux-p7-*.js`, `ux-p43-*.js`, `ux-p46-render.js`, `ux-p46-edit.js`, `ux-p47-*.js`, `ux-p50-*.js`, `ux-p51-*.js`, `ux-p52-*.js`, `ux-p53-*.js` oraz testów Core `PigPinMessagesTests.cs`, `RoomsOutdoorMessagesTests.cs`, `LampPlacementTests.cs`, `OutdoorSeedTests.cs` (to testy implementujących; Twoje testy mają być niezależne).

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

## Steps
1. Przeczytaj wskazane sekcje `docs/opt/foundations/R34.md` (przepisy testowe dla Twojej paczki) i najkrótsze potrzebne fragmenty kodu (grep). Zbadaj API, nie implementację testów.
2. Napisz testy dla WSZYSTKICH poniższych przypadków (każdy przypadek = osobny `check`/test z własnym id; przypadek bez API do wywołania = `SKIP <id>: <powód>`). Testy mają próbować ZEPSUĆ funkcję: wartości graniczne, kolejność zdarzeń, powtórzenia, szybkie klikanie, stare zapisy, brak danych.
3. Uruchom Weryfikację RAZ; każdy DEFECT zapisz w logu z 3 liniami odtworzenia (kroki, oczekiwane, faktyczne). Nie poprawiaj kodu produkcyjnego.

## Przypadki (min. wszystkie)
- C1 every lamp id x every cell of a 12x7 room: Core verdict recorded as a table and compared with the editor verdict (parity: identical in all cells)
- C2 floor lamp in the back-wall row accepted, in the wall rows rejected unless R25 says otherwise
- C3 wall-layer lamp only in wall rows, never on the floor
- C4 overlap of two lamp bases rejected, base next to furniture accepted
- C5 `Move` applies the same rules as `Place` for all lamps
- C6 rooms 10x6, 12x7, 14x8, 16x8, 20x9: bounds never exceeded, 5000 random placements keep every accepted layout valid
- C7 old saves (fixtures) with lamps at legacy positions still load and stay valid
- C8 data check: every lamp in `world_items.json` has the new fields or documented defaults and a sprite in `atlas.json`
- C9 hanging items (pictures) over furniture still accepted
- J1 editor: dragging a floor lamp to the top floor row shows the green ghost and sends one `room_place`/`room_move`
- J2 dragging a wall lamp to the floor shows the red ghost and sends nothing
- J3 snapping to the 16 px grid at the room offset of the fixed 256x144 viewport
- J4 rapid repeated drops send exactly one message per drop
- J5 no console errors

Dwa pliki: C# dla przypadków C*, JS (Playwright, mock) dla J*. Parytet C1 porównuje tabelę wygenerowaną z Core (test C# zapisuje ją do `tests/Cuy.Core.Tests/TestResults/lamp-parity.json` w katalogu wyników i ten sam plik czyta JS; jeśli go brak, JS drukuje `SKIP J-parity`).

Test C#: wada = test z `[Fact(Skip = "DEFECT <id>: <opis>")]` (pozostałe przechodzą); testy deterministyczne (`ManualClock`, `Random` z ziarnem), pliki repo przez `RepoFile(...)`, bez zmian statyków (`Current`).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", editing production code, running git.

Log: write `docs/opt/log/PK-T7.md` (max 10 linii: liczba przypadków PASS/DEFECT/SKIP, lista DEFECT z id i jednozdaniowym opisem, BLOCKED reason if any). Do not run git.
