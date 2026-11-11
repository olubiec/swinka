# PK-P46t2: Test agent: browser regression across all scenes (wave P46t)
Zmieniaj: tools/qa/ux-p46-regress.js, docs/opt/log/PK-P46t2.md
Wymagane: tools/qa/ux-p46-regress.js
Weryfikacja: node --check tools/qa/ux-p46-regress.js && node tools/qa/ux-p46-regress.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Independent regression check that outdoor instances, Edit mode and scene switching did not break the rest of the Home window. You did not write P46b/c: do not read `ux-p46-render.js` or `ux-p46-edit.js`.
Depends on: PK-P46a, PK-P46b, PK-P46c merged.
Produces (names other packages rely on): `tools/qa/ux-p46-regress.js` (picked up by `ux-all.js` automatically).

## Kontekst (fakty sprawdzone 11.11.2026, nie szukaj drugi raz)
- Sceny: `assets/data/place_scenes.json` (klucze scen: room, garden, park, farm, market). Rozmiary dziś: room 192x112 (`size_from_layout`), garden/farm/market 256x144, park 384x192. Każda scena ma `blockers` (id + rect): to są stałe obiekty NAMALOWANE w tle (garden: fountain, bench, flower_bed_left/right, tree_trunk_left/right, burrow, hedge; park: 14 wpisów m.in. gazebo, tree_trunk_1..4, bench_left/right, lantern_left/mid; farm: fence_left, barn_base, fence_right; market: stall_left/center/right, notice_board, crates_barrels, sign_right). Tła: `assets/world/bg/<scene>_<tod>.png`, generowane skryptami w `tools/art/` (np. `tools/art/world/market_bg.py`).
- Model zapisu: `src/Cuy.Core/World/WorldState.cs`: `Rooms` = słownik id miejsca -> `RoomLayout { Items: List<PlacedItem {Uid, ItemId, X, Y, Flip, Variant}> }`; operacje `src/Cuy.Core/World/RoomLayoutOps.cs` (`CanPlace`, `Place`, `Move`, `SetFlip`, `Remove`); wiadomości `room_place/room_move/room_remove/room_flip` obsługuje `src/Cuy/dotNet/Features/RoomsFeature.cs` z walidacją `src/Cuy.Core/Input/Validation/RoomsMessages.cs`. Katalog przedmiotów: `assets/data/world_items.json` (klucze `note, version, layers`), `WorldItemCatalog.cs`. Stary `src/Cuy.Core/DecorState.cs` to tylko sloty (Equipped), nie ten model.
- Web: `web/home/features/places/{feature,scenes,edit-panel,mock}.js` (`scenes.js` ma `layoutFor`, `placedThings(state, sceneId)`, `def(id, tod)`; `edit-panel.js` ~l.706-721 rozpoznaje przedmioty `outdoor`/`indoor`), płótno `web/home/canvas-pig.js` (`addLayer`, `setScene`, `debug()`), atlas `assets/world/atlas.json`. Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')`; Core: `tests/Cuy.Core.Tests` (np. `RoomLayoutOpsTests.cs`, `WorldMigrationTests.cs`, `WorldSaveSizeTests.cs`).
- Wytyczne grafika (nowe 11.11): `docs/BRIEF_DLA_GRAFIKA_SCENY_I_OBIEKTY.md` (tła 256x144 bez wklejonych obiektów, osobne sprite'y z alfą, kotwica = dół środek podstawy, skala do świnki 32x24).
- Zasada AGENTS.md: nowe pola zapisu tylko z bezpiecznymi domyślnymi; zmiany liczb za flagą `Balance`; JS nie liczy cen; tabele danych wg wzorca `EconomyConfig` (`Current`/`Load`/`LoadDefault`).

## Steps
1. Read `tools/qa/lib/ux.js` (helpers) and `docs/qa/UX_WAVE_CHECKS.md` section for P40 only (what Edit must still do).
2. Playwright, mock `seven`, viewport 420x720: R1 `all-scenes-times-of-day` (5 scenes x 4 times of day via the mock clock: no console error, canvas element size identical between the three 256x144 scenes and listed in the log for room and park), R2 `edit-roundtrip-each-outdoor-scene` (Edit on, move one object, scene switch away and back: object still at the new position), R3 `pig-still-walks` (pig position changes within 4 s in each scene, never inside an instance footprint), R4 `places-bar-unchanged` (bar title, arrows and Edit button exist and are clickable; keyboard arrows switch scenes), R5 `presence-chip-and-drag` (P38 chip text appears when the pig is elsewhere; drag to the edge still works if `CanvasPig.onEdgeHold` exists), R6 `hotspots-not-broken` (if `CanvasPig.setHotspots` exists, rooms still draw no hotspot cost), R7 `frame-time` (100 frames in garden with 20 instances under 3x the room time), R8 `stash-and-store-open` (More -> store/stash opens and closes, no leftover window).
3. Tests that cannot run because an API does not exist yet are skipped with a printed reason `SKIP <name>: <why>`; they must never pass silently.
4. Run the Weryfikacja line once. Log defects with a 3-line repro each; do not change production code.

## Poprawki po R1 (obowiązują, mają pierwszeństwo nad krokami wyżej)
- `ux-p46-regress.js` ma sprawdzać roundtrip Edit (przesuń, przełącz scenę, wróć) oraz wyznaczanie ścieżki w scenach z `bg_clean: true`.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P46t2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
