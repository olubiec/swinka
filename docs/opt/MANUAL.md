# Tryb ręczny: subagenci Antigravity bez orkiestratora

Zmiana względem starego promptu: nie ma już `tasks/W*-*.md` ani zadań W17-01.., są **pakiety** `PK-*` w `docs/prompts/`. Jeden pakiet = jeden subagent. Fale (W17, W18a, W18b, ... W33, plus PK-00 przed W17) idą po kolei, pakiety w fali równolegle. Zwykła kolejność: `grep '^- id' waves.yaml`.

## Prompt przed falą (FALA = np. W24, albo PK-00)

```
FALA=W24

Wykonaj falę $FALA repo swinka. Bez orkiestratora, bez pętli.

Czytaj tylko:
1. AGENTS.md.
2. Wynik: bash tools/release-wave.sh $FALA (lista pakietów: PROMPT, FILES, VERIFY).
Nie czytaj docs/*.md ani nie przeglądaj repo.

Wykonanie:
- Jeden pakiet = jeden subagent, wszystkie pakiety fali naraz. Subagent czyta tylko swój plik PROMPT
  i pliki wymienione w FILES. Zmienia tylko pliki z FILES (w tym docs/opt/log/<id>.md). Nie uruchamia gita,
  nie zmienia asercji istniejących testów, nie dodaje zależności. Zadania w pakiecie robi po kolei.
- Weryfikacja: komenda VERIFY pakietu (filtrowane testy). Pełny test + build tylko dla pakietu ze
  "stage gate: YES".
- Bez planów do akceptacji, bez refaktoru poza zadaniem.

Na koniec (agent główny):
- Sprawdź, że zmienione pliki mieszczą się w FILES pakietów. Napraw tylko to, co padło.
- git commit "$FALA: <ID pakietów>" (jeden commit, tylko agent główny).
- Raport do 10 linii: ID pakietów, ok/fail, co padło i dlaczego, przeniesienia zadań nie ma.
  Dla W22, W26 i W30 (ostatnia podfala) dopisz: "Wymagany test ręczny na Windowsie (TESTY_RECZNE.md)".
```

Przed pierwszą falą scal gałąź `claude/opt-packages` do `main` i uruchom PK-00.
W11-W16 to stare zadania (nie pakiety): skrypt wypisuje je tak samo, jeden subagent na zadanie, wszystkie naraz; pełny test + build na końcu fali.
