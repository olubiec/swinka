# QA fixes applied (2026-11-05)

| ID | Status | Commit | Note |
|---|---|---|---|
| F3-01 save null roster (S1) | fixed, test unskipped | 6340c96 | `Roster.RemoveAll(null)` on load |
| F1-01 diary BOM (S4) | fixed | 6340c96 | |
| F5-04 dorm bond bonus | applied | 58e3ddb | 5 % is rounded away on 1-2 point gains; needs fractional carry (design decision) |
| F5-03 memorial hook | fixed | 58e3ddb | `SetMemorial` calls `OnMemorialChanged` |
| F5-05 time hook | NOT done | - | no defined room-level time behaviour; left unwired on purpose |
| F5-01 update version | fixed | 58e3ddb | reads assembly version (2.6.160), not "1.0.0"; Windows build not run here |
| F3-05 contracts | 12 of 13 added | 58e3ddb | `IHome` is an interface, skipped |
| F5-06 PROJECT_STATE | updated | 58e3ddb | STATUS block only |
| F4-01 store CSS vars | fixed | f152539 | mapped to existing theme tokens |
| F3-06 customize.js | loader added | f152539 | loaded on demand from rooms/feature.js; not browser-tested for the panel itself |
| F1-05/F4-02 icon-pig | alias to pig_head (index 24) | f152539 | placeholder: replace with real art |
| F4-04 touch targets | fixed (24 px) | f152539 | modal close, decor, room title, market tab |
| F3-03 flaky memorial test | fixed in test (explicit wait) | f152539 | no race found in pigs feature |
| D room key (F1-01/F2-01) | NOT done | - | needs owner decision: changing the W24 assertion is forbidden by AGENTS.md |
| E art (tiles, icons, lights) | NOT done | - | user is handling graphics |
| F economy tuning | NOT done | - | judgement call, see QA-2/QA-5 |
| I Windows manual pass | NOT done | - | needs Windows |
| F4-06 shared-bedroom chip, F3-04 mock 404s | NOT done | - | low priority |
