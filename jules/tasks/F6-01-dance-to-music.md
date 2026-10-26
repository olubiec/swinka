# Task F6-01: The pig dances when music plays on the PC

Read `AGENTS.md` first and follow it. Requires F4-09 (behaviour plug-ins), F2-08 (settings) and **F6-00** (NAudio 2.2.1) merged.
No new package in this task: F6-00 already put `NAudio.WinMM` + `NAudio.Wasapi` 2.2.1 into `src/Cuy/Cuy.csproj`.

## Design (changed after research R11, R12)
Not loopback capture and no BPM. Per-session peak meters (Windows `IAudioMeterInformation` through NAudio) tell whether some app
is audible; a tested Core detector turns the peak stream into "music". The detector and its tests already exist in the repo.

## Files you may change
New: `src/Cuy/dotNet/Platform/AudioSessionProbe.cs`, `src/Cuy/dotNet/Behaviors/DanceToMusicBehavior.cs`; edit
`src/Cuy/dotNet/LocalData.cs` (only if a setting helper is missing), `src/Cuy/dotNet/HomeWindow.cs` (setting message), settings
feature JS, `assets/data/audio_exclusions.json` (new, see 3). Do not touch `src/Cuy.Core/Audio/MusicDetector.cs` unless a test fails.

## Specification
1. `AudioSessionProbe` (`Cuy.Platform`): `float ReadPeak()` returns the loudest `AudioMeterInformation.MasterPeakValue` of all active
   sessions on the default render device, ignoring system sounds and Cuy's own process; `string LastLoudestProcess`; `Dispose()`.
   API facts checked in NAudio 2.2.1 (R11.2): `AudioSessionControl.GetProcessID` and `IsSystemSoundsSession` are PROPERTIES (no
   parentheses); `AudioSessionState` is in `NAudio.CoreAudioApi.Interfaces` (extra `using`); `SessionCollection` is a snapshot, so call
   `AudioSessionManager.RefreshSessions()` before each read; `AudioSessionManager` is NOT `IDisposable` (no `using` on it);
   `MMDevice` and `MMDeviceEnumerator` ARE `IDisposable` (dispose them, re-resolve when the default device changes);
   `AudioSessionControl.AudioMeterInformation` may be null (check) and every read goes in try/catch (HRESULT exceptions); no audio
   device must not throw. Create and use it on one thread (the UI thread; each call is well below 1 ms).
2. `MusicDetector` (`Cuy.Core.Audio`, exists): `Push(double peak, DateTime utc)` every 100 ms, `IsMusic`, event `MusicChanged`;
   defaults `Threshold` 0.02, `MinVariation` 0.15, `EnterSeconds` 5, `LeaveSeconds` 3, `WindowSeconds` 2. The peak value is
   instantaneous, so poll often. Thresholds have no documented value: keep them as properties set from `assets/data/actions.json`
   (key `music`) so they can be tuned without a rebuild.
3. Exclusion list: processes that are calls, not music (Discord, Zoom, ms-teams, Teams, WhatsApp, Skype, slack, Webex) are skipped
   by name. The names are UNVERIFIED: read them from `assets/data/audio_exclusions.json` (`{ "processes": [...] }`, compared
   case-insensitively without `.exe`), never hard-code them. Browsers are one session per browser (tabs are indistinguishable) so a browser
   call cannot be excluded; apps in exclusive mode read 0.
4. `DanceToMusicBehavior` (pattern in the ready-made file, namespace `Cuy.Behaviors`, contract of F4-09): dance bouts of at most 20 s,
   at most one bout per 3 minutes, request animation `dance`, stop within 1 s after the music ends and return to idle, never while
   asleep, busy, held, Home open or in quiet hours. Fix the one known mismatch: the ready-made code calls
   `QuietHours.IsInQuietHours(DateTime.Now.TimeOfDay)` but the repo's method takes `DateTime.Now`; use the repo signature.
5. Setting: `DanceToMusicOff` in `cuy.config` (missing = on), toggled from Settings (`settings_dance { on }`).
6. SMTC (`Microsoft.Windows.SDK.Contracts` 10.0.17763.x, Windows 10 1809+) is NOT part of this task; it is an optional extension after the
   manual tests (R12.3). Do not add that package.
7. CPU target below 1 %: one timer, no per-sample allocation, dispose the probe on exit; a failing probe disables the behaviour
   and logs `[Dance] disabled`.

## Checks
`dotnet test ... -c Release` passes; `Cuy.csproj` builds.

## Gotowe pliki
- `research/gotowce/src/Cuy.Core/Audio/MusicDetector.cs` → `src/Cuy.Core/Audio/MusicDetector.cs` (ALREADY copied; tested in
  `tests/Cuy.Core.Tests/ReadyMadeComponentsTests.cs`).
- `research/gotowce/src/Cuy/dotNet/Platform/AudioSessionProbe.cs` → `src/Cuy/dotNet/Platform/AudioSessionProbe.cs` (copy, then compile).
- `research/gotowce/src/Cuy/dotNet/Behaviors/DanceToMusicBehavior.cs` → `src/Cuy/dotNet/Behaviors/DanceToMusicBehavior.cs` (copy, then
  compile). Files under `research/gotowce/src/Cuy/` were never compiled (they need Windows + .NET Framework 4.8): use them as the starting point and fix compile errors in this task. Files already copied into `src/Cuy.Core/` and `tests/Cuy.Core.Tests/` by the rebuild session compile and are tested.

## Testy ręczne (ZWERYFIKUJ NA PC)
All of these are UNVERIFIED in the sources (R12.1-R12.3); the human runs them with the F6-09 probe (`TESTY_RECZNE.md` AUD-01..AUD-14):
- Spotify, YouTube in Chrome/Edge, VLC, a game: does the session peak rise and does the pig dance? Muted app, system mute, Bluetooth headset?
- Discord/Zoom/Teams/WhatsApp/Skype/Slack/Webex: real process names in Task Manager, is the call excluded?
- Does the browser session belong to the browser process or to the audio-service process? Can `AudioMeterInformation` be null?
- Is polling `Sessions` from the UI thread timer safe? Best threshold values.

When done, open a pull request against `main` titled `F6-01: Dance to music`.
