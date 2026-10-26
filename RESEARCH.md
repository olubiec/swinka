# Cuy: plan researchu (Haiku)

Wersja z 26.10.2026. Uzupełnia `PLAN.md` i `PLAN_POPRAWKI.md` (część B). Notatki po polsku, polecenia po angielsku (RULES.md).

## Po co i jak

Cel: przed każdą falą Julesa sprawdzić, co da się wziąć gotowe (biblioteka, kod, wzorzec), żeby nie pisać od zera.
Research robi Claude Haiku: jedno wąskie pytanie = jedno zadanie. Haiku zbiera fakty, nie podejmuje decyzji.

1. Do każdego pytania doklej **wstęp** (niżej) i treść pytania z bloku `Question`.
2. Wynik zapisz jako `research/<id>.md` (np. `research/R3.2.md`).
3. Weryfikacja: Claude (Sonnet/Opus) sprawdza wersje, licencje i nazwy API z linków, potem poprawia prompt zadania
   w `jules/tasks/` (kolumna „Gdzie trafia”). Bez weryfikacji wynik nie trafia do promptu.
4. Research danej fali robimy, zanim fala trafi do `jules/queue/`.

### Wstęp do każdego pytania

```
Context: "Cuy" is a free, non-commercial gift: a pixel-art guinea pig desktop pet for Windows 10/11.
Stack: C# WinForms on .NET Framework 4.8 (based on eSheep/DesktopPet, MIT), game logic in .NET Standard 2.0 (C# 7.3),
Home window = WebView2 page in plain JavaScript, minigames in Phaser 3.80.1. Packaged as a zip today.
We prefer reusing permissive code (MIT, BSD, Apache-2.0, CC0) over writing our own; GPL code can only be used as a pattern.
Rules:
- Answer ONLY the question below. Keep it short and factual.
- Every fact needs a source URL. Prefer official docs, GitHub repos/issues/releases, NuGet/npm pages, StackOverflow,
  then forums (r/gamedev, html5gamedevs, Phaser forum). Say which kind of source each fact comes from.
- For each library/repo: name, URL, latest version and its date, licence (link the LICENSE file), supports
  .NET Framework 4.8 / .NET Standard 2.0 (yes / no / unknown) where relevant, size, last commit date.
- Never invent API names, versions or numbers. Quote signatures only from pages you opened. Mark guesses as UNVERIFIED.
- No code longer than 15 lines.
- End with two sections: "Answer for Cuy" (max 5 lines) and "Open questions / not found".
```

## Już sprawdzone (nie zlecać ponownie)

| Fakt | Źródło |
| --- | --- |
| NAudio 3.x jest tylko dla .NET 9+; dla net48 zostaje NAudio 2.2.1 (MIT). Repo ma dziś NAudio 1.8.4 w `Cuy.csproj` | nuget.org/packages/NAudio |
| Velopack 1.2.x celuje w net472 (działa z net48), MIT; `vpk pack --framework net48,webview2` doinstaluje środowiska; `GithubSource(repoUrl, null, false)`; `WaitExitThenApplyUpdates(asset, silent, restart)` | nuget.org/packages/velopack, docs.velopack.io |
| OpenMeteo.dotnet 2.0.0 wymaga .NET Standard 2.1, więc nie działa z net48: piszemy własny mały klient | nuget.org/packages/OpenMeteo.dotnet |
| Open-Meteo: tylko niekomercyjnie, < 10 000 zapytań/dzień, 5 000/h, 600/min, dane CC BY 4.0 | open-meteo.com/en/terms |
| Chromium `ui/base/fullscreen_win.cc` (BSD): SHQueryUserNotificationState (D3D, prezentacja) + okno na pierwszym planie = cały monitor bez ramki | chromium.googlesource.com |
| Phaser 3.90 to najpewniej ostatnia wersja v3; Phaser 4 wyszedł później | phaser.io/news/2025/05/phaser-mega-update |
| Licencje: NES.css 2.3.0 MIT, ZzFX 1.3.0 MIT, Tracery Apache-2.0, rot.js 2.2.1 BSD-3, uPlot MIT | npm / GitHub |
| Błąd: `SoundManager.IsFullScreenOrBusy()` uznaje kliknięty pulpit (Progman/WorkerW) za pełny ekran | kod w repo |

