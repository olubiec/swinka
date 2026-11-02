# PLAN — `orkiestra`: automat fal zadań dla Antigravity

> Ten plik czytasz TY, nie agenci. Agent w każdej sesji czyta tylko `AGENTS.md`
> i swój plik zadania z `plan/zadania/`. Dzięki temu każda sesja startuje z małym kontekstem.

## 1. Cel

Skrypt `orkiestra` (Python 3.11, jedna zależność: PyYAML) który:

1. czyta plan `waves.yaml` (fale → zadania z promptem i listą plików),
2. dla każdego zadania w fali tworzy osobny `git worktree` i odpala **świeżą** sesję
   `agy -p` (Gemini Flash) — maksymalnie `max_parallel` naraz,
3. po pracy agenta **sam** (bez AI) sprawdza: czy agent ruszył tylko swoje pliki, czy przechodzą testy,
4. przy błędzie robi **jedną** poprawkę agentem (z wynikiem testów w prompcie), potem oznacza `needs_human`,
5. **sam** commituje, pushuje, otwiera PR, czeka na CI, merguje (`gh`) — kolejno, z rebase,
6. startuje następną falę dopiero, gdy cała poprzednia jest zmergowana,
7. wykrywa wyczerpany limit Antigravity, wstrzymuje start nowych zadań i czeka do resetu,
8. zapisuje stan w `.orkiestra/state.json` — można przerwać i wznowić (`orkiestra run` ponownie).

### Zasada oszczędzania limitu (dlaczego tak)

Limit Antigravity liczy pracę agenta. Więc AI robi **wyłącznie edycję kodu**. Wszystko inne —
git, PR, CI, merge, sprawdzanie zakresu plików, pilnowanie kolejki — robi zwykły kod (0 tokenów).
Każde zadanie = nowa sesja z pustym kontekstem (brak rosnącej historii „rodzica”).
Agent kończy jednym zdaniem — bez streszczeń, które ktoś musiałby czytać.

## 2. Architektura

```
waves.yaml ──► plan.py ──► runner.py ─┬─► gitops.py   (worktree, commit, rebase, push, merge lokalny)
orkiestra.toml ► config.py            ├─► prompts.py  (prompt = szablon + zadanie + ewentualny feedback)
                                      ├─► agent.py    (agy -p ... ; wykrywanie limitu; log)
.orkiestra/state.json ◄─ state.py ◄───┤
                                      └─► github.py   (gh pr create / checks / merge)
cli.py: init | validate | run | status | mark | clean      report.py: tabela statusu
```

Przepływ jednego zadania (`runner.run_task`):

```
PENDING → [worktree z origin/main] → prompt → agy (Flash) ─┬─ limit? → wróć do PENDING, pauza
                                                           ├─ .orkiestra-result.json = blocked → NEEDS_HUMAN
                                                           └─ diff → zakres plików OK? → testy OK? → commit → VERIFIED
                                     błąd ─► (attempt < max_attempts) ponów w tym samym worktree z feedbackiem
                                              inaczej → NEEDS_HUMAN
```

Integracja fali (`runner.integrate_wave`, sekwencyjnie, po kolei zadania VERIFIED):

```
fetch → rebase na origin/main → push → PR → czekaj na CI ─┬─ zielone / brak CI → merge (squash) → MERGED → usuń worktree
                                                          └─ czerwone / timeout / konflikt → NEEDS_HUMAN (komentarz w PR)
```

Tryb `merge_mode = "local"` pomija GitHuba: merge do lokalnej gałęzi bazowej (do testów i dla repo bez CI).

### Wywołanie agenta (oficjalny tryb headless agy)

```
agy -p "<prompt>" --output-format json --print-timeout 20m \
    --model "<slug z `agy models`>" --dangerously-skip-permissions --add-dir <worktree>   (cwd = worktree)
```

- `--output-format json` → jedna koperta JSON: `status` (`SUCCESS`/`ERROR`/…), `response`, `error`, `usage`.
- Bez `--dangerously-skip-permissions` agent w trybie headless „po cichu” odmawia edycji i kończy kodem 0
  → dlatego worktree jest izolowany, a skrypt i tak weryfikuje zakres zmian. Alternatywa: `vendor/agy-auto`.
- Limit: niezerowy kod + tekst pasujący do `quota|rate limit|RESOURCE_EXHAUSTED|429|too many requests`;
  czas resetu parsowany z „resets in 4 hours and 50 minutes” (logika z `vendor/agy-headless-bridge`).
- Wszystkie flagi są w configu (`extra_args`), bo CLI agy się zmienia — sprawdź `agy --help` w Fali 0.

