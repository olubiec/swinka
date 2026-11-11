# Prompt startowy sesji (zmieniasz tylko FALA i WPISY)

```
FALA = P46
WPISY = P46a, P46b, P46c, P46t, P46q

Wykonaj falę z docs/PLAN_FAL_PRZEBUDOWA_11_11.md (sekcje 3 i 4) i docs/PLAN_POPRAWEK_UX.md. Oszczędnie i bezpiecznie.

CZYTAJ TYLKO: AGENTS.md (raz), sekcję "Do sprawdzenia po <FALA>" z docs/PLAN_POPRAWEK_UX.md oraz wpisy z listy WPISY w waves.yaml. Prompty paczek czytają subagenci, nie Ty. Nie czytaj assets/, *.Designer.cs, animations.xml, phaser.min.js ani docs/WORLD.md, PIG_ROOMS.md, NAMED_PIGS.md.

KROK 0 (raz, tylko jeśli pliku nie ma): node tools/qa/web-smoke.js > docs/opt/log/baseline-smoke.txt 2>&1
To jest stan wyjściowy. Poza paczkami q nikt nie uruchamia web-smoke.js.

KROK 1: wpisy z listy WPISY wykonuj PO KOLEI, w kolejności listy. W jednym wpisie dla każdej paczki uruchom jednego subagenta, wszystkie równolegle, na modelu z waves.yaml. Wpis n+1 startuje dopiero, gdy wpis n nie ma BLOCKED. Prompt paczki: docs/prompts/<id paczki>-*.md (paczki z wpisu podaje waves.yaml). Przekaż subagentowi tylko ścieżkę jego promptu, nic więcej. Subagent nie używa git.
- Paczki R (badawcze): tylko odczyt, wynik to jeden plik docs/opt/foundations/<R>.md. Sprawdź go: node tools/qa/foundation-check.js <plik> <min sekcji z promptu>.
- Paczki t (testowe): tylko nowe testy; wady kodu zapisują jako Skip = "DEFECT" i w logu, kodu produkcyjnego nie poprawiają.
- Paczka BLOCKED: nie ponawiaj, nie ruszaj jej. Reszta idzie dalej.

KROK 2: wpisy q (bramki, arkusze) uruchamiaj jako ostatnie, tylko gdy nic nie jest BLOCKED. Nie naprawiają kodu, każda komenda raz. Gdy coś było BLOCKED, pomiń kroki 2 i 3.

KROK 3 (tylko Ty, lokalny commit): tylko gdy brak BLOCKED i brak NOWYCH błędów testów (stare z baseline nie blokują; testy Skip="DEFECT" zgłoś osobno).
  git status --short. Zmiany tylko w plikach z pól "Zmieniaj" tej fali, docs/opt/log/, docs/opt/foundations/, docs/qa/, tools/qa/. Obce (save.json, bin/, obj/, tmp) pomiń i zgłoś.
  git add <konkretne pliki> (nigdy -A ani .)
  git commit -m "<FALA>: <jedno zdanie po angielsku>"
ZAKAZ: git push, merge, rebase, reset --hard, zmiana gałęzi, PR.

WYJĄTEK dla fali R1: po niej NIE uruchamiaj kolejnych fal. Raport = tylko lista decyzji z domyślnymi odpowiedziami i listy "Prompt fixes" z R46.md, R43.md, R47.md.

RAPORT (po polsku, maks. 12 linii):
- Paczki: nazwa, status (OK / OK-Z-UWAGĄ / BLOCKED), jedno zdanie.
- Testy: PASS/FAIL; osobno nowe błędy, stare z baseline i DEFECT.
- Git: lokalny hash commita albo "bez commita: powód".
- Sprawdź w grze: 3-5 punktów (dla P46 z arkusza q2 w docs/UX_WAVE_CHECKS.md).
- Odpisz mi: "OK" albo "krok X: opis" dla każdego, co nie działa.
```

| Sesja | FALA | WPISY |
| --- | --- | --- |
| 1 | R1 | R1 |
| 2 (równolegle z 1) | P4 | P4a, P4b, P4q |
| 3 | P44 | P44a, P44b, P44q |
| 4 | P46 | P46a, P46b, P46c, P46t, P46q |
| 5 (po poprawkach P43 z R43) | P43 | P43a, P43b, P43c, P43q |

Po R1 czat planujący stosuje "Prompt fixes" z `R46.md`, `R43.md`, `R47.md`. Plan i tabela fal: `docs/PLAN_FAL_PRZEBUDOWA_11_11.md`. Zamówienia dla grafika: `docs/prompts/GRAFIK_D3_pasek_miejsc.md` (potem D2, D4, D1 po R47).
