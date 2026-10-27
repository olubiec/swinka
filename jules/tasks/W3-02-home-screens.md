# Task W3-02: Home screens: diary, album, bond bar, hay gauge

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: W2-02 (diary engine) and W2-03 (bond + hay Core) merged.
Replaces old task(s): F4-04 + UI parts of F4-05 and F4-06. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

## Goal
One Home PR owns the shared Home files (`app.js`, `style.css`, `bridge.js`, `HomeWindow.cs` state) for all screens that depend on wave-2 Core:
Diary, Album, bond bar, hay gauge. Do Part A, then B, then C.

## Files you may change
New: `web/home/features/diary/feature.js`, `web/home/features/diary/feature.css`; edit `web/home/app.js`, `web/home/style.css`, `web/home/bridge.js`,
`src/Cuy/dotNet/HomeWindow.cs` (state keys `diary`, `album`, `bond`, `hayRack` and the feed handler for `hay` only), `tools/qa/web-smoke.js`.

## Part A: Diary and Album (from F4-04)

### Goal
Add the Diary screen and upgrade the existing Album screen to match the original plan: unseen stickers are dark
silhouettes with "???", seen stickers show a small animation, name and first-seen date, and there is a counter.

### Files you may change
New: `web/home/features/diary/feature.js`, `web/home/features/diary/feature.css`; edit the album code in `web/home/app.js`
(`STICKERS`, album rendering) and `web/home/style.css`, `web/home/bridge.js` (mock data for `diary` and album dates),
`src/Cuy/dotNet/HomeWindow.cs` (state: `album` becomes `[{ "key": "sniff", "firstSeen": "2026-10-20" }]`, `diary` list
of the last 60 entries `{ date, text }` newest first).

### Specification
1. State contract (`jules/contracts.md`, section `diary`): `diary: [{ "date": "2026-10-24", "text": "..." }]`;
   `album: [{ "key": "sniff", "firstSeen": "2026-10-20" }]` (keep the old key list readable: if an element is a string,
   treat it as seen with unknown date).
2. Album: grid of all 31 `STICKERS`; unseen = same sprite drawn with CSS `filter: brightness(0)` (silhouette) and the text
   "???"; seen = animated sprite (reuse the existing sprite-sheet card), name, "First seen: 20 Oct". Header shows
   "Collected 12 / 31". Pixel style, no layout shift when a card flips from unseen to seen.
3. Diary feature (registered with `CuyHome.registerFeature`, id `diary`, icon `book` if it exists in
   `assets/icons/icons.json` else the pig head): list of entries as small paper cards, newest first, date in a header,
   empty state "No entries yet. Come back tomorrow!". Entries are read-only.
4. Smoke test: add one check to `tools/qa/web-smoke.js` that opens the Album and the Diary and saves screenshots.

### Checks
`node --check` on every changed JS file; `node tools/qa/web-smoke.js` passes; build of `Cuy.csproj` passes.

## Part B: bond bar (UI part of F4-05)

State key `bond`: `{ "level": 4, "points": 61, "pointsToNext": 24, "next": { "level": 5, "title": "..." }, "pointsToday": 12, "dailyLimit": 30 }`
(use `Pet.NextUnlock()` from W2-03). UI: thin bar under the pig name "Bond 4", tooltip with the next unlock. Mock data in `bridge.js`.

## Part C: hay gauge and feed (UI part of F4-06)

State key `hayRack: { "value": 60, "max": 100 }` (from `Pet.HayRack`). Feed menu item `hay` calls `Pet.RefillHay()` (and plays the eat animation as today).
Small hay gauge on the feed button; show "The hay rack is empty" only if `StatusBubble` makes it a one-line change, otherwise leave a note in the PR. Mock data in `bridge.js`.

## Checks

`node --check` on every changed JS file; `node tools/qa/web-smoke.js` passes (extend it for Album, Diary, bond bar, hay gauge, screenshots); `Cuy.csproj` build passes; Core tests pass.

When done, open a pull request against `main` titled `W3-02: Diary, album, bond bar and hay gauge`.
