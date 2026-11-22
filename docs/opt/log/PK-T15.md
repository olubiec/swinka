PK-T15: 12 PASS, 0 DEFECT, 0 SKIP.
Command: `node --check tools/qa/ux-p121-rest-motion.js && node tools/qa/ux-p121-rest-motion.js` (exit 0).
Cases passed: RM-house-nose-only, RM-bed-and-cushion, RM-no-spot-fallback-floor, RM-two-pigs-sleep-together, RM-hop-above-and-returns, RM-zzz-only-while-asleep, RM-spot-not-on-blocked-cell (all 7 scenes), RM-hop-inside-scene, RM-stage-speed, RM-particles-cap, RM-wake-leaves-spot, RM-edit-moves-house-while-sleeping.
Decisions: tested pure UMD modules (RestSpots, PigMotion) and live Playwright CanvasPig across all 7 scenes (unlocked via CuyScenesMock.state('seven') + CuyScenes.def), with msedge fallback if default chromium missing.
Differences: used CuyScenes.def(id, st) instead of planned getScene; saved/restored CanvasPig.instance.behavior around isolated motion tests.
Left undone: none.
