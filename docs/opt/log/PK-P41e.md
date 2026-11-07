# PK-P41e: Gramophone available from the start
- Updated `assets/data/world_items.json`: set `price: 0` and `unlock_level: 1` for item `gramophone`.
- Extended `hasGramophone` in `web/home/features/music/player.js` to also inspect `st.rooms.storage` and `st.shop.items`.
- Kept `web/home/features/music/prices.js` unchanged to preserve parity with C# `MusicPrices.cs` and existing tests.
- Core starter gramophone: currently Core grants `player_turntable` via music starter save; if the owner wants a pre-placed/owned gramophone from day 1 without shopping, a starter entry in Core `WorldState.OwnedItems` / `layouts` can be added later.
- Added Playwright test `tools/qa/ux-p41-gramophone.js` testing Q1 `free-in-shop`, Q2 `placed-click-shows-player`, Q3 `click-aside-hides`, Q4 `music-continues-after-hide`, Q5 `no-gramophone-no-panel`.
- Verification: node syntax checks and all 5 Playwright test scenarios passed.
