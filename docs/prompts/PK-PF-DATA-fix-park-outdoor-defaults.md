# PK-PF-DATA: Fix out-of-bounds Park default coordinates (x < 16) and repair partial park seed in OutdoorSeed
Zmieniaj: assets/data/outdoor_defaults.json, src/Cuy.Core/World/OutdoorDefaults.cs, src/Cuy.Core/World/OutdoorSeed.cs, tests/Cuy.Core.Tests/OutdoorSeedTests.cs, docs/opt/log/PK-PF-DATA.md
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~OutdoorSeed" && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz `docs/opt/foundations/RF3.md`. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Move the 5 out-of-bounds Park default items (`tree_2`, `tree_3`, `bench_2`, `lamp_2`, `bush_2` with `x >= 16`) inside the 16x9 grid (`0 .. 16 - w`) in `outdoor_defaults.json` and `OutdoorDefaults.cs`, and make `OutdoorSeed.EnsureSeeded` backfill missing default items in already-seeded saves (unless their `uid` is in `RemovedFixtures`).

Depends on: `docs/opt/foundations/RF3.md`. Biegnie w kroku F2F-2 równolegle z 6 innymi paczkami.

Produces (names other packages rely on): Valid 16x9 Park coordinates in `assets/data/outdoor_defaults.json` and `OutdoorDefaults.cs`; self-healing backfill in `OutdoorSeed.EnsureSeeded`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF3.md`
- `assets/data/outdoor_defaults.json`
- `src/Cuy.Core/World/OutdoorDefaults.cs`
- `src/Cuy.Core/World/OutdoorSeed.cs`
- `tests/Cuy.Core.Tests/OutdoorSeedTests.cs`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RF3.md` oraz pliki z `Zmieniaj`.
2. W `assets/data/outdoor_defaults.json` i w fallbacku C# `src/Cuy.Core/World/OutdoorDefaults.cs` popraw współrzędne `x` (i w razie kolizji `y`) dla przedmiotów w `park`, tak aby każdy z 10 przedmiotów mieścił się w siatce 16×9 (`x >= 0`, `x + w <= 16`, `y >= 0`, `y + h <= 9`) i nie nachodził na żaden inny przedmiot w `park` (np. `tree_2` `x: 11, y: 1`, `tree_3` `x: 14, y: 1`, `bench_2` `x: 11, y: 5`, `lamp_2` `x: 13, y: 4`, `bush_2` `x: 14, y: 6`).
3. W `src/Cuy.Core/World/OutdoorSeed.cs`: gdy `room.OutdoorSeedVersion >= CurrentSeedVersion`, ale w pokoju plenerowym brakuje domyślnych przedmiotów z `defaults` (których `uid` NIE znajduje się w `room.RemovedFixtures` i których `uid` nie ma jeszcze w `room.Placed`), spróbuj je dostawić przez `RoomLayoutOps.TryPlace` (dzięki temu istniejący zapis gracza na dysku odzyska brakujące 5 obiektów w Parku bez resetowania jego zmian).
4. W `tests/Cuy.Core.Tests/OutdoorSeedTests.cs` dodaj test potwierdzający, że po `OutdoorSeed.EnsureSeeded` scena `park` ma wszystkie 10 domyślnych obiektów w `Placed`, a stary zapis z 5 obiektami w `park` dostaje brakujące 5 obiektów (o ile nie są w `RemovedFixtures`). Nie zmieniaj ani nie usuwaj istniejących asercji!
5. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-DATA.md` (max 10 linii).
