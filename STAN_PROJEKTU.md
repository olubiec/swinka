# Stan projektu Cuy (checkpoint 2026-11-18)

- **Fale:** fala 1 (F1) zrobiona i na `main`. Następna: **fala 2** (F2-1 .. F2-6), instrukcja `docs/FALA_2_START.md`.
- **Narzędzia:** orkiestra, pętla i strażnik baterii usunięte 18.11.2026 (praca ręczna w Antigravity). Plan: `waves.yaml`; prompty: `docs/prompts/`; logi: `docs/opt/log/`.
- **Testy (ostatni znany stan):** Core `dotnet test tests/Cuy.Core.Tests` zielone; web: `node tools/qa/web-smoke.js` (baseline: `docs/opt/log/baseline-smoke.txt`). Windows do potwierdzenia po fali 2.
- **Ryzyka:** W15/W16 robione na innym urządzeniu; PK-23b BLOCKED; PK-P5c (druga świnka na pulpicie) może skończyć się BLOCKED.
- **Ręczne bramki Windows:** `TESTY_RECZNE.md`, `docs/qa/UX_WAVE_CHECKS.md`.
