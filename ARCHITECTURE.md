# Cuy architecture

Cuy is a pixel art guinea pig that lives on the Windows desktop. The desktop part is built on eSheep (DesktopPet, MIT, see THIRD_PARTY_NOTICES.md). The game logic lives in a separate .NET Standard library, and the Home window is a modular web application shown in WebView2.

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
| `src/Cuy` | WinForms desktop app (.NET Framework 4.8): pet window, tray, Home host, managers, behaviors, graphics |
| `src/Cuy.Core` | Game logic (.NET Standard 2.0, no WinForms/Win32): needs, Brain (utility AI), Pet, GameState, SaveSystem, modular sub-systems |
| `tests/Cuy.Core.Tests` | xUnit tests (net9.0) for Cuy.Core |
| `tools/Cuy.Simulator` | Console app that fast-forwards days of game time to verify economy and needs |
| `tools/build_pet_xml.py` | Builds `src/Cuy/Resources/animations.xml` from sprite sheets |
| `tools/art` | Python pixel art generators, palette checks, and asset style validators |
| `tools/qa` | Headless Playwright and Node tests (web smoke test, maze logic, data checks, layout validation) |
| `tools/package.ps1` | Release packaging script with size limit enforcement and license checks |
| `web/home` | Home window web app (HTML/CSS/JS, ES2020 IIFE); `features/` modules; `minigames/` Phaser 3 minigames |
| `assets/` | Sprites, icons, app icons, sounds, music, and tunable data tables (`assets/data/*.json`) |

### Main classes in `src/Cuy/dotNet`

| Class / Namespace | Role |
| --- | --- |
| `Program` | Entry point: single instance mutex, argument parsing, tray icon, `StartUp` |
| `StartUp` | Initializes managers, creates the pet window (`FormPet`), and coordinates lifecycle |
| `FormPet` (+ `FormPet.Motion`) | The eSheep pet window: frames, motion tracking, window/taskbar collision, drag, toss, gravity |
| `BrainController` | Bridge between desktop pet and Cuy.Core: game session, scaled clock, Brain decisions, physics priority |
| `InteractionManager` | Cursor interactions: petting, eye tracking, call whistle, startup greeting, sulking |
| `FoodManager`, `FoodItemForm` | Dropping food onto the desktop, pig pathfinding to food, eating animations |
| `PoopManager`, `PoopForm` | Spawning droppings on desktop surfaces, cleaning click interaction with clover rewards |
| `SoundManager` | WAV sound playback via NAudio, pitch randomization, quiet hours, full-screen mute, wheek cooldown |
| `StatusBubble` | Pixel status speech bubble above the pig showing needs and quick actions |
| `HomeWindow` | WebView2 host for `web/home`, orchestrates bidirectional JSON bridge communication |
| `ContextMenus`, `ProcessIcon`, `PetIcons` | Tray notification icon, context menus, quick actions, and tricks submenu |
| `CareReminderForm` | Desktop popup reminding player of scheduled guinea pig care tasks |
| `ShadowForm` | Renders dynamic pixel shadow under the pig |
| `EdgePeekDirector`, `EdgePeekScene` | Screen-edge peeking behaviors and curiosity animations |
| `Graphics/SpriteSheetLoader` | Slices and caches 64x64 sprite sheet frames, handles hot-swapping on stage or pig change |
| `Graphics/PigLook`, `Graphics/PaletteRemap` | Multi-pig appearance mapping, palette color remapping for custom coats |
| `Platform/FullscreenDetector` | Win32 foreground window monitor detecting exclusive fullscreen applications |
| `Platform/MouseShakeMonitor` | Cursor shake monitoring to trigger pig startle reactions |
| `Platform/UpdateApplier` | Applies staged application updates on restart |
| `Behaviors/*` (`BehaviorHost`) | Desktop behavior plugins implementing `IDesktopBehavior` (e.g. `FullscreenHideBehavior`, `MouseFearBehavior`) |
| `Features/*` (`HomeFeatures`) | Backend Home controllers implementing `IHomeFeature`, discovered via reflection |
| `DebugOverlay`, `Diagnostics`, `SelfTest` | Telemetry overlay (F9), diagnostics dump, and headless release self-tests |

### Main classes in `src/Cuy.Core`

