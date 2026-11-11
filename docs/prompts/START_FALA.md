# Prompt startowy sesji (zmieniasz tylko FALA)

```
FALA = 31

Wykonaj falę P<FALA> z docs/PLAN_POPRAWEK_UX.md. Oszczędnie i bezpiecznie.

CZYTAJ TYLKO: AGENTS.md (raz), sekcję "Do sprawdzenia po P<FALA>" i wiersz fali P<FALA> z docs/PLAN_POPRAWEK_UX.md, wpisy P<FALA>a i P<FALA>q w waves.yaml. Prompty paczek czytają subagenci, nie Ty. Nie czytaj assets/, *.Designer.cs, animations.xml, phaser.min.js ani docs/WORLD.md, PIG_ROOMS.md, NAMED_PIGS.md.

KROK 0 (raz na całą pracę, tylko jeśli pliku nie ma): node tools/qa/web-smoke.js > docs/opt/log/baseline-smoke.txt 2>&1
To jest stan wyjściowy. Poza paczką q nikt nie uruchamia web-smoke.js.

KROK 1: wpisy P<FALA>a, P<FALA>b, P<FALA>c... (kolejne etapy, bez "q") wykonuj PO KOLEI; w jednym wpisie dla każdej paczki uruchom jednego subagenta, wszystkie równolegle, na modelu z waves.yaml. Etap n+1 startuje dopiero, gdy etap n nie ma BLOCKED. Prompty: docs/prompts/PK-<id paczki>-*.md. Przekaż mu tylko ścieżkę jego promptu. Prompt zawiera Limity i zakres, nie dodawaj nic więcej. Subagent nie używa git.
Paczka BLOCKED: nie ponawiaj, nie ruszaj jej. Reszta idzie dalej.

KROK 2: gdy żadna paczka nie jest BLOCKED, uruchom PK-P<FALA>q (jeden subagent, docs/prompts/PK-P<FALA>q-*.md). Nie naprawia kodu, każdą komendę raz. Jeśli była BLOCKED, pomiń krok 2 i 3.

KROK 3 (tylko Ty, lokalny commit): tylko gdy brak BLOCKED i brak NOWYCH błędów testów (stare z baseline nie blokują).
  git status --short. Zmiany mają być tylko w plikach z pól "Zmieniaj" tej fali, docs/opt/log/, docs/qa/ i tools/qa/. Obce (save.json, bin/, obj/, tmp) pomiń i zgłoś.
  git add <konkretne pliki> (nigdy -A ani .)
  git commit -m "P<FALA>: <jedno zdanie po angielsku>"
ZAKAZ: git push, merge, rebase, reset --hard, zmiana gałęzi, PR.

RAPORT (po polsku, maks. 12 linii):
- Paczki: nazwa, status (OK / OK-Z-UWAGĄ / BLOCKED), jedno zdanie.
- Testy: PASS/FAIL; osobno nowe błędy i stare z baseline.
- Git: lokalny hash commita albo "bez commita: powód".
- Sprawdź w grze: kroki z sekcji "Do sprawdzenia po P<FALA>" (3-5 punktów).
- Odpisz mi: "OK" albo "krok X: opis" dla każdego, co nie działa.
```

Kolejność sesji: 31-37 (zrobione), potem 41, 42, 38, 39, 40, 43, 44, na końcu 4 (adopcja, wpisy P4a, P4b, P4q po kolei).

Od 11.11 (przebudowa, `docs/PLAN_FAL_PRZEBUDOWA_11_11.md`): kolejność sesji to R1, 4, 44, 46 (wpisy P46a, P46b, P46c, P46t, P46q), potem 43. Wpis `R1` i `P46t`: paczki badawcze lub testowe, wszystkie równolegle, bez kodu produkcyjnego (R tylko dokument w `docs/opt/foundations/`, t tylko nowe testy). Po R1 nie uruchamiaj dalej: czat planujący najpierw stosuje „Prompt fixes” z `R46.md`, `R43.md`, `R47.md`. Raport po R1: tylko lista decyzji z domyślnymi odpowiedziami (maks. 12 linii).
