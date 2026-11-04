# PK-33: Stop using _x2 files and final verification record
Zmieniaj: docs/X2_DELETE_LIST.md, tools/qa/check-assets.js, docs/VISUAL_LOG.md, docs/opt/log/PK-33.md
Wymagane: docs/X2_DELETE_LIST.md, docs/VISUAL_LOG.md
Weryfikacja: node --check tools/qa/check-assets.js && node tools/qa/check-assets.js --x2 && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W33-01, W33-02
Goal: Stop using _x2 files and final verification record.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-33.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W33-01: G14: stop using _x2 files and list them for deletion
Files of this item: docs/X2_DELETE_LIST.md, tools/qa/check-assets.js
Goal: The game never reads `_x2` world files, and the human gets an exact list of the 102 files that can be deleted.
Depends on: W32 merged.
Facts: World items have `file` (1x) and `file_x2` in `assets/world/atlas.json`; the game now scales 1x sprites with nearest-neighbour. Deleting `assets/world/**/*_x2.png` needs the human to confirm, so this task does NOT delete anything. `tools/qa/check-assets.js` already exists (W31-01). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Add a `--x2` flag to `tools/qa/check-assets.js`: grep `web/` and `src/` (js, cs, html, css) for `file_x2` and `_x2.png`; print every hit; exit 1 if any code reference remains, else print `X2 OK` and exit 0. Data files (`atlas.json`, `props.json`) may keep their `file_x2` keys.
2. Write `docs/X2_DELETE_LIST.md` (Polish): a short note, the count, and the full list of `assets/world/**/*_x2.png` (generate it from disk), plus the command to delete them after confirmation.
3. If the flag finds code references, list them in the PR and do not edit code (outside this task).

## Item W33-02: G16: final verification run recorded in the visual log
Files of this item: docs/VISUAL_LOG.md
Goal: One dated entry in `docs/VISUAL_LOG.md` records the result of every automated check of the finished graphics.
Depends on: W32 merged.
Facts: Checks to run from the repository root (install Playwright first if needed: `npx playwright install chromium` in `tools/qa`; if the install or a check fails because of the environment, record the exact error instead of retrying more than once): `node tools/qa/anim-test.js`, `node tools/qa/palette-test.js`, `node tools/qa/web-smoke.js`, `node tools/qa/check-assets.js`, `node tools/qa/check-assets.js --x2`, `node tools/qa/lights-test.js`, `node tools/qa/check-icons.js`, `node tools/qa/check-css-vars.js`, `python3 tools/art/style_check.py` (expected 0 violations). Manual viewing (park stream at every time of day, garden hedge, farm, menu) is done by the human: list it as a checklist with empty boxes. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Run the commands and note PASS/FAIL and the last line of output for each.
2. Append a section `## Weryfikacja końcowa grafiki (<date>)` to `docs/VISUAL_LOG.md` with a table of results and the manual checklist. Do not edit older sections.
3. Do not fix failures in this task; list them in the PR.
