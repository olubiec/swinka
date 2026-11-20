# RF3: Stripped Outdoor Background Scenery and Out-of-Bounds Park Defaults

## 1. Deleted background scenery across Market, Farm, Garden and Park (`*_bg.py`)

Auditing `tools/art/world/{market_bg,farm_bg,garden_bg,park_bg}.py` against `assets/data/outdoor_defaults.json` and `R46_INSTANCE_IDS` in `tools/qa/ux-p47-bg.js` separates items replaced by interactive instances from non-instance background scenery that was stripped and never replaced:

- **Market (`tools/art/world/market_bg.py`)**:
  - Replaced by instances: `stall_left` (`stall_basic`), `stall_center` (`stall_big`), `stall_right` (`stall_basic`), `notice_board` (`order_board`), `sign_right` (`signpost`) in `outdoor_defaults.json` (plus `crates_barrels` in `R46_INSTANCE_IDS.market`). Dead constant `STALLS` remains on line 14.
  - Missing background scenery:
    1. **Evening string lights (`BULBS`)**: Line 15 still computes 16 bulb positions `BULBS = [(x, HORIZON + 8 + int(5 * math.sin((x % 64) / 64 * math.pi))) for x in range(8, 250, 16)]` (`x = 8..248`, `y = 64..69`), but neither wires nor glowing bulbs are drawn in `world()`, and `build()` passes an empty list `[]` to `light.render(wim, "evening", [])` despite the docstring citing `"zrodla po swietle"`.
    2. **Upper plaza / backdrop detail**: `world()` leaves `r = random.Random(61)` (line 39) unused and paints only distant roof silhouettes (`y = 39..56`) over flat `"wood.3"`/`"wood.2"` ground (`y = 56..144`) and two cobble strips (`y = 122, 135`). There is currently no back wall ("mur") or posters in `market_bg.py`. Any background facade/posters/garland restored above `y = 74` sits clear of the stalls (`y = 5` tile row).
- **Farm (`tools/art/world/farm_bg.py`)**:
  - Replaced by instances: `barn` (`barn_hay`), `fence_left` / `fence_right` (`fence_farm`), `plot:0..3` (`plot_empty`). `import farm_b` (line 13) is unused; `world(plots=())` defaults to `()` so `build()` produces empty meadow below `HORIZON = 54`.
  - Missing background scenery: Distant wooden pasture fence along the horizon (`y ~ 50..56`, behind the meadow), omitted behind the right-side barn footprint (`x = 11` tile -> `px ~ 176..240`) so horizon rails never show through transparent barn pixels or window areas.
- **Garden (`tools/art/world/garden_bg.py`)**:
  - Replaced by instances: `bench`, `fountain`, `flower_bed_left`, `flower_bed_right`, `tree_left`, `tree_right`, `hedge`, `burrow` (plus `tree_trunk_left`, `tree_trunk_right` in `R46_INSTANCE_IDS.garden`).
  - Missing background scenery:
    1. **Garden gate (`gate_garden.png`)**: `world()` draws an unbroken picket fence across `x = 0..255` (`y = 56..70`, rails at `y = 61..62` and `66..67`), directly blocking the top of the stepping-stone path (`garden/path_stone.png`, `row 0..5`, `x ~ 118..135, y = 72..137`).
    2. **Horizon trees**: Line 11 still imports unused `tree_small` (and `MOSS`; line 12 imports unused `home`). Only low hill/bush bands (`y = 46..60`) sit behind the fence; distant background trees above `HORIZON = 58` (especially left/center `x ~ 16..160`) are missing.
- **Park (`tools/art/world/park_bg.py`)**:
  - Docstring still mentions `384x192`, `"lampy parkowe i kosz z zarem"`, whereas `W, HT, HORIZON = 256, 144, 46`, `STREAM = (54, 68)` (`y = 52..70`), and `extra=()` in `world(extra=())` / `build()` is unused. Line 11 imports unused `MOSS`.
  - **Conflict with instance list**: `outdoor_defaults.json` and `R46_INSTANCE_IDS.park` already define `gazebo`, `bridge` (`bridge_wood`), and `tree_1..4` (`tree_big`) as **placed instances**. Painting `gazebo` or `bridge_wood` or foreground `tree_big` directly into `park_bg.py` would double-render over those active instances.
  - Missing non-instance background scenery: Richer distant treeline/shrubs behind the stream (`y < 46`, currently only tiny radius 6..8 `blob`s at `y = 43`), plus optional evening/night ambient light sources in `light.render(wim, tod, [])` (if not solely driven by `lamp_post` instances).

