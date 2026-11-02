# Użycie orkiestry

## Wymagania i Fala 0
Wymagane: Python 3.11+, `git`, `gh` (zalogowany: `gh auth login`), Antigravity CLI `agy` zalogowany raz interaktywnie.
Instalacja: `pip install -e .` (uruchamianie także jako `python -m orkiestra`).

Sprawdź przed pierwszym przebiegiem (Fala 0):
```bash
git --version
gh auth status
agy -p "Reply with exactly: OK" --output-format json   # musi wypisać JSON
agy models                                              # lista modeli
orkiestra run --plan examples/smoke.yaml                # test dymny
```

## Konfiguracja
Plik `orkiestra.toml` (tworzony przez `orkiestra init`).

| Klucz | Znaczenie |
|---|---|
| `[project] base_branch` | gałąź bazowa, z której powstają worktree (zwykle `main`) |
| `[project] remote` | nazwa remote (zwykle `origin`) |
| `[project] test_command` | domyślna komenda testów, gdy zadanie nie ma własnej |
| `[project] merge_mode` | `github` (PR + CI + merge) lub `local` |
| `[agent] cmd` | komenda agenta (`agy`) |
| `[agent] model` | model z `agy models` |
| `[agent] timeout_minutes` | limit czasu jednego uruchomienia agenta |
| `[agent] skip_permissions` | `true` dodaje `--dangerously-skip-permissions` |
| `[agent] add_dir` | `false`, jeśli `agy --help` nie ma `--add-dir` |
| `[agent] output_format` | `json` lub `text` |
| `[agent] use_pty` | `true` tylko dla starego `agy`, który nic nie wypisuje w skryptach |
| `[agent] extra_args` | dodatkowe argumenty dla `agy` |
| `[run] max_parallel` | ile zadań równolegle (trzymaj ≤ 3) |
| `[run] max_attempts` | liczba prób na zadanie (domyślnie 2) |
| `[run] quota_wait_minutes` | czas oczekiwania na limit, gdy komunikat nie podaje czasu resetu |
| `[run] ci_timeout_minutes` | jak długo czekać na zielone CI |
| `[run] worktree_dir` | katalog worktree |
| `[run] state_dir` | katalog stanu (`.orkiestra`) |
| `[run] stop_on_failure` | zatrzymaj przebieg po pierwszym zadaniu wymagającym człowieka |

Wartości domyślne ustawia `orkiestra init` w wygenerowanym `orkiestra.toml`; sprawdź je tam.

Bezpieczeństwo: `skip_permissions = true` jest akceptowalne, bo każdy agent pracuje w izolowanym worktree,
a orkiestra odrzuca zmiany poza `files`. Ostrzejsza opcja: hook `vendor/agy-auto`.

## Cykl pracy
```
worktree orkiestra/<fala>/<zadanie> z origin/main
        |
agy -p (jedna świeża sesja) --> sprawdzenie plików (tylko `files`) --> test_command --> commit
        |
(po całej fali, po kolei) rebase --> push --> PR --> CI --> squash merge --> usunięcie worktree
        |
następna fala dopiero, gdy poprzednia w pełni scalona
```
Maks. 2 próby na zadanie (druga dostaje błąd/wynik testów jako uwagę). Potem „WYMAGA CZŁOWIEKA”.
Agent zapisuje `.orkiestra-result.json` (`{"status":"done"|"blocked","note":...}`); `blocked` oznacza natychmiastowe przekazanie człowiekowi.

Stan: `.orkiestra/state.json`, logi: `.orkiestra/logs/<zadanie>-a<N>.log`, podsumowanie: `.orkiestra/summary.md`.
Własny szablon promptu: plik `task_prompt.md` w `.orkiestra/`.

## Komendy
Globalnie: `--repo PATH`, `--config PATH`, `-v`.
```bash
orkiestra init                                   # konfiguracja, waves.yaml, .gitignore, workflow CI (jeśli brak)
orkiestra validate --plan waves.yaml             # walidacja planu
orkiestra run                                    # cały plan
orkiestra run --wave w2                          # jedna fala
orkiestra run --task api                         # jedno zadanie
orkiestra run --dry-run                          # bez uruchamiania agenta
orkiestra run --no-wait                          # nie czekaj na limit, zakończ kodem 75
orkiestra status                                 # stan zadań
orkiestra mark api merged                        # pending|merged|skipped|needs_human
orkiestra clean --all                            # usuń worktree i stan pomocniczy
```
Kody wyjścia `run`: 0 wszystko scalone; 1 zadanie wymaga człowieka; 75 zatrzymano przez limit (`--no-wait`);
2 błąd konfiguracji/planu; 130 przerwano (stan zapisany, uruchom ponownie).

## Co zrobić gdy zadanie „WYMAGA CZŁOWIEKA”
1. Przeczytaj log: `.orkiestra/logs/<zadanie>-a<N>.log` oraz `orkiestra status`.
2. Popraw ręcznie w worktree zadania, zacommituj, a potem `orkiestra mark <zadanie> merged` (gdy zmiana jest już scalona).
3. Albo popraw prompt w planie i `orkiestra mark <zadanie> pending`, po czym uruchom `orkiestra run` ponownie.

## Limit Antigravity
Orkiestra wykrywa limit po błędach agenta (RESOURCE_EXHAUSTED, 429, quota). Przestaje startować nowe zadania,
czeka do czasu resetu z komunikatu (lub `quota_wait_minutes`) i kontynuuje. Trafienie w limit nie liczy się jako próba.
- `--no-wait` kończy przebieg kodem 75 zamiast czekać.
- Stan limitu sprawdzisz w `agy` poleceniem `/usage`.
- Uruchamiaj fale na początku świeżego 5-godzinnego okna.
- Trzymaj `max_parallel` ≤ 3.

## Tryb local vs github
- `github`: rebase, push, PR, czekanie na CI, squash merge. Wymaga `gh` i działającego workflow CI.
- `local`: scalanie lokalne, bez PR i CI.

## Rozwiązywanie problemów
- Pusty wynik agenta: ustaw `use_pty = true`.
- „Agent nie wprowadził żadnych zmian”: sprawdź uprawnienia, ustaw `skip_permissions = true`.
- „gh nie jest zalogowany”: `gh auth login`.
- CI nigdy nie jest zielone: napraw workflow CI (`.github/workflows`), potem uruchom ponownie.
- Worktree już istnieje: `orkiestra clean --all`.
- Błąd o `--add-dir`: ustaw `add_dir = false`.
