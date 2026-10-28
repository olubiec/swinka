# Cuy
Pixel art guinea pig for the Windows desktop (a gift): a WinForms pet on the taskbar, game logic in a separate .NET Standard library, a "Home" window (HTML/JS in WebView2).
Everything in code, UI, logs, commits and task files is **English**. Big picture: `ARCHITECTURE.md`. Plan and status: `docs/PLAN.md`.

## Commands
Setup: `bash setup.sh`
Tests (Core): `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` (needs the .NET 9 SDK)
Build (desktop app compile check, Linux): `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`
Lint (JS syntax): `node --check <file>` for every JS file you changed
Home smoke test: `node tools/qa/web-smoke.js` (after `bash setup.sh`)
The WinForms app cannot run on Linux; the human tests it on Windows with `tools/build.ps1`.

## Structure
| Path | What |
| --- | --- |
| `src/Cuy.Core/` | Game logic, .NET Standard 2.0, no WinForms. `Pet` (logic), `GameState` (saved data), `Balance` (numbers), `AI/Brain` (utility AI), `Save/` |
| `tests/Cuy.Core.Tests/` | xUnit tests (net9.0) for Cuy.Core |
| `src/Cuy/` | WinForms desktop app, .NET Framework 4.8, namespace `Cuy`. Main classes in `src/Cuy/dotNet/` |
| `web/home/` | Home page: `index.html`, `app.js`, `bridge.js` (C# <-> JS + mock mode), `canvas-pig.js`, `style.css`; `minigames/` (Phaser 3), `features/<id>/` (feature modules) |
| `assets/` | `sprites/<stage>/`, `icons/` (`icons_16.png` + `icons.json`), `sounds/`, `music/`, `data/*.json` (all tunable numbers), `coloring/` |
| `tools/` | `build.ps1`, `package.ps1`, `qa/` (headless web checks), `art/` (Python generators), `Cuy.Simulator/`, `jules-wave.sh`, `jules-backlog.sh` |
| `docs/` | `CONCEPT.md`, `PLAN.md` (waves, status), `contracts.md` (Home message/state shapes), `NAMES.md` (old Polish names), `archive/` |
| `tasks/` | One file = one Jules task (`W<wave>-<nn>-name.md`) and `BACKLOG.md` (one line = one task). Do not edit unless your task says so |

## Rules
- Run tests and build before finishing; open the PR only when the task's verification command passes. If you cannot verify it, do not open the PR: say what blocks you.
- One task = one branch = one pull request; PR title = `[<task id>] <task title>` (e.g. `[W2-03] Diary writer`).
- Change only the files listed in the task's `Zmieniaj:` line (plus `Wymagane:`). The Jules Loop plan guard reverts any other file. If the task is missing a file you need, say so in the PR and stop.
- Never change or delete an existing test assertion to make a check pass. If an old assertion is wrong, say so in the PR and stop.
- Libraries only from `docs/PLAN.md`. No new NuGet/npm dependencies. No network calls at runtime in the app (assets are local).
- Game numbers (prices, rewards, chances, durations, speeds, timings) live in `assets/data/*.json` or `Balance`, not in code. The human tunes them.
- Never delete or rename save fields in `GameState`; add new ones with safe defaults (old saves must load). Polish ids may appear only in the save migration in `src/Cuy.Core/Save/SaveSystem.cs`.
- Keep each file's encoding and line endings (some C# files have a UTF-8 BOM and CRLF). No mass reformatting.
- No real-money anything, no ads, no telemetry. The game must never kill the pig; the worst case is "very sick" until treated.
- Third-party assets: only CC0 or CC-BY, attribution in a new file under `assets/LICENSES/`, source URL recorded.
- PR description: what was done, decisions and why, files changed, how to check it by hand, a screenshot for visual changes (Playwright), anything left undone.

- Data tables (JSON in `assets/data/`) follow the `EconomyConfig` pattern: static `Current` (lazy `LoadDefault()`), `Load(string)`, `LoadDefault()` (file candidates, then code defaults, errors logged through `ItemCatalog.ErrorLogger`). A table is useless until something calls its loader: the task must name where. Tests inject tables into `Pet` (e.g. `BondTable`, `HayTable`) and never change statics. Tests find repo files by walking up from `AppContext.BaseDirectory` to the folder with `Cuy.sln` (`RepoFile` helper).
- New Core behavior that changes numbers is behind a `Balance` flag (default off, switched on in `GameSession.Open`) so existing tests keep their numbers.
- Use the signatures a task gives exactly; if the real code differs, stop and say so in the PR instead of inventing an alias.

## Jules Loop
Tasks arrive through the loop (`docs/JULES_LOOP.md`). Its plan guard asks you to revert files outside `Zmieniaj:`/`Wymagane:`, to restore removed assertions, and refuses PRs that touch `.github/workflows/jules-loop.yml` or `scripts/jules-loop/`. Keep the PR title format above; the loop uses it.

## Prohibited
- Do not commit secrets or `.env`. Do not run processes that never end (dev server, the game loop) without a timeout.
- Do not edit `docs/archive/`, `research/` or `docs/PLAN.md` unless the task says so (integration tasks update the status in `docs/PLAN.md`).

## Code conventions
- C# Core: `GameState`, `Pet`, `Balance` are `partial`. A new system adds its own files (`src/Cuy.Core/Care/CareState.cs`, `GameState.Care.cs`, `Pet.Care.cs`). Time comes from `IClock` (`ManualClock` in tests), randomness from an injectable `System.Random`.
- Desktop UI: log with `BrainController.Log("[Area] message")`. UI thread only for forms.
- Home bridge: JS sends `window.bridge.send({ type: 'snake_case_type', ... })`; C# answers by pushing a new state (`{ type: 'state', ... }`). Never trust prices/rewards sent by JS; compute them in C#/Core. Shapes: `docs/contracts.md`.
- Web: plain ES2020 in IIFEs, no build step, no frameworks. Pixel style: reuse CSS variables from `style.css`. Icons: `<span class="pixel-icon icon-<id with dashes>"></span>` (`x1_5`, `x2` size classes).
- Feature modules: `web/home/features/<id>/feature.js` calls `CuyHome.registerFeature({ id, title, icon, order, open(container, api), onState(state) })`; the C# side implements `Cuy.Features.IHomeFeature` in `src/Cuy/dotNet/Features/<Name>Feature.cs` (found by reflection).
- Logic apart from rendering: games and screens keep logic in pure functions that tests can call.

## Canonical ids
- items: hay pellets bell_pepper parsley kale cucumber carrot chew_stick ball tunnel house water_bottle cake (+ ids added in `assets/data/items_*.json`)
- icons: keys of `assets/icons/icons.json`
- needs: fullness vitamin_c energy mood cleanliness teeth (C# enum `Need.Satiety` = fullness)
- stages: baby junior adult senior legend; currency: clovers (icon `clover`)

## Lessons from mistakes (add one line per repeated mistake)
- (empty: the human adds a line when Jules makes the same mistake twice)
