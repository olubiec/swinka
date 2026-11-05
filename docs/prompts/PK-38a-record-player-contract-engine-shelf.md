# PK-38a: Odtwarzacz płyt, Fala A1-A3: kontrakt, silnik i półka (package, 3 items)
Zmieniaj: web/home/features/music/contract.js, web/home/features/music/engine.js, web/home/features/music/shelf.js, web/home/features/music/shelf.css, web/home/features/music/prices.js, tests/Cuy.Core.Tests/MusicRecordMigrationTests.cs, src/Cuy.Core/Records/RecordOwnership.cs, docs/opt/log/PK-38a.md
Wymagane: web/home/features/music/contract.js
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter FullyQualifiedName~MusicRecordMigrationTests && node --check web/home/features/music/engine.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: src/Cuy.Core/Audio/MusicPolicy.cs, web/home/music-director.js, web/home/app.js (podpięcie półki do menu to późniejszy pakiet), assets/*, waves.yaml, AGENTS.md
Goal: Płyty jako funkcja gry: kontrakt danych i zapisu, silnik odtwarzania płyt w Domku i półka (album). Fala A z `docs/PLAN_FALE_WDROZENIE.md`, kroki A1-A3. Przeczytaj tylko sekcję „Fala A” tego pliku.
Depends on: PK-35 (pola zapisu), PK-34b (silnik). Dane płyt (`records/manifest.json`, ikony) wg fal audio i grafiki; kod działa bez nich (pusta półka + ostrzeżenie).
Steps: work the items below in order. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes.
### Item 1: A1 Kontrakt i zapis.
- `contract.js`: pola zapisu płyt i odtwarzaczy (z PK-35), walidacja (per-feature, zgodnie z `docs/contracts/README.md`), migracja: brak pól = pusty ekwipunek.
- `RecordOwnership.cs` (Core): posiadanie i stan (`mint` domyślnie), test migracji w `MusicRecordMigrationTests.cs`.
### Item 2: A2 Silnik płyt.
- `engine.js`: odtwarzanie ogg z `../../assets/music/`, kolejka, pętla, głośność, wyciszenie z ustawień. Obejścia wg „Warianty” w sekcji Fala A.
### Item 3: A3 Półka i album.
- `shelf.js` i `shelf.css`: siatka płyt z `records/manifest.json`, `shelf_plank`, `slot/slot_on`, stany: posiadana / zablokowana / odtwarzana, ikony z atlasu. Ceny w `prices.js` (z D3 w pliku danych po stronie web, nie w `assets/data`).
Prohibited: no new dependencies; no changes to base economy; no edits to app.js.
Log: write `docs/opt/log/PK-38a.md` (max 10 lines: decisions and why, differences from the plan, anything left undone). No pull request text.
