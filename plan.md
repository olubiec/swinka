1. **Shadow Fix**:
   - In `web/home/canvas-pig.js`, currently the shadow is drawn in `drawPig` with `y = this.pigY + 59`.
   - Update it to compute lift height: `const h = Math.max(0, 60 - this.pigY);`
   - Shadow drawing parameters:
     - `y` should be `119` (which is `60 + 59`).
     - `radiusX` = `22 * Math.max(0.4, Math.min(1, 1 - h/80))`
     - `radiusY` = `6 * Math.max(0.4, Math.min(1, 1 - h/80))`
     - `alpha` = `0.45 * Math.max(0.2, Math.min(1, 1 - h/80))`
   - For drag release (`endDrag` in `bindEvents`), animate `pigY` back to 60 over 250ms with ease-out instead of instantly setting `this.pigY = 60`. We can add a property `this.fallVelocity` or just interpolate it in `update(dt)`. A simpler way is to set a target Y and let `update` interpolate it. Specifically, add `this.pigFallTimer` and `this.pigFallStartY` to manage the fall animation over 250ms.

2. **Owned Toys**:
   - Update `updateState(state)` to store `this.inventory = state.inventory || {};`. Initialize it to `{}` in `constructor`.
   - In `render()`, after `drawProps(ctx)` and before `drawPig(ctx)`, we will draw the owned toys on the floor (behind the pig). Or just add `drawToys(ctx)` in `render()` before `drawPig()`.
   - `house`: left side, icon 8 of `this.iconsImg` (row 0, col 8 assuming icons_16.png is 16x16 icons, so sx=8*16, sy=0). Drawn 3x (48px). Bottom at floor (`119`), so y = `119 - 48 = 71`. x = 6. (Actually, `house` overlaps hay rack if at x=6? Hay rack is at 8..36. Wait, "move the house so nothing overlaps". Let's put house at x=40.) Let's re-read spec: "house at the left... bottom at the floor, x 6. (The hay rack and water bottle are already drawn; keep them, move the house so nothing overlaps.)" Oh, move the house? Wait, "move the house so nothing overlaps". Maybe put the house at `x = 42` (hay rack ends at `36`).
   - `tunnel`: right side, icon 7 drawn 3x. Bottom at floor, right edge at `sceneWidth - 8`. Wait, water bottle is at `sceneWidth - 24` to `sceneWidth - 10`. So tunnel would overlap water bottle? Actually water bottle is floating (y=28..68). Floor is y=119. So tunnel at `sceneWidth - 8 - 48 = 184`.
   - `ball`: rolling on floor. icon 6 drawn 2x. `x = 150`, floor (y=119). Wait, it can roll. `this.ballX = 150;` Update it during ball play.

3. **Clicking a Toy**:
   - In `handleCanvasClick(e)`, add hit tests for house, tunnel, ball if they are owned.
   - If clicked and not playing:
     - Set `this.targetToy = toyName;`
     - Pig walks to toy: set `this.targetX = toyX;` (house: 42+24, tunnel: 184+24, ball: ballX).
     - In `update(dt)`, if `this.targetToy` is set, move `pigX` towards `targetX` at 60 px/s.
     - Once reached, start play animation (ball_push, tunnel_in then tunnel_out, house_enter then hidden 2s then house_exit).
     - Send `window.bridge.send({ type: 'play_toy', item: toyName })`.
     - Update `ANIM_DEFS` to include the new animations.

4. **Decor Hook**:
   - Expose `window.CuyRoom = { addLayer(name, z, drawFn), removeLayer(name) }`.
   - `this.layers = []`.
   - In `render()`, sort layers by `z`.
   - Layers with `z < 0` are drawn before props. Set flags `skipDefaultWall` and `skipDefaultFloor` if such layer registers as `name === 'wallpaper'` or `name === 'floor'`.
   - Check these flags before calling `drawHabitat()`.
   - Layers with `0 <= z < 10` drawn before pig.
   - Layers with `z >= 10` drawn after pig.

5. **Test**:
   - Smoke test passes.
