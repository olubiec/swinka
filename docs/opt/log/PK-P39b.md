# PK-P39b: Whole scene visible: layout below the places bar

- Places bar kept in normal flow above the canvas (`position: relative; width: 100%`).
- Replaced fixed 132px height on `.stage-viewport` with `flex: 0 0 auto; height: auto; background: var(--ui-wood-0)`.
- Set `#pigCanvas` to `width: 100%; height: auto; object-fit: contain; image-rendering: pixelated; image-rendering: crisp-edges;` to display full scene backgrounds preserving aspect ratio without clipping.
- Exposed CSS variable `--scene-k: 1` on `:root` and `.stage-viewport` for future integer scale multipliers.
- Created `tools/qa/ux-p39-layout.js` testing Ly1-Ly5 on mock `seven` across 420x720 and 360x640 viewports; all 5 tests pass.
