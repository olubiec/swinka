Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>". Nie zadawaj pytań i nie zatrzymuj się. Jeśli coś jest niejasne, wybierz najprostsze rozwiązanie zgodne z plikiem zadania i AGENTS.md, a decyzję opisz w PR-ze w sekcji „Decisions”. Jeśli test nie przechodzi, znajdź przyczynę w kodzie i napraw ją w zakresie „Change”; nie zmieniaj asercji.

# W2-02: Smoke test: fail on errors, missing files and layout problems
Goal: the Home smoke test fails loudly on page errors, missing files, wrong feature folders and layout problems.
Depends on: W1-03 (layout module) and W1-04 (feature list) merged.
Change: `tools/qa/web-smoke.js`
Do not touch: `web/home/*`, `tools/qa/lib/*`, `tools/qa/package.json`, C#.
Steps:
1. Keep the CLI, the static server, the `step()` helper, screenshots in `tools/qa/out/`, exit code 1 on any problem and the final line `WEB SMOKE OK`.
2. Print `Chromium <browser.version()>` at the start. Fail on `pageerror`, console `error` (keep the existing "Failed to load resource" exclusion), `requestfailed`, and any HTTP status >= 400 for files under `/web/` or `/assets/` unless the URL is in an `ALLOWED_MISSING` array at the top of the file (empty at first; every entry needs a comment saying why).
3. Folder check at the start: the directories in `web/home/features` must equal the ids in `features/index.json` (both directions); fail with the difference.
4. Call `assertLayout(page, label)` from `tools/qa/lib/layout.js` after every existing step.
5. Remove the hand-written script injection from step `03_shop` (the shop is in `features/index.json`).
6. Run it. For each problem it reports: if the fix is inside `tools/qa/web-smoke.js`, fix it; otherwise add the URL to `ALLOWED_MISSING` (or skip the label) with a `TODO: <problem>` comment and list it in the PR table (file, what, who fixes). Do not edit `app.js` or feature files in this task.
Verify: `node tools/qa/web-smoke.js` exits 0 and prints `WEB SMOKE OK`; `node --check tools/qa/web-smoke.js`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; the `Chromium <version>` line and a table of every problem found with its owner; screenshot if the change is visual.
