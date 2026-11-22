# PK-R45 Log
- Decisions: One optional companion `garden_friend` in `garden`/`park` only, default OFF (`CompanionEnabled=false`), zero effect on `Needs`/`Clovers`/`Brain`.
- Art choice: Used existing `assets/sprites/companion_agouti/spritesheet.png` (64x64, `scale: 0.45`) because no bird/snail sprites exist on disk (`K8 data-valid`).
- API/fields: `window.Companion.create(data, opts)` / `step(dt, ctx)` / `entries()`, `assets/data/companions.json`, `GameState.CompanionEnabled`/`CompanionId`, `companion.set { enabled, id? }`.
- Validation/contract: `CompanionMessages` (`IMessageRuleSet`) + `IsKnownCompanion`/`ValidateSetPayload`, `docs/contracts/companion.md`, `CanvasPig.setCompanion(cfgOrEnabled)`.
- Owner question (self-answered): Use existing `companion_agouti` spritesheet at 0.45x scale now vs wait for new bird PNG? Chose existing file so `K8 data-valid` passes without new binary PNGs; swappable via JSON later.
- Status: PASS (`foundation-check.js` pending).
