# PK-P6b: Edit templates module
- Implemented `web/home/features/places/edit-templates.js` (UMD: `module.exports` + `window.EditTemplates`).
- API: `themes(state)`, `plan(themeId, state, roomId)`, `build(container, { state, roomId, send })`, plus `DEFAULT_THEMES` and `OUTDOOR_IDS`.
- Decisions: `themes(state)` accepts both object-map (as in `pig_rooms.json`) and array overrides in `state.rooms.themes`; `findSkinOwnership` checks `state.rooms.owned` and `state.rooms.skins` (supporting both `{ id, name, icon, price, owned }` objects and string IDs per R27 sec 7).
- Decisions: `build` sets `container.hidden = true` and clears innerHTML for outdoor/missing rooms; injects `#editTemplatesStyle` once; disables refused (`title = res.refused`) and noop (`aria-pressed="true"`, `title = "Already applied"`) buttons.
- Differences from R6: followed R27 sec 4 & 7 (`PK-P6b` isolated module `edit-templates.js` instead of editing `place_scenes.json`/`scenes.js`/`edit-panel.js`).
- Stubs used in `tools/qa/ux-p6-templates.js`: `STUB send` callback capturing dispatched `room_skin` messages; Playwright launched via `msedge` fallback if Chromium headless_shell is absent.
- Verification: `node --check web/home/features/places/edit-templates.js`, `node --check tools/qa/ux-p6-templates.js`, `node tools/qa/ux-p6-templates.js` (M1-M10 PASS).
