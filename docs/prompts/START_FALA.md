# Prompt startowy sesji (zmieniasz tylko numer fali)

Fale są numerowane od 1 (R1 jest zrobione i pominięte). Fala to zbiór zadań z `waves.yaml`; wpisy fali mają prefiks `F<numer>-`. Wpisy jednej fali idą po kolei, a paczki w jednym wpisie równolegle.

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

## Fale (stan 11.11.2026)

| Fala | Wpisy w waves.yaml | Zadania (równolegle w obrębie wpisu) | Warunek startu |
|---|---|---|---|
| **1** | F1-1, F1-2, F1-3, F1-4 | F1-1: P44a, P4a, R5, R6, R7, R8; F1-2: P44b, P4b; F1-3: P4q; F1-4: P44q | brak. Do dopisania: P8 (po R8) |
| **2** | F2-1 .. F2-5 | P46a, P46b, P46c, P46t1+t2, P46q1+q2 | fala 1 zakończona; plik `foundations/R46.md` jest. Do dopisania: P5, P6, P47a, P47c (po R5, R6) |
| **3** | F3-1 .. F3-4 | P43a+b, P43c+d+e, P43f, P43q | fala 2 zakończona (P46c). Do dopisania: P47b (po D2), P7 bez latarni (po R7) |
| **4** | (jeszcze brak) | P47d (ognisko i światło), P7 (latarnie i noc), bramka końcowa | fala 3 zakończona i dostawa D4 odebrana |

## Grafik

| Dostawa | Zamów | Odbierz przed | Zlecenie |
|---|---|---|---|
| D3 pasek miejsc | zrobione | odbiór w P47c (fala 2) | `GRAFIK_D3_pasek_miejsc.md` |
| **D2** obiekty | **przed falą 1** | przed falą 3 | `GRAFIK_D2_obiekty.md` |
| D4 ognisko i światło | w fali 2, po odbiorze D2 | przed falą 4 | do napisania |
| D1 tła | robimy sami (P47a, fala 2) | n/d | n/d |

Po fali 1 czat planujący stosuje "Prompt fixes" z `R5.md`..`R8.md` i dopisuje brakujące paczki do fal 2-4. Plan i tabela fal: `docs/PLAN_FAL_PRZEBUDOWA_11_11.md`.
