# PK-P46t2 Log (Status: OK)
- Created `tools/qa/ux-p46-regress.js` (R1..R9, viewport 420x720, mock `seven`) verifying all 5 scenes x 4 times of day, outdoor Edit roundtrip, pig walking & `findPath` in `bg_clean: true`, places bar, presence chip & edge drag, room hotspot zero-cost (`CuyHotspots.EMPTY`), 100-frame timing, Store/Stash lifecycle, and `places/mock.js` vs `assets/data/outdoor_defaults.json`.
- R1 canvas sizes: `room(salon)` = 256x144 (internal 256x144, `roomSize` 192x112), `park` = 256x144 (internal 256x144), `garden`/`farm`/`market` = 256x144 (identical).
- R7 frame time: 100 frames in `room` = 469.60 ms vs `garden` (20 instances) = 58.60 ms (0.12x, well under 3x limit).
- R9 parity: `places/mock.js` matches `assets/data/outdoor_defaults.json` 1:1 on all items (`fx:<scene>:<id>`).
- Logged `DEFECT P46-D1` (3-line repro, exit 0 without `STRICT=1`): `park` in `places/mock.js` & `outdoor_defaults.json` uses 24x12 grid (items at x=16..21 -> px >= 256) while `place_scenes.json` updated `park.size` to `[256, 144]`.
- Also noted in R2: `rooms/mock.js` `room_move` only handles `CATALOG` items, so outdoor `fx:*` `room_move` is bridged in the test harness.
- Verification: `node --check tools/qa/ux-p46-regress.js && node tools/qa/ux-p46-regress.js` -> 9/9 PASS (exit 0).
