# Cuy architecture

Cuy is a pixel art guinea pig that lives on the Windows desktop. The desktop part is built on eSheep (DesktopPet, MIT, see THIRD_PARTY_NOTICES.md). The game logic lives in a separate .NET Standard library, and the Home window is a web application shown in WebView2.

## 1. Build and run

Requirements: Visual Studio 2022 with the ".NET desktop development" workload (.NET Framework 4.8 targeting pack) and the .NET 9 SDK (for the test project).

```powershell
powershell -ExecutionPolicy Bypass -File tools/build.ps1                 # Debug build + tests
powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release # Release build + tests
```

`tools/build.ps1` finds MSBuild with vswhere, restores packages (including packages.config) and runs `tests/Cuy.Core.Tests`. The app is written to `src/Cuy/bin/<Config>/Cuy.exe`; the build copies `assets/` and `web/` next to it.

Command line flags:
- `--home`: opens the Home window on startup.
- `--selftest`: runs comprehensive headless release self-tests.
- `--speed X` / `--60x` / `--clock X`: speeds up the game clock (Debug only).
- `--diag`: writes a diagnostics dump (Debug only).

## 2. Layout

| Path | Contents |
| --- | --- |
| `src/Cuy` | WinForms desktop app (.NET Framework 4.8): pet window, tray, Home host, managers |
| `src/Cuy.Core` | Game logic (.NET Standard 2.0, no WinForms/Win32): needs, Brain (utility AI), Pet, GameState, SaveSystem, systems |
| `tests/Cuy.Core.Tests` | xUnit tests for Cuy.Core |
| `tools/Cuy.Simulator` | Console app that fast-forwards days of game time |
| `tools/build_pet_xml.py` | Builds `src/Cuy/Resources/animations.xml` from a sprite sheet |
| `tools/art` | Python pixel art generator for all sprites and icons |
| `web/home` | Home window page (HTML/CSS/JS); `web/home/minigames` Phaser 3 minigames |
| `assets/` | Sprites, icons, app icon, sounds, music, game data tables (`assets/data/*.json`) |

### Main classes in `src/Cuy/dotNet`

| Class | Role |
| --- | --- |
| `Program` | Entry point: single instance mutex, argument parsing, tray icon, `StartUp` |
| `StartUp` | Creates the pet window (`FormPet`) and manages pet lifecycle |
| `FormPet` (+ `FormPet.Motion`) | The eSheep pet window: frames, movement, taskbar/window walking, drag, toss, gravity |
| `BrainController` | Glue between eSheep and Cuy.Core: game session, scaled clock, Brain decisions, physics priority |
| `InteractionManager` | Cursor interactions: petting, eye tracking, call, startup greeting, sulking |
| `FoodManager`, `FoodItemForm` | Food dropped on the desktop, the pig walking to it and eating |
| `PoopManager`, `PoopForm` | Poops on the taskbar/windows, cleaning for clovers |
| `SoundManager` | WAV playback with NAudio, pitch variation, quiet hours, full-screen mute, wheek rate limit |
| `StatusBubble` | Pixel status bubble above the pig (needs and quick actions) |
| `HomeWindow` | WebView2 window that hosts `web/home` and coordinates bridge communication |
| `ContextMenus`, `ProcessIcon`, `PetIcons` | Tray icon, tooltip, context menu, and tricks submenu |
| `SpriteSheetLoader` | Loads 64x64 sprite sheet frames and handles stage hot-swapping |
| `DebugOverlay`, `Diagnostics` | Debug-only telemetry (F9 overlay, diagnostics dump) |

### Main classes in `src/Cuy.Core`

| Class | Role |
| --- | --- |
| `Pet` | Single source of truth: needs, age and stage, bond, clovers, poops, inventory, events |
| `Needs`, `Need` | Six needs (fullness, vitamin C, energy, mood, cleanliness, teeth) and overall health |
| `AI/Brain` | Utility AI: scores actions based on need deficits, effects, cooldowns, and day budgets |
| `AI/ActionDefinition` | Model of `assets/data/actions.json` |
| `ItemCatalog` | Model of `assets/data/items.json` |
| `GameState`, `Save/SaveSystem`, `Save/AutoSaver`, `GameSession` | Save format, atomic saving with `save.bak`, migrations, reset backups |
| `LifeStage`, `Balance` | Age stages and tunable balance numbers |
| `Time/*` | `IClock`, `ScaledClock` (speed multiplier), `ManualClock` (tests) |

## 3. Runtime data

