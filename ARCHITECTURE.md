# Cuy architecture

Cuy is a pixel art guinea pig that lives on the Windows desktop. The desktop part is built on eSheep (DesktopPet, MIT, see THIRD_PARTY_NOTICES.md). The game logic lives in a separate .NET Standard library, and the Home window is a small web page shown in WebView2.

## 1. Build and run

Requirements: Visual Studio 2022 with the ".NET desktop development" workload (.NET Framework 4.8 targeting pack) and the .NET SDK (for the test project).

```powershell
powershell -ExecutionPolicy Bypass -File tools/build.ps1                 # Debug build + tests
powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release # Release build + tests
```

`tools/build.ps1` finds MSBuild with vswhere, restores packages (including packages.config) and runs `tests/Cuy.Core.Tests`. The app is written to `src/Cuy/bin/<Config>/Cuy.exe`; the build copies `assets/` and `web/` next to it.

Command line flags: `--home` opens Home on start, `--speed X` / `--60x` speeds up the game clock (Debug only), `--diag` writes a diagnostics dump (Debug only).

## 2. Layout

| Path | Contents |
| --- | --- |
| `src/Cuy` | WinForms desktop app (.NET Framework 4.8): pet window, tray, Home host, managers |
| `src/Cuy.Core` | Game logic (.NET Standard 2.0, no WinForms/Win32): needs, Brain (utility AI), Pet, GameState, SaveSystem, clocks |
| `tests/Cuy.Core.Tests` | xUnit tests for Cuy.Core |
| `tools/Cuy.Simulator` | Console app that fast-forwards days of game time |
| `tools/build_pet_xml.py` | Builds `src/Cuy/Resources/animations.xml` from a sprite sheet |
| `tools/art` | Python pixel art generator for all sprites and icons |
| `web/home` | Home window page (HTML/CSS/JS); `web/home/minigames` Phaser 3 minigames |
| `assets/` | Sprites (7 variants), icons, app icon, sounds, game data (`actions.json`, `items.json`) |

### Main classes in `src/Cuy/dotNet`

| Class | Role |
| --- | --- |
| `Program` | Entry point: single instance mutex, arguments, tray icon, `StartUp` |
| `StartUp` | Creates the pet window (`FormPet`) and keeps exactly one pet alive |
| `FormPet` (+ `FormPet.Motion`) | The eSheep pet window: frames, movement, taskbar and window walking, drag, toss, gravity |
| `BrainController` | Glue between eSheep and Cuy.Core: game session, scaled clock, Brain decisions, walk distance, physics priority, idle sleep, logging (`cuy.log`) |
| `InteractionManager` | Cursor interactions: petting, looking at the cursor, call, startup greeting, sulking |
| `FoodManager`, `FoodItemForm` | Food dropped on the desktop, the pig walking to it and eating |
| `PoopManager`, `PoopForm` | Poops on the taskbar/windows, cleaning for clovers |
| `SoundManager` | WAV playback with NAudio, pitch variation, quiet hours, full-screen mute, wheek rate limit |
| `StatusBubble` | Pixel status bubble above the pig (needs and quick actions) |
| `HomeWindow` | WebView2 window that hosts `web/home` and talks to it through messages |
| `ContextMenus`, `ProcessIcon`, `PetIcons` | Tray icon, tooltip and menu |
| `DebugOverlay`, `Diagnostics` | Debug-only tools (F9 overlay, diagnostics dump) |

### Main classes in `src/Cuy.Core`

| Class | Role |
| --- | --- |
| `Pet` | Single source of truth: time passing, needs, age and stage, bond, clovers, poops, inventory, events |
| `Needs`, `Need` | Six needs (fullness, vitamin C, energy, mood, cleanliness, teeth) and health |
| `AI/Brain` | Utility AI: score = sum((1 - need/100)^2 * effect) * random(0.8, 1.2) + base weight, with cooldowns, daily limits, times of day and the day budget |
| `AI/ActionDefinition` | Model of `assets/data/actions.json` |
| `ItemCatalog` | Model of `assets/data/items.json` |
| `GameState`, `Save/SaveSystem`, `Save/AutoSaver`, `GameSession` | Save format, atomic saving with `save.bak`, migrations, autosave every 60 s |
| `LifeStage`, `Balance` | Age stages and balance numbers |
| `Time/*` | `IClock`, `ScaledClock` (speed multiplier), `ManualClock` (tests) |

