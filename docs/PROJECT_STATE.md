# Stan projektu

> Prowadzony automatycznie przez Jules Loop. Każdy scalony PR i zdarzenie pętli dopisuje wpis: co zmieniono i z jakim efektem. Claude czyta ten plik na początku sesji; nie edytuj sekcji Log ręcznie.

## Status

<!-- STATUS -->
**State as of QA-6 (2026-11-05):** core tests 1026 total, 1021 pass, 4 known failures (F1-01..F1-04), 1 intentional skip (F3-01); release build clean. Release readiness is not yet reached: persistence is NO-GO until package A fixes the S1 finding F3-01 (save load guard). The store screen (F4-01) and dorm bond/memorial wiring (F5-03/F5-04) are open, and the Windows manual pass (package I) has not run. Next steps are packages A and B, then the decision on C and D. Source: `docs/qa/reports/QA-6.md`.
<!-- /STATUS -->

## Log zmian (najnowsze u góry)

<!-- LOG -->
- 2026-10-28 · Przebudowa pod pętlę: W3 w formacie `Zmieniaj:`, 9 zadań w `tasks/`; W3-09/W3-10 odłożone; dry-run pętli przeszedł (start W3, brak konfliktów zakresów).
- 2026-10-28 · Wdrożenie Jules Loop: workflow, orchestrator, `ci.yml` z concurrency i `workflow_dispatch`. Usunięto `jules-dispatch.yml` (omijał pętlę). Fale W1–W2 w `tasks/done/`.

## Zatwierdzone wyjątki od zakazu zmian asercji (5.11.2026, właściciel)
- `WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50`: 55 → 81 (katalog po handoverze grafik, +26 pozycji).
- `PigRoomsMigrationTests.ThreeRosterPigsGetThreeRooms_AndSecondCallCreatesNone`: klucze pokoi `NamedId ?? Id` (Kuki → `kuki`), zgodnie z docs/qa/DECISIONS.md D1.
- 2026-11-05 · `tests/Cuy.Core.Tests/GameSessionWorldTests.cs`, `Open_OldSaveWithEquippedDecor_PlacesLegacyItems_AndReopenKeepsThem`: przed: `Assert.True(itemCount > 0)` (tapeta i podłoga zakładały przedmioty w salonie); po: `Assert.Equal("floor_wood_light", floor)` plus sprawdzenie `salon.Wallpaper` i `salon.Floor` po ponownym otwarciu. Powód: tapeta i podłoga są polami salonu (`salon.Wallpaper`, `salon.Floor`), a nie umieszczonymi przedmiotami; `LegacyDecorMigrationTests` definiuje 4 umieszczenia dla sześciu slotów. Decyzja właściciela (przekazana Claude): zachowanie migracji bez zmian.

## Decyzja D4: ekonomia, pierwszy zakup (S3, 5.11.2026)
- Cel 14–21 dni do pierwszego zakupu **nie jest spełniony**. Pierwsze ulepszenie pokoju (L2 = 400) wypada w dniu 72 (gracz regularny) i 99 (casual); źródło: `docs/qa/reports/S4.md`.
- Ceny **bez zmian**: próba stawki K3 dla 26 nowych przedmiotów złamała zatwierdzone zakresy `PigRoomInvariantsTests` (wnętrze domu 28740 zamiast 10000–14000; nowy zlew 40463 zamiast 15000–30000), więc zmianę cofnięto.
- Otwarte: strukturalne koszty zakupów albo dochód; do decyzji właściciela przy późniejszym przeglądzie ekonomii.
