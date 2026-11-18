# Status planu fal (18.11.2026)

Orkiestra jest usunięta; fale uruchamiasz ręcznie w Antigravity. Instrukcja: `docs/FALA_2_START.md`. Plan: `waves.yaml` (generowany z `docs/opt/packages.spec.json` przez `python3 tools/opt/gen_packages.py`, kontrola `node tools/qa/plan-audit.js`), prompty: `docs/prompts/`, logi paczek: `docs/opt/log/`.

## Zrobione
- W11-W33 (z odłożonymi punktami i PK-23b BLOCKED, patrz `docs/opt/README.md`), P1-P45, R1, fala 1 (F1: P44, P4, P8, badania R5-R8).

## Zostało
- **Fala 2** (F2-1 .. F2-6, 54 agentów w 6 krokach): badania -> implementacja -> analiza sklejenia -> sklejanie -> testy -> bramki. Co każdy krok daje: tabela w `docs/FALA_2_START.md`.
- Po F2-6: ręczny test na Windowsie (`docs/qa/UX_WAVE_CHECKS.md`, `TESTY_RECZNE.md`).
- Odłożone: undo/redo edytora, dźwięki, limity rysowania, bieg po ogrodzie (W28), rekwizyty pulpitu (W29).
