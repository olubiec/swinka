# QA findings register (QA-1 .. QA-5), 2026-11-05

Severity: S1 crash/data loss, S2 wrong behaviour, S3 cosmetic/minor, S4 note. Status: all open unless noted. Fix package = proposed grouping (QA-6).

| ID | Sev | Area | Summary | Source | Fix pkg |
|---|---|---|---|---|---|
| F3-01 | S1 | Save | `SaveSystem.Load` throws NRE on `"Roster":[null]` (`GameState.Pigs.cs:77`); unskip `NullRosterEntries_LoadNeverThrows` | QA-3 | A |
| F4-01 | S2 | Store UI | Store screen unstyled: 6 undefined CSS vars in `store/feature.css` | QA-4/F1-06 | B |
| F5-04 | S2 | Dorm | `DormBondBonus` shown in UI but not applied in `Pet` bond gain | QA-5 | C |
| F3-06 | S2 | Rooms UI | `customize.js/.css` never loaded; customize panel unreachable | QA-3 | B |
| F1-01/F2-01 | S2 | Rooms | W24 assertion keys rooms by `Id`, code by `NamedId ?? Id`; decide, update assertion, add test for a pig gaining a NamedId later | QA-1/2 | D (owner decision) |
| F1-02/F1-03/F4-05 | S2 | Art/data | Floor tiles missing from `tiles.json`; world item icons missing from `icons.json` (2 failing tests) | QA-1/4 | E (visual wave) |
| F1-04/F2-04 | S2 | Migration | Legacy equipped decor not placed on open (likely caused by F1-02/03); verify with a real old save | QA-1/2 | E |
| F2-02 | S2 | Economy | `smart`/`exploit` profiles reach no milestone in 365 d; check sim profiles/tuning | QA-2 | F |
| F3-03 | S2 | Web test | Flaky memorial confirmation (`26_my_pigs`) | QA-3 | B |
| F5-03 | S3 | Memorial | `OnMemorialChanged` defined, never called | QA-5 | C |
| F5-05 | S3 | Time | Rooms `ApplyTime` hook not wired | QA-5 | C |
| F5-01 | S3 | Update | Update check uses network (concept: no internet) and hard-codes version `"1.0.0"` | QA-5 | G |
| F1-05/F4-02 | S3 | Icons | `icon-pig` missing (icons.json + CSS) | QA-1/4 | B |
| F4-03/F3-02 | S3 | Lights | 3 light textures 404 (`dust_motes`, `cone_shade`, `lamp_floor`); `web-smoke` exits 1 | QA-3/4 | E |
| F4-04 | S3 | UX | Buttons <24 px (decor, market, modal close) | QA-4 | B |
| F4-06 | S3 | UX | Shared-bedroom chip looks like a room tab | QA-4 | B |
| F2-03 | S3 | Economy | Top room level unreachable in a year for most profiles | QA-2 | F |
| F5-08 | S3 | Economy | First meaningful purchase after 51-90 days | QA-5 | F |
| F3-04 | S3 | Web | 404 noise from optional `mock.js` probes | QA-3 | B |
| F3-05 | S3 | Docs | 13 features without contract in `docs/contracts/` | QA-3 | H |
| F3-07 | S4 | Soak | Heap +6 MB in 150 s; re-measure 30 min | QA-3 | - |
| F1-07 | S4 | Data | BOM in `diary.json` | QA-1 | A |
| F5-06/F5-07 | S4 | Docs | `PROJECT_STATE.md` stale; Polish docs vs English-only rule | QA-5 | H |
| F2-06 | S4 | Tests | Compiler warnings in existing tests | QA-2 | - |
| F4-07 | S4 | Coverage | Visual matrix lacks day/night, 1/3/5 pigs, long names, 150 % text, Windows DPI | QA-4 | I (Windows) |
| F5-02 | - | Withdrawn | AttachPigRooms is called | QA-5 | - |
