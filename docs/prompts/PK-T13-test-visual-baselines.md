# PK-T13: Test agent: visual baselines, palette and clipping checks
Zmieniaj: tools/qa/ux-p69-visual-baseline.js, docs/qa/shots, docs/opt/log/PK-T13.md
Wymagane: tools/qa/ux-p69-visual-baseline.js
Weryfikacja: node --check tools/qa/ux-p69-visual-baseline.js && node tools/qa/ux-p69-visual-baseline.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 50 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj" i zakresy linii znalezione przez grep. Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego i NIE czytasz testów, które napisali implementujący (lista w sekcji "Nie czytaj"). Wada kodu = linia `DEFECT <id>: <opis>` w wyjściu testu i w logu (w C# test z `Skip = "DEFECT <id>"`); skrypt JS kończy się kodem 0, chyba że ustawiono zmienną STRICT=1 (wtedy kod 1 przy jakimkolwiek DEFECT). Test, którego API jeszcze nie istnieje, drukuje `SKIP <id>: <powód>` (nigdy nie przechodzi po cichu). Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Create deterministic canvas baselines for every scene and time of day, check them against themselves and against the style rules, and produce one contact sheet for the owner.

Depends on: kroki F2-2 i F2-4 scalone w `main` (cały kod funkcji istnieje). Biegnie w kroku F2-5 równolegle z innymi agentami testowymi (inne pliki testów).

Produces (names other packages rely on): `tools/qa/ux-p69-visual-baseline.js`, `docs/qa/shots/baseline/<scene>-<tod>.png` (28 files), `docs/qa/shots/contact-sheet.png`; a second run must reproduce them byte for byte. Wynik czyta bramka PK-Q1 (uruchamia testy raz, także z `STRICT=1`) i PK-Q2 (arkusz właściciela).

## Czytaj
`docs/opt/foundations/R34.md` sekcje 3 i 6 (zrzuty, determinizm), `tools/qa/scene-overlay.js` (wzór). Uwaga: pliki w `docs/qa/shots/baseline/` utworzysz Ty.
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
- V1 render 7 scenes x 4 times of day at the logical 256x144 (read from the canvas) and write baselines; run twice and require identical bytes (determinism)
- V2 compare with existing baselines when present (per-pixel tolerance 0, ratio of differing pixels printed); first run records
- V3 palette: in the un-lit day scene without the pig every opaque pixel is in `style_palette.json` (lighting blends excluded by design: only the day scene without lights)
- V4 clipping: no placed sprite extends more than 2 px outside the canvas
- V5 pig scale overlay (`scene-overlay.js`) shows the pig within the R28 range in every scene
- V6 backgrounds 256x144 for garden, park, farm, market (IHDR) and no painted duplicates of instance objects (compare the instance sprite pixels with the same area of the clean background: not present)
- V7 contact sheet: all 28 baselines in one PNG with scene and time labels (drawn by the script, palette colours only)

Zapis plików PNG bez nowych zależności (Playwright `page.screenshot`/`canvas.toDataURL` + `fs.writeFileSync`).

Szablon testu JS: `const defects=[]; const skips=[]; function check(id, cond, msg){ if(!cond){ defects.push(id); console.log("DEFECT "+id+": "+msg);} else console.log("PASS "+id); }`; na końcu `console.log(defects.length+" defect(s), "+skips.length+" skip(s)"); if (process.env.STRICT && defects.length) process.exit(1);`. Błąd samego testu (wyjątek, brak serwera) = kod 1.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", editing production code, running git.

Log: write `docs/opt/log/PK-T13.md` (max 10 linii: liczba przypadków PASS/DEFECT/SKIP, lista DEFECT z id i jednozdaniowym opisem, BLOCKED reason if any). Do not run git.
