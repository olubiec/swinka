# PK-P34a: Pig walks in 2D with depth and through exits
- Status: DONE
- APIs: CanvasPig.pigY, CanvasPig.pigX, CanvasPig.setExitsEnabled(bool), CanvasPig.enterFrom('left'|'right'), CanvasPig.setTarget(x,y), CanvasPig.walkTo(x,y), CanvasPig.onPigExit({to}), CanvasPig.fastForward(ms).
- Pig state: pigX (feet X center), pigY (feet Y), walk band clamping and 2D target picking with diagonal walk using side view animations.
- Depth scaling: lerp(depthScale[0], depthScale[1], (pigY - y0)/(y1 - y0)) rounded to steps of 1/8; sprite drawn anchored from feet (32, 59) rounded to whole pixels.
- Y-sort & debug: debug() exposes pig:{x,y,scale}, renderList [{id,y}], renderOrder [ids] sorting flat things first then standing props and pig ordered by feet Y.
- Exits: exit walk to scene edges triggers onPigExit({to}) once and hides pig; enterFrom places pig at edge and walks inwards 30 px.
- Toys and drag: toy walking uses 2D target reaching floor line 119; drag pick-up/drop respects walk band; dragging out of scene triggers take_out.
