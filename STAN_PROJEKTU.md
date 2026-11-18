# Stan projektu Cuy (checkpoint 2026-11-18)

- **Fale:** fala 1 (F1) zrobiona i na `main`. Następne: **fala 2** (`docs/FALA_2_START.md`, 54 agentów), **fala 3** (Home jak pulpit + odłożone punkty, `docs/FALA_3_START.md`, 35 agentów), **fala 4** (funkcje opcjonalne + bramka końcowa, `docs/FALA_4_START.md`, 25 agentów).
- **Narzędzia:** orkiestra, pętla i strażnik baterii usunięte 18.11.2026 (praca ręczna w Antigravity). Plan: `waves.yaml`; prompty: `docs/prompts/`; logi: `docs/opt/log/`.
- **Testy (ostatni znany stan):** Core `dotnet test tests/Cuy.Core.Tests` zielone; web: `node tools/qa/web-smoke.js` (baseline: `docs/opt/log/baseline-smoke.txt`). Windows do potwierdzenia po fali 2.
- **Ryzyka:** W15/W16 robione na innym urządzeniu; PK-23b BLOCKED; PK-P5c (druga świnka na pulpicie) może skończyć się BLOCKED.
- **Ręczne bramki Windows:** `TESTY_RECZNE.md`, `docs/qa/UX_WAVE_CHECKS.md`.
