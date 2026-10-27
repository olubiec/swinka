# W3-05: Album: silhouettes, first-seen dates and a counter
Goal: the Behaviour Album shows unseen stickers as dark "???" silhouettes, seen ones with name and first-seen date, and a "Collected N / M" counter, without any layout shift.
Depends on: W2-02 (strict smoke test) and W2-10 (state key `albumDates`) merged. Facts: the album is not a feature module; `openAlbumModal()` and the `STICKERS` list are in `web/home/app.js` (about lines 700-765); `state.album` is a list of animation names (unchanged), `state.albumDates` is `{ "<name>": "yyyy-MM-dd" }` and may be missing (mock state from `localStorage`, old builds). CSS classes `.album-grid`, `.album-card`, `.album-locked`, `.album-sprite` exist in `style.css`.
Change: `web/home/app.js` (only `openAlbumModal` and, if needed, `STICKERS`), `web/home/style.css` (only the album classes)
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `web/home/bridge.js`, `tools/qa/*`, C#.
Steps:
1. Header: "Collected N / M" where M is `STICKERS.length` and N the seen ones (replace the "Stickers found" bar, keep its look).
2. Unseen card: the same sprite drawn as a silhouette (CSS `filter: brightness(0)`, the existing `.album-locked` already does it: check it works at the current opacity), the name replaced by `???`, the small line "Not seen yet".
3. Seen card: sprite, name, and "First seen: 20 Oct" from `albumDates` (format day and short month, English, no library: a small `formatShortDate`); when the date is unknown the line is "Seen". Plain strings in `state.album` and objects `{ key, firstSeen }` are both accepted (future-proof, one small helper).
4. No layout shift: every card has the same height in both states (fixed `min-height`), the grid does not change size when a card flips; at 420x640 the modal body scrolls, the page does not.
5. Do not add anything to `tools/qa/web-smoke.js`: W3-01 opens the Album.
Verify: `node tools/qa/web-smoke.js` prints `WEB SMOKE OK`; `node --check web/home/app.js`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; two Playwright screenshots of the Album (the mock state with two seen stickers, and one with all seen: set `state.album` through `bridge.js` mock helpers or `page.evaluate`).
