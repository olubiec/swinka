# PK-CV2 Log
Status: OK
Changed: web/home/canvas-pig.js, web/home/features/places/scenes.js, tools/qa/ux-p50-canvas-wiring.js, docs/opt/log/PK-CV2.md
API: CanvasPig/PigCanvas.{setPresentPigs,setHotspots,getHotspots,onHotspot}, drawThing(frames/fps, suppressDraw, campfire), CuyScenes.hotspotsFor(sceneId, state) + w/h in placedThings
Decisions: _multiPigActive + _overridePrimaryPos preserves single-pig mode & CanvasPig.pigX/pigY writes; 1-pig renderList uses id 'pig' for D3 compat; _renderNowMs locks strip frame across thingLitCanvas dual draw; hotspotsFor applies stageOffset for rooms; editMode via CuyEdit.isOpen()
Differences vs R32: anchors shifted per RI1.md; CuyEdit.isOpen() instead of CuyEditMode; play-targets/scene-pigs/hotspots loaded via addScriptTag in ux-p50
Stubs in tests: ux-p50-canvas-wiring.js stubs CuyEdit.isOpen() for C9 and offscreen 64x16 strip canvas for C6 brazier_on
Perf: 1-pig drawImage=4 p95=3.40ms | 3-pigs drawImage=10 p95=9.00ms
Verify: node --check PASS; ux-p50-canvas-wiring.js PASS (C1-C12, Perf); ux-p47-room.js PASS (T1-T5); ux-p46-render.js PASS (D1-D8)
Pre-existing FAILs (per RI1.md, unchanged): ux-p44-drag-edge.js (G7), ux-p39-blockers.js (B5), ux-p45-pig-depth.js (PD3), ux-p34-pig-walk.js (W3, W8)
