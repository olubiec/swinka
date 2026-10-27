# Task W1-03: Wire all Home features together, remove examples, smoke test catches layout problems

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: W1-01 and W1-02 merged (the task stops by itself if they are missing).
Replaces old task(s): F3-01. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

## Preconditions (check before changing anything)
Run `ls src/Cuy/dotNet/Features/CalendarFeature.cs src/Cuy/dotNet/Features/ToysFeature.cs`. If either file is missing, F2-02 or
F2-07 is not merged yet: STOP, open no pull request, and say in the Jules thread which one is missing.

## Facts about the repo (checked on main, 26.10.2026; do not re-derive them)
- The Home window client area is **420x640 px** (`src/Cuy/dotNet/HomeWindow.cs`, `ClientSize`). The smoke test viewport is already
  420x640. Use these numbers everywhere (older notes say 400x620: wrong).
- In the real app the page loads EVERY folder found in `web/home/features` (`HomeWindow.cs` builds `payload["features"]` from
  `Directory.GetDirectories`). `web/home/features/index.json` is read only in mock mode (a normal browser). So a leftover folder such as
  `hello/` would appear in the player's "More" menu.
- `features/index.json` lists `hello, coloring, daily, settings` today. `shop`, `calendar`, `vet`, `decor` are missing from it.
- Page API used by the checks: `window.CuyHome.listFeatures()`, `openFeature(id)`, `closeFeature()`. More menu = button `#btnMore`; tiles are
  `button[data-open-feature]` (an `album` tile is always first). Toast = page message `{ type: 'toast', text }` shown in `#globalToast`;
  in mock mode `window.bridge.dispatchMessage(msg)` delivers a page message. Mock state lives in `localStorage['cuy_mock_state_v1']`
  (`defaultMockState` in `web/home/bridge.js`). First-run view = `#welcome` (shown when `state.needsNaming` is true).
- `tools/qa/package.json` has exactly one dependency: `playwright` 1.56.1. Do not add another (AGENTS rule 5). Playwright 1.56 ships
  Chromium 141.0.7390.37 according to Playwright's release notes; the WebView2 runtime on the player's PC can be a different version.
- `tools/qa/web-smoke.js` prints "Missing files" (HTTP >= 400) but does not fail on them, and its step `03_shop` injects the shop
  scripts by hand. Both are fixed below.

## Files you may change / delete
`web/home/features/index.json`; delete `web/home/features/hello/` and `src/Cuy/dotNet/Features/PingFeature.cs`;
`tools/qa/web-smoke.js` (rewrite); `web/home/app.js` and `web/home/bridge.js` (only bug fixes for problems the checks find);
`web/home/features/*/feature.js|feature.css` (only bug fixes for problems the checks find; list each one in the PR).
Do not touch `tools/qa/calendar-screenshot.js`, any C# other than deleting `PingFeature.cs`, or any `*.bak` file (F3-05 handles them).

## Steps
1. `features/index.json` = exactly `["daily","shop","calendar","vet","coloring","decor","settings"]`. Delete `web/home/features/hello/` and
   `PingFeature.cs`; `grep -rn "hello\|PingFeature" web src tools --include=* -i` and remove only references to these two examples
   (docs in `web/home/features/README.md` may keep `hello` as a generic example: leave them if they are only illustrative).
