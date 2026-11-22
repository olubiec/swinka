# PK-T27: Wave 3/4 Save Compat & Validation Fuzz
- Result: 12 PASS, 0 DEFECT, 0 SKIP (Wave34 filter: 12/12 passed).
- Full suite: 1413 passed, 18 failed (pre-existing unrelated tests), 6 skipped, 1437 total.
- Decisions: used `GameState.ActivePigIds` (actual property name vs singular), `RunCheck.Analyze(null, 16, 9, WorldItemCatalog.Current)`, and seeded `Random(4201..4205)` for deterministic 500-iteration fuzzing per feature.
- Coverage: all 5 `SAVE-*` cases in `Wave34SaveCompatTests.cs` and all 7 `VAL-*` cases (`run`, `props`, `companion`, `hayhop`, `weather`, oversized strings, unicode/control chars) in `Wave34ValidationFuzzTests.cs`.
- DEFECT list: none.
