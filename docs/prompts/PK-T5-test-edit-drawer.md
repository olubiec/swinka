# PK-T5: Test agent: Edit drawer (outdoor tab, filters, templates, skins, hint)
Zmieniaj: tools/qa/ux-p62-drawer-adv.js, docs/opt/log/PK-T5.md
Wymagane: tools/qa/ux-p62-drawer-adv.js
Weryfikacja: node --check tools/qa/ux-p62-drawer-adv.js && node tools/qa/ux-p62-drawer-adv.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj" i zakresy linii znalezione przez grep. Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego i NIE czytasz testów, które napisali implementujący (lista w sekcji "Nie czytaj"). Wada kodu = linia `DEFECT <id>: <opis>` w wyjściu testu i w logu (w C# test z `Skip = "DEFECT <id>"`); skrypt JS kończy się kodem 0, chyba że ustawiono zmienną STRICT=1 (wtedy kod 1 przy jakimkolwiek DEFECT). Test, którego API jeszcze nie istnieje, drukuje `SKIP <id>: <powód>` (nigdy nie przechodzi po cichu). Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Independent attack on the Edit drawer after the wiring: filters and search, templates, wallpaper and floor choice, outdoor tab, fixture lock and the hint.

Depends on: kroki F2-2 i F2-4 scalone w `main` (cały kod funkcji istnieje). Biegnie w kroku F2-5 równolegle z innymi agentami testowymi (inne pliki testów).

Produces (names other packages rely on): `tools/qa/ux-p62-drawer-adv.js`. Wynik czyta bramka PK-Q1 (uruchamia testy raz, także z `STRICT=1`) i PK-Q2 (arkusz właściciela).

## Czytaj
`docs/opt/foundations/R34.md` sekcja 6 (przepis PK-T5), `R27.md` sekcje 2-6, `RI2.md` sekcja 4.
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
- D1 tab counts add up to All (no item lost or counted twice)
- D2 search is case-insensitive, trims spaces, matches id and name, empty result shows the message, clearing restores the list
- D3 tab plus search combined, switching tab keeps the query
- D4 Outdoor tab only in outdoor scenes and indoor items only in rooms; a house-only item never appears in the garden drawer
- D5 template apply sends exactly two `room_skin` messages and no remove/move; unowned wallpaper blocks with a hint
- D6 skins panel: owned wallpaper and floor listed, click sends `room_skin`, Default sends empty itemId, hidden outdoors
- D7 fixture (stall, plot) stash disabled with a toast, move works
- D8 Edit hint visible only in Edit mode, cursor `grab` over objects
- D9 drawer state (tab, query) survives a scene switch or is reset consistently as documented in R27
- D10 drawer at 420x640 and 400x620 never covers the places bar or the More button
- D11 keyboard: tabs by arrows, Esc closes the drawer
- D12 100 stash items: scrolling and filtering stay under 50 ms per keystroke
- D13 rapid open/close 30 times leaves no extra DOM nodes or listeners
- D14 no console errors

Szablon testu JS: `const defects=[]; const skips=[]; function check(id, cond, msg){ if(!cond){ defects.push(id); console.log("DEFECT "+id+": "+msg);} else console.log("PASS "+id); }`; na końcu `console.log(defects.length+" defect(s), "+skips.length+" skip(s)"); if (process.env.STRICT && defects.length) process.exit(1);`. Błąd samego testu (wyjątek, brak serwera) = kod 1.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", editing production code, running git.

Log: write `docs/opt/log/PK-T5.md` (max 10 linii: liczba przypadków PASS/DEFECT/SKIP, lista DEFECT z id i jednozdaniowym opisem, BLOCKED reason if any). Do not run git.
