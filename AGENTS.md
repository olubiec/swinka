# AGENTS.md – rules for coding agents (Jules, Claude Code, others)

Cuy is a pixel art guinea pig desktop pet for Windows (a gift). A WinForms app (based on eSheep) shows the pig on the
taskbar; game logic is a separate .NET Standard library; the "Home" window is an HTML/JS page inside WebView2.
Everything in code, UI, logs and commits is **English**. Read `ARCHITECTURE.md` for the big picture.

## Layout
| Path | What |
| --- | --- |
| `src/Cuy.Core/` | Game logic, .NET Standard 2.0, no WinForms. `Pet` (logic), `GameState` (saved data), `Balance` (numbers), `AI/Brain` (utility AI), `Save/` |
| `tests/Cuy.Core.Tests/` | xUnit tests (net9.0) for Cuy.Core |
| `src/Cuy/` | WinForms desktop app, .NET Framework 4.8, namespace `Cuy`. Main classes in `src/Cuy/dotNet/` |
| `web/home/` | Home page: `index.html`, `app.js` (UI), `bridge.js` (C# <-> JS messages + mock mode), `canvas-pig.js` (pig room), `style.css` |
| `web/home/minigames/` | Phaser 3 minigames (`minigames-api.js` + one file per game) |
| `web/home/features/<id>/` | Home feature modules (`feature.js`, optional `feature.css`), see "Feature modules" |
| `assets/` | `sprites/<variant>/` (spritesheet 16x60 frames of 64 px + `animations.json`), `icons/` (`icons_16.png` + `icons.json`), `sounds/`, `music/`, `data/*.json`, `coloring/` |
| `tools/` | `build.ps1` (Windows build), `package.ps1`, `qa/` (headless web checks), `art/` (Python asset generators), `Cuy.Simulator/` |
| `jules/` | Task prompts for agents (`tasks/`) and the dispatch queue (`queue/`). Do not edit unless the task says so |

## Commands (Linux VM)
- Core tests: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` (needs the .NET 9 SDK).
- Desktop app compile check (only when `src/Cuy/Cuy.csproj` is SDK-style): `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.
- JS syntax: `node --check <file>` for every JS file you changed.
- Home smoke test: `npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`.
- The WinForms app cannot run on Linux. The human tests it on Windows with `tools/build.ps1`.

## Hard rules
1. Do only the task you were given. Touch only the files the task lists (plus new files it asks for). If another file
   really must change, change the minimum and say why in the PR description.
2. One task = one branch = one pull request. PR title = the task title. The PR must explain itself (the reviewer sees it cold). In the PR
   description list: what was done, the decisions you made and why, files changed, how you verified it, how to check it by hand,
   a screenshot for visual changes (Playwright), anything left undone.
3. All listed checks of the task must pass before you open the PR. Run Core tests whenever you touched C# in
   `src/Cuy.Core` or `tests/`. Run `node --check` on changed JS. Run the smoke test when you touched `web/`.
4. Keep each file's existing encoding and line endings (some C# files have a UTF-8 BOM and CRLF). No mass reformatting.
5. No new NuGet/npm dependencies unless the task says so. No network calls at runtime in the app (assets are local).
6. Never delete or rename save fields in `GameState`; add new ones with safe defaults (old saves must still load).
   Polish ids may appear only in the save migration in `src/Cuy.Core/Save/SaveSystem.cs`.
7. Game numbers (prices, rewards, chances, durations) live in `assets/data/*.json` or `Balance`, not scattered in code.
8. No real-money anything, no ads, no telemetry. The game must never kill the pig; worst case is "very sick" until treated.
9. Third-party assets: only CC0 or CC-BY with attribution in a new file under `assets/LICENSES/`. Record source URL.

## Canonical ids
- items: hay pellets bell_pepper parsley kale cucumber carrot chew_stick ball tunnel house water_bottle cake (+ ids
  added in `assets/data/items_*.json`)
- icons: keys of `assets/icons/icons.json`
- needs: fullness vitamin_c energy mood cleanliness teeth (C# enum `Need.Satiety` = fullness)
- stages: baby junior adult senior legend; currency: clovers (icon `clover`)

## Code conventions
- C# Core: `GameState`, `Pet` and `Balance` are `partial`. A new system adds its own files, e.g.
  `src/Cuy.Core/Care/CareState.cs`, `src/Cuy.Core/GameState.Care.cs` (a `public sealed partial class GameState` with one
  new property and an initializer), `src/Cuy.Core/Pet.Care.cs` for logic. Time always comes from `IClock`
  (`ManualClock` in tests), randomness from an injectable `System.Random`.
- Desktop UI: log with `BrainController.Log("[Area] message")`. UI thread only for forms.
- Home bridge: JS sends `window.bridge.send({ type: 'snake_case_type', ... })`; C# answers by pushing a new state
  (`{ type: 'state', ... }`). Never trust prices/rewards sent by JS; compute them in C#/Core.
- Web: plain ES2020 in IIFEs, no build step, no frameworks. Pixel style: reuse CSS variables from `style.css`.
  Icons: `<span class="pixel-icon icon-<id with dashes>"></span>` (`x1_5`, `x2` size classes).

## Feature modules (Home)
Once `web/home/features/` exists: a feature is a folder `web/home/features/<id>/` with `feature.js` that calls
`CuyHome.registerFeature({ id, title, icon, order, open(container, api), onState(state) })` and an optional
`feature.css`. The C# side of a feature is a class implementing `Cuy.Features.IHomeFeature` in
`src/Cuy/dotNet/Features/<Name>Feature.cs` (found by reflection, no registration list to edit). See
`web/home/features/README.md` and `src/Cuy/dotNet/Features/README.md` once they exist.

## Extra rules (from the Claude + Jules workflow)
10. Never change or delete an existing test assertion to make a check pass. If an old assertion is wrong, say so in the PR and stop.
11. A task you cannot verify with its own check command is not finished: do not open the PR, explain what blocks you.
12. Tunable numbers (speeds, timings) go to a config/data file as named constants so the human can tune them.