## 3. Formaty plików

`waves.yaml` (plan Twojego projektu — generujesz go Opusem, patrz `docs/PISANIE_PLANU.md` z Fali 5):

```yaml
version: 1
waves:
  - id: w1
    tasks:
      - id: auth-model
        title: "Model użytkownika"
        files: ["src/auth/**", "tests/auth/**"]   # agent może zmieniać TYLKO to
        prompt: |
          ...dokładne polecenie...
        # opcjonalnie: prompt_file: zadania/auth-model.md (zamiast prompt)
        # opcjonalnie: model: "...", test_command: "pytest tests/auth -q", timeout_minutes: 30
  - id: w2
    tasks: [...]
```

`orkiestra.toml` (konfiguracja, wszystko ma wartości domyślne):

```toml
[project]
base_branch = "main"
remote = "origin"
test_command = "pytest -q"      # puste = bez testów lokalnych
merge_mode = "github"           # github | local

[agent]
cmd = ["agy"]
model = ""                      # slug z `agy models`, np. Flash; puste = domyślny agy
timeout_minutes = 20
skip_permissions = true
add_dir = true
output_format = "json"          # json | text
use_pty = false                 # true tylko dla agy < 1.2.11 (pusty stdout)
extra_args = []

[run]
max_parallel = 3
max_attempts = 2
quota_wait_minutes = 30
ci_timeout_minutes = 30
worktree_dir = "../.orkiestra-worktrees"
state_dir = ".orkiestra"
stop_on_failure = true
```

## 4. Fale budowy skryptu

Zasady: w jednej fali zadania nie dzielą plików, więc mogą iść równolegle.
Maks. 3 sesje naraz. Każde zadanie = **nowa sesja Antigravity, model Flash** (wyjątek oznaczony).

| Fala | Zadanie | Pliki (tylko te!) | Model |
|---|---|---|---|
| 0 | Przygotowanie (ręcznie, bez AI) | — | — |
| 1 | T1.1 Szkielet + kontrakty | `pyproject.toml`, `.gitignore`, `.github/workflows/ci.yml`, `orkiestra/__init__.py`, `orkiestra/templates/__init__.py`, `orkiestra/models.py`, `orkiestra/errors.py`, `tests/test_models.py` | Flash |
| 2 | T2.1 Plan (waves.yaml) | `orkiestra/plan.py`, `tests/test_plan.py`, `examples/waves.example.yaml` | Flash |
| 2 | T2.2 Config + stan | `orkiestra/config.py`, `orkiestra/state.py`, `tests/test_config.py`, `tests/test_state.py`, `orkiestra.toml.example` | Flash |
| 2 | T2.3 Prompty | `orkiestra/prompts.py`, `orkiestra/templates/task_prompt.md`, `tests/test_prompts.py` | Flash |
| 3 | T3.1 Git | `orkiestra/gitops.py`, `tests/test_gitops.py`, `tests/conftest.py` | Flash |
| 3 | T3.2 Agent agy | `orkiestra/agent.py`, `tests/test_agent.py`, `tests/fakes/fake_agy.py` | Flash |
| 3 | T3.3 GitHub | `orkiestra/github.py`, `tests/test_github.py` | Flash |
| 4 | T4.1 Runner (serce) | `orkiestra/runner.py`, `tests/test_runner.py` | **Pro** (najtrudniejsze) |
| 4 | T4.2 CLI + raport | `orkiestra/cli.py`, `orkiestra/__main__.py`, `orkiestra/report.py`, `orkiestra/templates/ci_workflow.yml`, `tests/test_cli.py`, `tests/test_report.py` | Flash |
| 5 | T5.1 Test E2E + poprawki | `tests/test_e2e.py`, dowolne `orkiestra/*.py` (tylko poprawki błędów) | Flash |
| 5 | T5.2 Dokumentacja | `README.md`, `docs/USAGE.md`, `docs/PISANIE_PLANU.md`, `examples/smoke.yaml` | Flash |
| 6 | Smoke test na prawdziwym agy (ręcznie) | — | — |

Prompty: `plan/zadania/T1.1.md` … `T5.2.md`. Są po angielsku celowo — mniej tokenów
i Flash precyzyjniej trzyma się technicznych instrukcji. Opisy w tym pliku są po polsku.

## 5. Procedura dla fal 1–4 (ręcznie w Antigravity, zanim skrypt istnieje)

Jedna gałąź na falę; zadania w fali piszą różne pliki, więc mogą działać w tym samym katalogu.

