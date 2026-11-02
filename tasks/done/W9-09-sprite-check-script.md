# W9-09: CI sprite integrity check
Goal: tools/qa/sprite-check.js verifies every sprite variant and fails on structural errors.
Zmieniaj: tools/qa/sprite-check.js
Wymagane: tools/qa/sprite-check.js
Weryfikacja: node tools/qa/sprite-check.js prints SPRITES OK
Steps:
1. For each variant in assets/sprites/variants.json (no new dependencies: parse PNG size from the IHDR header): spritesheet is 1024x3840 and _x2 is 2048x7680; animations.json lists 60 animations and 592 frames; the animation names, rows and frame counts equal baby's; animations_x2.json has floor_y 118.
2. Print one line per problem and exit 1 if any. Do not check fps (senior and legend are intentionally slower).
Zakazy: change existing assertions, files outside Zmieniaj.
