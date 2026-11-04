# Plan pakietów (stan 4.11.2026)

Od W17 zadania są łączone w **paczki**: jedna paczka = jedna sesja agenta (jedno zadanie w `waves.yaml`), kilka powiązanych punktów wykonywanych po kolei, commit po każdym. Powód: orkiestra uruchamia świeżą sesję `agy` na każde zadanie, a koszt startu sesji i drugiej próby dominuje nad samym kodem. W15 i W16 zostały poza tym planem (robione ręcznie).

## Jak to działa
- Źródło prawdy: `docs/opt/packages.spec.json` (ręczny podział, pomijane zadania, nadpisania celów plików) + stare prompty zadań w `docs/prompts/items/`.
- Generator: `python3 tools/opt/gen_packages.py` tworzy `docs/prompts/PK-*.md`, zamienia część `waves.yaml` od PK-00 w dół i zapisuje `docs/opt/packages.json`. Sprawdza, że każdy punkt jest w dokładnie jednej paczce albo odłożony i że paczki w jednej fali nie dzielą plików. Po każdej zmianie specyfikacji uruchom generator i `node tools/qa/plan-audit.js`.
- Polecenie weryfikacji paczki: testy tylko klas z paczki (`--filter`), a **pełny test i build tylko w paczce zamykającej etap** (kolumna „pełny test"). `tools/verify.ps1` robi to samo ręcznie i drukuje tylko błędy.
- Model i limit czasu są per paczka (`model`, `timeout_minutes` = 20 + 8 min na punkt, max 60). Przy dwóch porażkach UI-paczki warto przełączyć `model` na `claude-sonnet-5-5-low` z `orkiestra.toml`.
- Wzorzec **PK-00** (najpierw): reguły walidacji (`IMessageRuleSet`), mock przeglądarki (`features/<id>/mock.js`) i kontrakty (`docs/contracts/<feature>.md`) są per funkcja, więc nie ma już osobnych zadań „kontrakt / walidacja / mock" ani edycji tych samych plików przez różne paczki.

## Odłożone (do osobnego etapu po teście na Windowsie)
| Co | Punkty |
|---|---|
| undo/redo and snapping in the room editor | W20-03 |
| sounds for the world | W21-03 |
| canvas draw limits | W21-05 |
| pigs walking inside the room editor | W27-07 |
| garden run | W28-01, W28-02, W28-03, W28-04, W28-05, W28-06, W28-07, W28-08 |
| desktop props audit | W28-09 |
| desktop props | W29-01, W29-02, W29-03, W29-04, W29-05, W29-06, W29-07, W29-08, W29-09 |

W22-02 jest **zmniejszone**: tylko test niezmienników z danych, bez portu symulatora do C# (symulacja 365 dni zostaje w `economy-sim.js --check`). W30 jest przycięte o wybieg i rekwizyty (nadpisania w specyfikacji).

## Paczki (34, w kolejności uruchamiania)
Paczki z tej samej fali idą równolegle (pliki rozłączne). Kolejne fale czekają na poprzednią.

| Fala | Paczka | Zakres | Punkty | Model | Min | |
|---|---|---|---|---|---|---|
| PK-00 | PK-00 | Per-feature files for validation, mock and contracts | (ręczny prompt) | flash-high | 44 |
| W17 | PK-17a | Room layout, comfort, place unlock, legacy decor migration | W17-01, W17-02, W17-07, W17-08 | flash-high | 52 |
| W17 | PK-17b | Farm engine and farm expansion | W17-03, W17-04 | flash-high | 36 |
| W17 | PK-17c | Market pricing and market stock | W17-05, W17-06 | flash-high | 36 | pełny test |
| W18a | PK-18a | Pet.World, Pet.Rooms and diary lines for the world | W18-01, W18-06, W18-02 | flash-high | 44 |
| W18b | PK-18b | Pet.Farm, Pet.Walk and world save migration | W18-03, W18-05, W18-07 | flash-high | 44 |
| W18b | PK-18c | Pet.Market | W18-04 | flash-high | 28 | pełny test |
| W19 | PK-19 | C# features for places, rooms, farm, market with contracts and validation | W19-01, W19-02, W19-03, W19-04, W19-05, W19-06 | flash-high | 60 | pełny test |
| W20a | PK-20a | Browser mocks for the world, places bar and room editor | W20-08, W20-01, W20-02 | flash-high | 44 |
| W20b | PK-20b | Garden and park view, farm view | W20-04, W20-05 | flash-high | 36 |
| W20b | PK-20c | Market view, orders board and daily specials | W20-06, W20-07 | flash-high | 36 | pełny test |
| W21 | PK-21 | Harvest notification, world settings, My Pigs links | W21-01, W21-02, W21-04 | flash-medium | 44 | pełny test |
| W22 | PK-22a | Switch world flags on, SelfTest, save size, asset contract tests | W22-01, W22-05, W22-06, W22-07 | flash-high | 52 |
| W22 | PK-22b | World economy invariants test (data level, no simulator port) | W22-02 | flash-high | 28 | pełny test |
| W22 | PK-22c | Web smoke for world screens and manual test steps | W22-03, W22-04 | flash-medium | 36 |
| W23a | PK-23a | Pig room config, world-state fields, flags, home economy config, invariants test | W23-01, W23-02, W23-06, W23-07, W23-08 | flash-medium | 60 |
| W23b | PK-23b | PigComfort, PigRoomOps and pig-room levels in the catalog | W23-03, W23-04, W23-05 | flash-high | 44 | pełny test |
| W24 | PK-24a | Pet integration of pig rooms: rooms, comfort, items, memory room | W24-01, W24-02, W24-03, W24-04 | flash-high | 52 |
| W24 | PK-24b | Pig rooms for old saves and diary lines | W24-05, W24-06 | flash-medium | 36 | pełny test |
| W25 | PK-25a | RoomsFeature for pig rooms with contract and validation | W25-01, W25-03, W25-02 | flash-high | 44 | pełny test |
| W25 | PK-25b | Pig room tabs, customize panel, My Pigs link, mock | W25-07, W25-04, W25-05, W25-06 | flash-high | 52 |
| W26a | PK-26a | Shared bedroom: SharedRoomOps, Pet.Dorm and roommate comfort | W26-01, W26-02, W26-03 | flash-high | 44 |
| W26b | PK-26b | DormFeature, contract and validation, flags on for pig rooms and the dorm | W26-04, W26-05, W26-08 | flash-high | 44 | pełny test |
| W26c | PK-26c | Shared bedroom page, wiring and smoke test | W26-06, W26-07, W26-09 | flash-high | 44 |
| W27a | PK-27a | Roaming and home mode: state, PigWander, Pet.Homes, HomesFeature, contract, validation | W27-01, W27-02, W27-03, W27-04, W27-05 | flash-high | 60 | pełny test |
| W27b | PK-27b | House plan and wiring of plan and home chips | W27-06, W27-08 | flash-high | 36 |
| W30a | PK-30a | HomeStore catalogue, Pet.Store and store totals test | W30-01, W30-02, W30-06 | flash-high | 44 |
| W30b | PK-30b | StoreFeature with contract and validation, store page | W30-03, W30-04, W30-05 | flash-high | 44 |
| W30c | PK-30c | Data checks, smoke test and manual steps, flags on for roaming | W30-07, W30-09, W30-08 | flash-high | 44 | pełny test |
| W31 | PK-31a | Asset checker, light engine and 9-slice UI assets | W31-01, W31-04, W31-03 | flash-medium | 44 |
| W31 | PK-31b | New app icon and favicon | W31-02 | flash-medium | 28 | pełny test |
| W32 | PK-32a | Light and time of day in rooms, garden, farm and market views | W32-01, W32-02, W32-03, W32-04 | flash-high | 52 |
| W32 | PK-32b | Apply UI assets in the main menu, pig lighting and contact shadow | W32-05, W32-06 | flash-high | 36 | pełny test |
| W33 | PK-33 | Stop using _x2 files and final verification record | W33-01, W33-02 | flash-medium | 36 | pełny test |

Razem 96 punktów w 33 paczkach plus PK-00 (z 118 punktów od W17; 22 odłożone). Dotychczas każdy punkt był osobną sesją, więc to ok. 3,5x mniej startów. Zużycie tokenów spadnie mniej, bo paczka jest większa od punktu; do zmierzenia na pierwszych paczkach.

## Ryzyka i uwagi
- Porażka kosztuje całą paczkę (`max_attempts = 2`); paczki mają 1-6 punktów i commit po każdym punkcie, a prompt każe dokończyć bieżący punkt i wypisać resztę w PR.
- Filtr `--filter FullyQualifiedName~<Plik>` zakłada, że klasa testowa nazywa się jak plik. Jeśli nie, filtr nic nie znajdzie, a pełny test na końcu etapu to wyłapie.
- `orkiestra.toml` ma `max_parallel = 4`, a `START_ORKIESTRA.md` mówił o 2. Przy limicie Antigravity 2 jest bezpieczniejsze.
- Punkty z odłożonych fal nie są usunięte: leżą w `docs/prompts/items/` i można z nich złożyć paczki później (dopisać do specyfikacji).