## Kolejność

| Kiedy | Pytania | Najważniejsze |
| --- | --- | --- |
| Teraz (przed resztą fali 2: F2-02, F2-04, F2-05, F2-07, F2-08) | R1, R2, R8 | R8 (zdrowie prawdziwych świnek w już scalonych F1-07/F1-08) |
| Przed falą 3 | R3, R4, R5 | R3 i R4 (pierwsze uruchomienie u niej) |
| Przed falą 4 | R6, R7 | R7 (zero opcji deweloperskich w paczce) |
| Przed falą 5 | R9, R10 | R10 |
| Przed falą 6 | R11, R12, R13, R14, R15 | R13 (też poprawka błędu w SoundManager) |

---

## R1. Pikselowe UI w Domku

Gdzie trafia: F2-08 (panel Ustawienia), potem F8-01 (osiągnięcia), F8-03 (reset, monitor), F6-08 (adopcja).
Decyzja do podjęcia: NES.css / inna biblioteka / zostajemy przy własnym CSS z `web/home/style.css`.

**R1.1**
```
Question: NES.css (github.com/nostalgic-css/NES.css). Give: latest released version and date, date of the last commit,
is it still maintained (open issues/PRs activity), licence, size of the minified CSS, whether it requires the
"Press Start 2P" font and how to use it with another pixel font (e.g. Pixelify Sans) instead.
```

**R1.2**
```
Question: Which NES.css components exist for: checkbox/toggle, radio, range slider, select/dropdown, text input,
dialog, progress bar, speech balloon, container with title, icons? For each give the class name and a doc/demo link.
List open GitHub issues about rendering in Chromium/Edge (WebView2 is Chromium-based) and about range inputs.
```

**R1.3**
```
Question: Compare pixel/retro CSS kits as alternatives to NES.css for a cute pixel-art pet game UI inside a 400x620 window:
98.css, XP.css, RPGUI, pixel-borders (or similar "pixel border" CSS/SCSS mixins), any other maintained kit you find.
For each: URL, licence, minified size, last release, which UI controls it styles, and how "cute game" vs "OS look" it is.
```

## R2. Dźwięki i muzyka w Domku

Gdzie trafia: `web/home/sound.js`, F2-08 (muzyka w grach, Ustawienia), F4-07 (głośność, godziny ciszy).

**R2.1**
```
Question: ZzFX (Frank Force, npm package "zzfx"). Give: repo URL, latest version, licence, which file to include in a plain
<script> page (no bundler), the API (zzfx(...params), master volume variable), and the URL of the official sound designer
tool that generates parameter arrays. Is there a CC0/MIT preset list of common game sounds (coin, pop, click, jump)?
```

**R2.2**
```
Question: For short retro sound effects in a browser page compare ZzFX, jsfxr (sfxr.me), and a plain Web Audio oscillator approach:
licence, size, sound quality/variety, whether sounds can be generated at runtime from parameters (no audio files).
Cite forum or blog comparisons (js13kGames, r/gamedev, html5gamedevs) where possible.
```

**R2.3**
```
Question: Juhani Junkala chiptune music on OpenGameArt (e.g. "5 Chiptunes (Action)", "Retro game music pack").
Give exact page URLs, track names, the licence stated on each page (CC0 or other), and whether attribution is required.
```

**R2.4**
```
Question: In a WebView2 control (Microsoft Edge WebView2, Win32/WinForms host), does page audio (HTMLAudioElement / Web Audio
AudioContext) start without a user gesture? Is the Chromium autoplay policy applied, and how can the host allow autoplay
(e.g. CoreWebView2EnvironmentOptions.AdditionalBrowserArguments "--autoplay-policy=no-user-gesture-required")?
Give Microsoft docs or GitHub issue links (MicrosoftEdge/WebView2Feedback).
```

## R3. Instalator i aktualizacje (Velopack)

Gdzie trafia: F3-03 i F7-03 (paczka), `src/Cuy/dotNet/AutoStart.cs`, `Program.cs`. Opcjonalne: ZIP zostaje.

