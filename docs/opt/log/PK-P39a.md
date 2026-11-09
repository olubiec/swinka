# PK-P39a: Scene blockers data and checker
- Schema: added `blockers: [{id, rect: [x0,y0,x1,y1]}]` and optional `behindLine: y` to outdoor scenes; room has `blockers: []`.
- Garden blockers: fountain, bench, flower_bed_left, flower_bed_right, tree_trunk_left, tree_trunk_right, burrow, hedge; behindLine: 74.
- Park blockers: tree_trunk_1..4, gazebo, river_bank_left, river_bank_right, bridge_post_left, bridge_post_right, bench_left, bench_right, lantern_left, lantern_mid, lantern_right; behindLine: 106.
- Farm blockers: fence_left, barn_base, fence_right; behindLine: 76.
- Market blockers: stall_left, notice_board, stall_center, crates_barrels, stall_right, sign_right; behindLine: 120.
- Extended tools/qa/place-scenes-check.js with rules B1 (in-bounds), B2 (no spawn overlap), B3 (>=60% free), B4 (1 connected 4px flood fill & exits reachable), B5 (unique ids), B6 (x0<x1, y0<y1).
- Exported checkBlockers and checkPlaceScenes for automated QA and in-memory fixture tests.
- Added tools/qa/ux-p39-blockers.js verifying place_scenes.json and rejecting 3 invalid fixtures (spawn overlap, disconnected, OOB).
- Verification passed; all 13 checks (C1-C7, B1-B6) OK.
