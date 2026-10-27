# Task F1-04: Home room: shadow stays on the floor, owned toys and house are visible and playable, decor layer hook

Read `AGENTS.md` first and follow it.

## Problems
1. In the Home room (`web/home/canvas-pig.js`) the shadow is drawn at `pigY + 59`, so when the user drags the pig up
   the shadow flies with it.
2. The ball, the tunnel and the house can be bought, but they are not visible anywhere in Home.
3. Later tasks will draw wallpaper/floor/decor; they need a hook instead of editing this file.

## Files you may change
`web/home/canvas-pig.js` only.

## Specification
1. Shadow: always at the floor line `FLOOR_Y = 119` (scene coordinates, the floor the pig stands on when `pigY = 60`).
   Lift height `h = 60 - pigY` (>= 0). Ellipse radius x = 22 * clamp(1 - h/80, 0.4, 1), radius y = 6 * same factor,
   alpha 0.45 * clamp(1 - h/80, 0.2, 1). When the pig is released (`endDrag`), animate `pigY` back to 60 over ~250 ms
   (ease-out, "falls down") instead of jumping.
2. Owned items from `state.inventory` (passed to `updateState`): draw each owned one on the floor, behind the pig:
   - `house` at the left: use icon 8 of `icons_16.png` (`this.iconsImg`) drawn 3x (48 px), bottom at the floor, x 6.
     (The hay rack and water bottle are already drawn; keep them, move the house so nothing overlaps.)
   - `tunnel` at the right: icon 7 drawn 3x, bottom at the floor, right edge at sceneWidth - 8.
   - `ball`: icon 6 drawn 2x, rolling: it sits at x 150 on the floor; when the pig plays, it rolls away 30 px and back.
3. Clicking a toy (hit test on its drawn rectangle, using the existing `toScene` mapping) while it is owned:
   - the pig walks to it (move `pigX` toward the toy at 60 px/s, `walk` animation, facing the toy), then plays:
     ball → `ball_push` (row 53, 12 frames, 10 fps) for ~2.5 s with the ball rolling; tunnel → `tunnel_in` (row 50,
     15 frames, 12 fps) then `tunnel_out` (row 52, 10 frames, 12 fps); house → `house_enter` (row 48, 13 frames, 10 fps),
     hidden 2 s, `house_exit` (row 49, 13 frames, 10 fps). Add these rows to `ANIM_DEFS` (rows/frames/fps above come from
     `assets/sprites/baby/animations.json`).
   - send `window.bridge.send({ type: 'play_toy', item: 'ball' | 'tunnel' | 'house' })` once when the play starts
     (C# handles it in a later task; the mock may ignore it).
   - one play at a time; ignore clicks while playing.
4. Decor hook: expose `window.CuyRoom = { addLayer(name, z, drawFn) , removeLayer(name) }`. `drawFn(ctx, scene)` is called
   every frame with `scene = { width, height, floorY, state, time }`. z < 0 → drawn after the wall but before props
   (wallpaper, rugs); 0 <= z < 10 → after props, before the pig; z >= 10 → after the pig (foreground). Layers are
   sorted by z. Keep the current wall/floor drawing as the default when no layer replaces it (a layer may set
   `scene.skipDefaultWall = true` / `skipDefaultFloor = true` from a z < 0 layer registered with name `wallpaper` /
   `floor`; read these flags before drawing the defaults).
5. Keep everything else working: petting, poop clicks, drag out of Home (`take_out`), bubbles, sounds.

## Checks
- `node --check web/home/canvas-pig.js`.
- Smoke test passes: `npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`.
- Add a temporary manual check to the PR description: in a browser (mock mode) set
  `bridge.currentState.inventory.ball = 1` etc., the toys appear and clicking them plays.

When done, open a pull request against `main` titled `F1-04: Home room floor shadow, visible toys and decor hook`.