**R3.1**
```
Question: Velopack with a .NET Framework 4.8 WinForms app: find GitHub issues/discussions (github.com/velopack/velopack)
or blog posts confirming it works, and known problems. Where exactly must VelopackApp.Build().Run() be called relative to
a single-instance Mutex and Application.Run? Any issue with apps that start hidden in the tray?
```

**R3.2**
```
Question: After installing with a Velopack Setup.exe on Windows: what is the install folder and the path of the main exe
(e.g. %LocalAppData%\<packId>\current\...)? Does that path stay the same across updates? What should a "start with Windows"
entry in HKCU\Software\Microsoft\Windows\CurrentVersion\Run point to (the exe in "current", a stub, or Update.exe)?
Does Velopack create Start menu / desktop shortcuts by default and how to configure it (vpk options)?
```

**R3.3**
```
Question: Velopack uninstall: what does it delete (install folder, shortcuts, registry)? Does it touch %AppData%\<app> user data?
Are there hooks (VelopackApp.Build().OnBeforeUninstallFastCallback or similar) to clean up an autostart Run key?
Give the exact hook names from the docs.
```

**R3.4**
```
Question: Velopack "--framework webview2" and "net48": how does the bootstrapper behave on a Windows 10 PC without WebView2
and without internet (error message? failure?). Is the WebView2 Evergreen installer downloaded or bundled?
Size of the resulting Setup.exe for a small app. Does Setup.exe from a browser download get the same SmartScreen warning
as an unsigned exe?
```

## R4. SmartScreen, antywirusy, podpisywanie

Gdzie trafia: `tools/package/README.txt` (instrukcja dla niej), F3-03, F7-03, decyzja o podpisie.

**R4.1**
```
Question: Azure Artifact Signing (formerly Azure Trusted Signing) in 2026: can an individual developer (not a company)
from Poland/EU use it? Monthly price, identity validation steps, how long validation takes, and whether signed apps
get immediate SmartScreen reputation. Official Microsoft Learn links only, plus one forum report if available.
```

**R4.2**
```
Question: SignPath Foundation free code signing for open-source projects: requirements (licence, public repo, CI build,
project activity), how to apply, typical waiting time, and whether a hobby project (desktop pet, MIT) qualifies.
```

**R4.3**
```
Question: For an UNSIGNED .exe downloaded from GitHub in 2026: what exactly does Windows 11 show (SmartScreen "Windows protected
your PC", Mark of the Web, Smart App Control)? Does "Properties -> Unblock" help with Smart App Control? How to submit a file
to Microsoft as a false positive (current WDSI URL and steps)? Give a 5-line plain-English instruction a non-technical user can follow.
```

**R4.4**
```
Question: Which Windows API patterns in C# desktop apps commonly cause antivirus false positives (SetWinEventHook,
EnumWindows, HKCU Run key autostart, global mouse polling, single-file packers, unsigned exe)? Cite StackOverflow,
Microsoft Q&A or vendor forum threads. List practical mitigations for a hobby app.
```

## R5. Ekonomia, codzienne nagrody, osiągnięcia

Gdzie trafia: F3-02 i F7-02 (symulacja 30/60 dni), `assets/data/economy.json`, F8-01.

**R5.1**
```
Question: Rules of thumb for virtual pet / idle game economies (faucets and sinks): typical time-to-afford for cheap, medium
and big purchases, daily earning caps, inflation control. Cite Game Developer (gamasutra) articles, GDC talks, Machinations.io
articles or well-known postmortems (Neko Atsume, Pou, Tamagotchi-likes). Give numbers where the sources give numbers.
```

**R5.2**
```
Question: Best practices for daily login rewards and streaks in casual games: cycle length, what happens on a missed day
(reset vs grace day), size of day-7 reward vs day-1, avoiding guilt/FOMO. Sources: game design articles, GDC, r/gamedesign.
```

**R5.3**
```
Question: Achievement design for small casual/cozy games: how many achievements, ratio of easy/medium/hard, typical reward
size relative to daily income, examples of achievement lists from cozy pet games. Cite sources.
```

