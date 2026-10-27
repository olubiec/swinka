# Task F1-13: New 16x16 pixel icons for the upcoming features

Read `AGENTS.md` first and follow it.

## Goal
New features need icons in the same procedural pixel style as the existing ones (`tools/art/props.py`, function
`icons()`, helpers `E`, `shade`, `rect`, `Canvas`, palettes `MAT`/`RAMP`). Add them to the shared icon sheet
WITHOUT changing the index of any existing icon.

## Files you may change / add
new `tools/art/icons_extra.py`, `assets/icons/icons_16.png`, `assets/icons/icons.json`, `web/home/style.css` (only the
pixel-icon block), `tools/art/README.md` (one paragraph).

## Icons to add (append in this order; ids are final, other tasks use them)
food: `dandelion`, `apple`; toys: `hay_ball`, `chew_bridge`, `hammock`, `cuddle_cup`; vet: `vet`, `vitamin_drops`,
`medicine`; care: `calendar`, `water_drop`, `scale`, `brush`, `nail_clipper`, `broom`; decor: `wallpaper`, `floor`, `rug`,
`plant`, `picture_frame`, `lamp`; misc: `gift`, `palette`, `music_note`.
Readability at 16 px is the priority: strong outline colour `#3a1d17`, 2-4 shades per material, transparent
background, same light direction as the existing icons (top-left).

## Steps
1. `tools/art/icons_extra.py`: imports helpers from `props.py` (run from `tools/art`), defines one draw function per
   icon, and a `main(assets_dir)` that loads the existing `icons_16.png` (keep its pixels), appends the new 16x16 icons
   to the right in the order above, saves the PNG and adds the ids to `icons.json` (`"dandelion": 25, ...`). Running it
   twice must not duplicate (skip ids already present). Command: `cd tools/art && python3 icons_extra.py ../../assets`.
2. `web/home/style.css` pixel icon block: the sheet is no longer 25 icons wide. Introduce `--icon-count` (= total icons)
   on `.pixel-icon` and use `background-size: calc(var(--icon-count) * var(--s)) var(--s)`; add one
   `.icon-<id-with-dashes> { --i: N; }` line per new icon (same style as the existing lines).
3. Check `src/Cuy/dotNet/PetIcons.cs` reads indexes from `icons.json` and cuts `index * 16` from the sheet – it should
   work unchanged; if it hardcodes the width 400 or 25 icons, mention it in the PR (do not edit that file).
4. `tools/art/README.md`: how to add more icons later.

## Checks
- The first 25 icons of the new PNG are pixel-identical to the old ones (write a tiny Python check and show its output).
- Attach/describe a 4x preview of all new icons in the PR (render with Pillow, nearest neighbour).
- Smoke test passes (`npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`).

When done, open a pull request against `main` titled `F1-13: New pixel icons`.
