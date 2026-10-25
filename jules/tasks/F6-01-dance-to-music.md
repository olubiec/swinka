# Task F6-01: The pig dances when music plays on the PC

Read `AGENTS.md` first and follow it. Requires F4-09 (behaviour plug-ins) and F2-08 (settings) merged.
This task MAY add the NuGet package `NAudio` 2.2.1 (MIT) to `src/Cuy/Cuy.csproj` (the only new dependency allowed; add it
to `THIRD_PARTY_NOTICES.md` and make sure `tools/package.ps1` copies the needed DLLs into the ZIP).

## Files you may change
New: `src/Cuy.Core/Audio/MusicDetector.cs`, `tests/Cuy.Core.Tests/MusicDetectorTests.cs`,
`src/Cuy/dotNet/Behaviors/DanceToMusicBehavior.cs`; edit `src/Cuy/Cuy.csproj`, `src/Cuy/dotNet/LocalData.cs`,
`src/Cuy/dotNet/HomeWindow.cs` (setting message), settings feature JS, `THIRD_PARTY_NOTICES.md`, `tools/package.ps1`.

## Specification
1. Core `MusicDetector` (pure, no NAudio): `Push(double rms, DateTime utc)` called every 50 ms. State machine:
   Silent -> Music when RMS stays above `threshold` (0.02) for 5 s AND its coefficient of variation over a 2 s window is
   above 0.15 (steady noise/hum is not music); Music -> Silent after 3 s below threshold. Exposes `IsMusic`,
   `EstimatedBpm` (autocorrelation of the envelope over the last 8 s, null when unsure, range 70-180).
   Tests with synthetic envelopes: silence, constant hum (no music), 120 BPM pulses (music, BPM within +-6), 3 s gap ends music.
2. `DanceToMusicBehavior`: `WasapiLoopbackCapture` (default render device) in the behaviour thread; compute RMS from each
   `DataAvailable` buffer; if no audio device or no data (silence delivers no events) handle it: a 1 s watchdog timer pushes
   RMS 0. Catch all exceptions, log `[Dance]`, and disable itself without crashing the app.
3. While `IsMusic` and the pig is awake, not busy, not being held and Home is closed: request animation `dance` (loop it,
   re-request when it ends); stop within 1 s after music ends and return to idle. Optional: scale the animation playback
   speed within 0.8-1.4 from `EstimatedBpm` if the animation system allows it (skip otherwise, say so in the PR).
4. Setting `DanceToMusic` (default on) toggled from the Settings panel (`settings_dance { on }`).
5. CPU target < 1 %: do not allocate per sample; one timer; dispose the capture on exit.

## Checks
`dotnet test ... -c Release` passes; Cuy.csproj builds. PR section "Windows check for the human": play a song on YouTube,
the pig dances after ~5 s, stops 3 s after silence.

When done, open a pull request against `main` titled `F6-01: Dance to music`.
