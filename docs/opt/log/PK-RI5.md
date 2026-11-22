# PK-RI5 Log
- Analyzed R38, R39, R40, contracts (`run.md`, `props.md`), `RunFeature.cs`, `PropsFeature.cs`, `DesktopPropsOverlay.cs`, `RunMessages.cs`, `PropsMessages.cs`, `features/run/*`, `edit-panel.js`, `edit-history.js`, `places/feature.js`, `canvas-pig.js`, `RoomsFeature.cs`, `Program.cs`, `HomeWindow.cs`, `HomeFeatures.cs`.
- Decision: `HomeFeatures.LoadAll()` (`HomeFeatures.cs:15`) already loads `RunFeature` and `PropsFeature` by reflection and `BrainController.cs:635` calls `TickAll`; `PK-CS3` only needs to wire `PropsFeature.PropsChanged` -> `DesktopPropsOverlay` via `_uiInvoker` in `Program.cs` and dispose on `ApplicationExit`.
- Decision: `RoomsFeature.cs` (`room_buy`, `comfort`) and `RoomsMessages.cs` are already implemented; `PK-PF3` targets `WorldSounds` hooks in `places/feature.js` (and `places/mock.js` lacks `comfort`/`room_buy` if needed in mock mode).
- Identified script-tag gap in `web/home/index.html` (`edit-history.js`, `draw-budget.js`, `world-sounds.js` not yet loaded) and `"run"` missing from `web/home/features/index.json`.
- `MessageValidator.cs` behavior for `run_*`/`prop_*` aliases and `PropsMessages.Rules` marked `UNVERIFIED` (not read to stay within scope).
- Verification `node tools/qa/foundation-check.js docs/opt/foundations/RI5.md 4` executed and checked.