## 2. Check against `tools/qa/ux-p47-bg.js` assertions

Direct inspection of `tools/qa/ux-p47-bg.js` (lines 1-176) shows that **zero background pixel regions or colors are tested**. Its assertions cover structure, metadata, and determinism only:

- **T1 & T6 (lines 63-78, 96-99)**: All 10 PNGs (`garden_{morning,day,evening,night}.png`, `park_{morning,day,evening,night}.png`, `farm.png`, `market.png`) exist, have valid PNG/IHDR headers, and have exact size `256x144`; `place_scenes.json` has non-empty `bg.{morning,day,evening,night}` strings.
- **T2 & T3 (lines 93-95, 101-119)**: `scenes[id].size === [256, 144]`; `walk`, `exits.*.x`, and every `blockers[*].rect` fit inside `[0, 0, 256, 144]`.
- **T4 (lines 121-131)**: `scenes[id].bg_clean === true`, and `scenes[id].blockers` contains no `id` from `R46_INSTANCE_IDS[id]` (or `defaultsData[id]` — note line 124 looks up `defaultsData[id]` instead of `defaultsData.scenes[id]`).
- **T5 (lines 151-167)**: Runs all four `*_bg.py` scripts twice and asserts identical SHA-256 checksums for all 10 output PNGs. Restored scenery must therefore use fixed `random.Random(seed)` instances and avoid non-deterministic iteration/timestamps.
- **T7 (lines 134-149)**: Checks `scenes.room` (`size`, `size_from_layout`, `behindLine === 48`, `walk` inside `[32, 48, 224, 128]`).

Because `ux-p47-bg.js` does not test pixels, avoiding overlap with placed instances is a **visual/architectural requirement** (`bg_clean` policy): keep baked scenery distinct from instance IDs in `outdoor_defaults.json` and `R46_INSTANCE_IDS`.

## 3. Out-of-bounds Park items in `outdoor_defaults.json`, `OutdoorDefaults.cs`, `OutdoorSeed.cs`, `places/mock.js`

On the `256x144` world with 16px tiles, grid dimensions are `Cols = 16` (`x in 0..15`) and `Rows = 9` (`y in 0..8`). The old `park_bg.py` was `384x192` (`24x12` tiles), and `"park"` defaults were never rescaled when backgrounds were resized to `256x144`.

Comparing `assets/data/outdoor_defaults.json` (lines 14-26) and `src/Cuy.Core/World/OutdoorDefaults.cs` (`CreateCodeDefaults()`, lines 237-250):
- `"park"` actually defines **11 items** (both JSON and code defaults match identically):
  - **6 items with `x < 16`**: `gazebo` `(4,2)`, `bench_left` `(7,8)`, `bridge` `(10,5, removable=false)`, `tree_1` `(0,1)`, `tree_2` `(13,1)`, `lamp_left` `(1,7)`. Note `tree_2` at `x=13` exceeds `Cols=16` if `tree_big` width `w > 3`, and `bench_left` at `y=8` exceeds `Rows=9` if `bench_park` height `h > 1`.
  - **5 items strictly out of bounds (`x >= 16`, two also `y >= 9`)**:
    1. `tree_3` (`tree_big`): `x = 16, y = 1`
    2. `lamp_mid` (`lamp_post`): `x = 17, y = 7`
    3. `tree_4` (`tree_big`): `x = 20, y = 1`
    4. `bench_right` (`bench_park`): `x = 21, y = 9` (out in both `x` and `y`)
    5. `lamp_right` (`lamp_post`): `x = 21, y = 10` (out in both `x` and `y`)
