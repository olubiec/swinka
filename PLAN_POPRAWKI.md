# Cuy: poprawki planu (wersja z 25.10.2026)

Ten plik uzupełnia PLAN.md. Nie zastępuje go. Notatki są po polsku, prompty dla agentów po angielsku (zgodnie z RULES.md).

Kolejność użycia: (1) wstęp dla agentów, (2) zmiany w starych promptach, (3) nowe prompty E1, E2, E3, E5, E6, F2, F3, (4) prompt licencji, (5) zlecenia researchu dla Gemini (część B).

---

## A1. Wstęp do doklejenia na początku KAŻDEGO promptu z PLAN.md (C4, C5, D2-D5, E*, F*)

```
Preamble. Read RULES.md and ARCHITECTURE.md first. PLAN.md prompts written before the Cuy rename use old Polish names:
map them with the tables in RULES.md (swinka/ -> assets/, SwinkaCore -> src/Cuy.Core, domek/ -> web/home,
domek/minigry -> web/home/minigames, ZASADY.md -> RULES.md, needs/stages/item ids -> English ids).
All code, comments, UI texts, diary templates and docs are in English. Do only the current task.
Game ids, data keys and file names follow RULES.md. If this prompt contradicts RULES.md, RULES.md wins; report the contradiction.
```

## A2. Zmiany w istniejących promptach

**C4 (wiek, etapy, więź)**
- Zamiast pola `start_wzrostu` użyj `GrowthStartUtc` z CC3.
- Zmień `GrowthEnabled` w `Balance.cs` z `false` na `true` (CC3 trzyma świnkę na etapie baby).
- Foldery sprite'ów: `assets/sprites/baby|junior|adult|senior|legend`. Uwaga: `junior` nie istnieje jako folder (CC1 mapuje junior na baby). Najpierw sprawdź `assets/sprites/`; brakujący wariant zgłoś w raporcie, nie rysuj go.
- Dodaj test: po włączeniu wzrostu świnka z zapisu v1 nie przeskakuje etapu (wiek liczony od `GrowthStartUtc`).

**C5 (album, pamiętnik)**: szablony pamiętnika po angielsku, nie po polsku (RULES.md). Reszta bez zmian.

**D2-D5 (minigry)**: ikony i arkusze z `assets/icons/icons_16.png` i `assets/sprites/<stage>/`, nie z `/swinka`.

**Etap F: co wypada**
| Krok | Decyzja |
|------|---------|
| F1 dźwięki | zrobione w rundzie 5b, wypada |
| F2 ustawienia, autostart, tray | autostart i tray zrobił CC3; zostaje tylko okno ustawień (nowy F2 niżej) |
| F3 instalator | zip + `package.ps1` + selftest już są; instalator opcjonalny (nowy F3 niżej) |
| F4 przegląd | zastąpiony etapami QA1 i QA2 |
| F5 personalizacja | zrobione w CC3 (imię, liścik) |

**Bramka F** staje się: wynik QA1/QA2 bez P0 i P1 + 3 dni na czystym laptopie.

---

## A3. Nowe prompty

### E1: muzyka i taniec (Claude, /plan)

Zamiast własnej autokorelacji: najpierw prosty detektor "muzyka gra" na mierniku głośności urządzenia, BPM tylko opcjonalnie.