| Class / Namespace | Role |
| --- | --- |
| `Pet` | Partial class, central game entity: needs, age/stage, bond, clovers, inventory, care, events |
| `GameState` | Partial class, serializable game state: needs, items, rooms, achievements, care log, herd state |
| `Needs`, `Need` | Six core needs (fullness, vitamin C, energy, mood, cleanliness, teeth) and composite health |
| `AI/Brain`, `AI/ActionDefinition` | Utility AI: scores actions based on need deficits, environmental factors, cooldowns, and day budgets |
| `ItemCatalog`, `ItemDefinition` | Item catalog from `items.json`, item types (food, toy, decor, medical), stage filters |
| `Economy/EconomyConfig`, `EconomyState` | Clover balances, reward calculations, purchase verification |
| `Care/*` (`CareSchedule`, `CareData`, `CareInput`) | Care tasks (weighing, cage cleaning, brushing, nail trimming), scheduling, validation |
| `Health/*` (`HealthSystem`, `ConditionDefinition`) | Sickness conditions, vitamin C deficiency, symptoms, diagnosis, and treatments |
| `Bond/*` (`BondUnlocks`) | Friendship tiers (1-5), progression thresholds, interaction unlocks, and gifts |
| `Hay/*` (`HayConfig`) | Unlimited hay rack feeder, degradation rate, refill tracking |
| `Diary/*` (`DiaryWriter`, `TraceryGrammar`, `DayStats`) | Procedural evening diary generation using Tracery grammar from `diary.json` |
| `Tricks/*` (`TricksConfig`) | Performable tricks (Spin, Stand Up, Popcorn, Hurdle Jump), mastery requirements |
| `Achievements/*` (`AchievementCatalog`, `AchievementEvaluator`) | Milestones and categorized achievements with clover rewards |
| `Pigs/*` (`PigProfile`, `Palettes`, `NamedPigCatalog`) | Multi-pig herd support (Ned, Kuki, Glen, James, Racuch), profiles, adoption, palette definitions |
| `Save/*` (`SaveSystem`, `AutoSaver`, `GameSession`) | Atomic saving with `.bak`, schema migrations, corrupt backup preservation, session management |
| `LifeStage`, `Balance` | Five developmental stages, feature flags, and tunable balance parameters |
| `Time/*` (`IClock`, `ScaledClock`, `ManualClock`) | Injectable time providers for real-time play, scaled debug speed, and deterministic tests |
| `Audio/*` (`MusicDetector`, `SoundPolicy`) | Sound policy rules, mute constraints, and music detection |
| `Input/*` (`MouseShakeDetector`) | Pure math/logic for rapid cursor movement detection |
| `Platform/*` (`UpdateChecker`) | Release manifest parser and update availability verification |

## 3. Runtime data

| What | Where |
| --- | --- |
| Save | `%AppData%\Cuy\save.json` + `save.bak` (corrupted files preserved as `save.corrupt.json`) |
| Reset Backups | `%AppData%\Cuy\save.reset-<yyyyMMdd-HHmmss>.bak` |
| Log | `%LocalAppData%\Cuy\logs\cuy.log` (rotated at 1 MB, 3 files kept) |
| WebView2 profile | `%LocalAppData%\Cuy\WebView2` |
| Home page | `https://cuy.home/` mapped to `web/home`, assets at `https://cuy.assets/` mapped to `assets/` |

The save file includes schema versioning with automatic forward migrations in `SaveSystem.cs`.

## 4. Life stages and pig appearance

Cuy progresses through 5 developmental stages:
1. **Baby** (0 - 3 days)
2. **Junior** (4 - 14 days)
3. **Adult** (15 - 90 days)
4. **Senior** (91 - 365 days)
5. **Legend** (365+ days)

Visual asset handling:
- Dedicated 64x64 sprite sheets in `assets/sprites/<stage>/sheet.png` and named pig sheets in `assets/sprites/pigs/<id>/<stage>/sheet.png`.
- Color palette remapping via `PaletteRemap` maps greyscale master frames to pig-specific color swatches defined in `style_palette.json` and `pigs_named.json`.
- `SpriteSheetLoader` slices and caches frames. When `Pet.StageChanged` fires or active pig changes, `FormPet` hot-swaps the active sheet and frame dimensions without restarting the process.

## 5. Desktop behaviour plug-ins

Desktop environmental reactions are organized via `IDesktopBehavior` and managed by `BehaviorHost`:
- `FullscreenHideBehavior`: Monitors active foreground windows via Win32 API (`FullscreenDetector`). When a game or video enters exclusive fullscreen, Cuy hides and mutes to prevent interruptions.
- `MouseFearBehavior`: Tracks erratic cursor movements via `MouseShakeMonitor` / `MouseShakeDetector` and triggers an alarmed scurry.
- Standalone directors like `EdgePeekDirector` coordinate curious peeking and exploration along screen edges.

## 6. Home features architecture

The Home window provides an expandable modular architecture:
- **Frontend Modules**: Located in `web/home/features/<id>/` (`feature.js`, `feature.css`). Modules register via `window.CuyHome.registerFeature({ id, title, icon, order, open, close, onState })`.
- **Backend Features**: In `src/Cuy/dotNet/Features/`, implementing `IHomeFeature` (or inheriting `HomeFeatureBase`). Automatically discovered via reflection by `HomeFeatures.LoadAll()`.
- **Contract & Mock Mode**: The C# backend pushes `{ type: 'state', ... }` snapshots to WebView2. In standalone browser development (mock mode), `bridge.js` reads `web/home/features/index.json` to load all features with simulated data. State structures are defined in `docs/contracts.md`.

### Available Home Features

