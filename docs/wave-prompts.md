# Prompty do fal (Jules / Claude)

Zasada: najpierw PR z plikami zadań na `main`, potem `tools/jules-wave.sh Wn` (max 15 naraz, limit Pro 100 zadań / 24 h).
Backlog (`tools/jules-backlog.sh`): wieczorem, 15 linii z `tasks/BACKLOG.md`; pozycje dotykające `ci.yml` czekają na scalenie W1-03.

## A2-check (Claude, przed każdą falą, po integracji poprzedniej)
```
Projekt Swinka, repo olubiec/swinka, fala Wn. Sprawdź na main, czy pliki tasks/Wn-*.md nadal pasują do kodu:
sygnatury, nazwy plików, klucze stanu, numery linii, zależności od scalonych zadań. Popraw pliki zadań
(angielski, szablon B), nie ruszaj kodu. Wypisz zmiany w 10 linii. Sprawdź też kolizje: dwa zadania tej fali
nie mogą zmieniać tego samego pliku (wyjątek: osobne, nienakładające się hunki w Pet.cs, opisane w zadaniach).
```

## Integracja W1 (Jules, sesja bez pliku)
```
Integracja W1. 1) git pull main. 2) dotnet test tests/Cuy.Core.Tests -c Release, dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true, node tools/qa/web-smoke.js, node tools/qa/layout.selftest.js. 3) Sprawdź: BondUnlocks.Current i HayConfig.Current ładują się z assets/data (test na prawdziwych plikach); CareData.Current ma 9 zadań; features/index.json == foldery features/; po usunięciu hello nic nie odwołuje się do PingFeature. 4) Napraw błędy minimalnie, nie zmieniaj asercji. 5) Zaktualizuj status w docs/PLAN.md. PR: lista sprawdzeń z wynikami.
```

## Integracja W2 (Jules)
```
Integracja W2. Jak W1, plus: 1) tools/qa/web-smoke.js jest ścisłe (błędy konsoli, 404, folder=index, layout) i przechodzi; 2) CalendarFeature wczytuje CareData (log "[Calendar] loaded 9 care tasks" w SelfTest lub teście); 3) przy domyślnym new Balance() wszystkie stare testy mają stare liczby, a GameSession.Open włącza HayRackActive; 4) InteractionManager nie ma literałów poziomów więzi; 5) golden_bowl przyznawany raz; 6) docs/contracts.md zawiera klucze diary, albumDates, bondNext, hayRack, settings.*. Dodaj do PR tabelę problemów znalezionych przez smoke (to wejście dla W3-12). Zaktualizuj status.
```
Po integracji W2: **test na Windowsie** (`powershell -ExecutionPolicy Bypass -File tools/build.ps1`, kalendarz, karta przypomnienia, zabawki) i wynik do Claude.

## Integracja W3 (Jules)
```
Integracja W3. Jak W2, plus: 1) Cuy.exe --selftest ma checki behaviors i spritesheet (na Linuksie: build przechodzi); 2) TryWriteDiary: jeden wpis dziennie, tylko przy aktywności, domyślny Balance nic nie zapisuje; 3) features/index.json zawiera diary, smoke otwiera każdą funkcję, album, grę, ustawienia; 4) games.json ładuje minigry, brak console.error; 5) tools/qa/maze-test.js w ci.yml; 6) zadania Pet.cs (W3-03, W3-09) nie zostawiły konfliktów i formatowania. Zaktualizuj status i wypisz, co W4 ma wiedzieć (A2).
```

## Po W3
Claude pisze pliki W4 (A2) na podstawie stanu repo: osiągnięcia (Core), urodziny, pasek więzi i wskaźnik siana w UI, minigry Veggie Memory / Hay Maze, ukrywanie przy pełnym ekranie, poprawki SoundManager. Odświeżenie ARCHITECTURE.md po W4.
