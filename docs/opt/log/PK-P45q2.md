# PK-P45q2: Owner test sheet and screenshots for wave P45
- Verification: node --check tools/qa/ux-p45-shots.js && node tools/qa/ux-p45-shots.js PASS (exit 0).
- Docs updated: Added Section "Wave P45" with test checklist and manual points (a)-(e) in docs/qa/UX_WAVE_CHECKS.md.
- Screenshots generated: docs/qa/shots/p45-<scene>-top.png, p45-<scene>-bottom.png, p45-<scene>.png for room, salon, garden, park, farm, market (420x720).
- Visual check: Inspected p45-garden-bottom.png and p45-salon-bottom.png. Baseboard clean, furniture stands on floor, pig proportion & shadow look sharp.
- Visual note: In outdoor scenes "Cuy is in Salon [Go there]" banner appears when pig is assigned to salon; plant in salon is mounted on the wall.
- Decisions: Supported Edge/Chrome candidate paths in browser launcher for headless QA environment compatibility.
