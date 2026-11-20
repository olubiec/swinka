# PK-RF6
- Produced `docs/opt/foundations/RF6.md` (12369 chars, sections `## 1.` .. `## 5.`) for close button (`×`), capture `pointerdown` dismissal, `In bag: X` / `Seeds: Y`, and Farm-Market guidance.
- Verification: `node tools/qa/foundation-check.js docs/opt/foundations/RF6.md 5` -> `FOUNDATION OK (5 sections, 12369 chars)`.
- Missing planned file: `tools/qa/ux-p43-farm.js` does not exist in the repository (`file does not exist`); recorded in `RF6.md` sections 2 and 5.
- Differences from planned names: `feature.js` (724 lines) and `feature.css` (69 lines) use `#farmSceneStrip`, `.farm-scene-panel`, `.farm-scene-tooltip`, `.farm-menu-head`, `[data-scene-close]`, `.farm-crop`, `[data-plant]` instead of `#farmPopover`, `.farm-popover`, `.farm-seed-btn`, `#farmStripOverlay`.
- Decision: preserve all existing PK-P43d selectors/attributes and `window.CuyFarm` API while adding `#farmPopover`, `.farm-popover`, `.farm-popover-head`, `.farm-popover-close`, and `.farm-seed-btn`.
- Contract difference: `docs/contracts/farm.md` `crops[]` uses `seedOwned` and `sellPrice` without a clover planting `cost`; decision: treat `cost` as optional and display both `Seeds: X` and `In bag: Y` (`state.inventory` object or array).
- Decision: stamp `S.openedAt = performance.now()` only in `handleHotspot()`, not in `renderScenePanel()`, so `onState` re-renders do not reset the 80ms dismissal guard.
- Left undone: none (research-only package; ready for `PK-PF-FRM`).
