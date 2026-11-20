# PK-RF3 Log
- Status: OK; created `docs/opt/foundations/RF3.md` covering sections `## 1.`..`## 5.` strictly from the 8 allowed read-only files.
- Decision: Flagged `places/mock.js` (referenced in RF3 outline but outside `Czytaj tylko`) as unread and deferred to `PK-PF-DATA`.
- Decision: Flagged `park_bg.py` conflict—`gazebo`, `bridge_wood`, `tree_big` (`tree_1..4`) are active instances in `outdoor_defaults.json` and `R46_INSTANCE_IDS.park`, so only distant horizon treeline (`y < 46`) should be baked into `park_bg.py`.
- Key finding (`ux-p47-bg.js`): Checks PNG dimensions (`256x144`), `place_scenes.json` metadata (`bg_clean`, `blockers`), and SHA-256 determinism (`T5`), NOT pixel values; line 124 reads `defaultsData[id]` instead of `defaultsData.scenes[id]`.
- Key finding (`park` defaults): `park` has 11 items (not 10; no `bush_2`/`bench_2`/`lamp_2`/`x=18`); 5 items exceed `16x9` bounds (`tree_3 (16,1)`, `lamp_mid (17,7)`, `tree_4 (20,1)`, `bench_right (21,9)`, `lamp_right (21,10)`) leftover from `384x192` (`24x12`) layout.
- Key finding (`OutdoorSeed.cs`): Actual API is `OutdoorSeed.Seed` + `world.OutdoorSeeded` (no `EnsureSeeded`, `OutdoorSeedVersion`, or `RemovedFixtures`); it appends `PlacedItem` without calling `CanPlace` and skips `entry.Removable` when `alreadySeeded == true`.
- Verification: `node tools/qa/foundation-check.js docs/opt/foundations/RF3.md 5` -> `FOUNDATION OK (5 sections, 13961 chars)`.
