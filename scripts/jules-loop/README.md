# Jules Loop: instalacja (5 minut)

Pętla: Haiku wypycha `tasks/W<n>-<id>-<nazwa>.md` na main → Jules buduje → strażnik zgodności z planem → CI zielone = merge, czerwone = poprawka przez Julesa → fala testów (generowana ze zmian) → CI na main → zapis do pliku stanu → następna fala.

## Pliki
- `.github/workflows/jules-loop.yml`
- `scripts/jules-loop/orchestrator.mjs`
- `examples/ci.yml` – wzór CI (filtry ścieżek + anulowanie starych przebiegów); nazwa workflow musi być `CI`
- repo musi mieć `AGENTS.md`

## Ustawienia
1. Secret `JULES_API_KEY` – klucz z jules.google.com/settings.
2. Secret `LOOP_TOKEN` (zalecany) – PAT: contents, pull requests, issues, actions, variables (read/write). Bez niego merge'e z github-actions nie uruchamiają kolejnych workflowów, a przy ochronie gałęzi nie zapiszesz pliku stanu.
3. Aplikacja Jules zainstalowana na repo.
4. Opcjonalne zmienne repo: `LOOP_CI_WORKFLOW` (ci.yml), `LOOP_MAX_CONCURRENT` (12), `LOOP_DAILY_BUDGET` (80), `LOOP_FIX_GRACE_MIN` (10), `LOOP_TEST_WAVE` (on/off), `LOOP_PLAN_GUARD` (on/off), `LOOP_STATE_FILE` (docs/PROJECT_STATE.md), `LOOP_SCOPE_ALLOW` (lockfile'e dozwolone poza zakresem).
5. Branch protection na main: wymagaj zielonego CI.

## Format zadania
```
# Tytuł
Cel: ...
Zmieniaj: src/a.js, tests/a.test.js
Wymagane: tests/a.test.js
Weryfikacja: npm test
```
- `Zmieniaj:` – jedyne pliki, które PR może ruszyć (plus `Wymagane`). Nakładanie się zakresów w jednej fali = fala odrzucona bez zużycia sesji.
- `Wymagane:` – pliki, które muszą się pojawić w PR-ze (np. test, dokument).

## Strażnik zgodności (przed każdym merge'em, bez tokenów Claude)
1. Pliki spoza `Zmieniaj`/`Wymagane` → Jules dostaje prośbę o cofnięcie.
2. Brak plików z `Wymagane` → prośba o dodanie.
3. Usunięte asercje (`expect`/`assert`…) bez zastąpienia → prośba o przywrócenie (też w falach testów i napraw).
Po 2 prośbach bez skutku: etykieta `needs-human` + powiadomienie.

## Plik stanu projektu
`docs/PROJECT_STATE.md` – wpis dla każdego scalonego PR (co, efekt: +/− linii, pliki, CI, liczba poprawek) i dla zdarzeń pętli. Jeden commit `[skip ci]` na falę (oraz gdy pętla czeka na człowieka), żeby nie mnożyć commitów i przebiegów CI. Claude czyta ten plik na początku sesji zamiast pytać o stan.

## Powiadomienia (tylko gdy ktoś musi działać)
Pętla pinguje (`@wzmianka` w issue pętli) wyłącznie, gdy:
- zadanie wymaga człowieka (`needs-human`) albo CI na main jest czerwone po naprawach,
- fala została odrzucona przed startem,
- skończyły się fale i trzeba zaplanować następną (z podsumowaniem poprzedniej),
- nie da się zapisać pliku stanu.
Reszta (starty, merge'e, testy, pauzy limitów, poprawki) trafia tylko do pliku stanu i logu.

## Sterowanie
Actions → Jules Loop → Run workflow: `tick`, `resume`, `skip <ID>`, `skip-wave`, dry-run. Zdjęcie etykiety `needs-human` z PR wznawia zadanie.
