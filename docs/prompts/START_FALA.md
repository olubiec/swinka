# Prompt startowy sesji (zmieniasz tylko FALA)

```
FALA = 31

Wykonaj falę P<FALA> z docs/PLAN_POPRAWEK_UX.md. Oszczędnie i bezpiecznie.

CZYTAJ TYLKO: AGENTS.md (raz), sekcję "Do sprawdzenia po P<FALA>" i wiersz fali P<FALA> z docs/PLAN_POPRAWEK_UX.md, wpisy P<FALA>a i P<FALA>q w waves.yaml. Prompty paczek czytają subagenci, nie Ty. Nie czytaj assets/, *.Designer.cs, animations.xml, phaser.min.js ani docs/WORLD.md, PIG_ROOMS.md, NAMED_PIGS.md.

KROK 0 (raz na całą pracę, tylko jeśli pliku nie ma): node tools/qa/web-smoke.js > docs/opt/log/baseline-smoke.txt 2>&1
To jest stan wyjściowy. Poza paczką q nikt nie uruchamia web-smoke.js.

KROK 1: dla każdej paczki wpisu P<FALA>a (pliki docs/prompts/PK-P<FALA>[a-z]-*.md, bez "q") uruchom jednego subagenta, wszystkie równolegle, na modelu z waves.yaml. Przekaż mu tylko ścieżkę jego promptu. Prompt zawiera Limity i zakres, nie dodawaj nic więcej. Subagent nie używa git.
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

Kolejność sesji naprawczych po nieudanym P3: 31, 32, 33, 34, 35, 36, 37, 38. Potem 4 (adopcja), z wpisami P4a, P4b, P4q: wtedy w kroku 1 uruchom P4a, po jego zakończeniu P4b (P4b czyta log PK-P4a), na końcu P4q.
