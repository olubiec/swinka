# PK-R5: Research multiple pigs on screen (P5)
- Status: DONE (foundation document docs/opt/foundations/R5.md verified with foundation-check).
- Item status: P5-01 Done (P31b/P38a), P5-02 Partly (CanvasPig single-pig only), P5-03 Partly (Core/C# done, UI/rules missing), P5-04 Open.
- Decision D1: 2nd desktop pig as minimal ambient companion (local FormPet loop, no BrainController AI collision) or drop 2nd window.
- Decision D2: Pinning UI in pigs/feature.js on pig cards sending existing message places.pigPin { pigId, pinned }.
- Decision D3: Schedule P5 in Wave 2 after Wave 1 (P44, P4) to avoid merge conflicts on canvas-pig.js and places/feature.js.
- Exact names: places.pigPin, places.pigMove, CanvasPig.setPresentPigs(pigLocs, roster), btn-pin-toggle.
- Package split: PK-P5a (scene rendering), PK-P5b (pinning UI & validation), PK-P5c (desktop handling), PK-P5q (QA smoke).
