# Status planu fal (18.11.2026)

Orkiestra jest usunięta; fale uruchamiasz ręcznie w Antigravity. Instrukcja: `docs/FALA_2_START.md`. Plan: `waves.yaml` (generowany z `docs/opt/packages.spec.json` przez `python3 tools/opt/gen_packages.py`, kontrola `node tools/qa/plan-audit.js`), prompty: `docs/prompts/`, logi paczek: `docs/opt/log/`.

## Zrobione
- W11-W33 (z odłożonymi punktami i PK-23b BLOCKED, patrz `docs/opt/README.md`), P1-P45, R1, fala 1 (F1: P44, P4, P8, badania R5-R8).

## Zostało
- **Fala 2** (F2-1 .. F2-6, 54 agentów): `docs/FALA_2_START.md`.
- **Fala 3** (F3-1 .. F3-6, 35 agentów): Home jak pulpit (świnka śpi, drzemie, pije, biega, skacze, tańczy, reaguje) plus odłożone punkty (undo/redo, dźwięki, limity rysowania, wybieg W28, rekwizyty pulpitu W29): `docs/FALA_3_START.md`.
- **Fala 4** (F4-1 .. F4-6, 25 agentów): Hay Hop, towarzysz, taniec do muzyki, pogoda za zgodą, etapy w Domku, bramka końcowa: `docs/FALA_4_START.md`.
- Po każdej fali: ręczny test na Windowsie (`docs/qa/UX_WAVE_CHECKS.md`, `TESTY_RECZNE.md`, arkusze fal 3 i 4 powstają w F3-6 i F4-6).
- Poza planem: PK-23b (BLOCKED), PK-21 (częściowo).
