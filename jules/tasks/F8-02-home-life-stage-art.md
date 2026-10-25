# Task F8-02: Life stage look in the Home room (baby, senior, legend)

Read `AGENTS.md` first and follow it. Requires F4-01 and F0-02 merged.

## Goal
F4-01 changes the desktop pig only. The Home canvas (`web/home/canvas-pig.js`) must show the same stage: baby 75 % size
with a bigger head, senior with a greyer muzzle, legend with a golden outline in the room. Junior uses the baby sheet
if no junior folder exists (say so in the PR).

## Files you may change
`web/home/canvas-pig.js`, `web/home/app.js` (only what passes the stage), `web/home/style.css`, `web/home/bridge.js` (mock stage),
`src/Cuy/dotNet/HomeWindow.cs` (state field `stage` is already sent; check it).

## Specification
1. Load the sheet of the current stage (`assets/sprites/<stage>/spritesheet.png`, same grid as the embedded sheet) and draw
   with `image-rendering: pixelated`; the stage comes from the state key `stage`; on change reload the sheet without reload
   of the page.
2. Baby: draw at 75 % of the room pig size. Senior: CSS `filter` only on the sprite canvas (no separate art): `sepia(0.2) saturate(0.8)`.
   Legend: a golden 2-px outline drawn in the canvas (`#f2c94c`) around the sprite alpha, drawn once per frame.
3. The stage label under the name already exists; add the age line from the state.
4. Smoke test: mock stage `baby`, `senior`, `legend` and screenshot the Home screen for each.

## Checks
`node --check`; `node tools/qa/web-smoke.js`; build passes (no C# change expected).

When done, open a pull request against `main` titled `F8-02: Life stage art in Home`.
