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
| `tools/` | `build.ps1`, `package.ps1`, `qa/` (headless web checks), `art/` (Python generators), `Cuy.Simulator/`, `orkiestra/`, `verify.ps1` |
| `docs/` | `CONCEPT.md`, `PLAN.md` (waves, status), `contracts.md` (Home message/state shapes), `NAMES.md` (old Polish names), `archive/` |
| `tasks/` | `BACKLOG.md` and `done/` only; wave prompts live in `docs/prompts/` (referenced by `waves.yaml`) |

## Rules
- Run tests and build before finishing; open the PR only when the task's verification command passes. If you cannot verify it, do not open the PR: say what blocks you.
- One task or package = one branch = one pull request; PR title = `[<task or package id>] <title>` (e.g. `[W2-03] Diary writer`, `[PK-17a] Room layout, comfort, unlock`).
- Change only the files listed in the task's `Zmieniaj:` line (plus `Wymagane:`); other files are reverted. If the task is missing a file you need, finish the rest and record the gap in the PR; do not touch the file.
- Never change or delete an existing test assertion to make a check pass. If an old assertion is wrong, do not change it: record the conflict and the decision in the PR and finish the task.
- Libraries only from `docs/PLAN.md`. No new NuGet/npm dependencies. No network calls at runtime in the app (assets are local).
- Game numbers (prices, rewards, chances, durations, speeds, timings) live in `assets/data/*.json` or `Balance`, not in code. The human tunes them.
- Never delete or rename save fields in `GameState`; add new ones with safe defaults (old saves must load). Polish ids may appear only in the save migration in `src/Cuy.Core/Save/SaveSystem.cs`.
- Keep each file's encoding and line endings (some C# files have a UTF-8 BOM and CRLF). No mass reformatting.
- No real-money anything, no ads, no telemetry. The game must never kill the pig; the worst case is "very sick" until treated.
- Third-party assets: only CC0 or CC-BY, attribution in a new file under `assets/LICENSES/`, source URL recorded.
- PR description: what was done, decisions and why, files changed, how to check it by hand, a screenshot for visual changes (Playwright), anything left undone.

- Data tables (JSON in `assets/data/`) follow the `EconomyConfig` pattern: static `Current` (lazy `LoadDefault()`), `Load(string)`, `LoadDefault()` (file candidates, then code defaults, errors logged through `ItemCatalog.ErrorLogger`). A table is useless until something calls its loader: the task must name where. Tests inject tables into `Pet` (e.g. `BondTable`, `HayTable`) and never change statics. Tests find repo files by walking up from `AppContext.BaseDirectory` to the folder with `Cuy.sln` (`RepoFile` helper).
- New Core behavior that changes numbers is behind a `Balance` flag (default off, switched on in `GameSession.Open`) so existing tests keep their numbers.
- Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR and continue (nobody answers questions). Do not invent aliases for old names.

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

## Per-feature files (so parallel work never collides)
- Contracts: `docs/contracts/<feature>.md` (one file per feature); `docs/contracts.md` only gets an index line.
- Message validation (Core): one `IMessageRuleSet` class per feature in `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, found by reflection (see `docs/contracts/README.md`). Do not edit `MessageValidator.cs` for a new feature.
- Browser mock: `web/home/features/<id>/mock.js` calls `bridge.registerMockHandler(type, fn)` / `bridge.registerMockState(id, fn)`. Do not add cases to the `switch` in `bridge.js`.
- New saved fields of a shared class go to a partial file of their own (`WorldState.<Topic>.cs`), not into the main file.

## Canonical ids
- items: hay pellets bell_pepper parsley kale cucumber carrot chew_stick ball tunnel house water_bottle cake (+ ids added in `assets/data/items_*.json`)
- icons: keys of `assets/icons/icons.json`
- needs: fullness vitamin_c energy mood cleanliness teeth (C# enum `Need.Satiety` = fullness)
- stages: baby junior adult senior legend; currency: clovers (icon `clover`)

## Lessons from mistakes (add one line per repeated mistake)
- (empty: the human adds a line when an agent makes the same mistake twice)

## Packages and autonomy
- Nobody answers questions or approves plans: decide, record the decision in the PR ("Decyzje"), finish.
- A package (several `W<n>-<nn>` items in one prompt) is worked in the listed order, with a commit after each item. If time runs out, finish the current item, commit, and list the rest in the PR.
- Do not edit `.github/workflows/` or `tools/orkiestra/`. Do not weaken or remove existing test assertions.
- Verify with `tools/verify.ps1` (prints only failures) or the command named in the prompt; run the full test suite only when the prompt says so.
