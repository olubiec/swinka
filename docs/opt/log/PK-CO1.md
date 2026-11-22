# PK-CO1 Log
- Status: PASS (`node --check` + `tools/qa/ux-p131-companion.js` 9/9 passed).
- Decisions: UMD module (`window.Companion` / `module.exports`) with mulberry32 deterministic PRNG (default seed 1337), sub-stepped `dt` (max 50ms, cap 2000ms), grid fallback when random spawn/target points fail `isFree`/`minPigGap`, and `pushAwayFromPigs` guard if a pig moves within `minPigGap`.
- Data: `assets/data/companions.json` defines `version: 1`, `defaultId: "garden_friend"`, `allowedScenes: ["garden", "park"]`, `sprite: "sprites/companion_agouti/spritesheet.png"`, `frameSize: [64, 64]`, `floorY: 59`, `scale: 0.45`, `speed: 22`, `minPigGap: 20`, `reactRadius: 34`, `reactCooldownMs: 3500`, `idleMinMs: 1400`, `idleMaxMs: 3200`.
- API: `Companion.DEFAULT_DATA`, `Companion.create(data, opts)` -> `{ step(dt, ctx), entries(), setEnabled(on), setId(id), isEnabled(), getId() }`.
- Entries shape: `[{ id, x, y, frame, row, anim, facing, sprite, frameSize, floorY, scale }]`.
- Differences from R45: none.
- Stubs: none (pure module, no sibling dependencies).
