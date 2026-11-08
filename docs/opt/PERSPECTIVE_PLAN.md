# Plan: one perspective for pig, rooms and backgrounds (8.11.2026)

Source: measurement of the real renders (Playwright, `CanvasPig.debug()`), 4x crops of `assets/world/bg/*` and a read of `canvas-pig.js`, `scenes.js`, `rooms/feature.js`. Waves P45a-P45q are in `docs/opt/packages.spec.json` (prompts `docs/prompts/PK-P45*.md`). They run AFTER wave P39 and BEFORE P40 (P40 edits furniture on the scene, so the room geometry must be right first).

## Findings
1. Backgrounds (garden, farm, park) are an **oblique projection from above, no vanishing point**. Same-type objects keep their size at any depth (flower bed y~80: 32 px, y~125: 31 px). The pig had 0.82-1.0 depth scale in 1/8 steps: stronger than the world and off the pixel grid.
2. The pig is a side view, camera ~15-20 deg. It also walks away from or toward the camera in the side pose. Accepted for now (classic look); better poses are optional wave P46.
3. Room: the editor and Core use `cols x rows` cells of 16 px (12x7 = 192x112, `wallRows` 2 = wall 32 px). The canvas draws 240x130 with wall 96 px and `placedThings` uses `y*16`. Furniture on the floor grid does not match the floor in the main window. Core is NOT changed (`wallRows` is a C# constant with tests); the canvas follows the grid.
4. `drawHabitat` uses off-palette colours and an alpha shadow (`#c98d50`, `#6e4424`, `rgba(0,0,0,0.15)`), and the pig has an alpha ellipse shadow with a hard-coded floor line `119`.
5. Market is a front elevation with a 20 px walk strip: a corridor, not a floor. Left as is (see optional P46d).

## Decisions
- One camera: oblique from above, no vanishing point. Pig `depthScale` = `[0.9375, 1.0]` in 1/16 steps (64 px sprite -> whole pixels).
- Room scene = layout grid (`CuyRoomGeometry`), pig rooms of other sizes work for free.
- Blockers, pathfinding, whole-scene fit and light stay in P39 (not duplicated here).

## Waves (each wave waits for the previous one; packages inside a wave are parallel and file-disjoint)
| Wave | Package | What | Files | Model tier |
|---|---|---|---|---|
| P45a | PK-P45a | Calibration overlay tool: bg 4x + walk band + blockers + window crop + pig at top/bottom | `tools/qa/scene-overlay.js`, test | mid |
| P45a | PK-P45b | `CuyRoomGeometry`: layout -> size, wall, floor, walk band, cell<->px (pure) | `features/places/room-geometry.js`, `index.html`, test | mid |
| P45a | PK-P45c | ART: baseboard strip and floor-edge dither shadow | `tools/art/room_trim_art.py`, 2 PNG, `tiles.json` | mid |
| P45b | PK-P45d | Scene data: `depth_scale`, tuned `walk`, room `size_from_layout`, checker rules | `place_scenes.json`, checker, test | high |
| P45c | PK-P45e | Room drawn from the grid, new trim, placed furniture on the floor | `canvas-pig.js`, `scenes.js`, test | high |
| P45d | PK-P45f | 1/16 depth steps, one sprite shadow, no ellipse and no `119` | `canvas-pig.js`, test | high |
| P45q | PK-P45q | Windows checks, 5 screenshots, manual points | `docs/qa/UX_WAVE_CHECKS.md`, shots | low |

Gate between waves: the `Weryfikacja` line of each package and `node tools/qa/plan-audit.js`. Stage gate: PK-P45q runs the full build, `ux-all`, `web-smoke`, `check-assets`, `check-icons`, `run-exe-smoke`. Two failures of a UI package: switch its `model` (see `docs/opt/README.md`).

## How each element is implemented
- **Overlay tool (P45a):** Playwright page canvas, nearest-neighbour 4x, outlines in palette colours, deterministic output (byte-identical on re-run) so it can be diffed after each later wave.
- **Room geometry (P45b):** pure function `geometry(layout)`; defaults 12x7 wall 2 when fields are missing; `cellToPx` equals the current `placedThings` formula, so nothing moves in existing rooms except by design in P45e.
- **Scene data (P45d):** measure two same-type objects per scene first (expected ratio ~1.0), then write `depth_scale`, then place `walk` on real ground using the overlay. Market also gets `[0.9375, 1]` so P39e `D1` (top < bottom) holds in every scene.
- **Room engine (P45e):** `setScene(def)` takes `wallH`; `drawHabitat` stops using 96/130; trim sprites replace the colour rectangles; `floorLine()` replaces `119`; other scenes untouched; old saves load because layouts already hold `cols/rows/wallRows`.
- **Depth and shadow (P45f):** quantise scale to 1/16, draw `shadow_pig_<stage>.png` at the same step, delete the ellipse branch.

## How each graphic element is made
| Element | Where | How | Checks |
|---|---|---|---|
| Baseboard (16x8, tiles on x) | `assets/world/house/trim_baseboard.png` | `tools/art/room_trim_art.py`: wood ramp from `style_palette.json`, outline `#3a1d17`, light top edge 2 px, board 5 px with one nail and one knot, dark contact line 1 px; left/right edges seamless | palette-only, no alpha 1-254, seamless edge, `style_check.py`, `check-assets.js` |
| Floor-edge shadow (16x4) | `assets/world/house/trim_floor_shadow.png` | same script: 2-colour checker dither, densest on row 1, gone by row 4, fully opaque or fully transparent pixels | same |
| Pig contact shadow | `assets/world/fx/shadow_pig_{baby,junior,adult}.png` | existing; only reused (P45f). If `style_check` flags one, fix it in a later art package | `style_check.py` |
| Room wallpaper and floor | `assets/world/tiles/*` | existing 16x16 tiles, unchanged | n/a |
| Calibration overlays | `docs/qa/calibration/*.png` | generated by P45a, QA only, never shipped in `assets/` | deterministic output test |

## Optional wave P46 (NOT in the spec; start only after the owner tests P45q and says yes)
1. **P46a prototype (art):** pig walking toward and away from the camera (`walk_front`, `walk_back`, 8 frames, 64x64) for ONE variant (adult, ginger "cuy") rendered by `tools/art/pig.py` + a new `tools/art/anims_depth.py` (rows appended after the current last row, `rotation.json` strips like `turn_smooth`). Output to a scratch contact sheet; owner approves the look. Checks: `check_sprites.py`, `style_check.py`, frame bounding box inside 64x64, feet at y=59.
2. **P46b export (art):** same rows for all breeds, stages and baked named sheets via `export_all.py`, `export_breeds.py`, `export_named.py`; update `animations.json` and `variants.json`; test that every sheet has the rows and identical frame counts.
3. **P46c engine:** `canvas-pig.js` chooses the front/back animation when `|dy| > |dx|` on a walk leg; keep the side pose otherwise; test with the walk of P34.
4. **P46d market redraw (owner decision):** a market background with a deeper floor (>= 50 px of free ground in front of the stalls) in `tools/art/tiles_art.py`, then re-tune `walk`, `blockers` and P43 `hotspots`. Only if the 20 px corridor feels wrong in the owner test.
5. **P46e taller room wall (owner decision, Core change):** `wallRows` 2 -> 3 needs a C# constant change, a save migration for wall items and new tests; not planned.

## Risks
- P39 packages edit `canvas-pig.js`, `scenes.js` and `place_scenes.json` first; P45 prompts assume their API names (`blockers`, `behindLine`, `pigWidthFrac`, `--scene-k`). If a P39 log says otherwise, the P45 agent uses the real names and notes the difference.
- The window crop is the reason the room looked cut: P39b fixes it for all scenes; P45 does not add a second viewport fix.
