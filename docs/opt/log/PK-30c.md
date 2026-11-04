# PK-30c log

- W30-07: data-check adds theme tile file checks (tiles.json keeps tiles under `tiles`), `missing_art` warning for prop_of placeables without atlas entry (none now), and prints the placeable price sum (8240). SelfTest adds `pig_rooms.json`, `home_economy.json`, `pig room skins`, `pig room placeables` checks (Windows only, not run here).
- W30-09: `HomesActive = true` in both branches of `GameSession.Open`. RunActive, PropsActive and the W29-04 migration skipped per package override; toys test skipped.
- W30-09 tests: `tests/Cuy.Core.Tests/GameSessionHomeExtrasTests.cs` did not exist, created with 3 tests (new session, given Balance, every pig has a location). All pass.
- W30-08: web-smoke adds `roamingStoreSmoke` (house plan windows, window -> tab, pig canvas painted, home switch, store categories/search, buy lowers clovers). Garden run and tray scenarios skipped per override.
- Smoke differences: plan windows are 4 shared rooms plus adopted pig rooms, not `homes.rooms`. There is no store mock module, so the smoke page registers store state and `store_buy`. World mocks clamp clovers to >= 5000, so the buy check starts at 6000.
- TESTY_RECZNE: new section 11 (roaming and store only); garden run, tray and desktop props omitted.
- Verify: dotnet test 998 passed, 4 failed, all known (PigRoomsMigration, GameSessionWorld OldSaveWithEquippedDecor, WorldAssets x2). Build OK. data-check OK. web-smoke OK.
- Left undone: none. Log file `docs/opt/log/PK-30c.md` did not exist; created.