```
Task E1: dance to music. Read RULES.md, ARCHITECTURE.md, Brain and the E3 FullscreenDetector (if it exists).
Reuse existing libraries, do not write DSP from scratch.
1. Cuy.Core: interface IMusicSignal { bool IsMusicPlaying; double? Bpm; } and a Brain condition "music".
   The action dance gets a high base weight while music plays; at most one dance bout per 3 minutes, 8-20 s each,
   stops when the music stops. Quiet hours and full-screen mute apply (no dancing while hidden).
2. src/Cuy/dotNet/MusicDetector.cs implements IMusicSignal with NAudio only. Step A: poll the default render device
   peak meter (MMDevice.AudioMeterInformation.MasterPeakValue) every 100 ms. Music = peak above a threshold AND
   enough variation (standard deviation over a 5 s window above a threshold) for at least 5 s; steady noise and
   constant hum must not count. Re-resolve the default device when it changes (headphones plugged in) and survive
   having no audio device. Put thresholds in assets/data/actions.json or a settings constant, not inline.
3. Step B (OFF by default, behind a setting "Dance in rhythm"): BPM through WasapiLoopbackCapture +
   SoundTouch.Net BPMDetect. Known gotcha: loopback raises no data events while the device plays silence, so use a
   2 s watchdog and treat "no data" as "no music". Before adding the package, check its licence (original SoundTouch is
   LGPL) and report it; if it is a problem, skip Step B and leave Bpm = null.
4. Without a BPM the dance animation loops at its normal speed; with a BPM, scale frame time within +-25 %.
5. Tests with a fake IMusicSignal in tests/Cuy.Core.Tests (weight, cooldown, stop). Add a --music-test Debug flag that
   logs peak, variation and the decision once per second.
Report: how to test (song, podcast/speech, silence, a browser video, YouTube with the volume low, headphones plug/unplug).
```

**Sprawdź:** utwór, podcast, cisza, wideo w przeglądarce, wtyczka słuchawek. **Powinno być:** taniec do muzyki, brak tańca do mowy i szumu, max jeden taniec na 3 minuty, brak wyjątków przy braku urządzenia audio.

### E2: strach przed szybką myszką (Claude)

Część z kursorem (patrzenie, zawołanie, kliknięcia) jest w I1. Tu tylko strach i ucieczka.

```
Task E2: fear of fast mouse and fleeing. Read RULES.md, ARCHITECTURE.md, Brain, InteractionManager and the dragVelocity
sampling in FormPet (reuse it, do not write new mouse code if it fits).
1. Fear trigger: cursor speed above a threshold (px/s) while within 150 px of the pet, sampled at 30-60 Hz, with a 400 ms
   confirmation window. Threshold rises with the bond level (a tame pig startles less). Cooldown 5 minutes, never while
   asleep (wake_up first), never while dragged or in physics states.
2. Reaction: startle, then freeze (1 s) or flee (flee animation toward the nearest screen edge or taskbar end and
   peek back after 10-20 s). Humor -3, no bond loss.
3. Clicks 8+ in 3 s are already handled by I1; do not duplicate.
4. All numbers in assets/data/actions.json. Add the events to the QA hooks.
Report how often it fires in 10 minutes of normal mouse work (it must be rare and never fire while the user just
works with the mouse at normal speed).
```

**Sprawdź:** praca myszką 10 minut obok świnki. **Powinno być:** nie wystrasza się przy normalnej pracy, ucieka tylko przy gwałtownym ruchu, nie częściej niż raz na kilka minut.

### E3: chowanie przy pełnym ekranie i prezentacjach (Gemini)

```
Task E3: hide the pet during full-screen apps and presentations. Read RULES.md, ARCHITECTURE.md, SoundManager and Brain.
Reuse the proven pattern from Chromium (fullscreen_win.cc): combine two signals.
1. SHQueryUserNotificationState (shell32): QUNS_BUSY (2), QUNS_RUNNING_D3D_FULL_SCREEN (3), QUNS_PRESENTATION_MODE (4)
   mean "do not disturb".
2. Window check: the foreground window rectangle covers its whole monitor and the window is not the desktop shell
   (Progman, WorkerW), not Cuy's own windows, and has no normal caption/WS_CAPTION or is maximized-borderless.
Class FullscreenDetector in src/Cuy/dotNet: poll every 2 s, debounce 3 s to enter and 5 s to leave. Expose
bool IsFullscreen plus an event.
Effects while true: hide or park the pet window off the way (no flicker), mute sounds, no status bubble or popups,
needs decay like offline while hidden (3x slower, floor 20), as in the original plan. On leave: reappear with the peek animation. Multi-monitor: hide the pet
only when the full-screen window is on the pet's monitor. Log every state change to cuy.log.
Report test results for: a game in exclusive full screen, a borderless game, a YouTube video in full screen,
PowerPoint slide show, a maximized (not full-screen) window (must NOT hide), a second monitor, Alt+Tab out of a game.
```