## R6. Pamiętnik (generowanie tekstu)

Gdzie trafia: F4-03 (silnik pamiętnika), `assets/data/diary.json`. Mam gotowy, przetestowany silnik w stylu Tracery w C# (C# 7.3).

**R6.1**
```
Question: Tracery grammar format (github.com/galaxykate/tracery): exact syntax of actions ([key:value], [key:POP]),
the full list of modifier names in baseEngModifiers, and URLs of online editors/visualisers where a grammar JSON can be pasted
and previewed. Quote only from the repo or the official tutorial (tracery.io).
```

**R6.2**
```
Question: Are there maintained C#/.NET ports of Tracery (NuGet or GitHub)? For each: URL, licence, target framework
(does it support .NET Standard 2.0?), last update, supported features (actions, modifiers).
```

**R6.3**
```
Question: Advice on writing procedural text so short daily entries do not feel repetitive (Kate Compton
"So you want to build a generator", Emily Short's blog on procedural text, other well-known sources):
summarise the 8 most practical tips with links.
```

## R7. WebView2 w paczce bez opcji deweloperskich

Gdzie trafia: F4-10 (audyt), `src/Cuy/dotNet/HomeWindow.cs`, F3-03 (self-test).

**R7.1**
```
Question: List every CoreWebView2Settings property useful to lock down an embedded app page (dev tools, browser accelerator keys,
zoom, default context menus, status bar, autofill, password autosave, swipe navigation, pinch zoom, script dialogs).
For each: name, default value, minimum WebView2 SDK and runtime version. Microsoft Learn links only.
```

**R7.2**
```
Question: A .NET Framework 4.8 WinForms app uses WebView2 (Microsoft.Web.WebView2 NuGet). What exception is thrown when the
WebView2 Runtime is missing, how to detect the runtime first (CoreWebView2Environment.GetAvailableBrowserVersionString),
and the official Evergreen bootstrapper/standalone installer URLs. Is the runtime preinstalled on all supported Windows 10
and Windows 11 versions in 2026?
```

## R8. Realizm opieki i chorób (sprawdzenie scalonych F1-07 i F1-08)

Gdzie trafia: `assets/data/care.json`, `assets/data/health.json`, `assets/data/actions.json`, teksty w Lecznicy (F2-03/F2-04).
Źródła tylko weterynaryjne lub organizacje opieki: Merck Veterinary Manual, RSPCA, PDSA, RWAF, Blue Cross, VCA, uczelnie.

**R8.1**
```
Question: Guinea pig vitamin C: daily requirement in mg/kg for adults, and increased needs (pregnant, sick, young).
Which common vegetables are high and low in vitamin C (mg per 100 g) — bell pepper, parsley, kale, cucumber, carrot,
dandelion, strawberry, apple. Veterinary sources only.
```

**R8.2**
```
Question: Recommended home health routine for pet guinea pigs: how often to weigh, what weight loss (in % or grams over what time)
should trigger a vet visit, nail trimming interval, how often a routine vet check, cage cleaning frequency,
fresh water and hay guidance. Veterinary sources only.
```

**R8.3**
```
Question: For these guinea pig conditions give 3-5 early signs an owner can see and the urgency (emergency today / vet within
days / monitor): scurvy, dental malocclusion (overgrown teeth), bumblefoot (pododermatitis), mites/mange, respiratory infection,
gastrointestinal stasis, bloat. Veterinary sources only.
```

**R8.4**
```
Question: Guinea pig life stages with ages (baby, juvenile, adult, senior), typical lifespan, and the list of foods that are
toxic or unsafe (onion, chocolate, others) with reasons. Veterinary sources only.
```

**R8.5**
```
Question: Guinea pig daily activity: time spent resting/sleeping (nap length), eating, exploring, grooming, playing;
crepuscular activity; how often adults "popcorn"; meaning of wheeking, purring (content vs annoyed), rumbling, chutting,
teeth chattering. Compare with this budget and say which numbers are supported: rest 50 %, eating/drinking 28 %,
sniffing 8 %, walking 8 %, grooming 3 %, play 3 %; sleep 4-6 h/day in short naps; popcorn 1-3/day for adults.
```

