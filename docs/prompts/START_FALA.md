# Prompt startowy sesji (zmieniasz tylko numer fali)

> Fala 2 (stan 18.11.2026, bez orkiestry): zamiast tego pliku użyj `docs/FALA_2_START.md` (prompt kroku F2-n, lista co zostało, podział F2-2 na partie). Poniższy prompt zostaje jako ogólny wzorzec.

Fale są numerowane od 1 (R1 jest zrobione i pominięte; fala 1 zrobiona). Fala to zbiór zadań z `waves.yaml`; wpisy fali mają prefiks `F<numer>-`. Wpisy jednej fali idą po kolei, a paczki w jednym wpisie równolegle.

```
FALA = 1

Wykonaj falę FALA z waves.yaml: wszystkie wpisy o id zaczynającym się od "F<FALA>-" (np. FALA = 1 to F1-1, F1-2, ...). Plan: docs/PLAN_FAL_PRZEBUDOWA_11_11.md (sekcja "Fale 1-4") i docs/PLAN_POPRAWEK_UX.md. Oszczędnie i bezpiecznie.

CZYTAJ TYLKO: AGENTS.md (raz), wpisy fali z waves.yaml i sekcje "Do sprawdzenia po <P...>" z docs/PLAN_POPRAWEK_UX.md dla paczek tej fali. Prompty paczek czytają subagenci, nie Ty. Nie czytaj assets/, *.Designer.cs, animations.xml, phaser.min.js ani docs/WORLD.md, PIG_ROOMS.md, NAMED_PIGS.md.

KROK 0 (raz, tylko jeśli pliku nie ma): node tools/qa/web-smoke.js > docs/opt/log/baseline-smoke.txt 2>&1
To jest stan wyjściowy. Poza paczkami q nikt nie uruchamia web-smoke.js.

KROK 1: wpisy fali wykonuj PO KOLEI (F<FALA>-1, F<FALA>-2, ...). W jednym wpisie dla każdej paczki uruchom jednego subagenta, wszystkie równolegle, na modelu z waves.yaml. Wpis n+1 startuje dopiero, gdy wpis n nie ma BLOCKED. Prompt paczki: docs/prompts/<id paczki>-*.md. Przekaż subagentowi tylko ścieżkę jego promptu, nic więcej. Subagent nie używa git.
- Paczki R (badawcze): tylko odczyt, wynik docs/opt/foundations/<R>.md. Sprawdź: node tools/qa/foundation-check.js <plik> <min sekcji z promptu>.
- Paczki t (testowe): tylko nowe testy; wady kodu jako Skip = "DEFECT" i w logu, kodu produkcyjnego nie poprawiają.
- Paczka BLOCKED: nie ponawiaj, nie ruszaj jej. Reszta idzie dalej.
- Paczka, która czeka na plik (np. foundations/R46.md albo dostawę grafika) i go nie znajduje: kończy BLOCKED.

KROK 2: wpisy q (bramki, arkusze) to ostatnie wpisy fali; uruchamiaj je tylko gdy nic nie jest BLOCKED. Nie naprawiają kodu, każda komenda raz. Gdy coś było BLOCKED, pomiń kroki 2 i 3.

KROK 3 (tylko Ty, lokalny commit): tylko gdy brak BLOCKED i brak NOWYCH błędów testów (stare z baseline nie blokują; testy Skip="DEFECT" zgłoś osobno).
  git status --short. Zmiany tylko w plikach z pól "Zmieniaj" tej fali, docs/opt/log/, docs/opt/foundations/, docs/qa/, tools/qa/. Obce (save.json, bin/, obj/, tmp) pomiń i zgłoś.
  git add <konkretne pliki> (nigdy -A ani .)
  git commit -m "Fala <FALA>: <jedno zdanie po angielsku>"
ZAKAZ: git push, merge, rebase, reset --hard, zmiana gałęzi, PR.

WYJĄTEK dla paczek R (badania) w fali 1: po nich nie pisz promptów kolejnych paczek. Raport = decyzje z domyślnymi odpowiedziami i listy "Prompt fixes" z R5.md, R6.md, R7.md, R8.md.

RAPORT (po polsku, maks. 12 linii):
- Paczki: nazwa, status (OK / OK-Z-UWAGĄ / BLOCKED), jedno zdanie.
- Testy: PASS/FAIL; osobno nowe błędy, stare z baseline i DEFECT.
- Git: lokalny hash commita albo "bez commita: powód".
- Sprawdź w grze: 3-5 punktów (z arkusza q w docs/UX_WAVE_CHECKS.md).
- Odpisz mi: "OK" albo "krok X: opis" dla każdego, co nie działa.
```

## Fale (stan 17.11.2026; plan: `docs/PLAN_FAL_PRZEBUDOWA_17_11.md`)

| Fala | Wpisy w waves.yaml | Zadania (równolegle w obrębie wpisu) | Warunek startu |
|---|---|---|---|
| **1 (zrobiona)** | F1-1 .. F1-6 | P44, P4, P8, badania R5-R8 | brak |
| **2** | F2-1 .. F2-6 | F2-1: 12 badań (PK-R24..R35); F2-2: 18 paczek implementujących (Core, dane, grafika, czyste moduły, canvas przejście 1); F2-3: 3 analizy sklejenia (PK-RI1..RI3); F2-4: 6 paczek sklejających (canvas przejście 2, places/feature.js, edit-panel.js, app/index.html, C# Rooms, Core lampy); F2-5: 13 agentów testowych; F2-6: bramki PK-Q1, PK-Q2 | fala 1 zakończona |

Fale 3 i 4 z planu 11.11 nie istnieją: grafika D2 i D4 jest już w repo, a P43, P47b/d, P5-P7 weszły do fali 2. Paczki RI (F2-3) tak jak R (F2-1) są tylko do odczytu: sprawdź plik wynikowy `node tools/qa/foundation-check.js docs/opt/foundations/<R>.md <min sekcji z promptu>`. Paczki testowe (F2-5) zgłaszają wady jako `DEFECT`, kodu nie poprawiają; w raporcie podaj liczbę DEFECT na paczkę. Przy fali 2 raport może mieć do 20 linii.

## Grafika

| Dostawa | Stan |
|---|---|
| D2 obiekty, D3 pasek miejsc, D4 ognisko | **odebrane** (w repo); czego jeszcze brakuje w katalogu/atlasie, wskaże PK-R35, a wpisy dopisze PK-P25c |
| D1 tła | robimy sami (PK-P47a) |

Plan i tabela fal: `docs/PLAN_FAL_PRZEBUDOWA_17_11.md`.
