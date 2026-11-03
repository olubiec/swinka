# W33-02: G16: final verification run recorded in the visual log
Zmieniaj: docs/VISUAL_LOG.md
Wymagane: docs/VISUAL_LOG.md
Weryfikacja: node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, assets/*, tools/*, AGENTS.md, tasks/*
Goal: One dated entry in `docs/VISUAL_LOG.md` records the result of every automated check of the finished graphics.
Depends on: W32 merged.
Facts: Checks to run from the repository root (install Playwright first if needed: `npx playwright install chromium` in `tools/qa`; if the install or a check fails because of the environment, record the exact error instead of retrying more than once): `node tools/qa/anim-test.js`, `node tools/qa/palette-test.js`, `node tools/qa/web-smoke.js`, `node tools/qa/check-assets.js`, `node tools/qa/check-assets.js --x2`, `node tools/qa/lights-test.js`, `node tools/qa/check-icons.js`, `node tools/qa/check-css-vars.js`, `python3 tools/art/style_check.py` (expected 0 violations). Manual viewing (park stream at every time of day, garden hedge, farm, menu) is done by the human: list it as a checklist with empty boxes. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Run the commands and note PASS/FAIL and the last line of output for each.
2. Append a section `## Weryfikacja końcowa grafiki (<date>)` to `docs/VISUAL_LOG.md` with a table of results and the manual checklist. Do not edit older sections.
3. Do not fix failures in this task; list them in the PR.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
