# W9-01: Home canvas plays all 60 animations and uses the junior sprite sheet
Goal: web/home/canvas-pig.js reads animation tables from assets/sprites/<stage>/animations.json instead of the hard-coded 23-entry ANIM_DEFS, and junior uses sprites/junior/spritesheet.png.
Zmieniaj: web/home/canvas-pig.js
Wymagane: web/home/canvas-pig.js
Weryfikacja: node --check web/home/canvas-pig.js; node tools/qa/web-smoke.js
Steps:
1. Load animations.json for each stage (baby, junior, adult, senior, legend) next to its sheet; keep the current ANIM_DEFS only as a fallback when the fetch fails. Use per-stage fps/frames (senior and legend differ from baby).
2. Replace `junior: .../baby/spritesheet.png` with `sprites/junior/spritesheet.png`.
3. playAnim(name) must not fall back to idle for any of the 60 names (startle, spin, hurdle, wheek, dance, sad, sick, party, etc.).
Context: audit found 37 of 60 animations silently fall back to idle in Home for every stage.
Zakazy: change existing assertions, new dependencies, files outside Zmieniaj.
