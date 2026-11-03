# Status Projektu i Plan Fali Orkiestratora

## Wykonane poprawki (Sesja przygotowawcza)
- **Orkiestrator (`tools/orkiestra/`, `orkiestra.toml`)**:
  - Ustawiono `gemini-3-flash` jako główny model (`model = "gemini-3-flash"`, `models = ["gemini-3-flash", ...]`).
  - Dodano automatyczne podpinanie `NODE_PATH` i dowiązania `tools/qa/node_modules` w każdym `git worktree` (obsługa Playwright w izolowanych drzewach roboczych).
  - Naprawiono obsługę limitu `429 RESOURCE_EXHAUSTED` w `runner.py`: jeśli pod-agent zdążył zapisać kod przed trafieniem w limit i zmiany przechodzą `_check` (zakres plików + `test_command`), zadanie jest automatycznie zatwierdzane jako `VERIFIED` zamiast porzucania pracy.
  - Zoptymalizowano szablon `task_prompt.md` (`WaitMsBeforeAsync: 10000`, czytanie tylko niezbędnych plików), aby ograniczyć zużycie tokenów i czas działania.
- **Skrypty QA i Fala 1–2 (`w-qa-tools`, `w-compat-tests`)**:
  - `tools/qa/check-css-vars.js` i `tools/qa/check-icons.js` – przepisane na CommonJS (`CSS VARS OK`, `ICONS OK`, brak ostrzeżeń).
  - `tools/qa/web-smoke.js` – naprawiony timeout w `20_more_menu` oraz obsługa częściowych katalogów w równoległych worktree (`WEB SMOKE OK`, 22/22 kroków zielone).
  - `tests/Cuy.Core.Tests/SaveCompatTests.cs` oraz `tools/qa/a11y-check.js` – odzyskane z Fali 2, zweryfikowane (`5/5` testów zielonych, `A11Y OK`) i włączone do głównej gałęzi.
- **Prompty i pełny plan fal (`waves.yaml`, `docs/prompts/W12-*..W22-*`)**:
  - Rozwiązano wszystkie konflikty zależności wewnątrz fal (`W13-05` przeniesione do `W14`, podział na pod-fale `W18a`/`W18b`, `W19a`/`W19b`, `W20a`/`W20b`, rejestracja `index.json` w `W21-02`).
  - Dopisano wszystkie zadania podpięcia grafiki `G1`–`G10` (`W14-06`, `W14-09`, `W20-02`, `W20-04`, `W20-05`, `W20-06`, `W22-03`, `W22-07`).
  - Zbudowano i zwalidowano pełny `waves.yaml` (**20 fal, 89 zadań**, 0 kolizji plików).

## Kolejne fale gotowe do uruchomienia (`orkiestra run`)
1. `w-validation-tests` (2 zadania: `data-ranges`, `sim-assertions`)
2. `w-perf-tests` (2 zadania: `perf-test`, `fuzz-test`)
3. `w-backlog-cleanup` (3 zadania: `xml-docs-ai`, `arch-doc-refresh`, `testing-docs-unify`)
4. `W11` (5 zadań: `W11-01` .. `W11-05`)
5. `W12` (5 zadań: `W12-01` .. `W12-05`)
6. `W13` (4 zadania: `W13-01` .. `W13-04`)
7. `W14` (10 zadań: `W13-05`, `W14-01` .. `W14-09`)
8. `W15` (5 zadań: `W15-01` .. `W15-05`)
9. `W16` (8 zadań: `W16-01` .. `W16-08`)
10. `W17` (8 zadań: `W17-01` .. `W17-08`)
11. `W18a` (2 zadania: `W18-01`, `W18-06`)
12. `W18b` (5 zadań: `W18-02` .. `W18-05`, `W18-07`)
13. `W19a` (4 zadania: `W19-01` .. `W19-04`)
14. `W19b` (2 zadania: `W19-05`, `W19-06`)
15. `W20a` (2 zadania: `W20-01`, `W20-02`)
16. `W20b` (6 zadań: `W20-03` .. `W20-08`)
17. `W21` (5 zadań: `W21-01` .. `W21-05`)
18. `W22` (7 zadań: `W22-01` .. `W22-07`)