**Sprawdź:** lista z końca promptu. **Powinno być:** chowa się w grze, wideo i pokazie slajdów; NIE chowa się przy zwykłym zmaksymalizowanym oknie; po wyjściu wraca przez peek.

### E5: pogoda (Gemini)

```
Task E5: weather reactions with Open-Meteo. Read RULES.md, ARCHITECTURE.md, Brain and the settings code.
1. Location: a text setting "City" (Home -> Settings). Resolve it once with the Open-Meteo geocoding API, store
   latitude/longitude in the save (local only, never sent anywhere else). No Windows location API.
2. src/Cuy/dotNet/WeatherService.cs: HttpClient (TLS 1.2 on .NET Framework 4.8), 5 s timeout, fetch every 30 minutes
   https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,weather_code,is_day
   (no API key). Never block the UI thread; keep the last good value in the save; fully offline-tolerant.
3. Map WMO weather_code to {clear, cloudy, fog, drizzle, rain, snow, thunder} in Cuy.Core (a pure, tested function).
4. Brain conditions: rain/thunder -> prefers house/sleep_in_house; temperature >= 28 -> heat_flop and shade-seeking
   (stay under a window edge if possible); temperature <= 5 -> shiver. At most one weather action per 20 minutes.
5. About dialog and Home -> Settings footer: "Weather data by Open-Meteo.com" (attribution). Request rate must stay far
   below the free limits; free use is non-commercial only (this is a gift, keep it that way).
6. Settings toggle "Weather reactions" (default on once a city is set).
Tests: WMO mapping, offline fallback, no request when no city is set.
```

**Sprawdź:** wpisz miasto, wymuś deszcz w trybie testowym. **Powinno być:** świnka reaguje na deszcz i upał/zimno, bez miasta nie ma żadnych zapytań, w razie braku internetu brak błędów.

### E6: sztuczki i towarzysz (Claude, /plan)

```
Task E6: tricks and companion. Read RULES.md, ARCHITECTURE.md, Brain, InteractionManager, StartUp and eSheep's child
pet mechanism (<childs> in animations.xml and the multi-pet code in StartUp/FormPet).
1. Reuse what eSheep already has for a second pet instead of writing a new mechanism. CC1 forced MaxPets = 1:
   make it 2 only when the companion is unlocked (bond level >= 10 AND the first birthday has passed), and keep exactly
   one pet otherwise.
2. Companion: adoption flow in Home (choose a coat from the 3 companion_* variants, name it), saved in the save
   (companion { variant, name, adopted_utc }). Simple Brain profile: follow, nose_touch, groom_other, sleep_together,
   own needs sharing the care actions (feeding one feeds both is fine). The companion must not double the sound or
   attention load: sound rate limit is shared, one wheek per 30 s across both.
3. Tricks gated by bond (spin lvl 5, stand_up, hurdle lvl 15, popcorn on command lvl 12): a "Tricks" tray submenu
   and Home buttons; each trick has a 60 s cooldown and gives bond points within the daily limit.
4. Physics works for both pets (drag, toss, fall); pets must not stack on the same pixel.
5. QA: simulation with a companion for 14 days; check for crashes when one pet is dragged while the other follows.
Report anything in eSheep's multi-pet code that conflicts with the single-pet cleanup from CC1.
```

**Sprawdź:** poziom więzi 10 (tryb testowy), adopcja, drag jednej i druga idzie za nią. **Powinno być:** druga świnka zachowuje się naturalnie, bez dubli dźwięków i bez zderzeń; bez odblokowania wciąż jedna.

### F2 (nowy): okno ustawień w Domku (Gemini)