```bash
git checkout main && git pull
git checkout -b fala-2
```

Dla każdego zadania fali: **nowa** konwersacja w Antigravity, model Flash, wklej:

```
Read AGENTS.md, then read plan/zadania/T2.1.md and execute it exactly.
```

(Nie kontynuuj starej rozmowy — nowa = pusty kontekst = taniej.)

Gdy wszystkie sesje fali skończą:

```bash
python -m pytest -q            # musi być zielone
ruff check .                   # od Fali 1
git add -A && git commit -m "Fala 2: plan, config, state, prompts"
git push -u origin fala-2
gh pr create --fill && gh pr merge --squash --auto   # lub merge ręcznie po zielonym CI
```

Gdy testy padają: jedna nowa sesja Flash z promptem
`Read AGENTS.md. Tests fail: <wklej ostatnie ~40 linii pytest>. Fix only files of task T2.x listed in plan/zadania/T2.x.md.`
Jeśli druga próba nie pomaga — popraw prompt zadania (Opusem), nie męcz Flasha.

Od Fali 5 możesz już użyć samego `orkiestra` (dogfooding): cały plan budowy jest też zapisany
w formacie narzędzia w `plan/waves-budowa.yaml`. Po Fali 4: `pip install -e .`, `orkiestra init`
(ustaw model), potem `orkiestra run --plan plan/waves-budowa.yaml --wave w5`. Albo dalej ręcznie.

## 6. Fala 0 — przygotowanie (ręcznie, ~10 min, 0 tokenów)

1. Python 3.11+, `git`, `gh` (≥ 2.50): `gh auth login` (scope `repo`, `workflow`).
2. Antigravity CLI: instalacja z <https://antigravity.google/docs/cli>, potem raz interaktywnie `agy` (logowanie).
3. Sprawdź wersję i flagi — zapisz wynik, bo od tego zależy config:
   ```bash
   agy --version
   agy --help | grep -E -- "--output-format|--print-timeout|--add-dir|--dangerously-skip-permissions|--model|--mode"
   agy models                       # zanotuj dokładny slug modelu Flash
   ```
4. Test headless (MUSI coś wypisać):
   ```bash
   agy -p "Reply with exactly: OK" --output-format json | cat
   ```
   - Widzisz JSON z `"status": "SUCCESS"` → wszystko gra.
   - Pusto → stara wersja agy (błąd #76): `agy update`; jeśli dalej pusto, w configu ustawisz `use_pty = true`.
   - Brak flagi `--add-dir` w `--help` → w configu `add_dir = false`.
5. W repo GitHub: Settings → General → Pull Requests → włącz „Allow squash merging”.
6. Sprawdź limit w agy: `/usage` w sesji interaktywnej — zacznij fale przy świeżym oknie 5h.

## 7. Fala 6 — smoke test (ręcznie)

```bash
pip install -e .
orkiestra init                         # tworzy orkiestra.toml, .gitignore, workflow CI (jeśli brak)
# ustaw model w orkiestra.toml
orkiestra validate --plan examples/smoke.yaml
orkiestra run --plan examples/smoke.yaml --dry-run
orkiestra run --plan examples/smoke.yaml        # 1 malutkie zadanie, prawdziwy agy + PR + merge
orkiestra status
```

Kryterium ukończenia całego projektu: smoke test kończy się zmergowanym PR, `orkiestra status`
pokazuje `merged`, a ponowne `orkiestra run` nic nie robi (wszystko gotowe).

## 8. Ryzyka i decyzje

| Ryzyko | Decyzja |
|---|---|
| Flagi agy zmieniają się między wersjami | Wszystko w `orkiestra.toml`; Fala 0 weryfikuje `--help`. |
| Agent wychodzi poza swoje pliki | Skrypt porównuje `git status` z `files` zadania → odrzuca i ponawia z informacją. |
| Pusty stdout (stare agy) | `use_pty = true` (kod przepisany z `vendor/agy-headless-bridge`). |
| Soft-deny uprawnień (kod 0, brak zmian) | Brak diffu = błąd „agent made no changes”. |
| Limit się kończy w środku fali | Zadanie wraca do `pending` (próba się nie liczy), pauza do resetu, wznowienie. |
| Konflikty przy merge | Pliki rozłączne w fali + rebase przed każdym push; konflikt → `needs_human`. |
| Pętla poprawek zjada limit | Twardo `max_attempts = 2`; CI czerwone → człowiek, nie AI. |
| `--dangerously-skip-permissions` | Agent działa tylko w osobnym worktree; opcjonalnie `vendor/agy-auto`. |
