# RI4: Integration Analysis — Behaviour, Spots, Motion, Reactions, DrawBudget & WorldSounds

## 1. Module API vs Contract Discrepancies

All 6 pure UMD modules exist in `web/home/lib/`, alongside `assets/data/home_behavior.json` and `assets/data/draw_limits.json`.

| Module (`file:line`) | Contract | Discrepancies & Wiring Notes (`file:line`) |
| --- | --- | --- |
| `PigBehavior` (`web/home/lib/pig-behavior.js:576-584`) | R36 §5 (`R36.md:93-118`) | 1. Exports extra `getBudgetGroup` (`578`) besides `create`.<br>2. Top-level `ctx.mood` (`R36.md:98`) is ignored; only `ctx.needs.mood` (`203,214`) is read.<br>3. `idle_min_s` (`R36.md:43`) hits `default: break` (`274-275`).<br>4. `modifiers` also accepts `joy_weight`, `wheek_rate` (`130-135`).<br>5. `home_behavior.json:325-367` matches R37 §4 (`popcornDurationMs: 857`, 16 bubbles). |
| `RestSpots` (`web/home/lib/rest-spots.js:386-394`) | R37 §3 (`R37.md:44-73`) | 1. `pickFloorSingle` scans 4 corners + center (`176-182`) vs 2 corners in R37 §3 (`70`).<br>2. `pick` expects scene-pixel `item.x/y` (`330`) and `item.w <= 8 ? w * tilePx : w` (`115-116`). `canvas-pig.js:1182-1185` mutates `t.x/t.y` by `roomOffset` in-place, so pass `canvasPig.things`, not raw `CuyScenes.placedThings()`. |
| `PigMotion` (`web/home/lib/pig-motion.js:223-236`) | R37 §4 (`R37.md:74-110`) | 1. `offsetY` (`99-111`) ignores `popcornPeakFrac` (always `4*H*p*(1-p)`).<br>2. `particles(anim, tMs, rng, cfg, currentCount)` (`149-206`) is stateless: `tMs >= interval` emits on **every call** (`173`). Caller must pass time since last emission and reset accumulator when non-empty.<br>3. `speed` (`116-144`) & `bubble` (`211-221`) match R37 §4. |
| `PigReactions` (`web/home/lib/pig-reactions.js:220-235`) | R41 §3 (`R41.md:34-62`) | 1. Exports extra `isThrottled` (`226`), handles extra `'call'` (`204-210`), `'play'` (`212-215`); `trick` checks `ctx.isSulking` (`170`).<br>2. `react()` enforces `isThrottled` (`129-131`, default `600 ms`) returning `null`; `detectSulk` (`59-77`) must run **before** `react()` on clicks.<br>3. Emits `sound: 'purr'|'pop'|'chirp'|'chatter'`, missing in `web/home/sound.js:43-103`. |
| `DrawBudget` (`web/home/lib/draw-budget.js:357-369`) | R40 §3 (`R40.md:43-68`) | 1. `loadLimits()` (`81`) defaults to `'assets/data/draw_limits.json'`, which 404s from `web/home/`; pass `base + 'data/draw_limits.json'`.<br>2. **Coordinate mismatch**: `isVisible` (`114-120`) assumes normalized `anchorX/Y` (`0.5, 1`) and pixel `w/h` (`16`), whereas `canvas-pig.js:1194-1195,1895-1896,1934-1935` stores **pixel** `anchorX/Y` (`fw/2, sh`) and tile `w/h`.<br>3. `capAnimated` (`232-278`) reads `animated/frames/fps/light` on items, while `canvas-pig.js:1883,1929` stores light `frames/fps` on `this.lightScene.sources`. |
| `WorldSounds` (`web/home/lib/world-sounds.js:128-135`) | R40 §4 (`R40.md:69-94`) | 1. All 17 `EVENT_MAP` entries (`14-32`) and API match R40 §4.<br>2. Calls `Sound.play(cue)` (`108`) then `Sound[cue]()` (`113`), never loading `.wav` `file` paths (`29-31`). Since `sound.js:43-103` lacks `Sound.play`/`Sound.CUES`, cues outside `{click,wheek,crunch,sweep,fanfare}` silently no-op until PK-U2 updates `sound.js`. |

## 2. Anchors in `web/home/canvas-pig.js` for PK-CV3

