# Task F6-09: Diagnostic probe for audio sessions and full-screen state (Debug only)

Read `AGENTS.md` first and follow it. Requires F6-00 (NAudio 2.2.1), F6-01 and F6-03 merged.

## Goal
Several answers in the research are UNVERIFIED (what the audio session meters show for Spotify, Discord, VLC, browsers; what `SHQueryUserNotificationState`
returns for borderless games, F11, Teams). The human measures them on a real PC with this probe and writes the results into `TESTY_RECZNE.md`.

## Files you may change
New: `src/Cuy/dotNet/Platform/DiagnosticProbe.cs`; edit `src/Cuy/dotNet/Program.cs` (flag parsing only), `src/Cuy/dotNet/ContextMenus.cs` (Debug-only item),
`src/Cuy/dotNet/SelfTest.cs` (check that Release has no probe item, see F4-10), `TESTY_RECZNE.md` (a short "How to run the probe" section).

## Specification
1. Everything is `#if DEBUG`; the Release build contains no probe, no menu item and no flag (F4-10 audit applies). Flag `--probe` and a Debug tray item
   "Probe: start/stop" toggle it; the pig does nothing different while it runs.
2. Every second the probe appends one block to `cuy.log` (`[Probe] ...`, one line per item, English):
   - Audio sessions of the default render device: process id, process name (`Process.GetProcessById`, try/catch), session state
     (`AudioSessionState` from `NAudio.CoreAudioApi.Interfaces`), `IsSystemSoundsSession`, `AudioMeterInformation.MasterPeakValue` (or `null`), display name,
     and the peak the `AudioSessionProbe` would return; the MusicDetector decision (`IsMusic`, `Variation`). `GetProcessID` and `IsSystemSoundsSession` are
     properties. Call `RefreshSessions()` each time; every read in try/catch.
   - Whether the default render device exists and its friendly name (log a line only when it changes: headphones, Bluetooth).
   - Full-screen: the raw `SHQueryUserNotificationState` value (`QUNS_*` name), the foreground window class name, process name, window rect, monitor rect,
     `WS_THICKFRAME`/`WS_DLGFRAME`/`WS_EX_WINDOWEDGE` flags, and `FullscreenDetector.Check()` (`IsFullscreen`, `ShellBusy`, `Reason`). Log a block only when
     something changed (avoid a flood).
3. The probe must be cheap (below 1 % CPU), never throw and never block the UI thread for more than a few ms.
4. `TESTY_RECZNE.md`: add the section "How to run the probe" (how to start, where the log is: `%LocalAppData%\Cuy\logs\cuy.log`, which table rows to fill in).

## Checks
Debug and Release builds compile; Release has no probe (`--selftest` check).

## Gotowe pliki
- The probe reuses `research/gotowce/src/Cuy/dotNet/Platform/AudioSessionProbe.cs` (→ `src/Cuy/dotNet/Platform/AudioSessionProbe.cs`, added by F6-01) and
  `research/gotowce/src/Cuy/dotNet/Platform/FullscreenDetector.cs` (→ `src/Cuy/dotNet/Platform/FullscreenDetector.cs`, added by F6-03). No ready-made probe file exists:
  write `DiagnosticProbe.cs` here.

## Testy ręczne (ZWERYFIKUJ NA PC)
This task IS the tool for the manual tests. The human runs it with: Spotify, YouTube in Chrome and Edge, VLC, Discord, Teams/Zoom (call and screen share),
WhatsApp, Skype, Slack, Webex, a muted app, Bluetooth headphones, an exclusive-mode app (`TESTY_RECZNE.md` AUD-01..AUD-12), and with a borderless game, F11,
YouTube fullscreen, PowerPoint, Focus assist, maximised Chrome/Edge/Explorer/Office, a desktop click, a second monitor (`TESTY_RECZNE.md` FS-01..FS-10).

When done, open a pull request against `main` titled `F6-09: Diagnostic probe`.
