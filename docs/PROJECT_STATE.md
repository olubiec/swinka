# Stan projektu

> Prowadzony automatycznie przez Jules Loop. Każdy scalony PR i zdarzenie pętli dopisuje wpis: co zmieniono i z jakim efektem. Claude czyta ten plik na początku sesji; nie edytuj sekcji Log ręcznie.

## Status

<!-- STATUS -->
**Stan na 2026-11-22 (od `v1.0.0` `0add9b6` do `2753f0d` + drzewo robocze po poprawkach playtestowych i samouczku):**
- **Postęp prac (477 commitów od `v1.0.0`, tagi do `v2.6.166`):** Zrealizowano fale **W11–W33** (poza odłożonymi punktami i `PK-23b` BLOCKED), fale UX/wizualne **P1–P47**, **F1** (`F1-fix`, `F1-fix2`), **F2** (`F2-1`..`F2-6`) oraz **F2-FIX** (`F2F-1`..`F2F-6`, `F2-FIX2`..`F2-FIX5`). W drzewie roboczym (niezacommitowane) znajdują się wdrożenia **F3**, **F4**, poprawki `PK-FX1` / `F5-*` oraz **pakiet poprawek playtestowych** (lightmap z naturalnym rozświetlaniem świnek/mebli, bursztynowe lampy na dworze, migracja domyślnych lamp `#lamps_v1` w `OutdoorSeed`, wpis `warm_house_bed` w `atlas.json`, poprawki CSS/układu Market i Edit drawer, pogoda w Settings, taniec wieloświnkowy i wykrywanie audio na pulpicie, czulsze głaskanie vs przeciąganie).
- **Build & SelfTest:** `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` — **PASS** (0 błędów, 0 ostrzeżeń); `Cuy.exe --selftest` — **PASS** (exit code 0).
- **Testy `Cuy.Core.Tests` (`dotnet test -c Release`):** **1441** łącznie — **1414 PASS**, **21 FAIL**, **6 SKIP** (`WeatherAdversarialTests` x4, `OutdoorSeedAdversarialTests` x1, `RunAdversarialTests` x1). Nowe `TutorialTests`: 4/4 PASS. Główne błędy bazowe: `LampPlacement*` (10), `PigPinMessagesTests` (4), `PigRoomInvariantsTests` (2), `NewFeaturesAdversarialTests.S10` (1), `WorldItemCatalogTests` (1), `WorldAssetsTests` (1), `PetMarketTests` (1), `WorldMessageTests` (1).
- **Kontrole JS/danych:** `data-check.js` (PASS: 5 świnek, 15 upraw, 112 przedmiotów, 5 motywów pokoi), `lights-test.js` (PASS), `node --check` na zmienionych plikach JS (PASS), Playwright (`msedge`, `340x600`) dla układu `#editDrawer` (PASS, brak nakładania).
- **Pozostałe zaległe checki przed wydaniem:** naprawa 21 testów Core, `check-assets.js` (duplikat `cosy_nook.png`), `check-css-vars.js`, stabilizacja `web-smoke.js`, commit drzewa roboczego i ręczna akceptacja na Windows (`TESTY_RECZNE.md`).
<!-- /STATUS -->

## Log zmian (najnowsze u góry)

<!-- LOG -->
- 2026-11-22 · Wdrożono pełny samouczek bez spoilerów (`fresh` 5 kart, `update` 4 karty po `v1.0.0`, 9 podpowiedzi akcyjnych z `z-index` nad modalami/marketem, 8-zakładkowy `Guide`); `TutorialTests` 4/4 PASS, `Cuy.Core.Tests` 1414/1441 PASS (21 FAIL, 6 SKIP), Release build + `--selftest` + Playwright `tutorial-smoke` PASS.
- 2026-11-22 · Przegląd stanu gry od `v1.0.0` (477 commitów do `2753f0d` + drzewo robocze F3/F4/F2-FIX5): Release build + `--selftest` PASS; `Cuy.Core.Tests` 1410/1437 PASS (21 FAIL, 6 SKIP); `data-check`/`economy-sim`/`plan-audit`/`home-behavior-check`/`hotspots-check`/`check-icons`/`maze-test` PASS; `check-assets.js` FAIL (duplikat `cosy_nook.png`), `check-css-vars.js` 18 błędów, `web-smoke.js` i `ux-p76`/`p77` FAIL.
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