1. **Init & Data (`canvas-pig.js:376`, `4255-4325`)**: At `:376` (`this.idleTimer = 400;`), init `this.behavior = null`, `this.motionCfg = null`, `this.pendingSpot = null`, `this._moveAnim = 'walk'`, `this._animElapsedMs = 0`, `this._particleAccMs = 0`, `this._pokeTimes = []`, `this._sulkUntilMs = 0`, `this._reactionPriority = 0`, `this._lastRenderMs = 0`. Add `setBehaviorData(actionsData, homeBehaviorData)` on `PigCanvas`, `CanvasPig` (`4255+`), and `PigCanvas` (`4466+`) to store `this.motionCfg = homeBehaviorData?.motion` and create `this.behavior = window.PigBehavior.create({ data: actionsData, homeData: homeBehaviorData, stage: this.stageKey })`.
2. **Disable Desktop Override (`canvas-pig.js:2911-2914`)**: Remove/gate `if (state.currentAction && ...)` in `updateState(state)` (`2874-2915`) so `HomeWindow.cs:656` (`UNVERIFIED` here, per `R36.md:141`) cannot clobber `PigBehavior`. Sync `isSick`, `sicknessAnim`, `isBirthday`, `favoriteFood` from `state`.
3. **`PigBehavior.tick` & `RestSpots.pick` (`canvas-pig.js:3188-3205`, `3093-3136`, `1174-1209`)**:
   - Replace `idleTimer` (`3188-3205`) with `PigBehavior.tick(dt, ctx)` once `this.behavior` is initialized (keep legacy fallback until async JSON resolves).
   - `ctx`: `needs: this.lastState?.needs`, `stage: this.stageKey`, `hour: new Date().getHours()`, `sceneKind: this.sceneKind || 'room'`, `hasSpot: (k) => !!window.RestSpots?.pick(...)`, `otherPigNear: this._multiPigActive && this.presentPigs.length > 1`, `sick: !!this.lastState?.vet?.isSick`, `weather: this.lastState?.weather`, `dragging: !!this.drag`, `modalOpen: !!document.getElementById('modalBackdrop')?.classList.contains('active')`, `hayInRack: this.lastState?.hayRack?.value`, `items: this.lastState?.inventory`, `musicPlaying: !!window.CuyMusic?.isPlaying?.()`.
   - On `decision.needsSpot`: call `RestSpots.pick({ kind: decision.id === 'nap' ? 'nap' : decision.needsSpot, scene: { id: this.sceneId, kind: this.sceneKind, walk: this.walk, isFree: (x, y) => this.isFree(x, y) }, things: this.things, pigPos: { x: this.pigX, y: this.pigY }, taken })`. If distant (`>4 px`), set `this.pendingSpot = { spot, decision }`, `this._moveAnim = 'walk'`, `this.setTarget(spot.gx, spot.gy)`; else face `spot.faceLeft` and `playAnim(spot.anim, decision.durationMs)`.
   - On `walk`/`zoomies`/`following`: set `this._moveAnim = decision.anim` (`walk|run|follow`) and call `pickRandomWalkTarget()` (`1619`). Otherwise call `playAnim(decision.anim, decision.durationMs)` + bubble + sound.
   - At `:3093` (arrival, alongside `pendingPlay`), handle `else if (this.pendingSpot)` before `exitsEnabled` (`3112`).
   - Call `behavior.interrupt(...)` on drag (`2459`) and reactions; call `behavior.resume(ctx)` when `animTimer <= 0` (`3176-3179`) or landing finishes (`2977`). In `setThings` (`1174-1209`) & `enforceFreePigs` (`1254-1296`), clear `pendingSpot` and wake pig if its spot's furniture moved/vanished.
4. **`PigMotion` Speed, Hop & Particles (`2834-2841`, `3076`, `3152`, `3215-3225`, `3725-3727`, `4075-4092`)**:
   - `playAnim` (`2834`): reset `_animElapsedMs = 0`, `_particleAccMs = 0`; increment `_animElapsedMs += dt` in `update` (`3072`).
   - Movement (`3076`): use `PigMotion.speed(this._moveAnim || 'walk', this.stageKey, this.motionCfg) * dt / 1000`. At `3152`, replace `'walk'` with `this._moveAnim || 'walk'` so `run`/`follow` are preserved.
   - Hop (`3725-3727`): add `PigMotion.offsetY(this.currentAnim, this._animElapsedMs || 0, this.motionCfg)` to `airY` when `!this.drag && !this._toss`.
   - Particles (`3215-3225`): accumulate `_particleAccMs += dt`, call `PigMotion.particles(this.currentAnim, this._particleAccMs, Math.random, this.motionCfg, this.particles.length)`, reset `_particleAccMs = 0` on emission, push `{ x: pigX + d.dx, y: pigY + d.dy, vx: d.vx, vy: d.vy, life: d.life, type: d.type }`. Extend `drawParticles` (`4075-4092`) with `'zzz'`, `'sweat'`, `'confetti'`, `'sparkles'`.
5. **`PigReactions` & Edit Click (`2777-2832`)**:
   - `handleCanvasClick` (`2791-2794`): when `this.isEditMode()` (`1412`), dispatch `CustomEvent('room-pig', { detail: { pigId } })` on `document` and return without `pet()`. Otherwise run `PigReactions.detectSulk(this._pokeTimes, now)` before `pet()`.
   - `pet()` (`2817-2832`) + new `applyReaction(event, extraCtx)` (`4255+`): call `PigReactions.react(...)` + `canInterrupt`, apply `anim/durationMs/bubble/sound/effect`, interrupt `behavior`, gate `bridge.send({ type: 'pet' })` by `!res.blocked`.
