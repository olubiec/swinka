# Cuy

A pixel art guinea pig for the Windows desktop. It walks on the taskbar and on windows, has needs like a Pou-style pet, and grows up at the pace of a real guinea pig. A gift project, built with AI agents.

| What | Where |
| --- | --- |
| Project plan, stages and prompts (Polish) | `PLAN.md` |
| Rules for AI agents | `RULES.md`, `CLAUDE.md` |
| Architecture | `ARCHITECTURE.md` |
| Art (60 animations x 7 variants, icons), sounds and game data | `assets/` |
| Desktop app (C#, .NET Framework 4.8, based on eSheep, MIT) | `src/Cuy/` |
| Game logic (.NET Standard 2.0) and tests | `src/Cuy.Core/`, `tests/` |
| Home window and minigames (HTML/JS) | `web/home/` |
| Build, packaging and art tools | `tools/` |
| Licences | `THIRD_PARTY_NOTICES.md` |

Build and test: `powershell -ExecutionPolicy Bypass -File tools/build.ps1`. Manual release checklist: `TESTING.md`.

## Windows warns me when I start Cuy (SmartScreen, Smart App Control)

Cuy is a free gift project and the program is not signed with a code-signing certificate (a certificate for a private person in Poland is not available
through Azure Artifact Signing (formerly Trusted Signing), which accepts individuals only in the US and Canada). Because of that Windows may show a warning:

- **SmartScreen:** "Windows protected your PC". Click "More info" and then "Run anyway".
- **Smart App Control (Windows 11) switched on:** the file may be blocked completely, without a "Run anyway" button. Unblocking the file does not help. Either
  turn Smart App Control off in Windows Security, or wait until Microsoft recognises the file. The exact menu path and whether it can be switched back
  depend on your Windows build (not verified).
- **Antivirus false positives:** if an antivirus blocks Cuy, report the file as a false positive at https://www.microsoft.com/en-us/wdsi/filesubmission.
  Cuy uses no packer or obfuscator.

## WebView2 runtime

The Home window and the minigames run in Microsoft Edge WebView2. Windows 11 includes the runtime and most Windows 10 PCs have it. If it is missing, Cuy tells you and the
download page is https://developer.microsoft.com/microsoft-edge/webview2/ (choose "Evergreen").

## Weather data (Dane pogodowe)

The optional weather reactions use the free Open-Meteo API and its geocoding (GeoNames). Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the link is shown next to the weather in Settings. The free API may be used for non-commercial purposes
only: Cuy is a free gift and must not be sold or monetised while it uses it. Only the city name and its coordinates are sent. See `THIRD_PARTY_NOTICES.md`.

