# PK-T13: Visual baselines, palette and clipping checks
Status: DONE (4 PASS, 3 DEFECT, 0 SKIP)
Weryfikacja: `node --check tools/qa/ux-p69-visual-baseline.js && node tools/qa/ux-p69-visual-baseline.js` -> exit 0 (3 defect(s), 0 skip(s)).
- DEFECT V2: 28/28 existing baselines have 1.35%-1.80% pixel mismatch against current canvas render.
- DEFECT V3: Un-lit day scenes contain off-palette opaque pixels in dorm (82), garden (664), park (814), farm (264), and market (1172).
- DEFECT V4: Placed sprites in park extend >2px outside 256x144 canvas (bench_right, tree_3, tree_4, lamp_mid, lamp_right).
