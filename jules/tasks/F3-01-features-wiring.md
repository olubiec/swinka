# Task F3-01: Wire all Home features together, remove the examples, extend the smoke test

Read `AGENTS.md` and `jules/contracts.md` first. All F2 tasks are merged.

## Files you may change / delete
`web/home/features/index.json`, delete `web/home/features/hello/` and `src/Cuy/dotNet/Features/PingFeature.cs`,
`tools/qa/web-smoke.js`, `web/home/app.js` (only bug fixes found by the checks below), feature files only for bugs the
checks find (list each fix in the PR).

## Steps
1. `features/index.json` = every folder in `web/home/features` that has `feature.js`, ordered: daily, shop, calendar,
   vet, coloring, decor, settings. Remove the hello example (web + C#).
2. Extend `tools/qa/web-smoke.js`: for each feature open it, take a screenshot, interact with the first visible button
   that is not destructive (skip buttons whose text contains Buy/Treat/Check-up/Claim/Unlock in a second pass where you
   DO click them in mock mode and assert no page error), close it. Also: open the More menu and assert every feature
   tile exists; trigger a page message `toast` through the mock bridge and assert the toast appears.
3. Run the smoke test, fix every page error / console error / broken layout you see (overflow outside the 400x620
   window, text cut off, buttons not reachable). Check the More grid with 8 tiles fits.
4. Make sure no feature auto-opens over the first-run screens (`needsNaming` true in mock: set it and assert only the
   welcome view is visible).

## Checks
`node --check` on changed JS; smoke test passes; screenshots of every feature attached as a workflow artifact
(CI already uploads `tools/qa/out`).

When done, open a pull request against `main` titled `F3-01: Feature wiring and smoke test`.
