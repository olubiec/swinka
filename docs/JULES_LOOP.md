# Jules Loop: jedyna droga zadań do Julesa

Każde zadanie dla Julesa idzie przez pętlę: `.github/workflows/jules-loop.yml` + `scripts/jules-loop/orchestrator.mjs` (instalacja i sterowanie: `scripts/jules-loop/README.md`).
**Nie startuj sesji ręcznie.** `jules remote new`, `tools/jules-wave.sh`, `tools/jules-backlog.sh` i `jules/queue/` omijają strażnika zakresu, limit fali i CI. Te skrypty zostają w repo tylko jako historia.

## Kto co robi

| Kto | Robi |
| --- | --- |
| Claude | Koncept, plan fal, pisze pliki `tasks/W<n>-<nn>-<nazwa>.md` w formacie niżej, pushuje na `main`. Po pushu nic więcej: pętla startuje sama. |
| Pętla (bez tokenów Claude) | Startuje falę, odpala sesje Julesa, pilnuje zgodności z planem, poprawia czerwone CI, scala zielone PR-y, uruchamia fale testów i integrację, zapisuje `docs/PROJECT_STATE.md`. |
| Ty | Sekrety i zmienne (raz), odpowiedź tylko przy `needs-human`, decyzje o treści fal. |

Uwaga: zielony PR z zgodnym zakresem jest scalany automatycznie (squash). Ręczne review nie jest bramką; bramką jest CI i strażnik zgodności. Powiadomienia przychodzą tylko wtedy, gdy ktoś musi działać.

## Format pliku zadania

Nazwa: `tasks/W<n>-<nn>-<nazwa>.md`. Id zadania to `W<n>-<nn>` i trafia do tytułu PR.

```
# W2-03: Pisarz pamiętnika (czysty)
Cel: gracz dostaje jeden wpis pamiętnika, gdy dzień się kończy (jedno zdanie o zachowaniu).
Zależy od: W1-05 (scalone)
Zmieniaj: src/Cuy.Core/Diary/DiaryWriter.cs, src/Cuy.Core/Diary/DayStats.cs, tests/Cuy.Core.Tests/DiaryWriterTests.cs
Wymagane: tests/Cuy.Core.Tests/DiaryWriterTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Nie ruszaj: src/Cuy.Core/Pet.cs, docs/PLAN.md, tasks/*
Kroki:
1. ...
Zakazy: zmiana istniejących asercji, nowe zależności.
```

Zasady, które sprawdza kod pętli:
- **`Zmieniaj:` jest obowiązkowe.** Bez tej linii cała fala jest odrzucona przed startem i żadna sesja nie zużyta.
- **`Zmieniaj:` i `Wymagane:` to same ścieżki po przecinku.** Bez słów typu „new”, bez nawiasów z opisem. Nowy plik też idzie do `Zmieniaj:`. Katalog z `/` na końcu albo `*` oznacza cały zakres.
- **Zakresy `Zmieniaj:` w jednej fali nie mogą się nakładać.** Nakładanie = fala odrzucona.
- **`Wymagane:`** to pliki, które muszą pojawić się w PR (np. test). Brak = prośba o dodanie.
- **Zależność od innej fali** idzie do następnej fali. Zadanie nie zależy od zadania z tej samej fali.
- Wspólne pliki (typy, config, rejestry) idą do wcześniejszej fali niż ich użytkownicy.
- Nikt nie odpowiada na pytania Julesa. Pętla odpisuje mu automatycznie: „przyjmij najrozsądniejsze założenie i opisz je w PR”.
- Rozmiar: 1 zachowanie, 1–4 pliki, 5–15 zadań na falę (z `docs/PLAN.md`).

## Cykl fali (dzieje się sam)

1. **Push** `tasks/W<n>-*.md` na `main` → start fali. Sesje na zadania, max `LOOP_MAX_CONCURRENT` (domyślnie 12) naraz, dzienny budżet `LOOP_DAILY_BUDGET` (domyślnie 80).
2. **Każdy PR:** czeka na CI. Czerwone → po 10 min prośba o poprawkę (max 2). Niezgodność z zadaniem (pliki spoza `Zmieniaj:`, brak `Wymagane:`, usunięte asercje) → prośba o poprawkę (max 2). Zielone i zgodne → squash merge.
3. **Fala testów:** po scaleniu całej fali pętla generuje zadania `T<n>-01…` z listy zmienionych plików (testy do nowego kodu, bez zmian asercji).
4. **Integracja:** CI na `main` musi być zielone. Czerwone → zadanie `I<n>-k` z logiem błędu (max 2).
5. **Zapis:** `docs/PROJECT_STATE.md` dostaje jeden commit `[skip ci]` na falę. Następna fala czeka na pliki w `tasks/`.

## Sterowanie

Actions → Jules Loop → Run workflow: `tick`, `resume`, `skip <ID>`, `skip-wave`, `dry_run`. Zdjęcie etykiety `needs-human` z PR wznawia zadanie.

## Zasady dla Claude

- Stan projektu czytasz z `docs/PROJECT_STATE.md`. Nie pytaj o stan, jeśli plik jest aktualny.
- Nową falę piszesz w formacie powyżej i sprawdzasz przed pushem: każdy plik ma `Zmieniaj:`, zakresy się nie nakładają, zależności są w wcześniejszych falach.
- Pliki w `tasks/plan/` są nieaktywne i w starym formacie (`Change:`). Przed przeniesieniem do `tasks/` przepisz je na format pętli.
- `tasks/BACKLOG.md` to surowa lista pomysłów. Wybrane linie przepisujesz na pliki fali; nie uruchamiasz ich skryptem.
- Nie edytujesz `.github/workflows/jules-loop.yml` ani `scripts/jules-loop/` w zadaniach dla Julesa. Pętla odrzuca PR-y, które to ruszają.