- Other scenes near edge (`Cols=16`): `farm` `fence_right` `(15,4)`, `market` `sign_right` `(15,6)`, `garden` `tree_right` `(14,2)` — valid only if their tile widths `w` satisfy `x + w <= 16`.
- **`OutdoorSeed.cs` actual behavior** (lines 16-80):
  - Method is `OutdoorSeed.Seed(WorldState world, string placeId, OutdoorDefaults defaults = null, Balance balance = null)` (there is no `EnsureSeeded`, `OutdoorSeedVersion`, or `RemovedFixtures` in `OutdoorSeed.cs`).
  - `Seed` does **not** call `RoomLayoutOps.CanPlace` or check grid bounds; it blindly appends `PlacedItem { X = entry.X, Y = entry.Y, ... }` to `room.Items` and increments `world.OwnedItems`, then adds `key` to `world.OutdoorSeeded`.
  - When `alreadySeeded == true` (`world.OutdoorSeeded.Contains(key)`), line 49 executes `if (alreadySeeded && entry.Removable) continue;`. Because all 5 out-of-bounds park items have `Removable = true`, any existing save with `"park"` already seeded will **never** be repaired by `OutdoorSeed.Seed`: either those items remain stuck off-grid at `(16..21, 1..10)` in `room.Items`, or if downstream placement/bounds logic rejects/drops them, the right half of the park stays permanently empty.
- **`web/home/features/places/mock.js`**: Excluded from `Czytaj tylko` in this package, so it was not read and must be inspected directly during `PK-PF-DATA`.

## 4. Exact restoration spec for `PK-PF-BG` and `PK-PF-DATA`

### `PK-PF-BG` (background scripts + regenerated PNGs)
1. **`tools/art/world/market_bg.py`**:
   - Restore scalloped cable connecting `BULBS` (`y = 64..69`, `x = 8..248`) and draw warm bulb sprites at `BULBS` coordinates (above the `y >= 78` stall zone).
   - Remove/replace unused `r = random.Random(61)` or use it deterministically for subtle plaza/backdrop stone texture; if adding distant market backdrop/wall posters above `y = 74`, keep them flat background art clear of `notice_board` (`x=64,y=96`) and `sign_right` (`x=240,y=96`).
   - Inspect `tools/art/world/light.py` for the light-source tuple schema and pass `BULBS` lights to `light.render(wim, "evening", lights)` in `build()`.
2. **`tools/art/world/farm_bg.py`**:
   - Draw a low wooden pasture fence along `HORIZON = 54` (`y ~ 50..56`, posts + two rails), skipping the right-side barn footprint (`x ~ 176..240` for `barn_hay` at tile `x=11`) so no fence posts/rails intersect the barn window or sprite. Remove unused `import farm_b`.
3. **`tools/art/world/garden_bg.py`**:
   - Inspect `assets/world/garden/` for `gate_garden.png` dimensions. Open a matching gap in the picket fence (`x ~ 116..140`, skipping posts and interrupting the horizontal rails at `HORIZON+3..4` and `HORIZON+8..9`) centered over the top of the `path_stone` path (`row 0` at `x = 118, y = 72`) and composite `gate_garden.png`.
   - Restore distant horizon trees behind the fence (`y < HORIZON`, e.g., using `tree_small` or deterministic horizon tree canopies along `x ~ 16..160`), avoiding heavy overlap with `tree_left` (`x=192`) and `tree_right` (`x=224`) instances.
4. **`tools/art/world/park_bg.py`**:
   - Do **not** bake `gazebo`, `bridge_wood`, or the 4 foreground `tree_big` instances into `park_*.png` (they are active instances in `outdoor_defaults.json` and `R46_INSTANCE_IDS.park`).
   - Restore richer distant horizon trees/foliage beyond the stream (`y < 46`, deterministic with `random.Random(43)`), update stale `384x192` docstring, verify stream/cobble path alignment with the `bridge` instance (`x=10, y=5`), and pass deterministic ambient lights if needed in `build()`.
5. Run all 4 generators and verify with `node tools/qa/ux-p47-bg.js` (determinism T5 + size/metadata checks).

