# PK-P47c3: QA tools use the 640x400 viewport
Zmieniaj: tools/qa/lib/ux.js, tools/qa/screen-matrix.js, tools/qa/a11y-check.js, docs/opt/log/PK-P47c3.md
Wymagane: tools/qa/lib/ux.js
Weryfikacja: node --check tools/qa/lib/ux.js && node --check tools/qa/screen-matrix.js && node --check tools/qa/a11y-check.js && node tools/qa/a11y-check.js && node tools/qa/screen-matrix.js --quick && node tools/qa/ux-p47-hud.js && node tools/qa/ux-p47-layout.js && node tools/qa/ux-all.js p40 && node tools/qa/ux-all.js p43 && node tools/qa/ux-all.js p44
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The shared Playwright helper and the two screen checks run at the Home window size 640x400 instead of the old portrait sizes.
Depends on: PK-P47c2 merged.

## Kontekst (fakty zweryfikowane w repo 8.11.2026, nie szukaj ich drugi raz)
- Owner's problem: the Home window (420x640) crops the scene (`.stage-viewport` 132 px, `#pigCanvas` `object-fit: cover`). P47 makes the window landscape 640x400 CSS px: 40 px HUD strip (`#hudStrip`) on top, stage below it with the WHOLE scene (`contain`), bottom panel gone, menu opens as full-stage panel.
- `tools/qa/lib/ux.js` line 48: `openHome` opens `{ viewport: { width: 400, height: 620 } }` (NOT 420x640; the old prompt text was wrong). `openMore` clicks `#btnMore` and waits for `#modalBackdrop.active`; keep those helpers as they are.
- `tools/qa/screen-matrix.js`: header comment line 1, `WIDTHS` line 18 (`[360, 480]` quick, `[360, 420, 480]` full), `HEIGHT = 640` line 21, `webview-mode` toggle line 82 uses `w >= 420`; the Home probe (line 38) checks `btnShop btnMinigames btnMore` are not below the fold; the tag `${w}x${HEIGHT}` names the output files.
- `tools/qa/a11y-check.js`: comment line 1, viewport line 50 (420x640); Tab order must reach `btnSound btnClose btnFeed btnClean btnShop` (line 140), the HUD order differs now: if the Tab loop (check the step count near line 100) is too short for the strip, raise the step count only.
- Other files holding `420`/`640` viewports (`web-smoke.js` 488/808/874, `paths-test.js`, `perf-soak.js`, `resource-loss.js`, `soak.js`, `minigame-fit-check.js`, `layout.selftest.js`, `visual-matrix.js`) are NOT edited: the package q compares them with the baseline.
- Order: P47 runs AFTER waves P39 (scene fit, blockers), P45 (perspective in `canvas-pig.js`, `CuyRoomGeometry`), P40 (edit mode), P43 (hotspots) and P44 (pig drag to the edge). Do not undo what they added (hotspot, edit-mode and drag overlays, the Edit button and drawer); if a log `docs/opt/log/PK-P39b.md` or `PK-P45e*.md` exists, read only its last lines.

## Pliki i elementy (zweryfikowane)
- `tools/qa/lib/ux.js` 48 (`openHome` viewport), `tools/qa/screen-matrix.js` 1/18/21/82, `tools/qa/a11y-check.js` 1/50 (listed above).

## Steps
1. `ux.js`: viewport 640x400. `screen-matrix.js`: `WIDTHS = [640]` (QUICK and full), `HEIGHT = 400`, `w >= 420` -> `w >= 640`, comment line 1 (`Home and every feature at 640x400 x theme x scale`). `a11y-check.js`: viewport 640x400 and comment.
2. Run Weryfikacja once. Then, if `ux-all.js p40/p43/p44` fail only because of the new size, write the test names and 5 error lines in the log (status BLOCKED for those; do not edit those tests). The order of the checks is cheap first, so `&&` stops at the first failure.

Prohibited: Nie dodawaj zabawek (piłka, tunel itp. zostały usunięte). Bez glifów/emoji w grafice, tylko paleta i sprite'y z biblioteki UI. No refactors, no new abstractions, no edits outside Zmieniaj.
Log: write `docs/opt/log/PK-P47c3.md` (max 10 lines). Do not run git.
