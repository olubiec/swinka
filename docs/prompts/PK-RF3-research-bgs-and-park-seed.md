# PK-RF3: Research: stripped outdoor backgrounds and out-of-bounds park default items
Zmieniaj: docs/opt/foundations/RF3.md, docs/opt/log/PK-RF3.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RF3.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Nie uruchamiaj git. Czytaj wyłącznie wskazane pliki. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Audit what background scenery was stripped from `market_bg.py`, `farm_bg.py`, `garden_bg.py`, `park_bg.py` in `PK-P47a` without being replaced by instances, and why 5 Park items in `outdoor_defaults.json` fail to spawn in `OutdoorSeed.cs`.

Depends on: nothing (tylko odczyt). Działa w kroku F2F-1 równolegle z `PK-RF1..PK-RF6`.

Produces (names other packages rely on): `docs/opt/foundations/RF3.md` (1500..16000 znaków, sekcje `## 1.` .. `## 5.`):
- `## 1.` Deleted background scenery across Market, Farm, Garden and Park (`*_bg.py`)
- `## 2.` Check against `tools/qa/ux-p47-bg.js` assertions (what background pixels are tested)
- `## 3.` Out-of-bounds Park items in `outdoor_defaults.json`, `OutdoorDefaults.cs`, `OutdoorSeed.cs`, `places/mock.js`
- `## 4.` Exact restoration spec for `PK-PF-BG` and `PK-PF-DATA`
- `## 5.` Prompt fixes

## Czytaj tylko (zakaz czytania innych plików)
- `tools/art/world/market_bg.py` (cały, ok. 60 linii)
- `tools/art/world/farm_bg.py` (cały, ok. 50 linii)
- `tools/art/world/garden_bg.py` (cały, ok. 55 linii)
- `tools/art/world/park_bg.py` (cały, ok. 60 linii)
- `tools/qa/ux-p47-bg.js` (cały, ok. 90 linii)
- `assets/data/outdoor_defaults.json` (cały)
- `src/Cuy.Core/World/OutdoorDefaults.cs` (cały)
- `src/Cuy.Core/World/OutdoorSeed.cs` (cały)

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `tools/art/world/{market_bg,farm_bg,garden_bg,park_bg}.py` oraz `tools/qa/ux-p47-bg.js`. Sprawdź dokładnie, które prostokąty w `ux-p47-bg.js` są sprawdzane pod kątem braku wmalowanych instancji (np. stragany na targu, drzewo w ogrodzie, stodoła na farmie), aby przywracane elementy tła (sznur świecących lampek `BULBS` i plakaty na murze `market_bg.py`, drewniany płot na horyzoncie `farm_bg.py` poza oknem stodoły, furtka `gate_garden.png` i drzewka horyzontu `garden_bg.py`, altana `gazebo`, dalekie drzewa `tree_big` za strumieniem i mostek `bridge_wood` w `park_bg.py`) nie naruszyły żadnej asercji `ux-p47-bg.js`!
2. Przeczytaj `assets/data/outdoor_defaults.json`, `src/Cuy.Core/World/OutdoorDefaults.cs` i `src/Cuy.Core/World/OutdoorSeed.cs`. Wykaż, że w `park` 5 przedmiotów (`tree_2`, `tree_3`, `bench_2`, `lamp_2`, `bush_2`) ma `x = 16, 18, 20, 21`, a siatka 256×144 ma `Cols = 16` (`0..15`), przez co `RoomLayoutOps.CanPlace` odrzuca je i prawa połowa parku jest pusta.
3. Sprawdź też, jak `OutdoorSeed.EnsureSeeded` zachowuje się dla istniejącego zapisu z `OutdoorSeedVersion == 1`, w którym w parku zasiało się tylko 5 z 10 przedmiotów — zaprojektuj naprawę (np. dosianie brakujących `uid` z listy domyślnej dla `park`, jeśli nie są w `RemovedFixtures` i nie ma ich w `Placed`, z korektą `x` mieszczącą się w `0 .. 16 - w`).
4. Zapisz dokładną specyfikację dla `PK-PF-BG` i `PK-PF-DATA`.
5. Uruchom Weryfikację (`node tools/qa/foundation-check.js docs/opt/foundations/RF3.md 5`).

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-RF3.md` (max 10 linii).