### `PK-PF-DATA` (Park default coordinates + existing-save repair)
1. First inspect `items_world.json` (and `RoomLayout.cs` / `RoomLayoutOps.cs` / `WorldState.cs` / `places/mock.js`) to confirm exact `(w, h)` tile footprints for `tree_big`, `bench_park`, `lamp_post`, `gazebo`, `bridge_wood`, `fence_farm`, `signpost`, `tree_small`.
2. Rescale `"park"` defaults in **both** `assets/data/outdoor_defaults.json` and `OutdoorDefaults.CreateCodeDefaults()` in `src/Cuy.Core/World/OutdoorDefaults.cs` so every item satisfies `0 <= x`, `x + w <= 16`, `0 <= y`, `y + h <= 9`, e.g. within `x in 0..15-w`, `y in 0..8-h` (targeting right-half balance for `tree_3`, `tree_4`, `bench_right`, `lamp_mid`, `lamp_right` and adjusting `tree_2` / `bench_left` if their `w`/`h` exceeds `16`/`9`). Update `places/mock.js` if it mirrors coordinates.
3. Add an idempotent migration/repair path in `OutdoorSeed.Seed` (or versioned `OutdoorSeedVersion` on `WorldState` with safe default `0` -> `1`/`2`):
   - For any `"park"` default entry whose `uid` (`fx:park:<id>`) already exists in `room.Items` with out-of-bounds `(X, Y)` (`X < 0 || X + w > 16 || Y < 0 || Y + h > 9`, or matching legacy `24x12` coordinates `(16,1)`, `(17,7)`, `(20,1)`, `(21,9)`, `(21,10)`), relocate `item.X`/`item.Y` to the new in-bounds default coordinates without re-incrementing `OwnedItems`.
   - For any `"park"` default entry missing from `room.Items` (even when `alreadySeeded == true` and `entry.Removable == true`), seed it once during the version upgrade unless explicitly recorded as player-removed (`RemovedFixtures` if present in `WorldState`, else track one-time seed migration version so user removals after migration stay respected).
   - Ensure `RoomLayoutOps.CanPlace` / bounds invariants hold for every default item across all 4 scenes.

## 5. Prompt fixes

Downstream prompts `PK-PF-BG` and `PK-PF-DATA` (and `PK-RF3` assumptions) need these corrections:
1. **Correct Park default inventory & IDs**: There are **11** items in `"park"` (not 10); there is no `bench_2`, `lamp_2`, `bush_2`, or `x = 18`. The out-of-bounds items are `tree_3 (16,1)`, `lamp_mid (17,7)`, `tree_4 (20,1)`, `bench_right (21,9)`, `lamp_right (21,10)` (plus check `tree_2 (13,1)` and `bench_left (7,8)` against `w, h`).
2. **Correct `OutdoorSeed.cs` symbol names**: Use `OutdoorSeed.Seed` and `world.OutdoorSeeded` (not `EnsureSeeded`), add a safe-default seed version field on `WorldState` if versioning migration, and handle **already-seeded out-of-bounds items** in `room.Items` (since `OutdoorSeed.Seed` never checked `CanPlace`).
3. **Clarify `park_bg.py` vs instances**: Do not ask `PK-PF-BG` to paint `gazebo`, `bridge_wood`, or foreground `tree_big` into `park_bg.py` while they remain instances in `outdoor_defaults.json` and `R46_INSTANCE_IDS.park`; restrict `park_bg.py` restoration to distant horizon treeline behind the stream (`y < 46`) and lighting/path polish.
4. **Correct `ux-p47-bg.js` scope**: `ux-p47-bg.js` validates PNG size (`256x144`), metadata, and SHA-256 determinism (`T5`), not pixels; also note its line 124 bug (`defaultsData[id]` vs `defaultsData.scenes[id]`).
5. **Expand `Czytaj tylko` for `PK-PF-BG` and `PK-PF-DATA`**: `PK-PF-BG` needs `tools/art/world/light.py`, `tools/art/world/garden.py`, and sprite dimensions in `assets/world/{garden,park,market}/`; `PK-PF-DATA` needs `assets/data/items_world.json`, `src/Cuy.Core/World/WorldState.cs`, `RoomLayoutOps.cs`, and `web/home/features/places/mock.js`.
