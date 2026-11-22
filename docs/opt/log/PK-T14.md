PK-T14: 12 PASS, 4 DEFECT, 1 SKIP (PAR-dance-music: no active music track in headless mock).
Command: `node --check tools/qa/ux-p120-behavior-parity.js && node tools/qa/ux-p120-behavior-parity.js` (exit 0).
DEFECT PAR-all-28: 6 actions missing on canvas (drink, rumblestrut, nose_touch, grooming_other, following, sleeping_together). Repro: run multi-pig + day phases in Home; expected: all 28 anims play; actual: _multiPigActive returns early in canvas-pig.js:3312 skipping behavior.tick.
DEFECT PAR-two-pigs-sleep-together: Two pigs never trigger sleep_together on canvas. Repro: setPresentPigs(2 pigs) at hour=23 energy=25; expected: sleep_together; actual: only idle/walk from scenePigs.
DEFECT PAR-actions-not-stuck: eat_hay (134750ms > 90000ms) and sniffing (15000ms > 8000ms) stayed active past maxMs (consecutive same-id picks or timer overflow). Repro: fastForward day phases; expected: <= maxMs; actual: exceeded maxMs.
DEFECT PAR-all-scenes: salon pig at (132,126) failed walk bounds check (inWalk=false). Repro: CuyScenes.def('salon') + fastForward(5000); expected: pig within walk rect; actual: y=126 outside salon walk.
Decision: tested real CanvasPig behavior loop via fastForward(250ms) and CuyScenes.def; used msedge fallback only if default chromium missing.