## R9. Phaser

Gdzie trafia: wszystkie minigry (`web/home/minigames/lib/phaser.min.js`), F5-01..F5-04.

**R9.1**
```
Question: Phaser changelog from 3.80.1 to 3.90.0: list breaking changes and deprecations that affect Arcade physics,
spritesheet loading, animations, tweens, input (pointer, keyboard), Text and Graphics. Official changelog/release notes links.
```

**R9.2**
```
Question: Status of Phaser 4 in October 2026 (latest version, date) and of Phaser 3 (still receiving fixes?).
Main migration differences from v3 to v4 for a simple Arcade game. Is staying on 3.90 reasonable for a small offline project?
```

## R10. Gotowe minigry jako baza

Gdzie trafia: F5-01 Hay Hop, F5-02 Hay Maze, F5-03 Veggie Memory. Bez wyraźnej licencji w repo bierzemy tylko wzorzec, nie kod.

**R10.1**
```
Question: Open-source Phaser 3 "infinite jumper" / Doodle Jump style games with an explicit MIT, BSD, Apache or CC0 LICENSE file
(e.g. the Ourcade "Infinite Jumper" tutorial code). For each: repo URL, LICENSE link, Phaser version, and the file/function names
for platform recycling, camera follow upwards, horizontal screen wrap and game-over on falling.
```

**R10.2**
```
Question: Open-source Phaser 3 memory / card-matching games with an explicit permissive LICENSE file: repo URL, LICENSE link,
Phaser version, how the card flip is done (scaleX tween or other), and how input is blocked while two cards are checked.
```

**R10.3**
```
Question: Maze generation and path finding in plain JS: rot.js (ROT.Map.EllerMaze, DividedMaze, IceyMaze; ROT.Path.AStar/Dijkstra)
- exact API names from the rot.js docs, size of the browser build file and its URL; EasyStar.js - licence, size, API.
Is a perfect maze (recursive backtracker) guaranteed solvable and how many dead ends does it typically have?
```

## R11. NAudio (upgrade 1.8.4 -> 2.2.1)

Gdzie trafia: `src/Cuy/dotNet/SoundManager.cs`, F6-01 (taniec do muzyki), `tools/package.ps1` (DLL w paczce).

**R11.1**
```
Question: NAudio breaking changes from 1.8.4 to 2.2.1 that affect: WaveOutEvent, WaveFileReader, AudioFileReader,
SampleChannel / VolumeSampleProvider, SmbPitchShiftingSampleProvider, MMDeviceEnumerator/MMDevice (IDisposable).
Use the NAudio GitHub releases, CHANGELOG/RELEASE_NOTES and the "upgrading to NAudio 2" notes.
```

**R11.2**
```
Question: NAudio 2.2.1 per-session audio API - give exact member names and types from the source on GitHub:
MMDevice.AudioSessionManager, AudioSessionManager.RefreshSessions(), AudioSessionManager.Sessions (SessionCollection),
AudioSessionControl.GetProcessID, IsSystemSoundsSession, State (AudioSessionState enum namespace), AudioMeterInformation.MasterPeakValue,
MMDeviceEnumerator.HasDefaultAudioEndpoint. Link each to the source file.
```

**R11.3**
```
Question: Which assemblies does the NAudio 2.2.1 NuGet package bring into a .NET Framework 4.8 app (NAudio.Core, NAudio.Wasapi,
NAudio.WinMM, NAudio.Asio, NAudio.Midi, NAudio.WinForms...) and which of them are needed for WaveOutEvent playback plus
WASAPI session peak meters? Total size of those DLLs.
```

## R12. Wykrywanie muzyki

Gdzie trafia: F6-01. Plan zastępczy: mierniki głośności sesji (bez nagrywania dźwięku i bez liczenia BPM). Kod jest gotowy, trzeba sprawdzić, jak zachowują się aplikacje.

**R12.1**
```
Question: Windows per-session peak meters (IAudioMeterInformation on IAudioSessionControl, e.g. via NAudio): do they report
non-zero levels for Spotify desktop, Chrome/Edge playing YouTube, Discord, games, VLC? Known problems: one session for all
browser tabs, apps in WASAPI exclusive mode, Bluetooth headphones, muted session. StackOverflow / GitHub issue links.
```

