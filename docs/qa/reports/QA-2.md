# QA-2 – Core logic, economy, validation

Date: 2026-11-05. New test file: `tests/Cuy.Core.Tests/QaInvariantFuzzTests.cs` (8 tests, all pass, 0.3 s).

## What was run
- **Invariant fuzz** (6 seeds x 600 random actions, 1-5 pigs): buy, place, move, remove, transfer, dorm unlock/upgrade, move in/out, set home, memorial toggle, time jumps up to 2 days with `Update()`. Hostile ids mixed in (null, empty, 5000 chars, `../..`, Polish diacritics, unknown rooms, extreme coordinates).
  Invariants: no exception, clovers never negative, item uids unique across rooms, item coordinates never negative, owned counts never negative. **No violation found.**
- **Hostile input sweep**: 11x11 combinations of junk through `PlaceItem`, `MoveItem`, `RemoveItem`, `RenameRoom`, `SetVariant`, `UnlockVariant`, `TransferItem`, `SetHome`, `RoomIdOf`, `BuyItem` incl. `int.MinValue/MaxValue`. **No exception.**
- **Save round trip** with Newtonsoft after activity: room count and clovers preserved.
- **Economy sim** (`tools/qa/economy-sim.js`, 20 runs, 365 days), "full sane" profile:
  | Profile | all places | firstRoomL2 | allRoomL3 | dorm | benefit% | content bought |
  |---|---|---|---|---|---|---|
  | casual | 194 d | 90 d | >365 | 144 d | 22% | 44% |
  | regular | 80 d | 51 d | 330 d | 107 d | 18% | 79% |
  | heavy | 41 d | 26 d | 166 d | 93 d | 8% | 100% |
  | exploit | >365 | >365 | >365 | >365 | 12% | 31% |
  | smart | >365 | >365 | >365 | >365 | 19% | 36% |
  Total content price 48653.
- Full suite after adding the file: see QA-1 (4 known failures unchanged).

## Findings
| ID | Sev | Area | Description |
|---|---|---|---|
| F2-01 | S2 | Rooms | Room key is `NamedId ?? Id` in code, `Id` in one W24 assertion. Recommendation: keep `NamedId ?? Id` (all other tests and the web/bridge use it) and update the W24 assertion in a fix wave with owner approval; no code change. Risk if left: a pig that gains a `NamedId` after its room exists would get a second room (needs a test; not covered). |
| F2-02 | S2 | Economy | Profiles `exploit` and `smart` never reach any milestone in 365 days (>365 for allPlaces, room L2/L3, dorm) while `smart` is described as the efficient player. Either the profiles are mis-tuned or the early economy punishes optimal play. Needs a look at the sim profile definitions. |
| F2-03 | S3 | Economy | `allRoomL3` is >365 d for casual and smart and 330 d for regular: top room level is effectively unreachable for most players in a year. Confirm intent against CONCEPT. |
| F2-04 | S2 | Migration | F1-04 (legacy equipped decor not placed on open) is a save-migration path (`LegacyDecorMigration`). Likely caused by the decor ids (`wallpaper_mint`, `floor_wood_light`) not being in the world item catalog / tiles (F1-02, F1-03), i.e. missing art data rather than logic. Real legacy saves with equipped decor may lose it. Verify with a real old save before release. |
| F2-05 | S3 | Coverage | Not verified: `ApplyTime` hook (not wired), `OnMemorialChanged`, dorm bond bonus (not wired). Cannot be tested until wired; listed so QA-6 carries them. |
| F2-06 | S4 | Tests | Compiler warnings in existing tests (xUnit1012 nulls in `InlineData`, xUnit2029): noise only. |

## Verdict
Core is robust against random and hostile input; no crash or invariant break. Open risks are economy tuning (F2-02/03), the room key decision (F2-01) and the legacy decor migration (F2-04).