## 3. Runtime data

| What | Where |
| --- | --- |
| Save | `%AppData%\Cuy\save.json` + `save.bak` (a damaged file is kept as `save.corrupt.json`) |
| Log | `%LocalAppData%\Cuy\logs\cuy.log` (rotated at 1 MB, 3 files kept) |
| WebView2 profile | `%LocalAppData%\Cuy\WebView2` |
| Home page | `https://cuy.home/` mapped to `web/home`, assets at `https://cuy.assets/` mapped to `assets/` |

The save has a `Version` field. `SaveSystem` migrates older versions on load (version 1 used Polish item ids and counter names).

## 4. Home bridge (C# <-> JavaScript)

`HomeWindow` sends the game state with `PostWebMessageAsJson` as `{ type: "state", ... }` whenever it changes. The page (`web/home/bridge.js`) sends actions with `window.chrome.webview.postMessage`:

| Message type | Meaning |
| --- | --- |
| `feed` (`item`) | Feed hay or an inventory item |
| `clean` | Clean all poops |
| `call` | Call the pig to the cursor |
| `pet` | Pet the pig |
| `buy` (`itemId`) | Buy an item for clovers |
| `play` | Simple play in Home |
| `minigame_result` (`gameId`, `score`) | Minigame finished; clovers = min(40, score / 10), mood +15, at most 10 rewarded games a day |
| `settings` | Settings change |
| `log` | Console message forwarded to `cuy.log` |
| `close`, `drag_start`, `drag_move` | Window control from the page |

Opened in a normal browser, `bridge.js` runs in mock mode with a simulated state, so the page can be developed without the app.

## 5. animations.xml format

The pet animations live in `src/Cuy/Resources/animations.xml`, described by the XSD in `src/Cuy/Resources/animations.xsd`. The file combines the sprite sheet, sounds and the state graph of all behaviours.

```xml
<animations xmlns="https://esheep.petrucci.ch/">
  <header> ... </header>
  <image> ... </image>
  <spawns> ... </spawns>
  <animations> ... </animations>
  <childs> ... </childs>
  <sounds> ... </sounds>
</animations>
```

- `<header>`: `<author>`, `<title>`, `<petname>`, `<version>`, `<info>`, `<application>` (always `1`) and `<icon>` (Base64 ICO).
- `<image>`: `<tilesx>` (columns, 16 for Cuy), `<tilesy>` (rows, 60 for Cuy), `<png>` (Base64 PNG in CDATA), `<transparency>` (key colour, default Magenta).
- `<spawns>`: where and how likely the pet appears; each `<spawn>` has `<x>`, `<y>` and a `<next>` animation.
- `<animations>`: one `<animation id="N">` per behaviour with `<name>`, `<start>`, `<end>`, `<sequence>`, `<border>` and `<gravity>`.

### Movement and sequences

1. `<start>` and `<end>`: `<x>`/`<y>` movement per frame in pixels (linearly interpolated if they differ), `<interval>` frame time in ms, `<offsety>` vertical correction, `<opacity>` 0.0-1.0.
2. Expressions in `<x>`, `<y>`, `<interval>` and `repeat` are evaluated with `DataTable.Compute` (`Xml.cs`): `screenW`, `screenH`, `areaW`, `areaH` (working area without the taskbar), `imageW`, `imageH`, `imageX`, `imageY`, `random` (0-99 each step), `randS` (0-99 fixed until the next spawn), `scale`.
3. `<sequence>`: `<frame>` tile index (0-based), `repeat` count (constant or expression), `repeatfrom` frame to loop from, `<action>flip</action>` mirrors the pet.

### Transitions

`<next probability="P" only="CONDITION">ANIMATION_ID</next>`:
- in `<sequence>`: after the sequence finishes,
- in `<border>`: right after hitting a screen, window or taskbar edge,
- in `<gravity>`: when the pet has no ground under its feet.

`only` values (`TNextAnimation.TOnly`): `none` (always), `taskbar`, `window`, `horizontal` (top or bottom screen edge), `horizontal+` (horizontal screen edge or a window edge), `vertical` (left or right screen edge).

Animations recognised by `<name>` in `Xml.cs`: `drag` (held by the mouse), `fall` (dropped gently), `toss` (thrown), `fall soft` / `fall hard` (landing after a throw, vertical speed below / at least 40), `kill` (fade out on exit), `sync`.