```
Task F2: Settings view in Home. Read RULES.md, ARCHITECTURE.md, web/home, HomeWindow and the tray menu code.
Add a Settings view (same pixel style): sound on/off and volume slider, quiet hours (from/to), Start with Windows,
Dance in rhythm (E1 step B), Weather reactions and City (E5), About (version, licences link). Settings persist in the
save (settings object, version bumped with a migration). The tray toggles and the Settings view must stay in sync.
Add the strings to web/home/strings.js.
```

### F3 (nowy, opcjonalny): instalator i aktualizacje (Claude Code)

Rób dopiero po wyniku researchu R1 (część B).

```
Task F3 (optional): evaluate Velopack for Cuy. Read RULES.md, ARCHITECTURE.md and tools/package.ps1.
Do NOT replace the zip package. First confirm from the Velopack docs that .NET Framework 4.8 WinForms apps are supported.
If yes: add tools/package-velopack.ps1 (vpk pack) producing Setup.exe and update packages, VelopackApp.Build().Run()
at the start of Program.Main, an update check on startup that never blocks and never interrupts the pet, and
keep %AppData%\Cuy saves untouched. Keep the zip path working. Report size, install time, how SmartScreen behaves
for an unsigned build, and the update test (v1.0.0 -> v1.0.1) done on a second account.
```

---

## A4. Prompt licencji (Gemini, zrób po E1 i E5)

```
Task: licence audit. Read THIRD_PARTY_NOTICES.md, packages.config / PackageReference files, web/home and assets/sounds.
Add missing notices: NAudio (MIT, with copyright and licence text), Open-Meteo attribution ("Weather data by Open-Meteo.com"),
SoundTouch.Net only if it is referenced (state the exact licence and what it requires), any other NuGet or JS library found.
List anything whose licence you cannot identify instead of guessing. Do not add code. Report the diff.
```

---

# CZĘŚĆ B: research dla Gemini (Deep Research)

Wklej każdy prompt osobno do Gemini (Deep Research). Raporty wklej mi z powrotem; uwzględnię je w planie. Każdy raport ma kończyć się sekcją "Rekomendacja dla Cuy" i listą linków źródłowych.

Wspólny kontekst do dopisania przed każdym promptem:

```
Context: "Cuy" is a free gift desktop pet for Windows (pixel-art guinea pig), built on the eSheep desktop pet (MIT, C#, WinForms, .NET Framework 4.8), a game-logic library in .NET Standard 2.0, and a Home window using WebView2. It is a non-commercial gift for one person, distributed as a zip or small installer. I prefer reusing existing libraries and code over writing new code. Prefer official documentation and primary sources; for every claim give a URL and say how sure you are. Mark anything you could not verify.
```

**R1. Instalator i aktualizacje (do F3)**
```
Research: how to package and auto-update a .NET Framework 4.8 WinForms + WebView2 app for a single non-technical user.
Compare Velopack, Squirrel.Windows (status), ClickOnce, WiX/MSIX, Inno Setup, and a plain zip. For each: does it support
.NET Framework 4.8 WinForms, per-user install without admin rights, shortcuts, autostart, update mechanism and hosting
(GitHub Releases?), delta updates, size, maintenance status in 2026, licence. Also: does the WebView2 Evergreen runtime need to
be bundled or is a bootstrapper needed on Windows 10/11, and what happens on a clean Windows 10 without it?
Return: a comparison table, a recommended option for a one-person gift with a step-by-step minimal setup, and pitfalls.
```

**R2. SmartScreen i podpisywanie kodu**
```
Research: how an unsigned Windows .exe from a hobby developer behaves with Microsoft Defender SmartScreen and antivirus
heuristics in 2026, and the realistic options to avoid scary warnings for one recipient: code signing certificates (cost, OV vs EV),
Azure Trusted Signing / Artifact Signing eligibility for individuals, SignPath Foundation for open source, MSIX/Store, and "unblock the file" instructions.
Also: do a desktop pet that hooks window events (SetWinEventHook), enumerates windows and writes to HKCU\...\Run trigger AV false positives, and how to reduce that?
Return: options ranked by effort/cost, what I should do for a free personal gift, and a short user-facing README text.
```