**R12.2**
```
Question: How can a Windows app tell music playback from a voice call (Discord, Teams, Zoom, WhatsApp)? Do these apps use
the eCommunications role or a separate audio category that is visible per session? List process names of popular call apps
to exclude. Sources: Microsoft docs on audio roles/ducking, forum threads.
```

**R12.3**
```
Question: Can a .NET Framework 4.8 WinForms app use GlobalSystemMediaTransportControlsSessionManager (SMTC) to know that media
is playing? Which package is needed (Microsoft.Windows.SDK.Contracts? version), known threading/MTA problems, minimum Windows version,
and which apps report playback status to SMTC (Spotify, browsers, VLC). Is this simpler or more reliable than peak meters?
```

## R13. Chowanie przy pełnym ekranie

Gdzie trafia: F6-03 i poprawka `SoundManager.IsFullScreenOrBusy()`. Kod gotowy (port Chromium + wyjątek dla pulpitu), trzeba potwierdzić przypadki.

**R13.1**
```
Question: Real-world values of SHQueryUserNotificationState on Windows 10/11 for: exclusive fullscreen game, borderless
fullscreen game, browser F11, YouTube video fullscreen in Chrome/Edge, PowerPoint slide show, Teams/Zoom screen sharing,
Windows 11 Do Not Disturb / Focus. Which return QUNS_BUSY vs QUNS_RUNNING_D3D_FULL_SCREEN vs QUNS_PRESENTATION_MODE?
Cite forum/issue reports (e.g. projects that pause on fullscreen).
```

**R13.2**
```
Question: Open-source C# implementations of "pause when a fullscreen app is running": Lively Wallpaper, PowerToys, Flow Launcher,
Rainmeter plugins, others. For each: file URL, licence, and how the check differs from Chromium's fullscreen_win.cc
(window rect equals monitor rect + no WS_THICKFRAME/WS_DLGFRAME). Note any handling of the desktop shell windows (Progman, WorkerW).
```

**R13.3**
```
Question: On Windows 11, can a normal maximized window (Chrome, Edge, Explorer, Office) have a window rect equal to the monitor rect
and no WS_THICKFRAME? List known false positives of the "rect == monitor and no frame" check and how projects avoid them.
```

## R14. eSheep i drugi zwierzak

Gdzie trafia: F6-07 (towarzysz na pulpicie), F4-01 (wygląd według etapu), ewentualne poprawki DPI.

**R14.1**
```
Question: github.com/Adrianotiger/desktopPet: list releases and notable commits since January 2024 (DPI, multi-monitor,
taskbar position, performance, multiple pets). Link each and say which ones fix bugs in the WinForms pet window code.
```

**R14.2**
```
Question: In eSheep/DesktopPet (C#): how do child animations (<childs> in animations.xml) and multiple pets work in the code
(StartUp / FormPet, AddSheep, max pets)? Give file and method names with links. Can two pets interact, or only spawn children?
```

**R14.3**
```
Question: How do Shimeji-ee and VPet-Simulator implement interaction between two pets (Shimeji "Breed", "ScanMove", "Interact"
behaviours, affordances; VPet multiplayer/visits)? Summarise the pattern in 10 lines with links and licences (code reuse only if permissive).
```

## R15. Pogoda (Open-Meteo)

Gdzie trafia: F6-04. Klient i mapowanie kodów WMO są gotowe i przetestowane; zostały dwa szczegóły.

**R15.1**
```
Question: Open-Meteo geocoding API (geocoding-api.open-meteo.com/v1/search): does language=pl return Polish names
(e.g. "Warszawa", "Kraków")? How are ambiguous names handled (e.g. "Nowa Wieś") - ordering by population? Which fields exist
(admin1..admin4, country_code, population, timezone)? Official docs link.
```

**R15.2**
```
Question: Open-Meteo licence page: the exact attribution text/format they ask for (CC BY 4.0), where it should be shown in an app,
and confirm the "current" forecast variables temperature_2m, weather_code, is_day (names and units) from the docs.
```
