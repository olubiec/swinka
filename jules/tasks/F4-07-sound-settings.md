# Task F4-07: Sound settings - volume, quiet hours, fullscreen mute

Read `AGENTS.md` first and follow it. Requires F2-08 (Settings panel) merged.

## Goal
`SoundManager` already has `Volume`, `QuietHours` (default 22:00-07:00), `MuteOnFullScreen`, the wheek rate limiter
(2 minutes) and pitch variation, but none of it is user-adjustable or saved. Expose it in the Settings panel.

## Files you may change
`src/Cuy/dotNet/SoundManager.cs`, `src/Cuy/dotNet/LocalData.cs`, `src/Cuy/dotNet/HomeWindow.cs` (settings messages),
`web/home/features/settings/feature.js` (or the settings code F2-08 created), `web/home/bridge.js` (mock),
`tests/Cuy.Core.Tests/AudioTests.cs` (only if you touch `SoundPolicy`).

## Specification
1. Settings state (extend the `settings` key of `jules/contracts.md`): `"volume": 70`, `"quietHours": { "enabled": true, "start": "22:00", "end": "07:00" }`, `"muteFullscreen": true`.
2. Messages: `settings_volume { value 0-100 }`, `settings_quiet_hours { enabled, start, end }`,
   `settings_mute_fullscreen { on }`. Persist in `LocalData` (settings file, not the game save); apply at start and live.
3. UI: a slider with a test "wheek" on release (rate limit applies), two time inputs, two toggles. Pixel style.
4. Quiet hours also silence the Home page music/sounds: send `soundSuppressed` boolean in the state (true while
   `SoundManager.IsSoundSuppressed`), and `CuyMusic` / `Sound` in the page pause while it is true.
5. The pet must never wheek more than once per 2 minutes (already enforced); add a test if it is not covered.

## Checks
Build passes, `node --check`, smoke test passes, `dotnet test` passes if Core changed.

When done, open a pull request against `main` titled `F4-07: Sound settings`.
