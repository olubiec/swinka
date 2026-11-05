# PK-35: Pola muzyki w zapisie, ustawienia i kontrola SelfTest (package, 2 items)
Zmieniaj: src/Cuy.Core/Save/MusicSaveFields.cs, tests/Cuy.Core.Tests/MusicSaveFieldsTests.cs, web/home/features/settings/feature.js, src/Cuy/dotNet/SelfTest.cs, docs/opt/log/PK-35.md
Wymagane: web/home/features/settings/feature.js
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter FullyQualifiedName~MusicSaveFieldsTests && node --check web/home/features/settings/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Nie ruszaj: src/Cuy.Core/Audio/MusicPolicy.cs, src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/HomeWindow.cs, web/home/app.js, istniejących asercji w SelfTest.cs, waves.yaml, AGENTS.md
Goal: Muzyka ma pola w zapisie i przełączniki w Ustawieniach. Wszystkie pola są opcjonalne z wartościami domyślnymi, więc stare zapisy działają bez migracji.
Depends on: PK-34a (`MusicSettings`).
Steps: work the items below in order. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes.
### Item 1: Pola zapisu.
- `MusicSaveFields.cs`: `settings.musicOn` (true), `settings.musicVolume` (0,6), `settings.musicAtNight` (false), `records.owned[]` (`{id, condition}`, duplikaty dozwolone, brak `condition` = `mint`), `players.owned[]` (id), `players.placed[]` (`{id, place, x, y}`), `records.lastPlayed` (`{recordId, side}`, może być `null`). Mapowanie na `MusicSettings` przez funkcję, nie przez zmianę istniejącej klasy zapisu poza dodaniem pól.
- Test: stary zapis bez pól daje wartości domyślne; zapis z polami wraca bez zmian; nieznany `condition` traktowany jak `mint` z ostrzeżeniem w logu.
### Item 2: Ustawienia i kontrola SelfTest.
- `features/settings/feature.js` (linie 12-14 wywołują `CuyMusic.setVolume`/`setEnabled`): dodać przełącznik „Muzyka", suwak „Głośność muzyki" (osobny od „Głośność dźwięków") i przełącznik „Muzyka w nocy". Wartości idą przez istniejący most (wiadomość zapisu ustawień), nowe typy wiadomości nie są potrzebne jeśli most już je przyjmuje; jeśli nie, zapisz w logu.
- `SelfTest.cs`: dopisać NOWY test, który sprawdza, że pliki z `assets/music/` podane w `music.json` istnieją (gdy `music.json` brak, test zwraca „pominięto", nie błąd). Istniejących testów nie zmieniać.
Prohibited: no new dependencies; no changes to save format of other fields; no UI for playback (to PK-36/37).
Log: write `docs/opt/log/PK-35.md` (max 10 lines: decisions and why, differences from the plan, anything left undone). No pull request text.
