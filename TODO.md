# Status planu fal (22.11.2026)

Orkiestra jest usunięta; fale uruchamiane ręcznie w Antigravity. Plan: `waves.yaml` (generowany z `docs/opt/packages.spec.json` przez `python3 tools/opt/gen_packages.py`, kontrola `node tools/qa/plan-audit.js`), prompty: `docs/prompts/`, logi paczek: `docs/opt/log/`.

## Zrobione (na `main` po `v1.0.0`)
- **W11–W33** (poza odłożonymi punktami i `PK-23b` BLOCKED, patrz `docs/opt/README.md`), **P1–P47**, **R1**, **F1** (`F1-fix`, `F1-fix2`), **F2** (`F2-1`..`F2-6`) oraz **F2-FIX** (`F2F-1`..`F2F-6`, `F2-FIX2`..`F2-FIX5`, fizyka drag/toss + perf).

## Zrobione w drzewie roboczym (niezacommitowane)
- **Fala 3 (`F3`)**: Home 1:1 jak pulpit (`pig-behavior.js`, `rest-spots.js`, `pig-motion.js`, `pig-reactions.js`), `undo/redo` i snapping (`edit-history.js`), limity rysowania i dźwięki świata, wybieg (`RunFeature` + `features/run/`), rekwizyty pulpitu (`PropsFeature` + `DesktopPropsOverlay`).
- **Fala 4 (`F4`)**: Hay Hop (`minigames/hayhop/`), towarzysz (`companion.js`), taniec do muzyki (`DanceToMusicBehavior` + `dance-sync.js`), pogoda za zgodą (`WeatherService` + `features/weather/`), etapy w Domku (`stage-looks.js`), bramki `PK-Q5`/`PK-Q6` i poprawki `PK-FX1` / `F5-*`.

## Zostało przed wydaniem (blokery NO-GO)
1. **Naprawa 21 błędów `Cuy.Core.Tests`** (obecnie 1410/1437 PASS, 21 FAIL, 6 SKIP): `LampPlacementTests` (4), `LampPlacementAdversarialTests` (6), `NewFeaturesAdversarialTests.S10` (1), `PigPinMessagesTests` (4), `WorldMessageTests.OutOfRangeInt` (1), `WorldAssetsTests` (1), `PetMarketTests` (1), `PigRoomInvariantsTests` (2), `WorldItemCatalogTests` (1).
2. **Stabilizacja `web/home` w Playwright**: naprawa `web-smoke.js` (niewidoczne przyciski dolnego paska, 404 starych ścieżek minigier w `dorm`/`roaming`, brak Kuki/Ned w `26_my_pigs`) oraz timeoutu `openHome` w `ux-p76-fix5.js` / `ux-p77-fix6.js` + defektów `PK-Q5` (`HOP-console-clean`, `COM-draw-order-with-furniture`, `DAN-*`, `STG-regression-*`).
3. **Naprawa kontroli statycznych**: duplikat `house/cosy_nook.png` w `assets/data/world_items.json` (`check-assets.js`), 18 nieznanych zmiennych CSS (`check-css-vars.js`).
4. **Commit zmian z drzewa roboczego** i **ręczne bramki Windows**: `TESTY_RECZNE.md`, `docs/qa/UX_WAVE_CHECKS.md`, `docs/qa/F3_OWNER_SHEET.md`, `docs/qa/F4_OWNER_SHEET.md`.
5. **Poza planem**: `PK-23b` (BLOCKED), `PK-21` (częściowo).