| Feature ID | Title / Purpose | Backend Class |
| --- | --- | --- |
| `daily` | Daily login rewards, daily gift wheel, streaks | `DailyFeature.cs` |
| `shop` | Veggie shop, grocery purchases, treats | `ShopFeature.cs` |
| `decor` | Room decoration, wallpaper, flooring, and furniture | `DecorFeature.cs` |
| `toys` | Interactive cage toys (balls, tunnels, chew sticks) | `ToysFeature.cs` |
| `calendar` | Care calendar, scheduled routines (cage cleaning, weighing, nails) | `CalendarFeature.cs` |
| `vet` | Veterinary health checkups, diagnoses, medicines, treatments | `VetFeature.cs` |
| `coloring` | Retro pixel-art coloring book with unlockable color palettes | `ColoringFeature.cs` |
| `pigs` | Multi-pig herd profiles (Ned, Kuki, Glen, James, Racuch), adoption offers, memorials | `PigsFeature.cs` |
| `tricks` | Tricks training, performance triggers, mastery stats | `TricksFeature.cs` |
| `diary` | Daily procedural journal entries, day statistics, and history | Aggregated via `ProgressFeature.cs` |
| `achievements` | Milestone tracking and clover reward claims | `AchievementsFeature.cs` |
| `settings` | Audio volume, quiet hours, monitor picker, update check, new game | `SettingsFeature.cs` |

## 7. Core systems and data tables

All tunable parameters reside in `assets/data/*.json` and follow the `EconomyConfig` pattern (lazy static `Current`, `Load(string)`, `LoadDefault()`, code fallback):
- **Economy & Shop** (`economy.json`, `items_shop.json`, `home_economy.json`): Clover rewards, item prices, and purchases.
- **Care System** (`care.json`): Daily care tasks, schedules, thresholds, and reminders.
- **Health System** (`health.json`): Sickness conditions, vitamin C deficiency, symptoms, and remedies.
- **Coloring Book** (`coloring/index.json`): Retro pixel-art coloring pictures and unlockable palette packs.
- **Decorations & World Items** (`items_decor.json`, `world_items.json`): Wallpaper, flooring, furniture, and room props.
- **Bond System** (`bond.json`): 5 friendship tiers, progression unlocks, and interaction rewards.
- **Hay Rack** (`hay.json`): Unlimited fresh hay feeder with degradation and refill tracking.
- **Diary Writer** (`diary.json`): Tracery-powered procedural daily journal generated every evening.
- **Tricks & Talents** (`tricks.json`): Performable tricks (Spin, Stand Up, Popcorn, Hurdle Jump).
- **Achievements** (`achievements.json`): Categorized milestones rewarding clovers.
- **Named Pigs & Herd** (`pigs.json`, `pigs_named.json`, `style_palette.json`): Personality modifiers, adoption offers, palette remaps.
- **Places & World** (`places.json`, `farm.json`, `market.json`, `items_farm.json`, `pig_rooms.json`): Expandable places, garden, farm plots, market orders, pig rooms.
- **Lighting & Ambiance** (`lights.json`): Time-of-day lighting states (morning, day, evening, night) and lamp activations.
- **Birthday System** (`actions.json`): Annual celebrations with party music and popcorn jumping.
- **Away System**: Offline simulation that catches up needs and logs away events on restart.

## 8. Minigames architecture

Minigames run on Phaser 3 inside WebView2 and are configured in `web/home/minigames/games.json`:
- `veggie_rain` (`veggie-rain.js`): Catch falling fresh vegetables while dodging spoiled items.
- `nyan_cuy` (`nyan-cuy.js`, `nyan-cuy-logic.js`, `nyan-audio.js`): Rainbow retro runner with custom pig squeaks.
- `veggie_memory` (`veggie-memory.js`): Match-two veggie memory cards against the clock.
- `hay_maze` (`hay-maze.js`, `hay-maze-logic.js`): Guide the pig through a procedural maze to collect treats.

`MinigryManager` in `web/home/minigames/minigames-api.js` coordinates loading, start/pause/resume hooks, high score tracking, daily rewarded play limits (10 games/day), and shared result presentation. Game logic is decoupled into pure functions for headless testing.

## 9. Development loop and QA tools

The project uses autonomous multi-agent wave loops with strict quality gates:
- **Build & Tests**: `dotnet test tests/Cuy.Core.Tests` for core logic; `dotnet build src/Cuy/Cuy.csproj` for desktop app compilation.
- **QA Automation**:
  - `tools/qa/web-smoke.js`: Headless Playwright smoke tests verifying all Home features, navigation, and mock mode.
  - `tools/qa/layout.selftest.js`: UI layout problem detection.
  - `tools/qa/maze-test.js`: Deterministic maze generation testing.
  - `tools/qa/data-check.js`: Asset and data schema consistency checks.
- **Simulator**: `tools/Cuy.Simulator` simulates 60+ days of game time to validate economy invariants and need decay.
- **Self-Tests**: `Cuy.exe --selftest` runs in-engine headless tests of asset files, sprite sheets, and feature registrations.
- **Conventions & Rules**: Documented in `AGENTS.md` and `docs/PLAN.md`.
