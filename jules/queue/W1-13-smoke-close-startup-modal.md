Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>".

# W1-13: Smoke test closes the modal that Daily opens at start
Goal: the Home smoke test passes when the Daily feature auto-opens its dialog on start, because the test closes that dialog before the first click.
Depends on: nothing. Facts: `web/home/features/daily/feature.js` opens `daily` once per session on start (`window._dailyAutoOpened`). With the feature order in `features/index.json` after W1-04, the auto-open leaves `#modalBackdrop.active` in place, and step `02_feed_drawer` times out because the backdrop intercepts clicks. Step `01_home` in `tools/qa/web-smoke.js` only checks the bridge and canvas.
Change: `tools/qa/web-smoke.js` (only step `01_home`)
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `features/*`, `index.json`, C#.
Steps:
1. At the end of step `01_home`, after the `ok` check, add: if `#modalBackdrop.active` is visible, click `#modalCloseBtn` and wait 200 ms. Keep the existing check and its message as they are.
2. Do not change any other step.
Verify: `node tools/qa/web-smoke.js` prints `WEB SMOKE OK` and exits 0.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, why the modal is open at start, how to check by hand.
