# Task F4-04: Diary and album screens in Home

Read `AGENTS.md` first and follow it. Requires wave 0-3 merged and F4-03 merged (state key `diary`, see `jules/contracts.md`).

## Goal
Add the Diary screen and upgrade the existing Album screen to match the original plan: unseen stickers are dark
silhouettes with "???", seen stickers show a small animation, name and first-seen date, and there is a counter.

## Files you may change
New: `web/home/features/diary/feature.js`, `web/home/features/diary/feature.css`; edit the album code in `web/home/app.js`
(`STICKERS`, album rendering) and `web/home/style.css`, `web/home/bridge.js` (mock data for `diary` and album dates),
`src/Cuy/dotNet/HomeWindow.cs` (state: `album` becomes `[{ "key": "sniff", "firstSeen": "2026-10-20" }]`, `diary` list
of the last 60 entries `{ date, text }` newest first).

## Specification
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

## Checks
`node --check` on every changed JS file; `node tools/qa/web-smoke.js` passes; build of `Cuy.csproj` passes.

When done, open a pull request against `main` titled `F4-04: Diary and album screens`.
