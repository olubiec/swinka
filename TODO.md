# Status planu fal (3.11.2026)

Plan: `waves.yaml`, **46 fal, 162 zadania**; prompty: `docs/prompts/` (155 plików); start: `docs/START_ORKIESTRA.md`.
Kontrola: `python -m orkiestra validate` -> `OK: 46 fal, 162 zadań`; `node tools/qa/plan-audit.js` -> `PLAN AUDIT OK`.
Testy: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --nologo` -> **399/399 passed**.

## Stan wykonania (12/162 zadań zmergowanych do `main`)
- **w-qa-tools**: `check-css-vars`, `check-icons` (zmergowane)
- **w-compat-tests**: `SaveCompatTests`, `a11y-check` (zmergowane)
- **w-validation-tests**: `data-ranges`, `sim-assertions` (zmergowane)
- **w-perf-tests**: `perf-test`, `fuzz-test` (zmergowane)
- **w-backlog-cleanup**: `xml-docs-ai`, `arch-doc-refresh`, `testing-docs-unify` (zmergowane)
- **W11 (Nazwane świnki)**: `W11-01`, `W11-02`, `W11-03`, `W11-04`, `W11-05` (wszystkie 5 zmergowane!)

## Następna fala do wykonania:
- **W12** (Farma: uprawa warzyw - 5 zadań: `W12-01` do `W12-05`)
  - Wznowienie: `python -m orkiestra -v run --wave W12`

## Kontrola zasilania i baterii
- Dodano strażnika baterii: [`tools/battery_guard.py`](tools/battery_guard.py) oraz integrację w [`tools/orkiestra/orkiestra/battery.py`](tools/orkiestra/orkiestra/battery.py) i `runner.py`.
- W razie spadku baterii <= 20% (na baterii) orkiestrator automatycznie przerywa pracę, zapisuje raport [`STAN_PROJEKTU.md`](STAN_PROJEKTU.md), zatwierdza commity i wypycha do `origin/main`.
- Ręczne sprawdzenie stanu baterii:
  ```powershell
  python tools/battery_guard.py status
  ```
- Ręczny natychmiastowy bezpieczny zrzut na GitHub:
  ```powershell
  python tools/battery_guard.py emergency-save
  ```
- Uruchomienie ciągłego monitora w tle:
  ```powershell
  python tools/battery_guard.py watch --threshold 20 --kill-agents   # raport co 30 min + alerty na gałąź orkiestra-status
  ```

## Kolejność dalszych fal w `waves.yaml`:
W12, W13, W14, W15, W16, W17, W18a/b, W19a/b, W20a/b, W21, W22, W23a/b, W24a, W25a/b, W26a-d, W27a-d, W28a-d, W29a-e, W30a-c, W31, W32, W33.
