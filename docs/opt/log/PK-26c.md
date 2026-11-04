PK-26c log (W26-06, W26-07, W26-09 done in order; node --check on all 4 JS files OK; web-smoke WEB SMOKE OK at 420x640).
- New files: dorm.js and dorm.css did not exist, created. DormPanel.mount(container, {state, send}); msgs dorm_unlock, dorm_move_in {pigIds}, dorm_move_out {pigId}, dorm_upgrade; state dorm = {unlocked, unlockCost, level, nextLevelCost, residents[pigId], candidates[{pigId,name,portrait,memorial}], bondBonus, storedNotice}.
- Assumed names (real C# state not read): residents are pigIds; room id 'dorm'; dorm.js/css load on demand from feature.js (no index change).
- feature.js: tab 'dorm' after pig tabs (price shown when locked); locked = panel + no canvas; resident pig tabs show 'moved in' and open dorm; tab html moved to tabsHtmlOf (needed by the locked branch).
- mock.js only (bridge.js untouched): layout dorm 16x8, level 2 = 18x9 for 1100, level 3 = 20x10 for 1800 (my choice); move in/out keeps item uids, overflow goes to storage with a notice; unlock needs 2 adopted pigs, 1500.
- Smoke: new roomsDormSmoke() after worldSmoke, adopted pigs' tabs only, 420x640 only (360 scrolls sideways on the existing Home layout). SKIP logged for customize swatch (RoomCustomize not loaded) and storage DOM (none drawn); storage checked in state.
- Setup: setup.sh stopped at the .NET download (proxy 403); ran only `npm --prefix tools/qa ci`; used CHROMIUM_PATH=/usr/bin/google-chrome.
- TESTY_RECZNE.md: section 10 (17 Polish steps) appended.
- Undone: C# side (PK-26b), storage list UI, customize smoke scenario.
