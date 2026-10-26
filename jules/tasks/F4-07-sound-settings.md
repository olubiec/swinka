# Task F4-07: Sound settings - volume, quiet hours, fullscreen mute

Read `AGENTS.md` first and follow it. Requires F2-08 (Settings panel) merged.

## Goal
`SoundManager` already has `Volume`, `QuietHours` (default 22:00-07:00), `MuteOnFullScreen`, the wheek rate limiter
(2 minutes) and pitch variation, but none of it is user-adjustable or saved. Expose it in the Settings panel.

## Files you may change
`src/Cuy/dotNet/SoundManager.cs`, `src/Cuy/dotNet/LocalData.cs`, `src/Cuy/dotNet/HomeWindow.cs` (settings messages),
`web/home/features/settings/feature.js` (or the settings code F2-08 created), `web/home/bridge.js` (mock), `web/home/sound.js`,
`web/home/lib/zzfx.min.js`, `THIRD_PARTY_NOTICES.md`,
`tests/Cuy.Core.Tests/AudioTests.cs` (only if you touch `SoundPolicy`).

## Specification
1. Settings state (extend the `settings` key of `jules/contracts.md`): `"volume": 70`, `"quietHours": { "enabled": true, "start": "22:00", "end": "07:00" }`, `"muteFullscreen": true`.
2. Messages: `settings_volume { value 0-100 }`, `settings_quiet_hours { enabled, start, end }`,
   `settings_mute_fullscreen { on }`. Persist in `LocalData` (settings file, not the game save); apply at start and live.
3. UI: a slider with a test "wheek" on release (rate limit applies), two time inputs, two toggles. Pixel style.
4. Quiet hours also silence the Home page music/sounds: send `soundSuppressed` boolean in the state (true while
   `SoundManager.IsSoundSuppressed`), and `CuyMusic` / `Sound` in the page pause while it is true.
5. The pet must never wheek more than once per 2 minutes (already enforced); add a test if it is not covered.
6. Page sound effects (R2.1, R2.2): `web/home/sound.js` generates short effects at runtime with ZzFX 1.4.0 (MIT, repository
   github.com/KilledByAPixel/ZzFX): vendor `ZzFXMicro.min.js` (1,226 bytes) as `web/home/lib/zzfx.min.js`, call `zzfx(...params)`,
   master volume is the global `zzfxV` (default 0.3; set it from the volume setting). Design own parameter arrays (coin, pop,
   click, soft error) with the sound designer https://killedbyapixel.github.io/ZzFX and paste the arrays into `sound.js` (no
   ready preset list exists). No jsfxr. The `AudioContext` starts suspended: `resume()` it on the first `pointerdown`/`keydown` (R2.4).
   Add ZzFX (MIT) to `THIRD_PARTY_NOTICES.md` and a line in the Settings footer ("sounds: ZzFX (MIT)").

## Checks
Build passes, `node --check`, smoke test passes, `dotnet test` passes if Core changed.

## Gotowe pliki
None for C#. The `MuteOnFullScreen` logic uses `FullscreenDetector` after F6-03; do not change its detection here
(the `SoundManager.IsFullScreenOrBusy()` bug is fixed in F6-03).

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC (`TESTY_RECZNE.md` AUTOPLAY-01): first sound only after the first click is acceptable; check it in the real Home.

When done, open a pull request against `main` titled `F4-07: Sound settings`.
