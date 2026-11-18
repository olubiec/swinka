# PK-T8 Log
Status: DONE
Results: 10 PASS, 2 DEFECT, 0 SKIP (W1-W12)
Verification: `node --check tools/qa/ux-p65-play-weather.js && node tools/qa/ux-p65-play-weather.js` -> exit 0
DEFECT W1: Play animations (`tunnel_in`, `tunnel_wiggle`, `tunnel_out`, `ball_push`) missing from `ANIM_DEFS` in `canvas-pig.js` so `playAnim` falls back to `idle`.
DEFECT W6: Toy is not restored after play ends (`endedPlay: false`, `suppressCleared: false`, `toyDraws: 0`).