In Cuy most decisions do not come from the random `<next>` graph: `BrainController` asks Cuy.Core's Brain for the next action and plays the matching animation. The graph still handles physics (drag, fall, toss, land).

## 6. Sprite sheet tiles

`Xml.cs` cuts the sheet in `ReadImages()` and `BuildSprites()`:

```csharp
while (image.Width * iScale / AnimationXML.Image.TilesX > 255) iScale--;
spriteWidth = image.Width * iScale / AnimationXML.Image.TilesX;
spriteHeight = image.Height * iScale / AnimationXML.Image.TilesY;
```

The loop keeps a tile under 256 px wide, the WinForms `ImageList` limit. Tiles are cut row by row, left to right, so `tile index = row * TilesX + column`. For Cuy (16 columns) row R holds tiles `R*16` to `R*16+15`; the row of each animation is listed in `assets/sprites/<variant>/animations.json`.

Tiles are scaled nearest neighbour (each source pixel drawn as an `iScale x iScale` block), so pixel art stays sharp. Facing left is done in `FormPet.Motion.cs` `GetSprite()` with `RotateFlip(RotateNoneFlipX)`, cached in `flippedSprites`.

## 7. Events, physics and interaction (eSheep engine)

### Animation loop
- `timer1` in `FormPet` calls `NextStep()` for every frame: picks the frame, sets the interval, interpolates opacity and offset, computes the move, checks edges and windows, and moves to the next animation when the sequence ends.
- `motionTimer` in `FormPet.Motion.cs` (8 ms, about 120 Hz, `timeBeginPeriod(1)`) moves the window smoothly while dragging, tossing and following windows.

### Taskbar and windows
- Taskbar: the working area (`Screen.WorkingArea`) excludes the taskbar; when the pet would go below it, the `taskbar` border transition fires.
- Windows: `FallDetect()` enumerates top-level windows (`EnumWindows`), skips hidden, minimised and title-less windows and other pet windows, and lands the pet on a window's top edge when it falls onto it and the window is not covered.
- Following a moving window: a `SetWinEventHook` on `EVENT_OBJECT_LOCATIONCHANGE` calls `FollowWindow()`, which moves the pet with the window.

### Drag and toss
- Mouse down on the pet clears the window it stood on, starts dragging (`BeginSmoothDrag`, mouse capture) and plays `drag`; mouse moves are sampled into `dragVelocity`.
- Mouse up computes `TossForce`. Above length 5 the pet is thrown (`toss`, 30 ms steps); otherwise it simply falls (`fall`).
- Flight (`AdvanceToss`): horizontal movement with a -0.3 bounce at screen edges, vertical `dy = vy*dt + 0.75*dt^2`, `vy += 1.5*dt`, window landing through `FallDetect`. On landing it plays `fall soft` (vy < 40) or `fall hard`.

Physics always has priority over the Brain: `BrainController` pauses the current action while the pet is dragged, thrown or falling, and resumes it after landing.

## 8. Planned components (not implemented yet)

Decided after the research of 26.10.2026 (`DECYZJE.md`). Ready-made drafts live in `research/gotowce/`; the Core ones are already in `src/Cuy.Core`.

| Component | Where | Role | Task |
| --- | --- | --- | --- |
| `AudioSessionProbe` | `src/Cuy/dotNet/Platform/` | Loudest per-session audio peak (NAudio 2.2.1, no loopback) | F6-01 |
| `MusicDetector` (exists) | `src/Cuy.Core/Audio/` | Peaks over time to "music is playing" | F6-01 |
| `FullscreenDetector` | `src/Cuy/dotNet/Platform/` | Chromium-style full-screen test, desktop shell excluded, per monitor | F6-03 |
| `WeatherService` | `src/Cuy/dotNet/Platform/` | Own Open-Meteo client (the only network use); Core mapping in `Cuy.Core.Weather` (exists) | F6-04 |
| `Updater` (optional) | `src/Cuy/dotNet/Platform/` | Velopack background update next to the ZIP | F7-03 |
| `MouseShakeDetector` (exists), `MouseShakeMonitor` | `src/Cuy.Core/Input/`, `src/Cuy/dotNet/Platform/` | Shaken mouse near the pig | F3-04 |
| `TraceryGrammar` (exists) | `src/Cuy.Core/Diary/` | Own Tracery-style engine for the diary | F4-03 |

