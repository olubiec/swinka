# W33-01: G14: stop using _x2 files and list them for deletion
Zmieniaj: docs/X2_DELETE_LIST.md, tools/qa/check-assets.js
Wymagane: docs/X2_DELETE_LIST.md
Weryfikacja: node tools/qa/check-assets.js --x2
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, assets/*, AGENTS.md, tasks/*
Goal: The game never reads `_x2` world files, and the human gets an exact list of the 102 files that can be deleted.
Depends on: W32 merged.
Facts: World items have `file` (1x) and `file_x2` in `assets/world/atlas.json`; the game now scales 1x sprites with nearest-neighbour. Deleting `assets/world/**/*_x2.png` needs the human to confirm, so this task does NOT delete anything. `tools/qa/check-assets.js` already exists (W31-01). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Add a `--x2` flag to `tools/qa/check-assets.js`: grep `web/` and `src/` (js, cs, html, css) for `file_x2` and `_x2.png`; print every hit; exit 1 if any code reference remains, else print `X2 OK` and exit 0. Data files (`atlas.json`, `props.json`) may keep their `file_x2` keys.
2. Write `docs/X2_DELETE_LIST.md` (Polish): a short note, the count, and the full list of `assets/world/**/*_x2.png` (generate it from disk), plus the command to delete them after confirmation.
3. If the flag finds code references, list them in the PR and do not edit code (outside this task).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