2. Rewrite `tools/qa/web-smoke.js`. Keep: the CLI (`node tools/qa/web-smoke.js`), the static server, the `step()` helper, screenshots in
   `tools/qa/out/`, exit code 1 on any problem and the final line `WEB SMOKE OK`. Add:
   a. Print `Chromium <browser.version()>` at start (the log shows which engine CI used; do not claim it equals WebView2).
   b. Fail on `pageerror`, console `error` (keep the existing "Failed to load resource" exclusion), `requestfailed`, and on any HTTP
      status >= 400 for files under `/web/` or `/assets/` unless the URL is in an `ALLOWED_MISSING` array at the top of the file
      (empty at first). Run it once; for every 404 either fix the wrong URL or, if the page checks for the file on purpose, add it to
      `ALLOWED_MISSING` with a comment saying why.
   c. Folder check at the start: the set of directories in `web/home/features` must equal the set in `features/index.json`
      (both directions). Fail with the difference.
   d. A `layoutProblems()` function run with `page.evaluate` after every feature opens, after every click below, and on the More grid.
      Reference implementation (dependency-free; improve it if needed, keep it under 40 lines):
      ```js
      function layoutProblems() {
        const out = [], vw = window.innerWidth, vh = window.innerHeight;
        const root = document.querySelector('#modalBackdrop.active, .modal-backdrop.active') || document.body;
        const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' "' + (e.textContent || '').trim().slice(0, 30) + '"';
        const scrollParent = (e) => { for (let p = e.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (/(auto|scroll)/.test(o.overflowX + o.overflowY) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return p; } return null; };
        if (document.documentElement.scrollWidth > vw + 1) out.push('page scrolls horizontally');
        root.querySelectorAll('*').forEach((e) => {
          const r = e.getBoundingClientRect(), s = getComputedStyle(e);
          if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none' || e.closest('[data-allow-clip]')) return;
          if (!scrollParent(e) && (r.right > vw + 1 || r.left < -1)) out.push('outside window (x): ' + desc(e));
          if (!scrollParent(e) && r.bottom > vh + 1) out.push('outside window (y): ' + desc(e));
          if (/hidden|clip/.test(s.overflowX) && s.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 1 && (e.textContent || '').trim())
            out.push('text cut off: ' + desc(e));
          if (e.tagName === 'BUTTON' && (r.width < 4 || r.height < 4)) out.push('button has no size: ' + desc(e));
        });
        return out.slice(0, 10);
      }
      ```
      A step fails if it returns anything (after a 300 ms settle). Intentional clipping (canvas, designed ellipsis) gets the attribute
      `data-allow-clip` in the markup; do not weaken the function to silence a real problem.
   e. Feature pass: for each id in `CuyHome.listFeatures()`: open it, wait 400 ms, run `layoutProblems()`, screenshot
      `10_feature_<id>.png`. Then click the first visible, enabled `button` inside `#modalBody` whose text does NOT match
      `/buy|treat|check-up|claim|unlock|new pig|reset|delete/i`, wait 300 ms, run `layoutProblems()`, screenshot `10_feature_<id>_click.png`,
      close. Second pass (re-open the feature before each click, at most 3 per feature): click the buttons that DO match that pattern and assert no
      page error (the mock bridge may ignore a message: that is fine). Use `animations: 'disabled'` (and `caret: 'hide'`) in `page.screenshot`; both options are
      confirmed in the Playwright 1.56 docs (R20.5).
   f. More menu: click `#btnMore`; assert there is one `button[data-open-feature]` for every feature in `listFeatures()` plus `album`, that the
      ids `daily, shop, calendar, vet, coloring, decor, settings` are present and `hello` is not (8 tiles in total); run `layoutProblems()`;
      screenshot `05_more.png`.
   g. Toast: `window.bridge.dispatchMessage({ type: 'toast', text: 'Smoke toast' })`, then assert `#globalToast` text is `Smoke toast` and its
      opacity is `1`.
   h. First run: in a fresh page, set `localStorage['cuy_mock_state_v1']` (via `page.addInitScript`) to `defaultMockState` with
      `needsNaming: true`, reload, and assert: `#welcome` is visible, `#intro` and `#letter` are hidden, and no `.modal-backdrop.active` is open
      (no feature opens over the first-run screen).
   i. Remove the hand-written script injection from step `03_shop` (the shop is now in `index.json`).
3. Run the smoke test. Fix every page error, console error, missing file and layout problem it reports, in the smallest possible way
   (`app.js`, feature CSS/JS). Check the More grid with 8 tiles fits in 420x640. No redesigns, no new features.
4. Real-app consistency (read, do not change C#): confirm in the PR that `HomeWindow.cs` builds the feature list from folders, so the C#-only
   feature `toys` (F2-07, no web folder) causes no request; confirm the calendar page renders in mock mode without a C# `calendar` state.

## Checks
`node --check` on every changed JS file; `npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`
exits 0 and prints `WEB SMOKE OK`; `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` (PingFeature deleted); Core tests.
CI already uploads `tools/qa/out` as the artifact `web-smoke-screenshots`.

## PR description must contain
The `Chromium <version>` line; a table of every problem the checks found and the fix (file, what); every `ALLOWED_MISSING` and
`data-allow-clip` entry with its reason.

## Gotowe pliki
None.

## Testy ręczne (ZWERYFIKUJ NA PC)
- CI-01: run `Cuy.exe --selftest` on the PC and note the WebView2 version it prints next to the Chromium version in the CI log. Known
  UNVERIFIED differences between headless Chromium and WebView2 (not researched): autoplay and AudioContext, fonts, DPI scaling,
  `file://` vs the virtual host `https://cuy.assets/`. Open every Home feature once on the PC and compare with the CI screenshots.

When done, open a pull request against `main` titled `W1-03: Feature wiring and smoke test`.
