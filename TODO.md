# Status planu fal (3.11.2026)

Plan: `waves.yaml`, **46 fal, 162 zadania**; prompty: `docs/prompts/` (155 plików); start: `docs/START_ORKIESTRA.md`.
Kontrola: `orkiestra validate` -> `OK: 46 fal, 162 zadań`; `node tools/qa/plan-audit.js` -> `PLAN AUDIT OK` (sprawdza też zgodność `files` z `Zmieniaj`).

## Zrobione i usunięte z planu
- w-qa-tools (check-css-vars, check-icons) i w-compat-tests (SaveCompatTests, a11y-check): pliki są w `main`.
- Fale W1-W8 (`tasks/done/`), grafika V0-V8 i G0-G8.

## Do wykonania (kolejność = kolejność w `waves.yaml`)
w-validation-tests, w-perf-tests, w-backlog-cleanup, W11, W12, W13, W14, W15, W16, W17, W18a/b, W19a/b, W20a/b, W21, W22, W23a/b, W24a, W25a/b, W26a-d, W27a-d, W28a-d, W29a-e, W30a-c, W31, W32, W33.

## Zmiany porządkowe z 3.11.2026
- Poprawiony `files` w W17-08 (`LegacyDecorMigration.cs`, nie istniejący `WorldEngine.Decor.cs`).
- Prompty W11 przeniesione z `tasks/` do `docs/prompts/`.
- Nowe fale W31-W33: G10-G16 z `docs/PLAN.md` (wcześniej poza planem).
- `tools/qa/plan-audit.js` pilnuje zgodności `files` z `Zmieniaj`.

## Otwarte decyzje
- Model działek farmy „trawnik -> grządka/drzewko" (`docs/PLAN.md`): koszt przeróbki i limit działek; do tego czasu poza planem.
- Fala S (restyl świata) i P0-P3 grafiki: `docs/GRAFIKA_KOLEJKA.md`.
