# PK-P39e: Pig scale and passing behind objects
- Status: DONE
- Scene defaults: pigWidthFrac: room/salon = 0.20 (body 46px = 19.2% of 240px); garden/farm/market/park = 0.17 (16.4% - 18.0%).
- Depth scale: scenes.js def() returns computed depthScale [top, bottom] in 1/8 steps from pigWidthFrac * sceneWidth / 46 and raw depthScale ratio.
- APIs: CanvasPig.scaleAt(y) and inst.scaleAt(y); CanvasPig.debug().pig {x, y, scale, drawnWidth, bodyWidth, frameWidth}.
- Behind objects: CanvasPig.drawBackgroundBlockersOverPig() redraws background slices (rect extended upward by height || 40px) over pig when pigY < blocker.behindLine || rect[3].
- Exits: setTarget allows walking to exits outside walk band when exitsEnabled; onPigExit handler synchronized between facade and instance.
- Verification: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p39-depth.js && node tools/qa/ux-p39-depth.js (D1-D5 PASS).