| What | Where |
| --- | --- |
| Save | `%AppData%\Cuy\save.json` + `save.bak` (corrupted files kept as `save.corrupt.json`) |
| Reset Backups | `%AppData%\Cuy\save.reset-<yyyyMMdd-HHmmss>.bak` |
| Log | `%LocalAppData%\Cuy\logs\cuy.log` (rotated at 1 MB, 3 files kept) |
| WebView2 profile | `%LocalAppData%\Cuy\WebView2` |
| Home page | `https://cuy.home/` mapped to `web/home`, assets at `https://cuy.assets/` mapped to `assets/` |

The save file includes format versions and migration routines in `SaveSystem.cs`.

## 4. Life stages on the desktop

Cuy progresses through 5 developmental stages:
1. **Baby** (0 - 3 days)
2. **Junior** (4 - 14 days)
3. **Adult** (15 - 90 days)
4. **Senior** (91 - 365 days)
5. **Legend** (365+ days)

Each stage has its own dedicated 64x64 sprite sheet located in `assets/sprites/<stage>/sheet.png`. `SpriteSheetLoader` slices and caches frames. When `Pet.StageChanged` fires upon reaching a new age threshold, `FormPet` hot-swaps the active sprite sheet and frame dimensions without requiring an application restart.

## 5. Desktop behaviour plug-ins

Desktop environmental reactions are organized via `IDesktopBehavior` and managed by `BehaviorHost`:
- `FullscreenHideBehavior`: Monitors active foreground windows using Win32 API. When a game or movie enters exclusive fullscreen, Cuy hides and mutes to prevent interruptions.
- `MouseFearBehavior`: Tracks fast, erratic cursor movements near the pig and triggers an alarmed scurry.
- `EdgePeekDirector`: Coordinates curious peeking and exploration along screen edges.

## 6. Home features architecture

The Home window provides an expandable modular architecture:
- **Frontend Modules**: Located in `web/home/features/<id>/` (`feature.js`, `feature.css`). Modules register via `window.CuyHome.registerFeature({ id, title, icon, order, open, close, onState })`.
- **Backend Features**: In `src/Cuy/dotNet/Features/`, implementing `IHomeFeature` (or inheriting `HomeFeatureBase`). Automatically discovered via reflection by `HomeFeatures.LoadAll()`.
- **Contract & Mock Mode**: The C# backend pushes `{ type: 'state', ... }` snapshots to WebView2. In standalone browser development (mock mode), `bridge.js` reads `web/home/features/index.json` to load all features with simulated data. State structures are defined in `docs/contracts.md`.

## 7. Core systems and data tables

All tunable parameters reside in `assets/data/*.json` and follow the `EconomyConfig` pattern (lazy static `Current`, `LoadDefault()`, code fallback):
- **Economy & Shop** (`economy.json`, `items_shop.json`): Clover rewards, item prices, and purchases.
- **Care System** (`care.json`): Daily care tasks, schedules, and reminders.
- **Health System** (`health.json`): Sickness conditions, vitamin C deficiency, and medical remedies.
- **Coloring Book** (`coloring/index.json`): Retro pixel-art coloring pictures and unlockable palette packs.
- **Decorations** (`items_decor.json`): Wallpaper, flooring, and room furniture.
- **Bond System** (`bond.json`): 5 friendship tiers, progression unlocks, and interaction rewards.
- **Hay Rack** (`hay.json`): Unlimited fresh hay feeder with degradation and refill tracking.
- **Diary Writer** (`diary.json`): Tracery-powered procedural daily journal generated every evening.
- **Tricks & Talents** (`tricks.json`): Performable tricks (Spin, Stand Up, Popcorn, Hurdle Jump).
- **Achievements** (`achievements.json`): Categorized milestones rewarding clovers.
- **Birthday System** (`actions.json`): Annual celebrations with party music and popcorn jumping.
- **Away System**: Offline simulation that catches up needs and logs away events on restart.

## 8. Minigames architecture

Minigames run on Phaser 3 inside WebView2 and are defined in `web/home/minigames/games.json`:
- `veggie_rain`: Catch falling fresh vegetables while dodging spoiled items.
- `veggie_memory`: Match-two veggie memory cards against the clock.
- `hay_maze`: Guide the pig through a maze to collect treats.
- `nyan_cuy`: Rainbow retro run with custom pig squeaks.

`MinigryManager` in `minigames-api.js` manages loading, start/pause/resume hooks, high score tracking, daily rewarded play limits (10 games/day), and shared result presentation.

## 9. Development loop

The project was developed with autonomous multi-agent wave loops. Tasks are defined in `tasks/` and tracked in `docs/PLAN.md`. Detailed autonomy rules, plan guards, and commit formats are documented in `docs/JULES_LOOP.md` and `AGENTS.md`.
