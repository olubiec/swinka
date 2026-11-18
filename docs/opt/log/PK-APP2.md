# PK-APP2 Log
Status: BLOCKED
- `web/home/index.html`: added `lib/{hotspots,scene-pigs,weather,play-targets}.js` before `canvas-pig.js` and `features/places/edit-{filters,templates,skins}.js` before `edit-panel.js`.
- `web/home/app.js`: excluded `farm` and `market` in `CuyHome.listFeatures()` and `openMoreModal()`; redirected `CuyHome.openFeature('farm'|'market')` to `CuyPlaces.openPlace(id)`.
- `web/home/features/index.json`: removed `"places/edit-panel"`.
- `tools/qa/ux-p53-load-order.js` (V1-V9), `ux-p47-bar.js` (T1-T6), `ux-p40-retire.js` (R1-R5): ALL PASS.
- Failing test (unrelated to PK-APP2): `tools/qa/ux-p1-lifecycle.js`:
  - `FAIL stale-container-all-features: locator.click: Timeout 5000ms exceeded.` (`#modalBody button[data-open-feature]` `Colouring`)
  - `FAIL back-button: Back button aria-label is "Back", expected "Back to More"` (`app.js:766` pre-existing)
