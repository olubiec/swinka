Status: DONE (own tests 17/17 pass; full suite has 7 pre-existing unrelated failures)
Files: src/Cuy.Core/World/RunCheck.cs, src/Cuy.Core/World/RunRules.cs, assets/data/pig_run.json, tests/Cuy.Core.Tests/RunCheckTests.cs, tests/Cuy.Core.Tests/RunRulesTests.cs
API: RunConfig (Current/CreateDefault/Load/LoadDefault), RunInfo, RunCheck (Analyze/IsFenced/Capacity), RunVerdict, RunRules (CanBeOut/Message/MoodFor/CreditableHours)
Decisions: Checked time window before weather in RunRules.CanBeOut; left Balance.cs/WorldState.cs/Pet.Run.cs untouched per R38 section 7.
Differences from R38: None; all shapes and pig_run.json values match R38 section 3 literally.
Pre-existing unrelated failures in full Cuy.Core.Tests (7):
- PigPinMessagesTests.{PlacesPigPin,PigsDesktopPet}_{VeryLongPigId,UnknownField}_IsInvalid (4)
- WorldAssetsTests.WorldAndPlaceIcons_ExistInIconsJson (["tunnel", "tunnel_playground"])
- WorldMessageTests.OutOfRangeInt_ReturnsInvalid("room_place", "x", 201)
- WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50 (Expected 75, Actual 101)
