# Instrukcja: uruchomienie orkiestry z prawdziwym Antigravity (Fala 0 + Fala 6)

Pełna dokumentacja: `docs/USAGE.md`, pisanie planów: `docs/PISANIE_PLANU.md`.
Poniżej tylko to, co trzeba zrobić na swojej maszynie (tam, gdzie jest `agy` i `gh`).

## 1. Fala 0 — przygotowanie (ok. 10 min, 0 tokenów)

```bash
git clone https://github.com/olubiec/orkiestracja && cd orkiestracja
git checkout fala-5            # albo main po zmergowaniu PR #1
python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
python -m pytest -q            # oczekiwane: wszystko zielone

gh auth login                  # scope: repo, workflow
agy --version                  # zaloguj się raz interaktywnie komendą `agy`
agy models                     # zanotuj slug modelu Flash
agy --help | grep -E -- "--output-format|--print-timeout|--add-dir|--dangerously-skip-permissions|--model"
agy -p "Reply with exactly: OK" --output-format json | cat
```

Jak czytać wynik ostatniej komendy:

| Wynik | Co zrobić |
|---|---|
| JSON z `"status": "SUCCESS"` | OK, nic nie zmieniaj |
| pusto | `agy update`; jeśli nadal pusto, w `orkiestra.toml` ustaw `use_pty = true` |
| brak `--add-dir` w `--help` | w `orkiestra.toml` ustaw `add_dir = false` |
| inne nazwy flag | dopasuj `extra_args` w `[agent]` |

W repo na GitHubie: Settings → General → Pull Requests → włącz „Allow squash merging”.

## 2. Fala 6 — smoke test

Wykonaj to w repozytorium **testowym** (z remote `origin` na GitHubie), nie w samym `orkiestracja`:

```bash
orkiestra init                                   # orkiestra.toml, .gitignore (.orkiestra/), workflow CI
# w orkiestra.toml ustaw: [agent] model = "<slug Flash>", [project] test_command = ""
git add -A && git commit -m "orkiestra: config" && git push
orkiestra validate --plan examples/smoke.yaml
orkiestra run --plan examples/smoke.yaml --dry-run    # pokazuje komendy, nic nie uruchamia
orkiestra run --plan examples/smoke.yaml              # prawdziwy agy + PR + merge
orkiestra status
orkiestra run --plan examples/smoke.yaml              # drugi raz: nic nie robi
```

Sukces = `status` pokazuje `zmergowane`, na `main` jest `SMOKE.md` z linią `orkiestra smoke OK`,
a ponowne `run` niczego nie uruchamia.

## 3. Codzienna praca

1. Plan w `waves.yaml` (fale → zadania z `files` i `prompt`); zadania w fali nie mogą dzielić plików.
2. `orkiestra validate --plan waves.yaml`, potem `run`.
3. Przerwane lub wstrzymane przez limit: uruchom `orkiestra run` ponownie, stan jest w `.orkiestra/state.json`.
4. Zadanie ze statusem „WYMAGA CZŁOWIEKA”: przeczytaj powód w `status`, popraw prompt albo plik,
   potem `orkiestra mark --plan waves.yaml <id> pending` i znów `run`.
5. Sprzątanie worktree: `orkiestra clean`.

Tryb bez GitHuba (testy lokalne): `merge_mode = "local"`. Repo musi być na gałęzi bazowej i czyste;
`orkiestra init` dopisuje `.orkiestra/` do `.gitignore`, więc zawsze zaczynaj od niego.

## 4. Co zostało sprawdzone, a co nie

Sprawdzone automatycznie (prawdziwe CLI i git, atrapa `agy` z `tests/fakes/fake_agy.py`, tryb `local`):
walidacja, dry-run, 3 zadania równolegle, kolejność fal (test zadania z fali 2 wymagał plików z fali 1),
merge, wznowienie i idempotencja, wyjście poza zakres plików, brak zmian, nieudane testy (2 próby,
potem „wymaga człowieka”), limit bez zużycia próby i z automatycznym wznowieniem po odczekaniu,
`mark`, `clean`, kody wyjścia (0 sukces, 1 wymaga człowieka/błędny plan, 2 błąd środowiska).

**Niesprawdzone (tylko u Ciebie):** prawdziwy `agy` (nazwy flag, format JSON, komunikat o limicie)
oraz tryb `merge_mode = "github"` z prawdziwym `gh` (PR, CI, squash merge).
To właśnie weryfikuje Fala 6.
