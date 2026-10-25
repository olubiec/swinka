# Task F1-11: Pixel "colour by number" game in Home (feature module)

Read `AGENTS.md` first and follow it. Requires F0-02 (feature modules) merged. Runs in parallel with F1-10 (picture
library): until it is merged, use a small sample file you create (see below).

## Goal
A relaxing colouring game like the popular phone "bead art" apps (the reference the human showed: a big picture made of
round beads on a pink board, "Level 9" at the top, a tray of coloured beads at the bottom): a pixel grid,
each cell shows a small number, a palette of numbered colours at the bottom with progress per colour; pick a colour, tap
or drag over cells with that number to fill them; zoom and pan; a gallery of packs and pictures with progress; a
celebration when a picture is finished.

## Files you may add
`web/home/features/coloring/feature.js`, `web/home/features/coloring/feature.css`,
`web/home/features/coloring/sample.json` (3 tiny pictures in the format below, used only when
`assets/coloring/index.json` is missing), and add `"coloring"` to `web/home/features/index.json`. Do not edit any other file.

## Data format (from F1-10, exact)
`assets/coloring/index.json` → `{ version, packs: [{ id, title, price, count, thumb }] }`;
`assets/coloring/<packId>.json` → `{ id, title, pictures: [{ id, title, w, h, palette: ["#rrggbb"...], cells }] }`;
`cells` row-major, `.` = background, `1`-`9`,`a`-`z` = palette index + 1. Load with `fetch(api.assetUrl('coloring/...'))`;
load a pack only when opened.

## Persistence contract (C# side comes in task F2-09; implement both paths now)
- If `api.getState().coloring` exists (C# supports it): progress through messages
  - JS → C#: `{ type: 'coloring_load', pictureId }`, C# answers with a page message
    `{ type: 'coloring_progress', pictureId, painted }` (`painted` = string of `0`/`1` of length w*h, or empty);
  - `{ type: 'coloring_save', pictureId, painted }` (debounced 1.5 s while painting and on close);
  - `{ type: 'coloring_done', pictureId, cells: <number of colourable cells> }` when finished (C# gives the reward);
  - `{ type: 'coloring_unlock', packId }` to buy a pack; unlocked packs are in `state.coloring.unlockedPacks`,
    completed picture ids in `state.coloring.completed`, `state.coloring.rewardedToday` / `maxRewardedPerDay`.
- Otherwise (mock mode / old C#): localStorage key `cuy_coloring_v1` = `{ progress: { id: painted }, completed: [],
  unlockedPacks: [] }` (try/catch around storage). Packs with price 0 are always unlocked; in this mode a priced pack
  can be unlocked for free with a note "(test mode)".
- Wrap both in one small `Store` object inside feature.js.

## UI (inside the feature container; the modal is ~360 px wide, ~520 px high)
1. Gallery: pack list (tile: title, `done/total`, thumbnail of the `thumb` picture rendered from data in greyscale or
   colours if done, lock + price when locked) → picture grid (3 columns, thumbnails rendered to small canvases:
   finished = full colour, started = colour where painted + light grey elsewhere, new = light grey with outlines).
2. Editor: a `<canvas>` with the grid. Cell size from zoom (start: fit width; min 6 px, max 40 px per cell).
   - Cell drawing in "bead" style like the reference: every cell is a round bead (circle, 88 % of the cell) on a soft
     pink-beige board. Painted → bead in its colour with a small light highlight (top-left) and a 1 px darker rim;
     unpainted → pale grey ring with the number in grey when the cell is >= 12 px; unpainted cells of the selected
     number get a light tint of that colour (highlight); background `.` cells → tiny dim dots, not paintable.
     A toggle in the header switches to flat squares (saved in localStorage `cuy_coloring_style`).
   - Input: tap/click paints one cell; press-and-drag paints continuously (only cells of the selected number); a cell of
     another number gets a short red flash (no paint). Mouse wheel / pinch zoom around the pointer; drag with the right
     mouse button, the middle button, two fingers, or the "hand" toggle to pan. Buttons: zoom in, zoom out, fit, hand.
   - Palette bar (bottom, horizontally scrollable): round chips with the number, the colour, and a ring showing the
     fraction done for that colour; a finished colour shows a check mark and becomes dim. Auto-select the next
     unfinished colour when one finishes.
   - Header: back to gallery, picture title, overall %.
   - Finishing: confetti of coloured pixels, the picture shown in full, "Done!" with the reward text (from state after
     `coloring_done`, or "Well done!" in mock mode), a sound (`api.sound` if it has a fanfare/click method) and buttons
     Gallery / Next picture.
3. Levels: besides the gallery, a big "Play level N" button on the gallery start screen plays pictures in a fixed
   order (the `guinea_pigs` pack first, then `food_and_toys`, then unlocked emoji packs), N = number of completed
   pictures in that order + 1; the editor header then shows "Level N" like the reference.
4. Music: if `window.CuyMusic` exists, play track `calm` while the editor is open, stop on close.
5. Performance: draw only the visible cells; redraw on change with `requestAnimationFrame`; pictures up to 64x64 must
   stay smooth.
6. Register: `CuyHome.registerFeature({ id: 'coloring', title: 'Colouring', icon: 'icon-strawberry', order: 20, open, close })`.
   All CSS selectors start with `.feature-coloring`.

## Checks
- `node --check web/home/features/coloring/feature.js`.
- Smoke test passes (`npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`);
  the smoke test opens the feature automatically if `coloring` is listed in `web/home/features/index.json` – add
  `"coloring"` to that array (this is the only allowed edit outside your folder).
- PR: screenshots of gallery, editor zoomed in, finished picture (mock mode).

When done, open a pull request against `main` titled `F1-11: Colour-by-number game`.