6. **`DrawBudget` (`2917-2926`, `3274-3397`)**:
   - `loop(now)` (`2917-2926`): check `DrawBudget.shouldDrawFrame(now, this._lastRenderMs, document.hidden)`; skip `this.render()` when `!draw`.
   - `render()` (`3274-3397`): build normalized proxy items (px `w/h`, fractional `anchorX/Y`, `animated` flag from `lightScene.sources`/`frames`), filter via `DrawBudget.selectItems(items, viewport, focus)` before splitting `flats` (`3275`)/`standing` (`3281`), apply `capAnimated`, `capLights` (`3305,3370`), and `capParticles` (`3392`).

## 3. Anchors in `index.html`, `app.js`, `features/index.json` & `places/feature.js`

1. **`web/home/index.html` (`290-322`, PK-APP3)**: Load `lib/world-sounds.js` after `sound.js` (`291`), and `lib/draw-budget.js`, `lib/pig-behavior.js`, `lib/rest-spots.js`, `lib/pig-motion.js`, `lib/pig-reactions.js` after `lib/play-targets.js` (`298`), strictly **before `canvas-pig.js` (`299`)**.
2. **`web/home/features/index.json` (`1-19`, `run`)**: `features/run/{feature.js,feature.css,mock.js}` exist on disk, but `"run"` is omitted from `features/index.json` (`1-19`), which `app.js:992-995` loads. Add `"run"` after `"places"` (`18`). (C# `state.features` at `app.js:989` is `UNVERIFIED`.)
3. **`web/home/app.js` (PK-APP3)**:
   - In `init()` / `initPigLight()` (`117-125, 140-144`): fetch `base + 'data/actions.json'`, `base + 'data/home_behavior.json'`, and `DrawBudget.loadLimits(base + 'data/draw_limits.json')`, then call `canvasPig.setBehaviorData(actions, homeBehavior)`.
   - Route `giveFood` (`501-518`), `btnClean` (`542-560`), `btnCall` (`563-578`) through `canvasPig.applyReaction(...)` / `PigReactions.react(...)`.
4. **`web/home/features/places/feature.js` (PK-PF3)**:
   - `applyScene` (`1089-1167`) already passes `sceneDef` (`kind`: `'room'|'outdoor'`) to `CanvasPig.setScene` (`1153`), `things` to `CanvasPig.setThings` (`1164`), and `targetPresent` to `CanvasPig.setPresentPigs` (`1346`).
   - Expose `CuyPlaces.getSceneContext()` (`{ sceneId, sceneKind, things }`) and ensure `applyScene` invalidates active rest spots when `sceneChanged` (`1144`) or `thingsSig !== lastThingsSig` (`1161`), including Edit `room_move`/`room_remove`.

## 4. Insertion Order & Risks

- **Order**: (1) `sound.js` (`Sound.CUES` + `Sound.play` + `purr/pop/chirp/chatter`, PK-U2/PK-APP3); (2) `index.html` + `features/index.json`; (3) `app.js` (JSON loaders + reactions); (4) `canvas-pig.js` (PK-CV3); (5) `places/feature.js` (PK-PF3).
- **Risks**:
  1. **Multi-pig bypass (P5, CRITICAL)**: `canvas-pig.js:3036-3069` returns early at `3068` when `_multiPigActive && presentPigs.length > 0`, delegating to `scenePigs.step()` (`scene-pigs.js:394-445`, `DEFAULT_SPEED = 70` at `:8`). Primary pig `PigBehavior`, `RestSpots`, and `PigMotion` will not run in multi-pig rooms unless integrated with `entries[0]` / `scenePigs`.
  2. **P39 walk & exits (`canvas-pig.js:3075-3157`)**: Walks must go through `pickRandomWalkTarget()`/`setTarget()`/`findPath()`; line `3152` forces `'walk'` and would clobber `'run'`/`'follow'`.
  3. **`DrawBudget` coords (`draw-budget.js:114-120` vs `canvas-pig.js:1194-1195`)**: Passing raw `this.things` with pixel `anchorX/Y` and tile `w/h` breaks `isVisible()` culling.
  4. **Edit mode & reduced motion (`R40 §5:102-103`)**: `handleCanvasClick` (`2792-2793`) still triggers `pet()` in edit mode, and `update(dt)` lacks `prefers-reduced-motion` handling.
  5. **Async startup & stateless particles**: Keep fallback until `actions.json` + `home_behavior.json` resolve; pass resettable `_particleAccMs` to `PigMotion.particles()`.