**R3. Wykrywanie muzyki i rytmu na Windows (do E1)**
```
Research: the best low-effort way to know that music is playing on Windows from a .NET Framework 4.8 app, and optionally its tempo.
Compare: NAudio MMDevice.AudioMeterInformation (peak meter), WasapiLoopbackCapture, Windows audio session APIs (per-session peak
meters, which apps are playing, IAudioSessionManager2), and SMTC / GlobalSystemMediaTransportControlsSession (media playing state,
title) for detecting "media is playing". For tempo: SoundTouch.Net BPMDetect (licence, accuracy, latency, CPU), alternatives (aubio, BTrack ports, simple onset detection
with FftSharp), and whether any C#/.NET library does real-time beat tracking. Include CPU cost, behaviour during silence, exclusive-mode apps, and Bluetooth devices.
Return: a decision table, a recommended minimal design, licence notes, and links to working C# examples.
```

**R4. Pełny ekran, prezentacje, spotkania (do E3)**
```
Research: the most reliable way to detect "the user is in a full-screen game/video/presentation/screen-share and a desktop overlay must hide" on Windows 10/11
from .NET. Cover: SHQueryUserNotificationState states and their real-world behaviour (borderless fullscreen, browsers' F11/video fullscreen,
PowerPoint slide show, Teams/Zoom screen share, Windows Focus assist), foreground-window-vs-monitor-bounds checks, how Chromium/Firefox/other apps do it,
known false positives/negatives, and multi-monitor handling. Include existing open-source implementations (C# preferred) and their licences.
Return: a recommended algorithm with the exact API calls, a test matrix, and links.
```

**R5. Pogoda: warunki Open-Meteo (do E5)**
```
Research: Open-Meteo for a free non-commercial desktop app: exact terms of use and attribution requirements (licence of the data), rate limits, the geocoding API (response fields, city name ambiguity, multiple languages incl. Polish),
current-weather variables, the WMO weather_code table with meanings, behaviour offline/timeouts, and whether a hobby gift app counts as non-commercial.
Also list 2 alternatives with no API key (and their terms). Return: the exact request URLs, a JSON example, the full WMO code table, attribution text, and caveats.
```

**R6. Drugi zwierzak, ucieczka, zachowania: gotowe wzory (do E2 i E6)**
```
Research existing open-source desktop pets (eSheep/DesktopPet, Shimeji-ee and forks, VPet-Simulator, Desktop Goose-likes, Pocket-Bird and others) and how they implement:
(a) multiple pets and child pets (eSheep <childs>, Shimeji "multiply"), (b) reacting to mouse speed/proximity and fleeing, (c) a companion/pair interaction,
(d) hiding during full-screen apps, (e) per-monitor DPI and taskbar-on-any-edge handling, (f) known performance and AV pitfalls.
For each: repo link, licence, the specific file/class/config to look at, and whether code could be reused with the MIT/Apache/BSD/MPL/GPL constraints. Return a reuse table and the three highest-value pieces to copy.
```

**R7. Prawdziwe zachowania świnek morskich (kontrola realizmu planu)**
```
Research with scientific or veterinary sources: guinea pig daily activity budget (sleep, eating, locomotion, grooming), nap length, crepuscular activity, popcorning frequency by age, vocalizations (wheeking, purring, rumbling, chutting, teeth chattering) and their triggers,
vitamin C requirements, hay/teeth, social needs, and lifespan stages with age thresholds (baby/juvenile/adult/senior).
Compare with this budget: rest/naps 50 %, eating/drinking 28 %, sniffing 8 %, walking 8 %, grooming 3 %, play/rare 3 %; sleep 4-6 h/day in short naps; popcorn 1-3/day for adults.
Return: which numbers are supported, which should change, with sources.
```

---

## Co zrobię po raportach
R1/R2 -> finalny kształt F3 i README, R3 -> E1 (krok B), R4 -> E3, R5 -> E5 i atrybucja, R6 -> E2/E6 (co skopiować), R7 -> korekta budżetu dnia w `assets/data/actions.json`.
